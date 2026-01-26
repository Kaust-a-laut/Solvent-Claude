import { describe, it, expect, vi } from 'vitest';
import { orchestrationJob, OrchestrationJobData } from './orchestrationJob';
import { Job } from 'bullmq';

// Mock dependencies
vi.mock('../services/pluginManager', () => ({
  pluginManager: {
    resolveProvider: vi.fn().mockResolvedValue({
      id: 'mock-provider',
      defaultModel: 'mock-model',
      complete: vi.fn().mockResolvedValue('Mock response'),
      isReady: () => true
    })
  }
}));

vi.mock('../services/vectorService', () => ({
  vectorService: {
    addEntry: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('orchestrationJob', () => {
  it('should use resolveProvider with providerOverride', async () => {
    const { pluginManager } = await import('../services/pluginManager');

    const mockJob = {
      data: {
        templateId: 'consultation',
        goal: 'Test goal',
        template: {
          agents: [{ id: 'test', name: 'Test Agent', instruction: 'Test' }],
          synthesisInstruction: 'Synthesize',
          intentAssertions: ['Test assertion']
        },
        providerOverride: 'ollama'
      },
      updateProgress: vi.fn()
    } as unknown as Job<OrchestrationJobData>;

    await orchestrationJob(mockJob);

    expect(pluginManager.resolveProvider).toHaveBeenCalledWith('ollama');
  });
});