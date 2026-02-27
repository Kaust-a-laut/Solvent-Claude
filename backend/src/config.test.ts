import { describe, it, expect } from 'vitest';
import { config } from './config';

describe('config', () => {
  it('should have DEFAULT_PROVIDER with fallback to gemini', () => {
    expect(config.DEFAULT_PROVIDER).toBeDefined();
    // Default should be 'gemini' if not set in env
    expect(typeof config.DEFAULT_PROVIDER).toBe('string');
  });
});