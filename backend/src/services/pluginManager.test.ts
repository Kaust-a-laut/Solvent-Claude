import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginManager } from './pluginManager';
import { IProviderPlugin, ProviderCapabilities } from '../types/plugins';

// Mock provider for testing
class MockProvider implements IProviderPlugin {
  constructor(
    public id: string,
    public name: string,
    private ready: boolean,
    public capabilities?: ProviderCapabilities
  ) {}
  description = 'Mock';
  version = '1.0.0';
  defaultModel = 'mock-model';
  
  isReady() { return this.ready; }
  async complete() { return 'mock response'; }
}

describe('PluginManager.resolveProvider', () => {
  let manager: PluginManager;

  beforeEach(() => {
    manager = new PluginManager();
  });

  it('should return explicitly requested provider if ready', async () => {
    const gemini = new MockProvider('gemini', 'Gemini', true);
    await manager.registerProvider(gemini);

    const resolved = await manager.resolveProvider('gemini');
    expect(resolved.id).toBe('gemini');
  });

  it('should fall back to default provider if explicit not ready', async () => {
    const gemini = new MockProvider('gemini', 'Gemini', false);
    const groq = new MockProvider('groq', 'Groq', true);
    await manager.registerProvider(gemini);
    await manager.registerProvider(groq);

    const resolved = await manager.resolveProvider('gemini', 'groq');
    expect(resolved.id).toBe('groq');
  });

  it('should fall back to first ready provider if default not ready', async () => {
    const gemini = new MockProvider('gemini', 'Gemini', false);
    const groq = new MockProvider('groq', 'Groq', false);
    const ollama = new MockProvider('ollama', 'Ollama', true);
    await manager.registerProvider(gemini);
    await manager.registerProvider(groq);
    await manager.registerProvider(ollama);

    const resolved = await manager.resolveProvider('gemini', 'groq');
    expect(resolved.id).toBe('ollama');
  });

  it('should throw if no providers are ready', async () => {
    const gemini = new MockProvider('gemini', 'Gemini', false);
    await manager.registerProvider(gemini);

    await expect(manager.resolveProvider('gemini')).rejects.toThrow('No operational AI providers');
  });

  it('should filter by capabilities when specified', async () => {
    const gemini = new MockProvider('gemini', 'Gemini', true, { supportsVision: true });
    const groq = new MockProvider('groq', 'Groq', true, { supportsVision: false });
    await manager.registerProvider(gemini);
    await manager.registerProvider(groq);

    const resolved = await manager.resolveProvider(undefined, undefined, { supportsVision: true });
    expect(resolved.id).toBe('gemini');
  });
});