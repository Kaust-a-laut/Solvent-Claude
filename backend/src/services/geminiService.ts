import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { AIProvider, ChatMessage, CompletionOptions } from '../types/ai';
import { toolService } from './toolService';
import { getGeminiTools } from '../constants/tools';
import { logger } from '../utils/logger';
import { extractImageFromDataUrl, normalizeMessagesForGemini } from '../utils/messageUtils';

export class GeminiService implements AIProvider {
  readonly name = 'gemini';
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (config.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
    }
  }

  private getGenAI(apiKey?: string): GoogleGenerativeAI {
    if (apiKey) return new GoogleGenerativeAI(apiKey);
    if (this.genAI) return this.genAI;
    throw new Error('Gemini API Key missing. Please provide it in settings or .env file.');
  }

  private getToolDefinitions() {
    return getGeminiTools();
  }

  async generateChatCompletion(messages: ChatMessage[], options: CompletionOptions): Promise<string> {
    const { model: modelName, shouldSearch, temperature = 0.7, maxTokens = 2048, apiKey } = options;

    const genAI = this.getGenAI(apiKey);
    const tools: any[] = this.getToolDefinitions();

    const modelConfig: any = {
      model: modelName,
      tools,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        ...(options.jsonMode ? { responseMimeType: 'application/json' } : {})
      }
    };

    const model = genAI.getGenerativeModel(modelConfig);

    // Use shared message normalization
    const history = normalizeMessagesForGemini(messages.slice(0, -1));
    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1].content;

    try {
      let result = await chat.sendMessage(lastMessage);
      let response = await result.response;
      let call = response.candidates?.[0]?.content?.parts?.find(p => p.functionCall);

      // Handle Tool Calls (Recursive)
      while (call && call.functionCall) {
        const toolResult = await toolService.executeTool(call.functionCall.name, call.functionCall.args);

        let messagePart: any = {
          functionResponse: {
            name: call.functionCall.name,
            response: { content: toolResult }
          }
        };

        // If it was a UI capture, inject the image into the next turn for visual reasoning
        if (call.functionCall.name === 'capture_ui' && toolResult.base64) {
          const imageInfo = extractImageFromDataUrl(toolResult.base64);
          if (imageInfo) {
            messagePart = [
              messagePart,
              {
                inlineData: {
                  data: imageInfo.data,
                  mimeType: imageInfo.mimeType
                }
              },
              { text: "Above is the screenshot I just captured. Analyze it to verify the UI state." }
            ];
          }
        }

        result = await chat.sendMessage(Array.isArray(messagePart) ? messagePart : [messagePart]);
        response = await result.response;
        call = response.candidates?.[0]?.content?.parts?.find(p => p.functionCall);
      }

      return response.text();
    } catch (error: any) {
      console.error(`[GeminiService] Error:`, error);
      throw error;
    }
  }

  async *generateChatStream(messages: ChatMessage[], options: CompletionOptions): AsyncGenerator<string> {
    const { model: modelName, shouldSearch, temperature = 0.7, maxTokens = 2048 } = options;

    const genAI = this.getGenAI();
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      }
    });

    // Use shared message normalization
    const history = normalizeMessagesForGemini(messages.slice(0, -1));
    const chat = model.startChat({ history });
    const lastMessage = messages[messages.length - 1].content;
    const result = await chat.sendMessageStream(lastMessage);

    for await (const chunk of result.stream) {
      yield chunk.text();
    }
  }

  async generateVisionContent(prompt: string, imageParts: any[], options?: any) {
    const { model: modelName, temperature = 0.7, maxTokens = 2048, apiKey } = options || {};
    const genAI = this.getGenAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName || 'gemini-2.0-flash',
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      }
    });
    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    return response.text();
  }

  vision = this.generateVisionContent;

  async generateImage(prompt: string, modelName: string = 'imagen-3.0-generate-001', apiKey?: string) {
    const genAI = this.getGenAI(apiKey);
    logger.info(`[Gemini] Requesting image generation with model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const parts = response.candidates?.[0]?.content?.parts;
    const imagePart = parts?.find(part => part.inlineData);

    if (imagePart && imagePart.inlineData) {
      logger.info(`[Gemini] Image generated successfully. MIME: ${imagePart.inlineData.mimeType}`);
      return {
        base64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType
      };
    }
    logger.error(`[Gemini] Image generation failed. Response parts: ${JSON.stringify(parts)}`);
    throw new Error('Image generation failed or model not supported. Ensure you have access to Imagen 3 API.');
  }
}
