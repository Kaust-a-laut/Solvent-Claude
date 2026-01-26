import { IProviderPlugin } from '../../types/plugins';
import { ChatMessage, CompletionOptions } from '../../types/ai';
import { config } from '../../config';
import { Ollama } from 'ollama';

export class OllamaProviderPlugin implements IProviderPlugin {
  id = 'ollama';
  name = 'Ollama';
  description = 'Local Ollama AI provider';
  version = '1.0.0';
  defaultModel = 'qwen2.5-coder:7b';

  private client: Ollama | null = null;
  private isInitialized = false;

  async initialize(options: Record<string, any>): Promise<void> {
    const host = options.host || config.OLLAMA_HOST || 'http://127.0.0.1:11434';
    this.client = new Ollama({ host });
    this.isInitialized = true;
  }

  isReady(): boolean {
    return this.isInitialized && !!this.client;
  }

  async complete(messages: ChatMessage[], options: CompletionOptions): Promise<string> {
    if (!this.client) {
      throw new Error('Ollama provider not initialized');
    }

    const { model, temperature = 0.7, maxTokens = 2048 } = options;

    const response = await this.client.chat({
      model: model || this.defaultModel,
      messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
      options: {
        temperature,
        num_predict: maxTokens,
      }
    });

    return response.message.content;
  }

  async *stream(messages: ChatMessage[], options: CompletionOptions): AsyncGenerator<string> {
    if (!this.client) {
      throw new Error('Ollama provider not initialized');
    }

    const { model, temperature = 0.7, maxTokens = 2048 } = options;

    const response = await this.client.chat({
      model: model || this.defaultModel,
      messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
      options: {
        temperature,
        num_predict: maxTokens,
      },
      stream: true
    });

    for await (const chunk of response) {
      yield chunk.message.content;
    }
  }
}

// Export as default for dynamic loading
export default OllamaProviderPlugin;