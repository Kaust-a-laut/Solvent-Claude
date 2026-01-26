import dotenv from 'dotenv';
import path from 'path';
import { BaseOpenAIService } from './baseOpenAIService';

export class OpenRouterService extends BaseOpenAIService {
  readonly name = 'openrouter';
  protected baseUrl = 'https://openrouter.ai/api/v1';
  protected apiKey: string;
  protected defaultModel = 'qwen/qwen-2.5-coder-32b-instruct:free';

  constructor() {
    super();
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
  }

  protected getExtraHeaders() {
    return {
      'HTTP-Referer': 'https://github.com/solvent-ai',
      'X-Title': 'Solvent AI Desktop',
    };
  }
}
