import { pluginManager } from './pluginManager';
import { logger } from '../utils/logger';
import { vectorService } from './vectorService';
import { taskService } from './taskService';
import { providerSelector } from './providerSelector';
import { circuitBreaker } from './circuitBreaker';

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
  priority?: 'cost' | 'performance' | 'reliability';
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

    // 3. Research Mission (Evidence-based investigation)
    this.templates.set('research', {
      id: 'research',
      agents: [
        { id: 'researcher', name: 'Research Specialist', instruction: 'Gather deep context, cite evidence, and surface relevant precedents and data points.' },
        { id: 'analyst', name: 'Data Analyst', instruction: 'Identify patterns in the research, draw data-driven conclusions, and quantify trade-offs where possible.' },
        { id: 'devil', name: "Devil's Advocate", instruction: 'Challenge the prevailing assumptions, surface blind spots, and argue the strongest counterpoint.' }
      ],
      synthesisInstruction: 'Synthesize the research findings into a comprehensive evidence-based brief with clear conclusions and recommended next steps.',
      intentAssertions: [
        'All conclusions must be grounded in evidence rather than speculation.',
        'The analysis must actively challenge initial assumptions.',
        'Conflicting evidence must be acknowledged rather than ignored.'
      ]
    });

    // 4. Code Review Mission (Engineering quality gate)
    this.templates.set('code-review', {
      id: 'code-review',
      agents: [
        { id: 'architect', name: 'Software Architect', instruction: 'Review overall design, system structure, scalability patterns, and architectural trade-offs.' },
        { id: 'reviewer', name: 'Code Reviewer', instruction: 'Assess code quality, naming conventions, readability, test coverage, and adherence to best practices.' },
        { id: 'security', name: 'Security Auditor', instruction: 'Identify vulnerabilities, injection risks, authentication gaps, and hardening opportunities.' }
      ],
      synthesisInstruction: 'Produce a prioritized code review report with actionable improvement items, grouped by severity (critical / major / minor).',
      intentAssertions: [
        'Security findings must be prioritized above style concerns.',
        'Recommendations must not suggest breaking changes to public APIs.',
        'Every critical finding must include a concrete remediation suggestion.'
      ]
    });
  }

  getTemplate(templateId: string): MissionTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Conclusive re-synthesis pass — called after all parallel agents have completed.
   * Takes their opinions + initial synthesis + optional user framing and produces
   * a deeper, actionable analysis in a single LLM call.
   */
  async analyzeFindings(
    opinions: Array<{ id?: string; agent?: string; role?: string; opinion: string }>,
    synthesis: string,
    userContext?: string,
    missionType?: string
  ): Promise<string> {
    const provider = await providerSelector.select({
      priority: 'cost',
      requirements: {}
    });
    const model = provider.defaultModel || 'default';

    const opinionText = opinions
      .map(o => `--- ${o.agent || o.role || o.id || 'Agent'} ---\n${o.opinion}`)
      .join('\n\n');

    const prompt = `You are a senior analytical synthesizer. You have received expert opinions from a ${missionType || 'multi-agent'} mission.

EXPERT OPINIONS:
${opinionText}

INITIAL SYNTHESIS:
${synthesis}
${userContext ? `\nADDITIONAL CONTEXT FROM USER:\n${userContext}` : ''}

Produce a conclusive analysis that goes meaningfully deeper than the initial synthesis. Specifically:
1. Identify the single most critical insight that the agents collectively surfaced
2. Surface any tensions or contradictions between the expert opinions and resolve them
3. Provide 3-5 concrete, prioritized next steps ordered by impact
4. Flag any blind spots or risks that none of the agents addressed

Be direct, specific, and actionable. Avoid restating the initial synthesis verbatim.`;

    logger.info(`[Orchestrator] Running analyzeFindings for missionType: ${missionType}`);
    const analysis = await provider.complete(
      [{ role: 'user', content: prompt }],
      { model }
    );
    return analysis;
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

    // 1. Intelligent Selection
    let provider;
    if (options.providerOverride) {
      // Use explicit override if provided
      provider = await pluginManager.resolveProvider(
        options.providerOverride,
        undefined,  // Use config default
        undefined   // No specific capabilities required
      );
    } else {
      // Use intelligent selection based on priority
      const priority = options.priority || 'cost'; // Default to saving money
      
      // Estimate token usage for cost calculation
      const inputTokens = goal.length * 2; // Rough estimation
      const outputTokens = 1000; // Estimated output length
      
      provider = await providerSelector.select({
        priority: priority as 'cost' | 'performance' | 'reliability',
        requirements: {
          minContext: undefined, // Determine from goal if needed
          supportsVision: goal.toLowerCase().includes('image') || goal.toLowerCase().includes('vision'),
          inputTokens,
          outputTokens
        }
      });
    }

    const model = options.modelOverride || provider.defaultModel || 'default';

    logger.info(`[Orchestrator] Using provider: ${provider.id}, model: ${model}`);

    try {
      // Phase 1: Parallel Agent Analysis
      const expertOpinions = await Promise.all(template.agents.map(async (agent) => {
        // Per-agent provider selection
        let agentProvider;
        if (agent.provider) {
          agentProvider = await pluginManager.resolveProvider(agent.provider);
        } else {
          // For agents, we can reuse the main provider or select based on agent specialty
          agentProvider = provider;
        }
        
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
      Output the synthesis followed by a 'VERIFICATION' section marking each invariant as PASSED or FAILED}.`;

      const synthesis = await provider.complete(
        [{ role: 'user', content: synthesisPrompt }],
        { model }
      );

      // 3. Success Telemetry
      await circuitBreaker.recordSuccess(provider.id);

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
    } catch (error) {
      // 4. Failure Telemetry
      await circuitBreaker.recordFailure(provider.id);
      
      // 5. Retry Logic (Simplified)
      logger.warn(`Provider ${provider.id} failed, retrying selection...`);
      
      // Re-throw the error to be handled by caller
      throw error;
    }
  }
}

export const orchestrationService = new OrchestrationService();