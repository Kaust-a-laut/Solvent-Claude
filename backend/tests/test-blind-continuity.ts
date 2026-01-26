import { contextService } from '../src/services/contextService';
import { vectorService } from '../src/services/vectorService';
import { ChatRequestData } from '../src/types/ai';

async function testBlindContinuity() {
  console.log('--- STARTING BLIND CONTINUITY SIMULATION ---');
  console.log('Scenario: Fresh session, zero chat history. Only hardened memory exists.');

  // 1. Prepare the "Blind" request
  const blindRequest: ChatRequestData = {
    messages: [
      { role: 'user', content: "I am a new developer on this project. Based on your memory, give me a high-level overview of the current architecture and any strict project rules I must follow." }
    ],
    model: 'gemini-2.0-flash',
    provider: 'gemini',
    mode: 'coding',
    notepadContent: "",
    openFiles: []
  };

  console.log('\n[Step 1] Enriching context from hardened vector memory...');
  const enrichedMessages = await contextService.enrichContext(blindRequest);

  // 2. Inspect the System Prompt
  const systemPrompt = enrichedMessages.find(m => m.role === 'system');
  console.log('\n[Step 2] Inspecting the generated System Prompt:');
  
  if (systemPrompt) {
    const content = systemPrompt.content;
    
    const hasMetaSummary = content.includes('[RELEVANT CONTEXT (META_SUMMARY');
    const hasRules = content.includes('CHRONOS_RULE');
    const hasRust = content.includes('Rust') || content.includes('Protobuf');

    console.log('--------------------------------------------------');
    console.log('ANALYSIS OF RETRIEVED MEMORY:');
    console.log(`- Identified as Project Chronos: ${hasRules ? '✅ YES' : '❌ NO'}`);
    console.log(`- Found Meta-Summaries: ${hasMetaSummary ? '✅ YES' : '❌ NO'}`);
    console.log(`- Detected Tech Stack (Rust/Protobuf): ${hasRust ? '✅ YES' : '❌ NO'}`);
    console.log('--------------------------------------------------');

    // Display a snippet of the retrieved context
    const memorySection = content.match(/[\[]PROJECT MEMORY \(RELEVANT FRAGMENTS\)\]:([\s\S]*?)[\[]ESTABLISHED PROJECT RULES[\]]/);
    if (memorySection) {
        console.log('\nExtracted Meta-Summary Fragment:');
        console.log(memorySection[1].trim().substring(0, 500) + '...');
    }
  }

  // 3. Final Verdict
  const memoryScore = (systemPrompt?.content.match(/CONFIDENCE/g) || []).length;
  if (memoryScore > 0) {
    console.log(`\n✅ VERDICT: SUCCESS. The AI retrieved ${memoryScore} high-confidence fragments from its deep memory.`);
    console.log('The "Amnesia Agent" successfully passed the baton to this new session.');
  } else {
    console.log('\n❌ VERDICT: FAILURE. No relevant hardened memory was retrieved.');
  }

  process.exit(0);
}

testBlindContinuity().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
