import { pluginManager } from './pluginManager';
import { logger } from '../utils/logger';
import { vectorService } from './vectorService';
import { taskService } from './taskService';

export interface MissionAgent {
  id: string;
  name: string;
  instruction: string;
  provider?: string;
  model?: string;
}

export interface MissionTemplate {
  id: string;
  agents: MissionAgent[];
  synthesisInstruction: string;
  intentAssertions: string[];
}

export interface MissionOptions {
  async?: boolean;
  providerOverride?: string;
  modelOverride?: string;
}

export interface MissionResult {
  goal: string;
  expertOpinions: { id: string; agent: string; opinion: string }[];
  synthesis: string;
}

export interface AsyncMissionResult {
  jobId: string;
  status: 'queued';
  message: string;
}

export class OrchestrationService {
  private templates: Map<string, MissionTemplate> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    // 1. Consultation Mission (Old Collaborate)
    this.templates.set('consultation', {
      id: 'consultation',
      agents: [
        { id: 'pm', name: 'Product Manager', instruction: 'Focus on business value and user alignment.' },
        { id: 'engineer', name: 'Lead Engineer', instruction: 'Focus on technical architecture and code quality.' },
        { id: 'security', name: 'Security Auditor', instruction: 'Focus on vulnerabilities and best practices.' }
      ],
      synthesisInstruction: 'Summarize the expert opinions into a single actionable Mission Briefing.',
      intentAssertions: [
        'The solution must be technically feasible.',
        'The solution must prioritize user safety and security.',
        'The solution must align with established project rules.'
      ]
    });

    // 2. Refinement Mission (Logic optimization)
    this.templates.set('refinement', {
      id: 'refinement',
      agents: [
        { id: 'critic', name: 'Adversarial Critic', instruction: 'Find flaws and edge cases.' },
        { id: 'optimist', name: 'Efficiency Optimizer', instruction: 'Find ways to make it faster and cleaner.' }
      ],
      synthesisInstruction: 'Provide a final set of optimized technical requirements.',
      intentAssertions: [
        'The refinement must not introduce new security vulnerabilities.',
        'The refinement must maintain backwards compatibility where applicable.'
      ]
    });
  }

  getTemplate(templateId: string): MissionTemplate | undefined {
    return this.templates.get(templateId);
  }

  async runMission(
    templateId: string,
    goal: string,
    options: MissionOptions = {}
  ): Promise<MissionResult | AsyncMissionResult> {
    const template = this.templates.get(templateId);
    if (!template) throw new Error(`Template ${templateId} not found.`);

    // Async mode: dispatch to queue and return immediately
    if (options.async) {
      logger.info(`[Orchestrator] Dispatching async mission: ${templateId}`);
      const jobId = await taskService.dispatchOrchestrationJob(
        templateId,
        goal,
        template,
        {
          providerOverride: options.providerOverride,
          modelOverride: options.modelOverride
        }
      );
      return {
        jobId,
        status: 'queued',
        message: `Mission ${templateId} queued. Poll /api/tasks/${jobId} for status.`
      };
    }

    // Sync mode: run inline (backwards compatible)
    return this.runMissionSync(templateId, goal, template, options);
  }

  private async runMissionSync(
    templateId: string,
    goal: string,
    template: MissionTemplate,
    options: MissionOptions
  ): Promise<MissionResult> {
    logger.info(`[Orchestrator] Starting sync mission: ${templateId}`);

    // Resolve provider dynamically
    const provider = await pluginManager.resolveProvider(
      options.providerOverride,
      undefined,  // Use config default
      undefined   // No specific capabilities required
    );
    const model = options.modelOverride || provider.defaultModel || 'default';

    logger.info(`[Orchestrator] Using provider: ${provider.id}, model: ${model}`);

    // Phase 1: Parallel Agent Analysis
    const expertOpinions = await Promise.all(template.agents.map(async (agent) => {
      // Per-agent provider override if specified
      const agentProvider = agent.provider
        ? await pluginManager.resolveProvider(agent.provider)
        : provider;
      const agentModel = agent.model || model;

      const response = await agentProvider.complete(
        [{ role: 'user', content: `GOAL: ${goal}\n\nAs the ${agent.name}, provide your professional analysis. ${agent.instruction}` }],
        { model: agentModel }
      );
      return { id: agent.id, agent: agent.name, opinion: response };
    }));

    // Phase 2: Anchored Synthesis Pass
    const synthesisPrompt = `I have gathered analysis from multiple experts regarding: "${goal}"

    INVARIANTS TO MAINTAIN:
    ${template.intentAssertions.map(a => `- ${a}`).join('\n')}

    EXPERT FEEDBACK:
    ${expertOpinions.map(o => `--- ${o.agent} ---\n${o.opinion}`).join('\n\n')}

    TASK:
    ${template.synthesisInstruction}

    Verify that the consensus meets all INVARIANTS.
    Output the synthesis followed by a 'VERIFICATION' section marking each invariant as PASSED or FAILED.`;

    const synthesis = await provider.complete(
      [{ role: 'user', content: synthesisPrompt }],
      { model }
    );

    // Phase 3: Memory Persistence
    await vectorService.addEntry(synthesis, {
      type: 'mission_synthesis',
      templateId,
      goal,
      timestamp: new Date().toISOString()
    });

    return {
      goal,
      expertOpinions,
      synthesis
    };
  }
}

export const orchestrationService = new OrchestrationService();
