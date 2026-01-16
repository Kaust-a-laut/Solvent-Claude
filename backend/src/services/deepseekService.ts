import axios from 'axios';
import dotenv from 'dotenv';

export class DeepSeekService {
  private apiKey: string;
  private baseUrl: string = 'https://api.deepseek.com';

  constructor() {
    dotenv.config({ path: '/home/kaust/solvent-ai/.env' });
    this.apiKey = process.env.DEEPSEEK_API_KEY || '';
  }

  async generateChatCompletion(messages: any[], model: string, temperature: number = 0.7, maxTokens: number = 2048) {
    if (!this.apiKey) {
      throw new Error('DeepSeek API key not provided.');
    }

    try {
      const response = await axios.post(`${this.baseUrl}/chat/completions`, {
        model: model || 'deepseek-chat',
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature,
        max_tokens: maxTokens
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content;
    } catch (error: any) {
      console.error('DeepSeek Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error?.message || 'DeepSeek API call failed');
    }
  }
}
