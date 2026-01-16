import ollama from 'ollama';

export class OllamaService {
  async generateChatCompletion(model: string, messages: any[], temperature: number = 0.7, maxTokens: number = 2048) {
    const response = await ollama.chat({
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      stream: false,
      options: {
        temperature,
        num_predict: maxTokens
      }
    });
    return response;
  }

  async listModels() {
    return await ollama.list();
  }
}
