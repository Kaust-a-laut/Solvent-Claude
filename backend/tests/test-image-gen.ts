
import { GeminiService } from './services/geminiService';
import { config } from './config';
import * as path from 'path';
import * as fs from 'fs';

async function testImageGen() {
  if (!config.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is not set in .env or config");
    return;
  }

  const service = new GeminiService();
  console.log("Attempting to generate image with model: gemini-2.5-flash-image");
  
  try {
    const result = await service.generateImage("A futuristic city on Mars, cinematic lighting, photorealistic", "gemini-2.5-flash-image");
    console.log("Image generation successful!");
    
    // Save to file to verify
    const outputDir = path.join(__dirname, '../generated_images_test');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    
    const filePath = path.join(outputDir, `test-image-${Date.now()}.png`);
    // result.base64 is base64 string
    const buffer = Buffer.from(result.base64, 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log(`Saved to ${filePath}`);
    
  } catch (error: any) {
    console.error("Error generating image:", error);
    if (error.response) {
       console.error("Response:", JSON.stringify(error.response, null, 2));
    }
  }
}

testImageGen();
