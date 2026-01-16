import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateChatCompletion(messages: any[], modelName: string, shouldSearch: boolean) {
    const tools: any[] = [];
    if (shouldSearch) {
      tools.push({ googleSearch: {} });
    }

    const model = this.genAI.getGenerativeModel({ 
      model: modelName,
      tools
    });

    // Convert messages to Gemini format
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const chat = model.startChat({
      history,
    });

    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessage(lastMessage);
    const response = await result.response;
    return response.text();
  }

  async generateVisionContent(prompt: string, imageParts: any[], modelName: string) {
    const model = this.genAI.getGenerativeModel({ model: modelName || 'gemini-1.5-flash' });
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    return response.text();
  }
}
