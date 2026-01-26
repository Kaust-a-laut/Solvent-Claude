import { vectorService } from '../src/services/vectorService';

async function verifySpecificScore() {
  console.log('--- FINAL SCORE MATH VERIFICATION ---');
  
  const text = "DECAY_TEST_DATA";
  const id = await vectorService.addEntry(text, { type: 'episodic' });
  
  // 1. Check Score Now (Age 0)
  const resultsNow = await vectorService.search(text, 100);
  const scoreNow = resultsNow.find(r => r.id === id)?.score;
  
  // 2. Check Score with Simulated Age (60 days)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  await vectorService.updateEntry(id!, { createdAt: sixtyDaysAgo.toISOString() });
  
  const resultsLate = await vectorService.search(text, 500); // Massive limit
  const scoreLate = resultsLate.find(r => r.id === id)?.score;
  
  console.log(`Initial Score (Age 0): ${scoreNow?.toFixed(4)}`);
  console.log(`Decayed Score (Age 60d): ${scoreLate?.toFixed(4)}`);
  
  if (scoreNow && scoreLate && scoreLate < scoreNow) {
     console.log('✅ SUCCESS: Mathematical decay verified.');
     console.log(`Reduction: ${((1 - (scoreLate/scoreNow)) * 100).toFixed(2)}%`);
  } else {
     console.log('❌ FAIL: Decay math not reflecting in scores.');
  }
  
  process.exit(0);
}

verifySpecificScore();
