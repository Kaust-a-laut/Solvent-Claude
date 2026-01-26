
import { aiService } from './services/aiService';
import * as path from 'path';
import * as fs from 'fs';

async function testAIServiceImageFallback() {
  console.log("Testing AIService.generateImage fallback logic...");
  
  const prompt = "A cyberpunk city at night with neon lights, high resolution";
  
  try {
    // This should trigger Gemini first, fail (due to quota), then hit Pollinations
    const result = await aiService.generateImage(prompt);
    console.log("Image generation result:", result);
    
    if (result.imageUrl) {
        console.log("SUCCESS: Image generated and saved.");
        if (result.info) {
            console.log("Info:", result.info);
        }
    } else {
        console.error("FAILED: No imageUrl in result.");
    }
  } catch (error: any) {
    console.error("Final Image Generation Error:", error.message);
  }
}

testAIServiceImageFallback();
