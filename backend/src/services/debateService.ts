import { aiService } from './aiService';
import { logger } from '../utils/logger';

export interface DebateRound {
  model: string;
  role: string;
  content: string;
}

export interface DebateResult {
  topic: string;
  rounds: DebateRound[];
  consensus: string;
}

export class DebateService {
  async conductDebate(topic: string): Promise<DebateResult> {
    const rounds: DebateRound[] = [];
    
    logger.info(`[DebateService] Starting debate on topic: ${topic}`);

    // Round 1: Gemini Proposes
    const proposal = await aiService.processChat({
      messages: [{ role: 'user', content: `TOPIC: ${topic}\n\nPropose a technical architecture or solution for this topic. Be detailed and decisive.` }],
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      smartRouter: false
    });
    rounds.push({ model: 'gemini', role: 'proponent', content: proposal.response });

    // Round 2: Ollama Critiques
    const critique = await aiService.processChat({
      messages: [
        { role: 'user', content: `TOPIC: ${topic}` },
        { role: 'assistant', content: proposal.response },
        { role: 'user', content: `Critically analyze the proposal above. Look for vulnerabilities, scalability issues, and technical debt. Be strict.` }
      ],
      provider: 'ollama',
      model: 'qwen2.5-coder:7b',
      smartRouter: false
    });
    rounds.push({ model: 'ollama', role: 'critic', content: critique.response });

    // Round 3: Gemini Rebuttal/Synthesis
    const synthesis = await aiService.processChat({
      messages: [
        { role: 'user', content: `TOPIC: ${topic}` },
        { role: 'assistant', content: proposal.response },
        { role: 'user', content: critique.response },
        { role: 'user', content: `Based on your original proposal and the critique provided, synthesize a final, high-fidelity architectural decision that addresses the concerns while maintaining the core vision.` }
      ],
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      smartRouter: false
    });
    rounds.push({ model: 'gemini', role: 'synthesizer', content: synthesis.response });

    return {
      topic,
      rounds,
      consensus: synthesis.response
    };
  }
}

export const debateService = new DebateService();
