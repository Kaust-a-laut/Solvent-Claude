import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrchestrationService } from './orchestrationService';

// Mock dependencies
vi.mock('./pluginManager', () => ({
  pluginManager: {
    resolveProvider: vi.fn().mockResolvedValue({
      id: 'mock-provider',
      complete: vi.fn().mockResolvedValue('Mock response'),
      isReady: () => true
    })
  }
}));

vi.mock('./vectorService', () => ({
  vectorService: {
    addEntry: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('OrchestrationService', () => {
  let service: OrchestrationService;

  beforeEach(() => {
    service = new OrchestrationService();
    vi.clearAllMocks();
  });

  it('should use pluginManager.resolveProvider instead of hardcoded provider', async () => {
    const { pluginManager } = await import('./pluginManager');

    await service.runMission('consultation', 'Test goal', { async: false });

    expect(pluginManager.resolveProvider).toHaveBeenCalled();
  });

  it('should pass providerOverride to resolveProvider', async () => {
    const { pluginManager } = await import('./pluginManager');

    await service.runMission('consultation', 'Test goal', {
      async: false,
      providerOverride: 'ollama'
    });

    expect(pluginManager.resolveProvider).toHaveBeenCalledWith(
      'ollama',
      undefined,
      undefined
    );
  });
});