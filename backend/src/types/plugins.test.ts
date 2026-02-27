import { describe, it, expect } from 'vitest';
import { IProviderPlugin } from './plugins';

describe('Provider Interfaces', () => {
  it('should support capabilities and health', () => {
    // Just verifying the type compiles and exists
    const mockPlugin: Partial<IProviderPlugin> = {
      capabilities: {
        supportsVision: true,
        contextWindow: 100000,
        costPer1k: { input: 0.01, output: 0.03 },
        supportsFunctionCalling: true,
        supportsStreaming: true
      }
    };
    expect(mockPlugin.capabilities?.supportsVision).toBe(true);
  });
});