import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

export class GeminiService {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateChatCompletion(messages: any[], modelName: string, shouldSearch: boolean, temperature: number = 0.7, maxTokens: number = 2048) {
    const tools: any[] = [];
    if (shouldSearch) {
      tools.push({ googleSearch: {} });
    }

    const model = this.genAI.getGenerativeModel({ 
      model: modelName,
      tools,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      }
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

  async generateImage(prompt: string, modelName: string = 'gemini-2.0-flash-exp') {
    const model = this.genAI.getGenerativeModel({ model: modelName });
    
    // Explicitly ask for image generation in the prompt if not already clear
    const fullPrompt = `Generate an image based on this description: ${prompt}. Return ONLY the image.`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    
    // In Gemini 2.0, images can be returned as parts in the response
    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find(part => part.inlineData);
    
    if (imagePart && imagePart.inlineData) {
      return {
        base64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType
      };
    }
    
    throw new Error('No image was generated in the response.');
  }

  async generateVisionContent(prompt: string, imageParts: any[], modelName: string, temperature: number = 0.7, maxTokens: number = 2048) {
    const model = this.genAI.getGenerativeModel({ 
      model: modelName || 'gemini-1.5-flash',
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      }
    });
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    return response.text();
  }
}
