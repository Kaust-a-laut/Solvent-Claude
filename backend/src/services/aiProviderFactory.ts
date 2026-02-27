import { AIProvider, ChatMessage, CompletionOptions } from '../types/ai';
import { pluginManager } from './pluginManager';
import { logger } from '../utils/logger';

/**
 * Provider configuration for OpenAI-compatible providers.
 * Used for documentation and centralized configuration.
 */
export interface ProviderConfig {
  name: string;
  baseUrl: string;
  apiKeyEnvVar: string;
  defaultModel: string;
}

/**
 * Configuration map for OpenAI-compatible providers.
 * Centralized provider configuration to reduce duplication.
 */
export const OPENAI_COMPATIBLE_PROVIDERS: Record<string, ProviderConfig> = {
  groq: {
    name: 'groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnvVar: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile'
  },
  deepseek: {
    name: 'deepseek',
    baseUrl: 'https://api.deepseek.com',
    apiKeyEnvVar: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat'
  },
  openrouter: {
    name: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnvVar: 'OPENROUTER_API_KEY',
    defaultModel: 'google/gemini-2.0-flash-001:free'
  }
};

export class AIProviderFactory {
  static async getProvider(name: string): Promise<any> {
    const provider = await pluginManager.getProvider(name);
    if (!provider) {
      throw new Error(`Unsupported AI provider: ${name}. No plugin found.`);
    }

    if (!provider.isReady()) {
      logger.warn(`[AIProviderFactory] Provider ${name} is not ready`);
      throw new Error(`AI provider ${name} is not ready`);
    }

    return provider;
  }

  static async getAllProviders() {
    return pluginManager.getAllProviders();
  }
}
