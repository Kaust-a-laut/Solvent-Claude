import { AIProvider } from '../types/ai';
import { pluginManager } from './pluginManager';
import { logger } from '../utils/logger';

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
