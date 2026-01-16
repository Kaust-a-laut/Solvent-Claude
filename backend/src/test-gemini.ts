import { GeminiService } from './services/geminiService';

async function test() {
  console.log("Testing Gemini Service...");
  const service = new GeminiService();
  
  const models = ['gemini-3-pro-preview', 'gemini-2.0-flash', 'gemini-flash-latest'];

  for (const modelName of models) {
    console.log(`\nTesting model: ${modelName}`);
    try {
      const response = await service.generateChatCompletion(
        [{ role: 'user', content: 'Hello' }],
        modelName, 
        false
      );
      console.log(`Success (${modelName}):`, response);
      return; // Stop on first success
    } catch (error: any) {
      console.error(`Failed (${modelName}):`, error.message);
    }
  }
}

test();