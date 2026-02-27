import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from './storageService';

describe('StorageService', () => {
  let storage: StorageService;

  beforeEach(() => {
    storage = new StorageService(); // Defaults to memory
  });

  it('should set and get values with TTL', async () => {
    await storage.set('test-key', { foo: 'bar' }, 1); // 1 sec TTL
    const val = await storage.get<{foo: string}>('test-key');
    expect(val?.foo).toBe('bar');
  });

  it('should increment counters', async () => {
    await storage.incr('counter');
    const val = await storage.incr('counter');
    expect(val).toBe(2);
  });
});