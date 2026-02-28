import { storageService } from './storageService';
import { logger } from '../utils/logger';

export class CircuitBreakerService {
  private readonly FAILURE_THRESHOLD = 5;
  private readonly COOL_DOWN_SECONDS = 60;

  async recordFailure(providerId: string): Promise<void> {
    const key = `cb:${providerId}:failures`;
    const failures = await storageService.incr(key);
    
    if (failures >= this.FAILURE_THRESHOLD) {
      await this.openCircuit(providerId);
    }
  }

  async recordSuccess(providerId: string): Promise<void> {
    // Reset failure count on success
    await storageService.del(`cb:${providerId}:failures`);
  }

  async isOpen(providerId: string): Promise<boolean> {
    const openKey = `cb:${providerId}:open`;
    const isOpen = await storageService.get<boolean>(openKey);
    return !!isOpen;
  }

  private async openCircuit(providerId: string): Promise<void> {
    logger.warn(`[CircuitBreaker] Opening circuit for ${providerId}`);
    await storageService.set(`cb:${providerId}:open`, true, this.COOL_DOWN_SECONDS);
    // Reset failure counter so it starts fresh after cooldown
    await storageService.del(`cb:${providerId}:failures`);
  }
}

export const circuitBreaker = new CircuitBreakerService();