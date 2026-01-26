import { memoryConsolidationService } from '../src/services/memoryConsolidationService';
import { vectorService } from '../src/services/vectorService';

async function testAnonymizationValve() {
  console.log('--- STARTING "ONE-WAY VALVE" ANONYMIZATION TEST ---');
  
  // 1. Prepare "Toxic" Specific Data (High-risk identifiers)
  const toxicData = [
    { role: 'user', content: 'We need to fix the SV_INTERNAL_AUTH_KEY_V9 in the shard_aggregator_chronos.ts file.' },
    { role: 'assistant', content: 'I will implement a custom middleware called ChronosAuthGuard that specifically checks the sv_v9_protocol header.' }
  ];

  console.log('\n[Step 1] Feeding "Toxic" project-specific data into the memory pool...');
  for (const msg of toxicData) {
    await vectorService.addEntry(`${msg.role.toUpperCase()}: ${msg.content}`, { type: 'episodic' });
  }

  // 2. Trigger the Dual-Output Amnesia Cycle
  console.log('\n[Step 2] Triggering Dual-Output Amnesia Cycle...');
  const result = await memoryConsolidationService.runAmnesiaCycle();

  if (!result) {
    console.error('❌ Error: Amnesia Cycle failed to return results.');
    process.exit(1);
  }

  // 3. The Audit: Search for "Leaks" in the Universal Output
  console.log('\n[Step 3] Auditing Universal Output for Specific Leaks...');
  const universal = (result.universal || "").toLowerCase();
  const specific = (result.specific || "").toLowerCase();

  const leaks = [
    'sv_internal_auth_key_v9',
    'chronos',
    'sv_v9_protocol',
    'shard_aggregator',
    'chronosauthguard'
  ].filter(id => universal.includes(id.toLowerCase()));

  console.log('--------------------------------------------------');
  console.log('AUDIT RESULTS:');
  console.log(`Specific Output Length: ${specific.length} chars`);
  console.log(`Universal Output Length: ${universal.length} chars`);
  
  if (leaks.length === 0) {
    console.log('✅ PASS: "One-Way Valve" successfully stripped all 5 specific identifiers.');
    console.log('Universal wisdom was distilled without variable contamination.');
  } else {
    console.log(`❌ FAIL: Leak detected! Universal Tier contains specific identifiers: ${leaks.join(', ')}`);
  }
  console.log('--------------------------------------------------');

  console.log('\nExtracted Universal Pattern:');
  console.log(result.universal);
  
  process.exit(leaks.length === 0 ? 0 : 1);
}

testAnonymizationValve().catch(err => {
  console.error(err);
  process.exit(1);
});
