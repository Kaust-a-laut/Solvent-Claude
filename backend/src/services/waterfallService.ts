import { AIProviderFactory } from './aiProviderFactory';
import { WATERFALL_CONFIG, MODELS } from '../constants/models';
import { AppError } from '../utils/AppError';
import { ResourceEstimator, ResourceEstimate } from '../utils/resourceEstimator';
import { SolventError, SolventErrorCode } from '../utils/errors';

export enum WaterfallStep {
  ARCHITECT = 'architect',
  REASONER = 'reasoner',
  EXECUTOR = 'executor',
  REVIEWER = 'reviewer'
}

export interface WaterfallProgressEvent {
  phase: string;
  data?: any;
  message?: string;
  estimate?: ResourceEstimate;
  score?: number;
  attempts?: number;
}

export interface WaterfallResult {
  architect: any;
  reasoner: any;
  executor: any;
  reviewer: any;
  attempts: number;
  history?: any[];
  status?: string;
  estimate?: ResourceEstimate;
}

export class WaterfallService {
  
  async runStep(step: WaterfallStep, input: string, context?: any, globalProvider: string = 'auto', signal?: AbortSignal) {
    if (signal?.aborted) throw new SolventError('Waterfall cancelled by user.', SolventErrorCode.OPERATION_CANCELLED);
    
    switch (step) {
      case WaterfallStep.ARCHITECT:
        return this.runArchitect(input, globalProvider, signal);
      case WaterfallStep.REASONER:
        return this.runReasoner(input, signal);
      case WaterfallStep.EXECUTOR:
        return this.runExecutor(input, context?.feedback, signal);
      case WaterfallStep.REVIEWER:
        if (!context?.plan) throw new SolventError('Reviewer requires the plan context.', SolventErrorCode.VALIDATION_ERROR);
        return this.runReview(context.plan, input, signal);
      default:
        throw new SolventError(`Unknown waterfall step: ${step}`, SolventErrorCode.VALIDATION_ERROR);
    }
  }

  async *runAgenticWaterfallGenerator(
    prompt: string, 
    globalProvider: string = 'auto', 
    maxRetries: number = 2, 
    notepadContent?: string, 
    openFiles?: any[], 
    signal?: AbortSignal, 
    forceProceed: boolean = false
  ): AsyncGenerator<WaterfallProgressEvent, WaterfallResult, void> {
    
    let fullPrompt = notepadContent 
      ? `MISSION CONTEXT / NOTES:
${notepadContent}

USER REQUEST:
${prompt}`
      : prompt;

    if (openFiles && openFiles.length > 0) {
      const filesContext = openFiles.map((f: any) => `FILE: ${f.path}

${f.content}

`).join('\n\n');
      fullPrompt = `[OPEN FILES CONTEXT]:
${filesContext}

${fullPrompt}`;
    }

    if (signal?.aborted) throw new SolventError('Waterfall cancelled by user.', SolventErrorCode.OPERATION_CANCELLED);

    yield { phase: 'architecting', message: 'Analyzing project requirements...' };
    const architect = await this.runStep(WaterfallStep.ARCHITECT, fullPrompt, null, globalProvider, signal);
    
    // --- RESOURCE GOVERNANCE GATE ---
    const estimate = ResourceEstimator.estimate(architect.complexity || 'medium', fullPrompt.length);
    if (!forceProceed && (estimate.riskLevel === 'high' || estimate.riskLevel === 'critical')) {
        yield { 
            phase: 'gated', 
            message: 'High resource usage detected. User confirmation required.',
            estimate 
        };
        // We must return a partial result here effectively pausing
        // The generator ends. The caller must handle resumption by restarting with forceProceed=true
        return { status: 'paused', estimate, architect } as any; 
    }
    // --------------------------------

    if (signal?.aborted) throw new SolventError('Waterfall cancelled by user.', SolventErrorCode.OPERATION_CANCELLED);

    yield { phase: 'reasoning', message: 'Formulating technical implementation plan...' };
    const reasoner = await this.runStep(WaterfallStep.REASONER, architect, null, globalProvider, signal);
    
    if (signal?.aborted) throw new SolventError('Waterfall cancelled by user.', SolventErrorCode.OPERATION_CANCELLED);

    yield { phase: 'executing', message: 'Generating production-ready code...' };
    let executor = await this.runStep(WaterfallStep.EXECUTOR, reasoner, null, globalProvider, signal);
    
    if (signal?.aborted) throw new SolventError('Waterfall cancelled by user.', SolventErrorCode.OPERATION_CANCELLED);

    yield { phase: 'reviewing', message: 'Senior Architect is auditing the code...', attempts: 1 };
    let reviewer = await this.runStep(WaterfallStep.REVIEWER, executor, { plan: reasoner }, globalProvider, signal);
    
    let attempts = 0;
    const history = [{ executor, reviewer }];

    while (reviewer.score < 80 && attempts < maxRetries) {
      if (signal?.aborted) throw new SolventError('Waterfall cancelled by user.', SolventErrorCode.OPERATION_CANCELLED);
      attempts++;
      yield { 
        phase: 'retrying', 
        message: `Score ${reviewer.score}/100 too low. Refining code (Attempt ${attempts})...`, 
        data: { issues: reviewer.issues, reviewer, attempt: attempts }
      };
      
      const feedback = `Previous attempt scored ${reviewer.score}/100. Issues: ${reviewer.issues.join(', ')}. Please fix these.`;
      executor = await this.runStep(WaterfallStep.EXECUTOR, reasoner, { feedback }, globalProvider, signal);
      
      yield { phase: 'reviewing', message: 'Reviewing refined code...', attempts: attempts + 1 };
      reviewer = await this.runStep(WaterfallStep.REVIEWER, executor, { plan: reasoner }, globalProvider, signal);
      
      history.push({ executor, reviewer });
    }

    yield { phase: 'completed', score: reviewer.score, data: { reviewer, attempts: attempts + 1 } };
    
    return {
      architect,
      reasoner,
      executor,
      reviewer,
      attempts: attempts + 1,
      history: history.length > 1 ? history : undefined
    };
  }

