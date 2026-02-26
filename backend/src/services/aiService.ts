import { AIProviderFactory } from './aiProviderFactory';
import { WaterfallService } from './waterfallService';
import { contextService } from './contextService';
import { ChatRequestData, AIProvider } from '../types/ai';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { AppError, ErrorType } from '../utils/AppError';
import { GeminiService } from './geminiService';
import { searchService } from './searchService';
import { vectorService } from './vectorService';
import { pollinationsService } from './pollinationsService';
import { localImageService } from './localImageService';
import { huggingFaceService } from './huggingFaceService';
import { memoryConsolidationService } from './memoryConsolidationService';
import { logger } from '../utils/logger';
import { config, APP_CONSTANTS } from '../config';
import { telemetryService } from './telemetryService';
import { supervisorService } from './supervisorService';

export class AIService {
  private waterfallService = new WaterfallService();

  private normalizeMessages(messages: any[]) {
    return messages.map(m => ({
      ...m,
      role: m.role === 'model' ? 'assistant' : m.role
    }));
  }

  async performSearch(query: string) {
    return searchService.webSearch(query);
  }

  async processChat(data: ChatRequestData) {
    const startTime = Date.now();
    const { provider, model, image, mode, smartRouter, fallbackModel, temperature, maxTokens, apiKeys, thinkingModeEnabled, imageProvider } = data;
    
    try {
      const lastUserMessage = data.messages[data.messages.length - 1]?.content || "";

      // --- GUARDIAN ANGEL HOOK (Proactive Value) ---
      // Fire-and-forget: Check if this request violates any established rules or needs guidance.
      // We combine the user's prompt with the names of open files to give the Supervisor context.
      const contextFocus = `${lastUserMessage} ${data.openFiles ? data.openFiles.map(f => f.path).join(', ') : ''}`;
      supervisorService.provideGuidance(contextFocus).catch(err => {
        logger.warn(`[AIService] Guardian Angel check failed: ${err.message}`);
      });
      // ---------------------------------------------

      const isSmartRouterEnabled = smartRouter !== false;

      // 1. Detect Image Intent
      const imageKeywords = ['generate an image', 'create an image', 'draw', 'paint', 'make a picture', 'show me a picture', 'generate a picture', 'imagine', 'visualize', 'generate image', 'make image', 'render', 'create image'];
      const isExplicitIntent = /^(draw|imagine|visualize|generate|make|create)\b/i.test(lastUserMessage.trim().replace(/^(please|can you|could you|i want to|i need to|i'd like to)\s+/i, ''));
      const isImageIntent = imageKeywords.some(k => lastUserMessage.toLowerCase().includes(k)) || 
                           /\b(draw|generate|imagine|render|visualize|make|create)\b.*\b(image|picture|photo|graphic|art|sketch)\b/i.test(lastUserMessage) ||
                           isExplicitIntent;

      if (isImageIntent && (mode === 'vision' || isExplicitIntent)) {
        logger.info(`[AIService] Image intent detected: "${lastUserMessage}"`);
        try {
          const prompt = lastUserMessage.replace(/generate an image of|create an image of|draw|paint|make a picture of|show me a picture of|generate a picture of|create a picture of|imagine|render|visualize|generate image of|make image of|generate|draw|make|create|please|can you|could you|i want you to|i'd like you to/gi, '').trim() || lastUserMessage;
          logger.info(`[AIService] Cleaned image prompt: "${prompt}"`);
          const result = await this.generateImage(prompt, undefined, apiKeys?.gemini, imageProvider || 'auto', { apiKeys });
         
          telemetryService.logTransaction({
            id: uuidv4(),
            type: 'image',
            model: imageProvider || 'auto',
            provider: imageProvider || 'auto',
            latencyMs: Date.now() - startTime,
            status: 'success'
          });

          return {
            response: `I've generated the image for you: "${prompt}"`, 
            model: imageProvider === 'huggingface' ? 'Hugging Face' : imageProvider === 'local' ? 'Local Juggernaut' : 'Image Router',
            isGeneratedImage: true,
            imageUrl: result.imageUrl 
          };
        } catch (err: any) {
          logger.error(`[AIService] Inline image generation failed: ${err.message}`);
          throw new AppError(`Image generation failed: ${err.message}`, ErrorType.PROVIDER_FAILURE, 502);
        }
      }

      logger.info(`Processing chat request with provider: ${provider}, model: ${model}`);

      // 2. Enrich Context
      const { messages: enrichedMessages, provenance } = await contextService.enrichContext(data);
      const normalizedMessages = this.normalizeMessages(enrichedMessages);

      // 3. Inject Thinking Instructions
      let finalMessages = normalizedMessages;
      if (thinkingModeEnabled) {
        const thinkingInstruction = {
          role: 'system' as const,
          content: `[DEEP THINKING MODE ACTIVE]
          You MUST perform an exhaustive chain-of-thought analysis BEFORE providing your final answer.
          Output your internal reasoning process inside <thinking> tags.`
        };
        finalMessages = [thinkingInstruction, ...normalizedMessages];
      }

      // 4. Execution
      let responseData: any;
      if (provider === 'gemini') {
        responseData = await this.handleGeminiChat(finalMessages, model, image, mode, isSmartRouterEnabled, fallbackModel, temperature, maxTokens, apiKeys, data.openFiles);
      } else {
        try {
          const selectedProvider = await AIProviderFactory.getProvider(provider);
          const response = await selectedProvider.complete(finalMessages, {
            model,
            temperature,
            maxTokens,
            apiKey: apiKeys?.[provider]
          });
          responseData = { response, model };
        } catch (error: any) {
          console.warn(`${provider} failed, initiating fallback: ${error.message}`);
          responseData = await this.handleFallbacks(finalMessages, mode, fallbackModel, temperature, maxTokens, error, apiKeys, provider);
        }
      }

      // 5. Attach Provenance for UI
      if (responseData) {
        responseData.provenance = provenance;
      }

      // 6. Memory
      if (responseData && responseData.response && mode) {
        const allMessages = [...data.messages, { role: 'assistant', content: responseData.response }];
        memoryConsolidationService.consolidateSession(mode, allMessages as any).catch(e => logger.error('Memory sync failed', e));
        memoryConsolidationService.extractKnowledge(responseData.response).catch(() => {});
      }

      telemetryService.logTransaction({
        id: uuidv4(),
        type: 'chat',
        model: responseData.model || model,
        provider: provider,
        latencyMs: Date.now() - startTime,
        tokensOut: responseData.response?.length ? Math.ceil(responseData.response.length / 4) : 0,
        status: 'success'
      });

      return responseData;

    } catch (error: any) {
      telemetryService.logTransaction({
        id: uuidv4(),
        type: 'chat',
        model: model,
        provider: provider,
        latencyMs: Date.now() - startTime,
        status: 'error',
        error: error.message
      });
      throw error;
    }
  }

  // --- Helpers ---

  private async handleGeminiChat(messages: any[], model: string, image: any, mode: any, shouldSearch: boolean, fallbackModel: any, temp: any, maxTokens: any, apiKeys?: Record<string, string>, openFiles?: any[]) {
    const GEMINI_CHAIN = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    const modelChain = GEMINI_CHAIN.includes(model) ? [model, ...GEMINI_CHAIN.filter(m => m !== model)] : [model, ...GEMINI_CHAIN];
    const gemini = await AIProviderFactory.getProvider('gemini');

    try {
      const hasImage = image || messages.some(m => m.image);
      if (hasImage) {
        return this.handleVisionRequest(messages, image, model, temp, maxTokens, apiKeys?.gemini, openFiles);
      }

      for (const currentModel of modelChain) {
        try {
          const response = await gemini.complete(messages, {
            model: currentModel,
            shouldSearch,
            temperature: temp,
            maxTokens,
            apiKey: apiKeys?.gemini
          });
          return { response, model: currentModel };
        } catch (err: any) {
          console.warn(`Gemini ${currentModel} failed, trying next...`);
        }
      }
      throw new Error('Gemini chain exhausted.');
    } catch (e: any) {
      return this.handleFallbacks(messages, mode, fallbackModel, temp, maxTokens, e, apiKeys, 'gemini');
    }
  }

  private async handleVisionRequest(messages: any[], image: any, model: string, temp: any, maxTokens: any, apiKey?: string, openFiles?: any[]) {
    const gemini = await AIProviderFactory.getProvider('gemini');
    try {
      const targetImage = image || messages.find(m => m.image)?.image;
      if (!targetImage) throw AppError.validation('No image for vision mode.');
      const matches = targetImage.match(/^data:(.+);base64,(.+)$/);
      if (!matches) throw AppError.validation('Invalid image format.');

      const lastMessage = messages[messages.length - 1].content;
      const isCodeRequest = /code|build|implement|create|react|html|css|component/i.test(lastMessage);

      const response = await gemini.vision!(
        lastMessage,
        [{ data: matches[2], mimeType: matches[1] }],
        {
          model,
          temperature: temp,
          maxTokens,
          apiKey
        }
      );

      if (isCodeRequest) {
        console.log("[AIService] Vision-to-Code bridge triggered.");
        const waterfallResult = await this.runAgenticWaterfall(`Convert this UI analysis into production code: ${response}`, undefined, APP_CONSTANTS.WATERFALL.MAX_RETRIES, undefined, undefined, openFiles);
        return {
          response: `### Vision Analysis\n${response}\n\n### Generated Implementation\n${waterfallResult.executor.code}`,
          model,
          waterfall: waterfallResult
        };
      }

      return { response, model };
    } catch (error: any) {
      if (error instanceof AppError) throw error;
      throw AppError.provider(`Vision failed: ${error.message}`);
    }
  }

  private async handleFallbacks(messages: any[], mode: any, fallbackModel: any, temp: any, maxTokens: any, originalError: Error, apiKeys?: Record<string, string>, failedProvider?: string) {
    if (failedProvider !== 'groq') {
      try {
        const groq = await AIProviderFactory.getProvider('groq');
        const res = await groq.complete(messages, { model: 'llama-3.3-70b-versatile', temperature: temp, maxTokens, apiKey: apiKeys?.groq });
        return { response: res, model: 'llama-3.3-70b-versatile', info: 'Groq fallback' };
      } catch (e) {}
    }

    if (failedProvider !== 'openrouter') {
      try {
        const openRouter = await AIProviderFactory.getProvider('openrouter');
        const res = await openRouter.complete(messages, { model: 'google/gemini-2.0-flash-001:free', temperature: temp, maxTokens, apiKey: apiKeys?.openrouter });
        return { response: res, model: 'openrouter/gemini', info: 'OpenRouter fallback' };
      } catch (e) {}
    }

    try {
      const ollama = await AIProviderFactory.getProvider('ollama');
      const res = await ollama.complete(messages, { model: 'qwen2.5-coder:7b', temperature: temp, maxTokens, apiKey: apiKeys?.ollama });
      return { response: res, model: 'local/ollama', info: 'Local fallback' };
    } catch (e: any) {
       throw new AppError(`All providers failed. Last: ${e.message}`, ErrorType.PROVIDER_FAILURE, 502);
    }
  }

  async generateImage(prompt: string, model?: string, apiKey?: string, provider: string = 'auto', options: any = {}) {
    let targetProvider = provider;
    if (provider === 'auto') {
      // Prefer pollinations (free, no key) unless a HF key is explicitly configured
      targetProvider = (config.HUGGINGFACE_API_KEY || options.apiKeys?.huggingface) ? 'huggingface' : 'pollinations';
    }

    if (targetProvider === 'local') {
      const result = await localImageService.generateImage(prompt, { model, ...options });
      return this.saveImage(result.base64);
    }

    if (targetProvider === 'huggingface') {
      const hfKey = options.apiKeys?.huggingface || config.HUGGINGFACE_API_KEY;
      if (!hfKey) throw new AppError('Hugging Face API Token missing', ErrorType.VALIDATION, 400);
      const result = await huggingFaceService.generateImage(prompt, hfKey, model);
      return this.saveImage(result.base64, 'Hugging Face');
    }

    try {
      const gemini = await AIProviderFactory.getProvider('gemini');
      const geminiKey = options.apiKeys?.gemini || apiKey || config.GEMINI_API_KEY;
      if (!geminiKey) throw new Error('Gemini API key missing');
      // Note: Image generation might need to be handled differently in the plugin system
      // For now, we'll keep the direct call to geminiService for image generation
      const result = await gemini.complete([{role: 'user', content: `Generate an image with the prompt: ${prompt}`}], {
        model: model || 'imagen-3.0-generate-001',
        apiKey: geminiKey
      });
      return this.saveImage(result.base64);
    } catch (error: any) {
      try {
        const result = await pollinationsService.generateImage(prompt);
        return this.saveImage(result.base64, 'Pollinations.ai');
      } catch (pollError: any) {
        throw new AppError(`All image providers failed.`, ErrorType.PROVIDER_FAILURE, 502);
      }
    }
  }

  private async saveImage(base64: string, info?: string) {
    const fileName = `generated_${uuidv4()}.png`;
    const dir = path.join(__dirname, '../../generated_images');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), Buffer.from(base64, 'base64'));
    return { imageUrl: `/generated_images/${fileName}`, fileName, info };
  }

  async listAvailableModels() {
    const providers = await AIProviderFactory.getAllProviders();
    const models: Record<string, string[]> = {};

    for (const provider of providers) {
      // For now, return a default model for each provider
      // In a real implementation, providers would expose their available models
      models[provider.id] = [provider.defaultModel || 'default-model'];
    }

    return models;
  }

  async runAgenticWaterfall(prompt: string, globalProvider?: string, maxRetries: number = APP_CONSTANTS.WATERFALL.MAX_RETRIES, onProgress?: (phase: string, data?: any) => void, notepadContent?: string, openFiles?: any[], signal?: AbortSignal, forceProceed: boolean = false) {
    return this.waterfallService.runAgenticWaterfall(prompt, globalProvider, maxRetries, onProgress, notepadContent, openFiles, signal, forceProceed);
  }

  async runWaterfall(prompt: string, globalProvider?: string, signal?: AbortSignal) {
    return this.runAgenticWaterfall(prompt, globalProvider, undefined, undefined, undefined, undefined, signal);
  }

  async compareModels(messages: any[]) {
    return { gemini: 'Comparison not implemented', ollama: 'Comparison not implemented' };
  }

  async indexProject() {
    return vectorService.indexProject(process.cwd());
  }

  async deprecateMemory(id: string, reason: string) {
    return vectorService.deprecateEntry(id, reason);
  }

  async checkLocalImageStatus() {
    return localImageService.checkModelAvailability();
  }

  async checkHealth() {
    const providers = await AIProviderFactory.getAllProviders();
    const health: Record<string, any> = {};

    for (const provider of providers) {
      health[provider.id] = provider.isReady() ? 'connected' : 'disconnected';
    }

    // Also check Ollama separately if it's not a plugin
    health.ollama = await this.checkOllamaHealth();

    return {
      ...health,
      timestamp: new Date().toISOString()
    };
  }

  async getSessionContext() {
    // Value: Instantly orient the user when they return to the app.
    try {
      const recent = await vectorService.getRecentEntries(20);
      const consolidation = recent
        .filter(m => m.metadata.type === 'memory_consolidation' || m.metadata.type === 'meta_summary')
        .pop(); // Get the very latest one
      
      return consolidation ? consolidation.metadata.text : null;
    } catch (e) {
      return null;
    }
  }

  private async checkOllamaHealth(): Promise<'connected' | 'disconnected'> {
    try {
      const response = await fetch(`${config.OLLAMA_HOST}/api/version`);
      return response.ok ? 'connected' : 'disconnected';
    } catch (e) {
      return 'disconnected';
    }
  }
}

export const aiService = new AIService();
