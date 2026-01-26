import crypto from 'crypto';
import { IStorageProvider, FileStorageProvider } from './storageProvider';

export class StorageService {
  private provider: IStorageProvider;

  constructor(provider?: IStorageProvider) {
    // Default to FileStorageProvider, but can be injected with RedisProvider, etc.
    this.provider = provider || new FileStorageProvider();
  }

  private getHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async getCachedWaterfall(prompt: string, context: string = ''): Promise<any | null> {
    const key = this.getHash(prompt + context);
    return this.provider.get(key);
  }

  async cacheWaterfall(prompt: string, context: string, data: any) {
    const key = this.getHash(prompt + context);
    await this.provider.set(key, data);
  }

  async saveTrace(data: any) {
    return this.provider.saveTrace(data);
  }
}

export const storageService = new StorageService();