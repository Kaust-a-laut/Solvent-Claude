import { GeminiService } from './geminiService';
import { OllamaService } from './ollamaService';
import { OpenRouterService } from './openRouterService';

export class WaterfallService {
  private geminiService: GeminiService;
  private ollamaService: OllamaService;
  private openRouterService: OpenRouterService;

  constructor() {
    this.geminiService = new GeminiService();
    this.ollamaService = new OllamaService();
    this.openRouterService = new OpenRouterService();
  }

  async runWaterfallPipeline(userPrompt: string, globalProvider: string = 'auto') {
    console.log('[Waterfall] Pipeline Initiated. Global Provider:', globalProvider);
    
    let architectResponse: string;

    if (globalProvider === 'local') {
      console.log('[Waterfall] Phase 1: Architect (Local: DeepSeek-R1)');
      const res = await this.ollamaService.generateChatCompletion('deepseek-r1:8b', [
        { 
          role: 'user', 
          content: `Act as an AI Project Lead. Analyze requirements and output a detailed LOGIC block.
          Requirements: ${userPrompt}
          Format: ### 🧠 LOGIC\n[Plan]`
        }
      ]);
      architectResponse = res.message.content;
    } else {
      console.log('[Waterfall] Phase 1: Architect (Cloud: Gemini 2.0 Flash)');
      const architectPrompt = [
        {
          role: 'user',
          content: `Act as an AI Project Lead. Analyze the following requirements and output a detailed LOGIC block for implementation.
          
          Requirements: ${userPrompt}
          
          Output format:
          ### 🧠 LOGIC
          [Your technical logic and step-by-step plan here]`
        }
      ];
      try {
        architectResponse = await this.geminiService.generateChatCompletion(architectPrompt, 'gemini-2.0-flash', false);
      } catch (error: any) {
        console.warn(`[Waterfall] Phase 1: Gemini Failed (${error.message}). Falling back to Local (DeepSeek-R1).`);
        const res = await this.ollamaService.generateChatCompletion('deepseek-r1:8b', architectPrompt);
        architectResponse = res.message.content;
      }
    }
    
    // Extract Logic Block
    const logicMatch = architectResponse.match(/### 🧠 LOGIC([\s\S]*)/);
    const logicBlock = logicMatch ? logicMatch[1].trim() : architectResponse;

    console.log('[Waterfall] Phase 2: Reasoner (Cloud: DeepSeek R1)');
    const reasonerPrompt = `Refine this implementation logic into a step-by-step technical plan: 

 ${logicBlock}`;
    
    let refinedPlan;
    try {
        const reasonerResponse = await this.openRouterService.generateChatCompletion([
          { role: 'user', content: reasonerPrompt }
        ], 'deepseek/deepseek-r1:free');
        refinedPlan = reasonerResponse.content;
    } catch (error: any) {
        console.warn(`[Waterfall] Phase 2: OpenRouter Failed (${error.message}). Falling back to Local (DeepSeek-R1).`);
        try {
          const res = await this.ollamaService.generateChatCompletion('deepseek-r1:8b', [
            { role: 'user', content: reasonerPrompt }
          ]);
          refinedPlan = res.message.content;
        } catch (ollamaErr) {
          console.warn(`[Waterfall] Phase 2: Local Failed. Final fallback to Gemini.`);
          refinedPlan = await this.geminiService.generateChatCompletion([
              { role: 'user', content: `[SYSTEM: DEEP REASONING] You are acting as a reasoning engine. ${reasonerPrompt}` }
          ], 'gemini-2.0-flash', false);
        }
    }

    console.log('[Waterfall] Phase 3: Executor (Cloud: Qwen-Coder-32B)');
    const executorPrompt = `Based on this technical plan, generate the final production-ready code. Ensure the code is complete and follows best practices.

 Plan:
 ${refinedPlan}`;
    
    let generatedCode;
    try {
        const executorResponse = await this.openRouterService.generateChatCompletion(
          [{ role: 'user', content: executorPrompt }],
          'qwen/qwen-2.5-coder-32b-instruct:free'
        );
        generatedCode = executorResponse.content;
    } catch (error: any) {
        console.warn(`[Waterfall] Phase 3: OpenRouter Failed (${error.message}). Falling back to Local (Qwen-Coder).`);
        try {
          const executorResponse = await this.ollamaService.generateChatCompletion('qwen2.5-coder:7b', [
            { role: 'user', content: executorPrompt }
          ]);
          generatedCode = executorResponse.message.content;
        } catch (ollamaErr: any) {
          console.warn(`[Waterfall] Phase 3: Local Failed (${ollamaErr.message}). Final fallback to Cloud (Gemini).`);
          generatedCode = await this.geminiService.generateChatCompletion([
              { role: 'user', content: `[SYSTEM: CODE GENERATION] You are an expert software architect. ${executorPrompt}` }
          ], 'gemini-3-pro-preview', false);
        }
    }

    console.log('[Waterfall] Phase 4: Senior Review (Gemini)');
    const reviewPrompt = [
      {
        role: 'user',
        content: `Perform a Senior Architect Review on the following code. 
        Plan: ${refinedPlan}
        Code: ${generatedCode}
        
        Check for:
        1. Security vulnerabilities.
        2. Performance bottlenecks.
        3. Alignment with the original plan.
        
        Provide a concise diagnostic report.`
      }
    ];

    let reviewResponse;
    try {
        reviewResponse = await this.geminiService.generateChatCompletion(reviewPrompt, 'gemini-3-pro-preview', false);
    } catch (error: any) {
        console.warn(`[Waterfall] Phase 4: Gemini Failed (${error.message}). Falling back to Local (Qwen-Coder).`);
        const res = await this.ollamaService.generateChatCompletion('qwen2.5-coder:7b', reviewPrompt);
        reviewResponse = res.message.content;
    }

    return {
      architect: architectResponse,
      reasoner: refinedPlan,
      executor: generatedCode,
      review: reviewResponse
    };
  }
}
