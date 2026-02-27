import { IToolPlugin } from '../../types/plugins';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../utils/logger';

const execAsync = promisify(exec);

export class TestRunnerPlugin implements IToolPlugin {
  id = 'test_runner';
  name = 'Automated Test Runner';
  description = 'Generates and executes tests based on project context';
  version = '1.0.0';

  schema = {
    name: 'run_synthetic_tests',
    description: 'Execute synthetic tests or generate new ones',
    parameters: {
      type: 'object' as const,
      properties: {
        operation: {
          type: 'string',
          enum: ['execute', 'list_results'],
          description: 'The operation to perform'
        },
        testName: {
          type: 'string',
          description: 'Specific test file to run (optional)'
        }
      },
      required: ['operation']
    }
  };

  private rootDir: string;
  private syntheticTestDir: string;

  constructor() {
    this.rootDir = path.resolve(__dirname, '../../../../');
    this.syntheticTestDir = path.join(this.rootDir, 'backend/tests/synthetic');
  }

  async initialize(options: Record<string, any>): Promise<void> {
    await fs.mkdir(this.syntheticTestDir, { recursive: true });
  }

  isReady(): boolean {
    return true;
  }

  async execute(args: Record<string, any>): Promise<any> {
    const { operation, testName } = args;

    switch (operation) {
      case 'execute':
        return await this.runTests(testName);
      case 'list_results':
        return await this.listResults();
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  private async runTests(testName?: string) {
    try {
      logger.info(`[TestRunner] Running synthetic tests...`);
      
      const testPath = testName 
        ? path.join('tests/synthetic', testName)
        : 'tests/synthetic';

      // We run vitest directly from the backend directory
      const backendDir = path.join(this.rootDir, 'backend');
      const { stdout, stderr } = await execAsync(`npx vitest run ${testPath}`, {
        cwd: backendDir
      });

      return {
        status: 'success',
        stdout,
        stderr
      };
    } catch (error: any) {
      logger.error(`[TestRunner] Test execution failed`, error);
      return {
        status: 'failure',
        error: error.message,
        stdout: error.stdout,
        stderr: error.stderr
      };
    }
  }

  private async listResults() {
    try {
      const files = await fs.readdir(this.syntheticTestDir);
      return {
        status: 'success',
        tests: files.filter(f => f.endsWith('.test.ts') || f.endsWith('.spec.ts'))
      };
    } catch (error: any) {
      return { status: 'failure', error: error.message };
    }
  }
}

export default TestRunnerPlugin;
