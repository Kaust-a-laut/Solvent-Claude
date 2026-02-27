import { describe, it, expect, vi, beforeEach } from 'vitest';
import { providerSelector } from './providerSelector';
import { pluginManager } from './pluginManager';
import { circuitBreaker } from './circuitBreaker';

// Mock dependencies
vi.mock('./pluginManager', () => ({
  pluginManager: {
    getAllProviders: vi.fn()
  }
}));

vi.mock('./circuitBreaker', () => ({
  circuitBreaker: {
    isOpen: vi.fn().mockResolvedValue(false)
  }
}));

describe('ProviderSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should prefer cheaper provider if priority is cost', async () => {
    // Mock providers with different costs
    const cheapProvider = {
      id: 'ollama',
      isReady: () => true,
      capabilities: {
        costPer1k: { input: 0, output: 0 }, // Free local provider
        supportsVision: false,
        supportsFunctionCalling: false,
        supportsStreaming: true,
        contextWindow: 32000
      } as any
    };

    const expensiveProvider = {
      id: 'gemini',
      isReady: () => true,
      capabilities: {
        costPer1k: { input: 0.075, output: 0.30 }, // Paid API
        supportsVision: true,
        supportsFunctionCalling: true,
        supportsStreaming: true,
        contextWindow: 1000000
      } as any
    };

    // Mock the plugin manager to return these providers
    (pluginManager.getAllProviders as any).mockReturnValue([
      cheapProvider,
      expensiveProvider
    ]);

    const selected = await providerSelector.select({
      priority: 'cost',
      requirements: { inputTokens: 1000, outputTokens: 500 }
    });

    // Should pick the cheaper provider (ollama)
    expect(selected.id).toBe('ollama');
  });

  it('should throw error when no providers match requirements', async () => {
    // Mock providers that don't meet requirements
    const provider = {
      id: 'low-context',
      isReady: () => true,
      capabilities: {
        costPer1k: { input: 0.1, output: 0.2 },
        supportsVision: false,
        supportsFunctionCalling: false,
        supportsStreaming: true,
        contextWindow: 1000 // Too low for requirement
      } as any
    };

    (pluginManager.getAllProviders as any).mockReturnValue([provider]);

    await expect(providerSelector.select({
      priority: 'cost',
      requirements: { minContext: 2000, inputTokens: 100, outputTokens: 50 }
    })).rejects.toThrow("No healthy providers match requirements");
  });
});