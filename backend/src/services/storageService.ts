import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export class StorageService {
  private baseDir: string;
  private cacheDir: string;
  private tracesDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), '.solvent');
    this.cacheDir = path.join(this.baseDir, 'cache');
    this.tracesDir = path.join(this.baseDir, 'traces');
    this.init();
  }

  private async init() {
    await fs.mkdir(this.cacheDir, { recursive: true });
    await fs.mkdir(this.tracesDir, { recursive: true });
  }

  private getHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  async getCachedWaterfall(prompt: string, context: string = ''): Promise<any | null> {
    const hash = this.getHash(prompt + context);
    const cachePath = path.join(this.cacheDir, `${hash}.json`);
    try {
      const data = await fs.readFile(cachePath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  async cacheWaterfall(prompt: string, context: string, data: any) {
    const hash = this.getHash(prompt + context);
    const cachePath = path.join(this.cacheDir, `${hash}.json`);
    await fs.writeFile(cachePath, JSON.stringify(data, null, 2));
  }

  async saveTrace(data: any) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const traceId = `trace-${timestamp}-${crypto.randomBytes(4).toString('hex')}`;
    const tracePath = path.join(this.tracesDir, `${traceId}.json`);
    await fs.writeFile(tracePath, JSON.stringify({
        id: traceId,
        timestamp: new Date().toISOString(),
        ...data
    }, null, 2));
    return traceId;
  }
}

export const storageService = new StorageService();
