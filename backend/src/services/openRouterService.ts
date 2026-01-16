import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

export class OpenRouterService {
  private apiKey: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1';

  constructor() {
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[OpenRouterService] Warning: OPENROUTER_API_KEY is not defined.');
    }
  }

  async generateChatCompletion(
    messages: any[], 
    model: string = 'qwen/qwen-2.5-coder-32b-instruct:free', 
    temperature: number = 0.7, 
    maxTokens: number = 2048
  ) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API Key missing');
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/chat/completions`,
        {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'HTTP-Referer': 'https://github.com/solvent-ai', // Placeholder
            'X-Title': 'Solvent AI Desktop',
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        content: response.data.choices[0].message.content,
        model: response.data.model,
        usage: response.data.usage
      };
    } catch (error: any) {
      console.error('[OpenRouter] API Request Failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'OpenRouter API failed');
    }
  }
}
