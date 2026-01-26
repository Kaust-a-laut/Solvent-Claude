import { IProviderPlugin } from '../../types/plugins';
import { ChatMessage, CompletionOptions } from '../../types/ai';
import { config } from '../../config';
import axios from 'axios';

export class GroqProviderPlugin implements IProviderPlugin {
  id = 'groq';
  name = 'Groq Cloud';
  description = 'Groq cloud-based AI provider';
  version = '1.0.0';
  defaultModel = 'llama-3.3-70b-versatile';

  private isInitialized = false;
  private apiKey: string | null = null;

  async initialize(options: Record<string, any>): Promise<void> {
    this.apiKey = options.apiKey || config.GROQ_API_KEY;
    if (!this.apiKey) {
      throw new Error('Groq API Key missing. Please provide it in settings or .env file.');
    }
    this.isInitialized = true;
  }

  isReady(): boolean {
    return this.isInitialized && !!this.apiKey;
  }

  async complete(messages: ChatMessage[], options: CompletionOptions): Promise<string> {
    if (!this.apiKey) {
      throw new Error('Groq provider not initialized or API key missing');
    }

    const { model, temperature = 0.7, maxTokens = 2048, apiKey } = options;
    const effectiveApiKey = apiKey || this.apiKey;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: model || this.defaultModel,
      messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
      temperature,
      max_tokens: maxTokens,
    }, {
      headers: {
        'Authorization': `Bearer ${effectiveApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.choices[0].message.content;
  }

  async *stream(messages: ChatMessage[], options: CompletionOptions): AsyncGenerator<string> {
    if (!this.apiKey) {
      throw new Error('Groq provider not initialized or API key missing');
    }

    const { model, temperature = 0.7, maxTokens = 2048, apiKey } = options;
    const effectiveApiKey = apiKey || this.apiKey;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: model || this.defaultModel,
      messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
      temperature,
      max_tokens: maxTokens,
      stream: true,
    }, {
      headers: {
        'Authorization': `Bearer ${effectiveApiKey}`,
        'Content-Type': 'application/json'
      },
      responseType: 'stream'
    });

    // Note: Actual streaming implementation would require parsing the stream response
    // For now, we'll return a simple completion
    const result = await this.complete(messages, options);
    yield result;
  }
}

// Export as default for dynamic loading
export default GroqProviderPlugin;