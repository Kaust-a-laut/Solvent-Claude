import { ChatRequestData } from '../types/ai';
import { vectorService } from './vectorService';
import { getModelContextLimit } from '../constants/models';
import { memoryMetrics } from '../utils/memoryMetrics';

// --- Named Constants ---

/**
 * Number of entries to fetch for massive context models (100k+ tokens)
 */
const RETRIEVAL_COUNT_MASSIVE = 25;

/**
 * Number of entries to fetch for constrained context models (<16k tokens)
 */
const RETRIEVAL_COUNT_CONSTRAINED = 3;

/**
 * Default number of entries to fetch for standard models
 */
const RETRIEVAL_COUNT_DEFAULT = 8;

/**
 * Number of global rules to fetch for massive context models
 */
const RULES_COUNT_MASSIVE = 10;

/**
 * Number of global rules to fetch for standard/constrained models
 */
const RULES_COUNT_DEFAULT = 3;

/**
 * Cosine similarity threshold above which entries are considered duplicates
 */
const DEDUP_SIMILARITY_THRESHOLD = 0.92;

/**
 * Minimum score for an entry to be considered active (massive context)
 */
const MIN_SCORE_MASSIVE_CONTEXT = 0.50;

/**
 * Minimum score for an entry to be considered active (standard/constrained context)
 */
const MIN_SCORE_STANDARD_CONTEXT = 0.60;

/**
 * Maximum number of suppressed items to show in UI
 */
const MAX_SUPPRESSED_ITEMS_UI = 10;

/**
 * Score boost for universal patterns
 */
const SCORE_BOOST_UNIVERSAL = 0.35;

/**
 * Score boost for meta summaries
 */
const SCORE_BOOST_META_SUMMARY = 0.30;

/**
 * Score boost for crystallized memories
 */
const SCORE_BOOST_CRYSTALLIZED = 0.25;

/**
 * Score boost for permanent rules
 */
const SCORE_BOOST_PERMANENT_RULE = 0.20;

/**
 * Score boost for keyword matches
 */
const SCORE_BOOST_KEYWORD_MATCH = 0.15;

/**
 * Score boost for tag index matches
 */
const SCORE_BOOST_TAG_MATCH = 0.20;

/**
 * Score decay rate for code blocks (per day)
 */
const SCORE_DECAY_CODE_BLOCK_PER_DAY = 0.01;

/**
 * Score multiplier for linked memories
 */
const LINKED_MEMORY_SCORE_MULTIPLIER = 0.9;

// --- Types ---

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

// --- Helper Functions ---

/**
 * Computes a simple LSH-style hash for a vector by binarizing it.
 * This allows O(1) lookup for very similar vectors before doing expensive cosine similarity.
 */
function computeVectorSignature(vector: number[], buckets: number = 16): string {
  const bucketSize = Math.ceil(vector.length / buckets);
  const signature: number[] = [];
  
  for (let i = 0; i < buckets; i++) {
    let sum = 0;
    const start = i * bucketSize;
    const end = Math.min(start + bucketSize, vector.length);
    for (let j = start; j < end; j++) {
      sum += vector[j];
    }
    signature.push(sum > 0 ? 1 : 0);
  }
  
  return signature.join('');
}

/**
 * Efficiently deduplicates entries using LSH-style pre-filtering.
 * Only performs exact cosine similarity check against entries with matching signatures.
 */
