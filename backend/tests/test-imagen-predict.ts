
import { config } from './config';
import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

async function testImagenPredict() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    return;
  }

  const model = 'imagen-4.0-fast-generate-001'; // or imagen-4.0-generate-001
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${apiKey}`;

  console.log(`Testing ${model} via REST predict endpoint...`);

  const payload = {
    instances: [
      {
        prompt: "A futuristic city on Mars, cinematic lighting, photorealistic"
      }
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio: "1:1" // or "1:1", "16:9", etc.
    }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error ${response.status}: ${response.statusText}`);
        console.error("Details:", errorText);
        return;
    }

    const data: any = await response.json();
    console.log("Success!");
    
    // Check structure of response. Usually predictions[0].bytesBase64Encoded or similar
    if (data.predictions && data.predictions.length > 0) {
        const prediction = data.predictions[0];
        const b64 = prediction.bytesBase64Encoded || prediction.b64; // Check actual field
        
        if (b64) {
             const outputDir = path.join(__dirname, '../generated_images_test');
            if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
            
            const filePath = path.join(outputDir, `test-imagen-${Date.now()}.png`);
            const buffer = Buffer.from(b64, 'base64');
            fs.writeFileSync(filePath, buffer);
            console.log(`Saved to ${filePath}`);
        } else {
            console.log("No base64 data found in prediction:", JSON.stringify(prediction).substring(0, 200));
        }
    } else {
        console.log("No predictions found:", data);
    }

  } catch (error: any) {
    console.error("Fetch error:", error);
  }
}

testImagenPredict();
