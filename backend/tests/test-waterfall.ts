import { aiService } from './services/aiService';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

async function testWaterfall() {
  console.log('🚀 Starting Waterfall Dream Team Test...');
  const prompt = "Implement a simple 'MemoryService' that uses a Map to store user session data and includes a method to clear expired sessions every 10 minutes.";

  try {
    console.log('\n--- PHASE 1: ARCHITECT (Gemini 3) ---');
    const architectRes = await aiService.runWaterfallStep('architect' as any, prompt);
    console.log('Architect Output:', JSON.stringify(architectRes).substring(0, 200) + '...');

    console.log('\n--- PHASE 2: REASONER (Groq Compound) ---');
    const reasonerRes = await aiService.runWaterfallStep('reasoner' as any, JSON.stringify(architectRes));
    console.log('Reasoner Output:', JSON.stringify(reasonerRes).substring(0, 200) + '...');

    console.log('\n--- PHASE 3: EXECUTOR (Qwen 3) ---');
    const executorRes = await aiService.runWaterfallStep('executor' as any, reasonerRes);
    console.log('Executor Output:', JSON.stringify(executorRes).substring(0, 200) + '...');

    console.log('\n--- PHASE 4: REVIEWER (GPT-OSS 120B) ---');
    const reviewerRes = await aiService.runWaterfallStep('reviewer' as any, executorRes, { plan: reasonerRes });
    console.log('Reviewer Output:', JSON.stringify(reviewerRes));

    console.log('\n✅ Waterfall Test Complete!');
  } catch (error) {
    console.error('\n❌ Waterfall Test Failed:', error);
  }
}

testWaterfall();