function deduplicateEntries(
  scoredEntries: Array<{ vector: number[]; id: string; score: number; metadata: any; finalScore: number }>,
  suppressedItems: ProvenanceItem[]
): Array<typeof scoredEntries[0]> {
  const dedupedEntries: typeof scoredEntries = [];
  const duplicateIds = new Set<string>();
  
  // Group entries by their vector signature for O(1) pre-filtering
  const signatureMap = new Map<string, typeof scoredEntries>();
  
  for (const entry of scoredEntries) {
    if (duplicateIds.has(entry.id)) continue;
    
    const signature = computeVectorSignature(entry.vector);
    const candidates = signatureMap.get(signature) || [];
    
    // Check against entries with the same signature
    let isDuplicate = false;
    for (const kept of candidates) {
      const similarity = cosineSimilarity(entry.vector, kept.vector);
      if (similarity > DEDUP_SIMILARITY_THRESHOLD) {
        isDuplicate = true;
        duplicateIds.add(entry.id);
        memoryMetrics.recordDeduplication(similarity);
        
        // Add to suppressed with reason
        suppressedItems.push({
          id: entry.id,
          text: entry.metadata?.text?.substring(0, 150) + '...' || '',
          type: entry.metadata?.type?.toUpperCase() || 'UNKNOWN',
          source: entry.metadata?.isUniversal ? 'GLOBAL' : 'LOCAL',
          score: entry.finalScore,
          status: 'suppressed',
          reason: 'Duplicate of higher-scored entry'
        });
        break;
      }
    }
    
    if (!isDuplicate) {
      dedupedEntries.push(entry);
      // Add to signature map for future comparisons
      candidates.push(entry);
      signatureMap.set(signature, candidates);
    }
  }
  
  return dedupedEntries;
}

/**
 * Computes cosine similarity between two vectors.
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
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

// --- ContextService Class ---

export class ContextService {
  async enrichContext(data: ChatRequestData): Promise<{ messages: any[], provenance: ContextProvenance }> {
    const lastMessage = data.messages[data.messages.length - 1]?.content || "";
    const modelLimit = getModelContextLimit(data.model);

    const isMassiveContext = modelLimit >= 100000;
    const isConstrained = modelLimit < 16000;

    const retrievalCount = isMassiveContext ? RETRIEVAL_COUNT_MASSIVE : (isConstrained ? RETRIEVAL_COUNT_CONSTRAINED : RETRIEVAL_COUNT_DEFAULT);
    const rulesCount = isMassiveContext ? RULES_COUNT_MASSIVE : RULES_COUNT_DEFAULT;

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
          if (m?.id && !relevantEntries.find(re => re.id === m.id)) {
            linkedMemories.push({ ...m, score: cand.score * LINKED_MEMORY_SCORE_MULTIPLIER });
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

      if (e.metadata.isUniversal) finalScore += SCORE_BOOST_UNIVERSAL;
      else if (e.metadata.type === 'meta_summary') finalScore += SCORE_BOOST_META_SUMMARY;
      else if (e.metadata.crystallized) finalScore += SCORE_BOOST_CRYSTALLIZED;
      else if (e.metadata.type === 'permanent_rule') finalScore += SCORE_BOOST_PERMANENT_RULE;
      else if (e.metadata.type === 'code_block') finalScore -= (ageHours / 24) * SCORE_DECAY_CODE_BLOCK_PER_DAY;

      uniqueKeywords.forEach(kw => {
        if (e.metadata.text && e.metadata.text.toLowerCase().includes(kw.toLowerCase())) finalScore += SCORE_BOOST_KEYWORD_MATCH;
      });

      // Tag match boost
      if (tagCandidatesIds.has(e.id)) finalScore += SCORE_BOOST_TAG_MATCH;

      return { ...e, finalScore };
    }).sort((a, b) => b.finalScore - a.finalScore);

    // --- SEMANTIC DEDUPLICATION (Optimized with LSH-style pre-filtering) ---
    const dedupedEntries = deduplicateEntries(scoredEntries, suppressedItems);

    // 3. Process Logic: Active vs Suppressed
    const minScore = isMassiveContext ? MIN_SCORE_MASSIVE_CONTEXT : MIN_SCORE_STANDARD_CONTEXT;

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
      suppressed: suppressedItems.slice(0, MAX_SUPPRESSED_ITEMS_UI),
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
}

export const contextService = new ContextService();
