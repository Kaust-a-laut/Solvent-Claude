import { config } from '../config';
import { BaseOpenAIService } from './baseOpenAIService';

export class GroqService extends BaseOpenAIService {
  readonly name = 'groq';
  protected baseUrl = 'https://api.groq.com/openai/v1';
  protected apiKey: string;
  protected defaultModel = 'llama-3.3-70b-versatile';

  constructor() {
    super();
    this.apiKey = config.GROQ_API_KEY || '';
  }
}
