import { config } from '../config';
import { BaseOpenAIService } from './baseOpenAIService';

export class DeepSeekService extends BaseOpenAIService {
  readonly name = 'deepseek';
  protected baseUrl = 'https://api.deepseek.com';
  protected apiKey: string;
  public defaultModel = 'deepseek-chat';

  constructor() {
    super();
    this.apiKey = config.DEEPSEEK_API_KEY || '';
  }
}