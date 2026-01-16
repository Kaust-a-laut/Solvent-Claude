import ollama from 'ollama';

export class OllamaService {
  async generateChatCompletion(model: string, messages: any[], temperature: number = 0.7, maxTokens: number = 2048) {
    const response = await ollama.chat({
      model,
      messages: messages.map(m => {
        const msg: any = { role: m.role, content: m.content };
        if (m.image) {
          // Extract base64 from data URL
          const matches = m.image.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            msg.images = [matches[2]];
          }
        }
        return msg;
      }),
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

  async *generateChatStream(model: string, messages: any[], temperature: number = 0.7, maxTokens: number = 2048) {
    const response = await ollama.chat({
      model,
      messages: messages.map(m => {
        const msg: any = { role: m.role, content: m.content };
        if (m.image) {
          // Extract base64 from data URL
          const matches = m.image.match(/^data:(.+);base64,(.+)$/);
          if (matches) {
            msg.images = [matches[2]];
          }
        }
        return msg;
      }),
      stream: true,
      options: {
        temperature,
        num_predict: maxTokens
      }
    });

    for await (const part of response) {
      yield part.message.content;
    }
  }
}