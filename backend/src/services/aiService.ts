import { GeminiService } from './geminiService';
import { OllamaService } from './ollamaService';
import { OpenRouterService } from './openRouterService';
import { SearchService } from './searchService';
import { DeepSeekService } from './deepseekService';
import { WaterfallService } from './waterfallService';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

export class AIService {
  private geminiService = new GeminiService();
  private ollamaService = new OllamaService();
  private openRouterService = new OpenRouterService();
  private searchService = new SearchService();
  private deepseekService = new DeepSeekService();
  private waterfallService = new WaterfallService();

  async processChat(data: any) {
    const { provider, model, messages, image, mode, smartRouter, fallbackModel, temperature, maxTokens, deviceInfo, notepadContent } = data;
    const isSmartRouterEnabled = smartRouter !== false;
    let lastMessage = messages[messages.length - 1].content;

    // 1. Mode Pre-processing
    if (mode === 'browser' || mode === 'scholarly') {
      lastMessage = await this.enrichWithSearch(lastMessage, mode);
    } else if (mode === 'deep_thought') {
      lastMessage = `[SYSTEM: DEEP THOUGHT] Reasoning inside <thinking> tags.

User: ${lastMessage}`;
    } else if (mode === 'analysis') {
      lastMessage = `[SYSTEM: ANALYSIS] Provide knowledge graph <graph_data>{...}</graph_data>

User: ${lastMessage}`;
    }

    let globalFormatting = `[SYSTEM: FORMATTING] Use Bold for key concepts. Double space sections.

`;

    if (notepadContent) {
      globalFormatting += `[SYSTEM: NOTEPAD]
Current User Notes:
"""
${notepadContent}
"""
You can see these notes and use them for context. If you need to update or add to these notes, wrap the ENTIRE new content of the notepad in <update_notepad>...</update_notepad> tags at the end of your response.

`;
    }

    if (deviceInfo) {
      const deviceType = deviceInfo.isMobile ? 'Mobile' : (deviceInfo.isTablet ? 'Tablet' : 'Desktop');
      globalFormatting += `[SYSTEM: ENVIRONMENT] User is on ${deviceType} (${deviceInfo.windowSize.width}x${deviceInfo.windowSize.height}). Optimize output for this screen size.

`;
    }

    lastMessage = globalFormatting + lastMessage;
    const updatedMessages = [...messages];
    updatedMessages[updatedMessages.length - 1].content = lastMessage;

    // 2. Execution with Fallback Logic
    if (provider === 'gemini') {
      return this.handleGeminiChat(updatedMessages, model, image, mode, isSmartRouterEnabled, fallbackModel, temperature, maxTokens);
    } else if (provider === 'ollama') {
      const response = await this.ollamaService.generateChatCompletion(model, updatedMessages, temperature, maxTokens);
      return { response: response.message.content, model };
    } else if (provider === 'deepseek') {
      const response = await this.deepseekService.generateChatCompletion(updatedMessages, model, temperature, maxTokens);
      return { response, model };
    } else if (provider === 'openrouter') {
      const response = await this.openRouterService.generateChatCompletion(updatedMessages, model, temperature, maxTokens);
      return { response: response.content, model };
    }
    
    throw new Error(`Unsupported provider: ${provider}`);
  }

  private async enrichWithSearch(query: string, mode: string) {
    try {
      const results = await this.searchService.search(query);
      if (results.length === 0) return query;
      const context = results.map(r => `[${r.source}] ${r.title}: ${r.snippet}`).join('\n\n');
      const systemPrompt = mode === 'scholarly' ? "[SYSTEM: RESEARCH]" : "[SYSTEM: WEB]";
      return `${systemPrompt}\n\nContext:\n${context}\n\nQuery: ${query}`;
    } catch (e) {
      console.warn("Search enrichment failed:", e);
      return query;
    }
  }

