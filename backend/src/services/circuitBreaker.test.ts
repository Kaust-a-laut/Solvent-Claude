import { describe, it, expect, beforeEach } from 'vitest';
import { circuitBreaker } from './circuitBreaker';
import { storageService } from './storageService';

describe('CircuitBreaker', () => {
  beforeEach(async () => {
    await storageService.del('cb:gemini:failures');
    await storageService.del('cb:gemini:open');
  });

  it('should open circuit after threshold failures', async () => {
    // Record 5 failures
    for(let i=0; i<5; i++) await circuitBreaker.recordFailure('gemini');
    
    const isOpen = await circuitBreaker.isOpen('gemini');
    expect(isOpen).toBe(true);
  });

  it('should allow requests when closed', async () => {
    const isOpen = await circuitBreaker.isOpen('gemini');
    expect(isOpen).toBe(false);
  });
});