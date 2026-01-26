import { ChatRequestData } from '../types/ai';
import { vectorService } from './vectorService';
import { getModelContextLimit } from '../constants/models';
import { memoryMetrics } from '../utils/memoryMetrics';

export interface ProvenanceItem {
  id: string;
  text: string;
  type: string;
  source?: string;
  score: number;
  status: 'active' | 'suppressed';
  reason?: string;
}

export interface ContextProvenance {
  workspaceFiles: string[];
  active: ProvenanceItem[];
  suppressed: ProvenanceItem[];
  counts: {
    workspace: number;
    local: number;
    global: number;
    rules: number;
  };
}

export class ContextService {
  async enrichContext(data: ChatRequestData): Promise<{ messages: any[], provenance: ContextProvenance }> {
    const lastMessage = data.messages[data.messages.length - 1].content;
    const modelLimit = getModelContextLimit(data.model);
    
    const isMassiveContext = modelLimit >= 100000;
    const isConstrained = modelLimit < 16000;

    const retrievalCount = isMassiveContext ? 25 : (isConstrained ? 3 : 8);
    const rulesCount = isMassiveContext ? 10 : 3;

    const keywords = lastMessage.match(/\b([a-zA-Z0-9_-]{5,})\b/g) || [];
    const uniqueKeywords = [...new Set(keywords)];

    // 1. Fetch Global Rules first (The Guardrails)
    const globalRules = await vectorService.search('global project rules', rulesCount, { type: 'permanent_rule' });
    const rulesContext = globalRules.map(r => `> [RULE]: ${r.metadata.text}`).join('\n');

    // 2. Fetch Candidates
    // Use keywords to find high-probability candidates via tag index
    const tagCandidatesIds = new Set<string>();
    for (const kw of uniqueKeywords) {
      const ids = vectorService.tagIndex.get(kw.toLowerCase());
      if (ids) ids.forEach((id: string) => tagCandidatesIds.add(id));
    }

    const relevantEntries = await vectorService.search(lastMessage, retrievalCount * 3);
    const universalPatterns = await vectorService.search(lastMessage, 5, { tier: 'meta-summary' });
    
    // 2b. Traversal of Links for top candidates
    const topCandidates = relevantEntries.slice(0, 5);
    const linkedMemories: any[] = [];
    for (const cand of topCandidates) {
      if (cand.metadata.links && Array.isArray(cand.metadata.links)) {
        const linked = vectorService.getEntriesByIds(cand.metadata.links);
        linked.forEach(m => {
          if (!relevantEntries.find(re => re.id === m.id)) {
            linkedMemories.push({ ...m, score: cand.score * 0.9 }); // Slightly lower score for linked
          }
        });
      }
    }

    const combinedCandidates = [...relevantEntries, ...linkedMemories];
    universalPatterns.forEach(up => {
      if (up.metadata.isUniversal && !combinedCandidates.find(ce => ce.id === up.id)) {
        combinedCandidates.push(up);
      }
    });

    const activeItems: ProvenanceItem[] = [];
    const suppressedItems: ProvenanceItem[] = [];

    const scoredEntries = combinedCandidates.map(e => {
      let finalScore = e.score;
      const ageHours = (Date.now() - new Date(e.metadata.timestamp || e.metadata.createdAt || 0).getTime()) / (1000 * 60 * 60);
      
      if (e.metadata.isUniversal) finalScore += 0.35;
      else if (e.metadata.type === 'meta_summary') finalScore += 0.30;
      else if (e.metadata.crystallized) finalScore += 0.25;
      else if (e.metadata.type === 'permanent_rule') finalScore += 0.20;
      else if (e.metadata.type === 'code_block') finalScore -= (ageHours / 24) * 0.01;

      uniqueKeywords.forEach(kw => {
        if (e.metadata.text && e.metadata.text.toLowerCase().includes(kw.toLowerCase())) finalScore += 0.15;
      });

      // Tag match boost
      if (tagCandidatesIds.has(e.id)) finalScore += 0.20;

      return { ...e, finalScore };
    }).sort((a, b) => b.finalScore - a.finalScore);

    // --- SEMANTIC DEDUPLICATION ---
    const SIMILARITY_THRESHOLD = 0.92;
    const dedupedEntries: typeof scoredEntries = [];
    const duplicateIds = new Set<string>();

    for (const entry of scoredEntries) {
      if (duplicateIds.has(entry.id)) continue;

      // Check if this entry is too similar to any already-included entry
      let isDuplicate = false;
      for (const kept of dedupedEntries) {
        const similarity = this.cosineSimilarity(entry.vector, kept.vector);
        if (similarity > SIMILARITY_THRESHOLD) {
          isDuplicate = true;
          duplicateIds.add(entry.id);
          memoryMetrics.recordDeduplication(similarity);

          // Add to suppressed with reason
          suppressedItems.push({
            id: entry.id,
            text: entry.metadata.text?.substring(0, 150) + '...' || '',
            type: entry.metadata.type?.toUpperCase() || 'UNKNOWN',
            source: entry.metadata.isUniversal ? 'GLOBAL' : 'LOCAL',
            score: entry.finalScore,
            status: 'suppressed',
            reason: 'Duplicate of higher-scored entry'
          });
          break;
        }
      }

      if (!isDuplicate) {
        dedupedEntries.push(entry);
      }
    }

    // 3. Process Logic: Active vs Suppressed
    const minScore = isMassiveContext ? 0.50 : 0.60;

    for (const entry of dedupedEntries) {
      const item: ProvenanceItem = {
        id: entry.id,
        text: entry.metadata.text.substring(0, 150) + '...',
        type: entry.metadata.isUniversal ? 'UNIVERSAL PATTERN' : entry.metadata.type.toUpperCase(),
        source: entry.metadata.isUniversal ? 'GLOBAL' : 'LOCAL',
        score: entry.finalScore,
        status: 'active'
      };

      if (entry.finalScore < minScore) {
        item.status = 'suppressed';
        item.reason = 'Low Relevance';
        suppressedItems.push(item);
        continue;
      }

      // Explicit Conflict Check (Simple heuristic for now)
      const hasConflict = globalRules.some(r => 
        (r.metadata.text.toLowerCase().includes('no') || r.metadata.text.toLowerCase().includes('don\'t')) &&
        item.text.toLowerCase().includes(r.metadata.text.toLowerCase().split(' ').pop() || '!!!')
      );

      if (hasConflict) {
        item.status = 'suppressed';
        item.reason = 'Conflict with Local Rule';
        suppressedItems.push(item);
      } else if (activeItems.length < retrievalCount) {
        activeItems.push(item);
      } else {
        item.status = 'suppressed';
        item.reason = 'Context Window Limit';
        suppressedItems.push(item);
      }
    }

    const ragContext = activeItems
      .map(item => `> [RELEVANT CONTEXT (${item.type} | ${item.source})]: ${item.text}`)
      .join('\n');

    const provenance: ContextProvenance = {
      workspaceFiles: data.openFiles?.map(f => f.path) || [],
      active: activeItems,
      suppressed: suppressedItems.slice(0, 10), // Limit UI noise
      counts: {
        workspace: data.openFiles?.length || 0,
        local: activeItems.filter(i => i.source === 'LOCAL').length,
        global: activeItems.filter(i => i.source === 'GLOBAL').length,
        rules: globalRules.length
      }
    };

    const systemPrompt = {
      role: 'system' as const,
      content: `
# SOLVENT AI | OPERATIONAL PROTOCOL v1.2

## DYNAMIC CONTEXT
[LIVE MISSION DIRECTIVES]: "${data.notepadContent || 'None'}"
[OPEN WORKSPACE FILES]: ${provenance.workspaceFiles.join(', ') || 'None'}
[PROJECT MEMORY]:
${ragContext || 'None'}
[ESTABLISHED RULES]:
${rulesContext || 'None'}

Maintain the persona of a brilliant, focused engineering partner.`
    };

    return { messages: [systemPrompt, ...data.messages], provenance };
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magA += vecA[i] * vecA[i];
      magB += vecB[i] * vecB[i];
    }
    const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}

export const contextService = new ContextService();
