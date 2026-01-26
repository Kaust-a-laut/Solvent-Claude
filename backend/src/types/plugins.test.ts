import { describe, it, expect } from 'vitest';
import { IProviderPlugin, ProviderCapabilities } from './plugins';

describe('ProviderCapabilities', () => {
  it('should define all capability fields as optional booleans or numbers', () => {
    const caps: ProviderCapabilities = {
      supportsVision: true,
      supportsStreaming: true,
      supportsEmbeddings: false,
      contextWindow: 128000,
      maxOutputTokens: 8192
    };

    expect(caps.supportsVision).toBe(true);
    expect(caps.contextWindow).toBe(128000);
  });
});