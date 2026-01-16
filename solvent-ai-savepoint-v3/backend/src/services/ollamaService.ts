import ollama from 'ollama';

export class OllamaService {
  async generateChatCompletion(model: string, messages: any[]) {
    const response = await ollama.chat({
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      stream: false
    });
    return response;
  }

  async listModels() {
    return await ollama.list();
  }
}
