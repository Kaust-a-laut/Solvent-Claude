import { GeminiService } from './services/geminiService';

async function test() {
  console.log("Testing Gemini Service...");
  const service = new GeminiService();
  
  const models = [
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash'
  ];

  for (const modelName of models) {
    console.log(`\nTesting model: ${modelName}`);
    try {
      const response = await service.generateChatCompletion(
        [{ role: 'user', content: 'Hello' }],
        { model: modelName, shouldSearch: false }
      );
      console.log(`Success (${modelName}):`, response);
    } catch (error: any) {
      console.error(`Failed (${modelName}):`, error.message);
    }
  }
}

test();