import { vectorService } from '../src/services/vectorService';
import { memoryConsolidationService } from '../src/services/memoryConsolidationService';
import { logger } from '../src/utils/logger';

async function testMemoryHardening() {
  console.log('--- STARTING MEMORY HARDENING VERIFICATION (REFINED) ---');

  // 1. Test Temporal Decay vs Anchor
  console.log('\n[1] Testing Temporal Decay & Anchoring...');
  
  // Use unique text to ensure distinct embeddings
  const anchorText = "CRITICAL_RULE_777: Always use strict typing in TypeScript.";
  const episodicText = "RANDOM_FACT_888: The weather in London is rainy today.";
  
  const anchorId = await vectorService.saveRule({ ruleText: anchorText });
  const episodicId = await vectorService.addEntry(episodicText, { type: 'episodic' });

  console.log(`Added Anchor (ID: ${anchorId}) and Episodic (ID: ${episodicId})`);

  // Simulate 60 days passing for the episodic memory (more aggressive decay)
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  
  await vectorService.updateEntry(episodicId!, { createdAt: sixtyDaysAgo.toISOString() });
  console.log('Simulated 60-day decay for episodic memory.');

  // Search with a large limit to ensure we find the decayed entry
  const searchResults = await vectorService.search("CRITICAL_RULE RANDOM_FACT", 100);
  
  const anchorResult = searchResults.find(r => r.id === anchorId);
  const episodicResult = searchResults.find(r => r.id === episodicId);

  if (!anchorResult) console.log('❌ Error: Anchor not found in search results.');
  if (!episodicResult) console.log('❌ Error: Episodic memory not found in search results (even with limit 100).');

  console.log(`\nResults Diagnostic:
`);
  console.log(`Anchor [${anchorId}]: Score = ${anchorResult?.score.toFixed(4)}`);
  console.log(`Episodic [${episodicId}]: Score = ${episodicResult?.score.toFixed(4)}`);

  if (anchorResult && episodicResult) {
    if (anchorResult.score > episodicResult.score) {
      console.log('✅ PASS: Anchor correctly outscored decayed episodic memory.');
    } else {
      console.log('❌ FAIL: Episodic memory still scoring higher than anchor.');
    }
  }

  // 2. Test Saturation Triggered Amnesia Cycle
  console.log('\n[2] Testing Saturation Trigger (Amnesia Cycle)...');
  
  // Note: The counter was reset in the previous test if it ran, but since we are running a fresh script
  // and VectorService is a singleton in memory for this process, we just add another 200.
  console.log('Adding 200 dummy entries to trigger Amnesia Cycle...');
  for (let i = 0; i < 200; i++) {
    await vectorService.addEntry(`Purge interaction ${i}.`, { type: 'episodic' });
  }
  
  console.log('Waiting for Amnesia Cycle (5s)...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  const metaSummaries = await vectorService.search("META-SUMMARY", 1, { tier: 'meta-summary' });
  
  if (metaSummaries.length > 0) {
    console.log('✅ PASS: Amnesia Cycle triggered and Meta-Summary generated!');
    console.log('Summary Content:', metaSummaries[0].metadata.text.substring(0, 100) + '...');
  } else {
    console.log('❌ FAIL: Amnesia Cycle was not triggered.');
  }

  console.log('\n--- VERIFICATION COMPLETE ---');
  process.exit(0);
}

testMemoryHardening().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});