  // Wrapper for backward compatibility (AIController consumes this)
  // We will refactor AIController next to use the generator directly for streaming
  async runAgenticWaterfall(prompt: string, globalProvider: string = 'auto', maxRetries: number = 2, onProgress?: (phase: string, data?: any) => void, notepadContent?: string, openFiles?: any[], signal?: AbortSignal, forceProceed: boolean = false) {
    const generator = this.runAgenticWaterfallGenerator(prompt, globalProvider, maxRetries, notepadContent, openFiles, signal, forceProceed);
    
    while (true) {
      const { value, done } = await generator.next();
      if (done) {
        return value as WaterfallResult;
      }
      onProgress?.(value.phase, value.data || { message: value.message, estimate: value.estimate, score: value.score });
    }
  }

  // --- Private Steps (Architect, Reasoner, etc.) ---
  // (These methods are largely unchanged but use SolventError now)

  private async runArchitect(userPrompt: string, globalProvider: string, signal?: AbortSignal) {
    const config = WATERFALL_CONFIG.PHASE_1_ARCHITECT;
    const providerName = globalProvider === 'local' ? 'ollama' : 'gemini';
    const provider = await AIProviderFactory.getProvider(providerName);

    const prompt = [{
      role: 'user' as const,
      content: `Act as an AI Project Lead. Analyze requirements and output a structured plan in JSON.
      Requirements: ${userPrompt}
      
      Response MUST be a JSON object:
      {
        "logic": "detailed step-by-step implementation logic",
        "assumptions": ["list", "of", "assumptions"],
        "complexity": "low|medium|high"
      }`
    }];

    try {
      const response = await provider.generateChatCompletion(prompt, { 
        model: 'gemini-2.0-flash', 
        shouldSearch: false,
        jsonMode: true,
        signal
      });
      return this.parseJSONResponse(response);
    } catch (error: any) {
      if (signal?.aborted) throw error;
      const groq = await AIProviderFactory.getProvider('groq');
      try {
        const res = await groq.generateChatCompletion(prompt, { model: 'llama-3.3-70b-versatile', jsonMode: true, signal });
        return this.parseJSONResponse(res);
      } catch (e) {
        if (signal?.aborted) throw e;
        const localProvider = await AIProviderFactory.getProvider('ollama');
        const res = await localProvider.generateChatCompletion(prompt, { model: config.LOCAL, jsonMode: true, signal });
        return this.parseJSONResponse(res);
      }
    }
  }

  private async runReasoner(logicData: any, signal?: AbortSignal) {
    const gemini = await AIProviderFactory.getProvider('gemini');
    const logicStr = typeof logicData === 'string' ? logicData : JSON.stringify(logicData);
    
    const prompt = `Refine this implementation logic into a step-by-step technical plan. 
    Respond in JSON format:
    {
      "plan": "The refined technical plan",
      "steps": [{"title": "step title", "description": "step desc"}]
    }
    
    Logic: ${logicStr}`;

    const messages = [{ role: 'user' as const, content: prompt }];

    try {
      const response = await gemini.generateChatCompletion(messages, { model: 'gemini-2.0-flash', jsonMode: true, signal });
      return this.parseJSONResponse(response);
    } catch (error: any) {
      if (signal?.aborted) throw error;
      const groq = await AIProviderFactory.getProvider('groq');
      const fallback = await groq.generateChatCompletion(messages, { model: 'llama-3.1-8b-instant', jsonMode: true, signal });
      return this.parseJSONResponse(fallback);
    }
  }

