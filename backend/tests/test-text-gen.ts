
import { GeminiService } from './services/geminiService';
import { config } from './config';

async function testTextGen() {
  if (!config.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set");
    return;
  }

  const service = new GeminiService();
  console.log("Testing text generation with gemini-2.0-flash-exp...");
  
  try {
    // Mock message
    const messages = [{ role: 'user', content: 'Hello, are you working?' }];
    const result = await service.generateChatCompletion(messages as any, { model: 'gemini-2.0-flash-exp' });
    console.log("Text generation result:", result);
  } catch (error: any) {
    console.error("Error generating text:", error);
  }
}

testTextGen();
