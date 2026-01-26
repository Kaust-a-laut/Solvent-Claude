import ollama from 'ollama';
import { AIProvider, ChatMessage, CompletionOptions } from '../types/ai';

export class OllamaService implements AIProvider {
  readonly name = 'ollama';

  async generateChatCompletion(messages: ChatMessage[], options: CompletionOptions): Promise<string> {
    const response = await ollama.chat({
      model: options.model,
      messages: messages.map(m => {
        const msg: any = { role: m.role, content: m.content };
        if (m.image) {
          const matches = m.image.match(/^data:(.+);base64,(.+)$/);
          if (matches) msg.images = [matches[2]];
        }
        return msg;
      }),
      stream: false,
      options: {
        temperature: options.temperature,
        num_predict: options.maxTokens
      }
    });
    return response.message.content;
  }

  async listModels() {
    return await ollama.list();
  }

  async *generateChatStream(messages: ChatMessage[], options: CompletionOptions): AsyncGenerator<string> {
    const response = await ollama.chat({
      model: options.model,
      messages: messages.map(m => {
        const msg: any = { role: m.role, content: m.content };
        if (m.image) {
          const matches = m.image.match(/^data:(.+);base64,(.+)$/);
          if (matches) msg.images = [matches[2]];
        }
        return msg;
      }),
      stream: true,
      options: {
        temperature: options.temperature,
        num_predict: options.maxTokens
      }
    });

    for await (const part of response) {
      yield part.message.content;
    }
  }
}