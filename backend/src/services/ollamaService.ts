import ollama from 'ollama';
import { AIProvider, ChatMessage, CompletionOptions } from '../types/ai';
import { normalizeMessagesForOllama } from '../utils/messageUtils';

export class OllamaService implements AIProvider {
  readonly name = 'ollama';

  async generateChatCompletion(messages: ChatMessage[], options: CompletionOptions): Promise<string> {
    const normalizedMessages = normalizeMessagesForOllama(messages);
    
    const response = await ollama.chat({
      model: options.model,
      messages: normalizedMessages,
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
    const normalizedMessages = normalizeMessagesForOllama(messages);
    
    const response = await ollama.chat({
      model: options.model,
      messages: normalizedMessages,
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
