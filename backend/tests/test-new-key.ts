import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

async function testKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Testing key ending in:', apiKey?.slice(-4));
  
  if (!apiKey) {
    console.error('No API key found in .env');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  try {
    const result = await model.generateContent('Hi');
    console.log('Success! Response:', result.response.text());
  } catch (error: any) {
    console.error('API Error details:');
    if (error.status) console.error('Status:', error.status);
    console.error('Message:', error.message);
    if (error.response) {
       console.error('Response Data:', JSON.stringify(error.response, null, 2));
    }
  }
}

testKey();