  private async runExecutor(planData: any, feedback?: string, signal?: AbortSignal) {
    const groq = await AIProviderFactory.getProvider('groq');
    const planStr = typeof planData === 'string' ? planData : JSON.stringify(planData);
    
    let prompt = `Based on this technical plan, generate the final production-ready code.
    Respond in JSON format:
    {
      "code": "The complete source code",
      "explanation": "brief explanation",
      "files": ["list", "of", "files", "affected"]
    }
    
    Plan: ${planStr}`;

    if (feedback) {
      prompt += `

CRITICAL FEEDBACK FROM PREVIOUS ATTEMPT: ${feedback}
Please address these issues in your revised code.`;
    }

    const messages = [{ role: 'user' as const, content: prompt }];

    try {
      const response = await groq.generateChatCompletion(messages, { model: MODELS.GROQ.LLAMA_3_3_70B, jsonMode: true, signal });
      return this.parseJSONResponse(response);
    } catch (error: any) {
      if (signal?.aborted) throw error;
      const orProvider = await AIProviderFactory.getProvider('openrouter');
      try {
        const res = await orProvider.generateChatCompletion(messages, { model: MODELS.OPENROUTER.QWEN_CODER_32B, jsonMode: true, signal });
        return this.parseJSONResponse(res);
      } catch (err) {
        if (signal?.aborted) throw err;
        const localProvider = await AIProviderFactory.getProvider('ollama');
        const res = await localProvider.generateChatCompletion(messages, { model: 'qwen2.5-coder:7b', jsonMode: true, signal });
        return this.parseJSONResponse(res);
      }
    }
  }

  private async runReview(plan: any, executorData: any, signal?: AbortSignal) {
    const groq = await AIProviderFactory.getProvider('groq');
    
    let compilationStatus = "Not tested";
    if (executorData.code) {
      if (signal?.aborted) throw new SolventError('Waterfall cancelled by user.', SolventErrorCode.OPERATION_CANCELLED);
      try {
        const tempFile = `.temp_review_${Date.now()}.ts`;
        const { toolService } = require('./toolService');
        await toolService.executeTool('write_file', { path: tempFile, content: executorData.code });
        const check = await toolService.executeTool('run_shell', { command: `node --check ${tempFile}` });
        compilationStatus = check.stderr ? `Syntax Error: ${check.stderr}` : "Syntax Validated (node --check)";
        await toolService.executeTool('run_shell', { command: `rm ${tempFile}` });
      } catch (e: any) {
        compilationStatus = `Check Failed: ${e.message}`;
      }
    }

    const prompt = [{
      role: 'user' as const,
      content: `Perform a Senior Architect Review. Audit the code against the original plan.
      
      RUBRIC (100 pts total):
      1. Plan Compliance (40 pts): Does the code implement all requirements in the plan?
      2. Security (20 pts): Are there hardcoded secrets, injection risks, or unsafe imports?
      3. Efficiency (20 pts): Is the code performant and idiomatic? 
      4. Syntax/Compilation (20 pts): Does the code pass basic syntax checks? 
      
      [DEBUG DATA]:
      Compilation Status: ${compilationStatus}
      
      Plan: ${JSON.stringify(plan)}
      Code: ${JSON.stringify(executorData)}
      
      Respond in JSON format:
      {
        "score": (total points from rubric),
        "breakdown": {
          "syntax": (0-20),
          "security": (0-20),
          "logic": (0-40),
          "efficiency": (0-20)
        },
        "issues": ["list", "of", "issues"],
        "summary": "final verdict",
        "compilationStatus": "${compilationStatus}",
        "crystallizable_insight": "If score > 90, provide a concise, reusable architectural pattern or rule derived from this success. Otherwise null."
      }`
    }];

    try {
      const response = await groq.generateChatCompletion(prompt, { model: MODELS.GROQ.LLAMA_3_3_70B, jsonMode: true, signal });
      const parsed = this.parseJSONResponse(response);

      // --- AUTO-CRYSTALLIZATION ---
      // If the code is excellent, we save the "Secret Sauce" to long-term memory automatically.
      if (parsed.score > 90 && parsed.crystallizable_insight) {
        try {
          const { toolService } = require('./toolService');
          await toolService.executeTool('crystallize_memory', {
            content: parsed.crystallizable_insight,
            type: 'solution_pattern',
            tags: ['waterfall_success', 'high_fidelity_code']
          });
          console.log(`[Waterfall] Crystallized success pattern: ${parsed.crystallizable_insight}`);
        } catch (e) {
          console.error('[Waterfall] Failed to crystallize memory:', e);
        }
      }
      // ----------------------------

      return parsed;
    } catch (error: any) {
      if (signal?.aborted) throw error;
      const gemini = await AIProviderFactory.getProvider('gemini');
      try {
        const res = await gemini.generateChatCompletion(prompt, { model: 'gemini-2.0-flash', jsonMode: true, signal });
        return this.parseJSONResponse(res);
      } catch (e) {
        if (signal?.aborted) throw e;
        const localProvider = await AIProviderFactory.getProvider('ollama');
        const res = await localProvider.generateChatCompletion(prompt, { model: 'qwen2.5-coder:7b', jsonMode: true, signal });
        return this.parseJSONResponse(res);
      }
    }
  }

  private parseJSONResponse(response: string): any {
    try {
      let cleaned = response.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      cleaned = cleaned.replace(/```json/g, '').replace(/```/g, '').trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      const jsonToParse = jsonMatch ? jsonMatch[0] : cleaned;
      return JSON.parse(jsonToParse);
    } catch (e) {
      console.warn('[WaterfallService] Failed to parse JSON, returning raw string.');
      return { raw: response };
    }
  }
}
