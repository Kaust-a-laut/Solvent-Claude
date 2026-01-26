import { AIProviderFactory } from './aiProviderFactory';
import { vectorService } from './vectorService';
import { logger } from '../utils/logger';
import { Server } from 'socket.io';

export interface SupervisorState {
  lastSync: string;
  activeMission: string;
  graphNodes: any[];
  graphEdges: any[];
}

export class SupervisorService {
  private io: Server | null = null;
  private isProcessing = false;

  setIO(io: Server) {
    this.io = io;
  }

  async supervise(noteContent: string, currentGraph: any) {
    if (this.isProcessing || !noteContent || noteContent.length < 20) return;
    
    this.isProcessing = true;
    logger.info('[Supervisor] Analyzing mission delta via Groq LPU...');

    try {
      const groq = AIProviderFactory.getProvider('groq');
      
      // Pull relevant long-term context for supervision
      const relevantMemories = await vectorService.search(noteContent, 2);
      const memoryContext = relevantMemories
        .filter(m => m.score > 0.8)
        .map(m => `[PAST INSIGHT]: ${m.metadata.text}`)
        .join('\n');

      const prompt = `Act as the Solvent AI Overseer. Analyze the user's latest notes and the current Knowledge Graph state. 
      Your goal is to maintain a perfect mental map of the project.
      
      Current Notes: "${noteContent}"
      Current Graph: ${JSON.stringify(currentGraph)}
      ${memoryContext ? `\nLong-term context found:\n${memoryContext}` : ''}

      TASKS:
      1. Extract new concepts, files, or entities as "nodes".
      2. Define "edges" (links) between these entities.
      3. Identify if any nodes are no longer relevant.
      4. Provide a "Supervisory Insight" (a short, high-value technical tip).
      5. Identify "Crystallizable Knowledge": Is there a NEW, stable rule or architectural decision in the notes that should be permanently remembered?

      RESPONSE FORMAT (STRICT JSON):
      {
        "nodesToAdd": [{"id": "unique_id", "label": "name", "type": "file|concept|task"}],
        "edgesToAdd": [{"source": "id1", "target": "id2", "label": "link_type"}],
        "nodesToRemove": ["id"],
        "insight": "technical insight here",
        "crystallize": { "content": "The rule/fact", "type": "architectural_decision|project_rule" } (OR null)
      }`;

      const response = await groq.generateChatCompletion([
        { role: 'system', content: 'You are a sub-100ms LPU-optimized project supervisor.' },
        { role: 'user', content: prompt }
      ], { model: 'llama-3.3-70b-versatile', temperature: 0.1 });

      const analysis = this.parseResponse(response);
      
      if (analysis) {
        if (this.io) {
          this.io.emit('SUPERVISOR_UPDATE', analysis);
          logger.info('[Supervisor] State synchronization emitted.');
        }

        // Auto-Crystallization from Supervisor
        if (analysis.crystallize && analysis.crystallize.content) {
           const { toolService } = require('./toolService');
           await toolService.executeTool('crystallize_memory', {
             content: analysis.crystallize.content,
             type: analysis.crystallize.type || 'architectural_decision',
             tags: ['supervisor_detected']
           });
           logger.info(`[Supervisor] Crystallized: ${analysis.crystallize.content}`);
        }
      }

      // Pillar 2: Background Vector Sync
      await vectorService.addEntry(noteContent, { type: 'note_delta', timestamp: new Date().toISOString() });

    } catch (error) {
      logger.error('[Supervisor] Supervision loop failed', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private parseResponse(res: string) {
    try {
      const jsonMatch = res.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : res);
    } catch (e) {
      return null;
    }
  }

  emitClarificationRequest(payload: { type: string, question: string, data: any }) {
    if (this.io) {
      this.io.emit('SUPERVISOR_CLARIFICATION', payload);
      logger.info(`[Supervisor] Clarification request emitted: ${payload.question}`);
    } else {
      logger.warn('[Supervisor] Cannot emit clarification - IO not initialized.');
    }
  }

  emitEvent(event: string, payload: any) {
    if (this.io) {
      this.io.emit(event, payload);
    }
  }

  /**
   * Proactive Memory: Analyzes current context (focus/files) to surface relevant rules *before* mistakes happen.
   */
  async provideGuidance(contextFocus: string) {
    if (this.isProcessing || !contextFocus) return;
    
    try {
      // 1. Semantic Search for Rules/Decisions only
      const relevantRules = await vectorService.search(contextFocus, 5, { 
        type: 'permanent_rule' 
      });
      
      const relevantDecisions = await vectorService.search(contextFocus, 3, { 
        type: 'architectural_decision' 
      });

      const memories = [...relevantRules, ...relevantDecisions];
      if (memories.length === 0) return;

      const memoryContext = memories
        .filter(m => m.score > 0.75) // Only high relevance
        .map(m => `[${m.metadata.type.toUpperCase()}]: ${m.metadata.text}`)
        .join('\n');

      if (!memoryContext) return;

      const groq = AIProviderFactory.getProvider('groq');
      const prompt = `Act as a Proactive Engineering Guide.
      
      USER CONTEXT: "${contextFocus}"
      
      RELEVANT MEMORY:
      ${memoryContext}
      
      TASK:
      Determine if any of the above memories are CRITICAL to mention right now to prevent a mistake or align the workflow.
      If yes, output a concise "Nudge". If the rules are obvious or irrelevant, output "NO_ACTION".
      
      Format: Just the nudge text or "NO_ACTION".`;

      const nudge = await groq.generateChatCompletion([
        { role: 'system', content: 'You are a helpful, non-intrusive assistant.' },
        { role: 'user', content: prompt }
      ], { model: 'llama-3.3-70b-versatile', temperature: 0 });

      if (nudge && !nudge.includes('NO_ACTION')) {
        if (this.io) {
          this.io.emit('supervisor-nudge', { message: nudge }); // Reuse existing event
          logger.info(`[Supervisor] Proactive guidance: ${nudge}`);
        }
      }

    } catch (error) {
       // Silent fail
    }
  }
}

export const supervisorService = new SupervisorService();
