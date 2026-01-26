
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

async function testPollinations() {
  const prompt = "A futuristic city on Mars, cinematic lighting, photorealistic";
  // Encode prompt
  const encodedPrompt = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}`;

  console.log(`Testing Pollinations.ai with URL: ${url}`);

  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    
    if (response.status === 200) {
        const outputDir = path.join(__dirname, '../generated_images_test');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        
        const filePath = path.join(outputDir, `test-pollinations-${Date.now()}.jpg`);
        fs.writeFileSync(filePath, response.data);
        console.log(`Success! Saved to ${filePath}`);
    } else {
        console.error(`Error: Status ${response.status}`);
    }

  } catch (error: any) {
    console.error("Error fetching from Pollinations:", error.message);
  }
}

testPollinations();
