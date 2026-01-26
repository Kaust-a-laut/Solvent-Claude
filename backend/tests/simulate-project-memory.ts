import { vectorService } from '../src/services/vectorService';
import fs from 'fs/promises';
import path from 'path';

async function simulateProjectChronos() {
  console.log('--- GENERATING PROJECT CHRONOS MEMORY ---');
  
  // 1. Backup existing memory
  const dbPath = path.resolve(__dirname, '../../../.solvent_memory.json');
  const backupPath = dbPath + '.bak';
  try {
    await fs.copyFile(dbPath, backupPath);
    console.log('Backed up existing memory to .solvent_memory.json.bak');
  } catch (e) {}

  // 2. Wipe current memory for clean test
  // @ts-ignore
  vectorService.memory = [];
  await fs.writeFile(dbPath, '[]'); // Force clear on disk
  console.log('Memory cleared on disk and in-memory for simulation.');

  // 3. Inject Rules (Anchors)
  console.log('Injecting Project Rules...');
  await vectorService.saveRule({ ruleText: "CHRONOS_RULE_1: All backend logic must be implemented in Rust for nanosecond precision." });
  await vectorService.saveRule({ ruleText: "CHRONOS_RULE_2: Use Protobuf for all internal service communication." });
  await vectorService.saveRule({ ruleText: "CHRONOS_RULE_3: Frontend must use a 'Canvas-First' rendering approach for the timeline." });

  // 4. Inject Architectural Insights (Anchors)
  console.log('Injecting Architectural Insights...');
  await vectorService.saveInsight({
    decision: "Migration from PostgreSQL to TimescaleDB",
    rationale: "Handling 10M+ events per second required native time-series optimization."
  });

  // 5. Inject a Meta-Summary (The "Soul" of the project)
  console.log('Injecting Meta-Summary (Amnesia Cycle Artifact)...');
  await vectorService.addEntry(`
    [META-SUMMARY] Project Chronos has reached Milestone 4. 
    We have successfully decoupled the 'Event_Ingestor' from the 'Aggregator' using a distributed WAL (Write-Ahead Log). 
    The current focus is optimizing the WASM-based Canvas renderer for the frontend. 
    Legacy REST endpoints are deprecated in favor of gRPC-Web.
  `, {
    type: 'meta_summary',
    tier: 'meta-summary',
    isAnchor: true,
    importance: 5
  });

  // 6. Inject some "Noise" (Episodic memory)
  console.log('Injecting episodic development noise...');
  for (let i = 0; i < 50; i++) {
    await vectorService.addEntry(`Minor fix in component ${i}: Adjusted CSS padding.`, { type: 'episodic' });
  }

  await vectorService.saveMemory();
  console.log('--- SIMULATION DATA INJECTED ---');
  process.exit(0);
}

simulateProjectChronos().catch(err => {
  console.error(err);
  process.exit(1);
});
