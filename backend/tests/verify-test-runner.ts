import TestRunnerPlugin from '../src/plugins/tools/testRunner';
import { logger } from '../src/utils/logger';

async function verify() {
  const plugin = new TestRunnerPlugin();
  await plugin.initialize({});
  
  console.log('--- Running Synthetic Tests via Plugin ---');
  const result = await plugin.execute({ operation: 'execute' });
  
  if (result.status === 'success') {
    console.log('✅ Plugin successfully executed tests.');
    console.log(result.stdout);
  } else {
    console.error('❌ Plugin failed to execute tests.');
    console.error(result.error);
    console.error(result.stdout);
    process.exit(1);
  }
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