  private async handleGeminiChat(messages: any[], model: string, image: any, mode: any, shouldSearch: boolean, fallbackModel: any, temp: any, maxTokens: any) {
    const GEMINI_CHAIN = ['gemini-2.0-flash', 'gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-flash-latest'];
    const modelChain = GEMINI_CHAIN.includes(model) ? [model, ...GEMINI_CHAIN.filter(m => m !== model)] : [model, ...GEMINI_CHAIN];

    // Check if the prompt is likely code-related to prioritize coder model
    const lastMessage = messages[messages.length - 1].content.toLowerCase();
    const isCodeRequest = lastMessage.includes('code') || lastMessage.includes('function') || lastMessage.includes('implement') || lastMessage.includes('typescript') || lastMessage.includes('javascript');

    try {
      if (image || mode === 'vision') {
        const targetImage = image || messages.find(m => m.image)?.image;
        if (!targetImage) throw new Error('No image for vision mode.');
        const matches = targetImage.match(/^data:(.+);base64,(.+)$/);
        if (!matches) throw new Error('Invalid image format.');
        const response = await this.geminiService.generateVisionContent(messages[messages.length - 1].content, [{ inlineData: { data: matches[2], mimeType: matches[1] } }], model, temp, maxTokens);
        return { response, model };
      }

      // If it's a code request and Gemini is not explicitly requested, we could consider OpenRouter first, 
      // but user said "default for coding suite".
      
      for (const currentModel of modelChain) {
        try {
          const response = await this.geminiService.generateChatCompletion(messages, currentModel, shouldSearch, temp, maxTokens);
          return { response, model: currentModel };
        } catch (err) {
          console.warn(`Gemini ${currentModel} failed:`, err);
        }
      }
      throw new Error('Gemini chain exhausted.');
    } catch (e: any) {
      console.error("Gemini failed, initiating fallback protocols:", e.message);
      
      // 1. Try OpenRouter (Free Cloud Fallbacks)
      const freeModels = [
        'google/gemini-2.0-flash-001:free',
        'qwen/qwen-2.5-coder-32b-instruct:free',
        'deepseek/deepseek-r1:free',
        'qwen/qwen3-next-80b-a3b-instruct:free'
      ];

      for (const freeModel of freeModels) {
        try {
          console.log(`Attempting OpenRouter fallback (${freeModel})...`);
          const orResponse = await this.openRouterService.generateChatCompletion(messages, freeModel, temp, maxTokens);
          return { response: orResponse.content, model: orResponse.model, info: `OpenRouter ${freeModel} fallback engaged.` };
        } catch (orError: any) {
          console.warn(`OpenRouter ${freeModel} fallback failed:`, orError.message);
        }
      }
      
      // 2. Try Local Ollama (Hardware Fallback)
      try {
         console.log("Attempting Local Ollama fallback...");
         const localModel = fallbackModel || (mode === 'vision' ? 'llama3.2-vision' : 'qwen2.5-coder:7b');
         const response = await this.ollamaService.generateChatCompletion(localModel, messages, temp, maxTokens);
         return { response: response.message.content, model: localModel, info: 'Local fallback engaged.' };
      } catch (ollamaError: any) {
         throw new Error(`All providers exhausted. Gemini: ${e.message}, OpenRouter fallbacks failed, Ollama: ${ollamaError.message}`);
      }
    }
  }

  async generateImage(prompt: string, model?: string, host?: string, protocol?: string) {
    const result = await this.geminiService.generateImage(prompt, model || 'gemini-3-flash-preview');
    const fileName = `generated_${uuidv4()}.png`;
    const dir = path.join(__dirname, '../../generated_images');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), Buffer.from(result.base64, 'base64'));
    return { imageUrl: `/generated_images/${fileName}`, fileName };
  }

  async compareModels(messages: any[]) {
    const [geminiRes, ollamaRes] = await Promise.allSettled([
      this.geminiService.generateChatCompletion(messages, 'gemini-3-flash-preview', false),
      this.ollamaService.generateChatCompletion('qwen2.5:3b', messages)
    ]);
    return {
      gemini: geminiRes.status === 'fulfilled' ? geminiRes.value : 'Gemini error.',
      ollama: ollamaRes.status === 'fulfilled' ? (ollamaRes.value as any).message.content : 'Ollama error.'
    };
  }

  async listAvailableModels() {
    let ollamaModels: any = { models: [] };
    try { ollamaModels = await this.ollamaService.listModels(); } catch (e) {}
    return {
      ollama: ollamaModels.models || [],
      gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
      deepseek: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
      openrouter: [
        'qwen/qwen-2.5-coder-32b-instruct:free', 
        'google/gemini-2.0-flash-001:free', 
        'deepseek/deepseek-r1:free',
        'qwen/qwen3-next-80b-a3b-instruct:free',
        'microsoft/phi-3-medium-128k-instruct:free',
        'meta-llama/llama-3.1-8b-instruct:free'
      ]
    };
  }

  async runWaterfall(prompt: string, globalProvider?: string) {
    return this.waterfallService.runWaterfallPipeline(prompt, globalProvider);
  }
}

export const aiService = new AIService();
