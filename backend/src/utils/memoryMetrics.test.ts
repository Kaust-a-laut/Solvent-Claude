import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryMetrics } from './memoryMetrics';

describe('MemoryMetrics', () => {
  let metrics: MemoryMetrics;

  beforeEach(() => {
    metrics = new MemoryMetrics();
  });

  it('should track retrieval latency', () => {
    metrics.recordRetrieval(50, 10, 5);
    metrics.recordRetrieval(100, 8, 4);

    const stats = metrics.getStats();
    expect(stats.retrieval.avgLatencyMs).toBe(75);
    expect(stats.retrieval.totalCount).toBe(2);
  });

  it('should track cache hit rate', () => {
    metrics.recordCacheHit();
    metrics.recordCacheHit();
    metrics.recordCacheMiss();

    const stats = metrics.getStats();
    expect(stats.cache.hitRate).toBeCloseTo(0.667, 2);
  });

  it('should track memory saturation', () => {
    metrics.updateMemoryStats(1200, 1500, { crystallized: 800 }, { rule: 200 });

    const stats = metrics.getStats();
    expect(stats.memory.totalEntries).toBe(1200);
    expect(stats.memory.maxEntries).toBe(1500);
    expect(stats.memory.saturationPercent).toBe(80);
  });

  it('should reset metrics', () => {
    metrics.recordRetrieval(50, 10, 5);
    metrics.reset();

    const stats = metrics.getStats();
    expect(stats.retrieval.totalCount).toBe(0);
  });

  it('should export Prometheus-style metrics', () => {
    metrics.recordRetrieval(50, 10, 5);
    metrics.recordCacheHit();
    metrics.updateMemoryStats(1000, 1500, { crystallized: 700 }, { rule: 150 });

    const prometheus = metrics.toPrometheus();
    expect(prometheus).toContain('solvent_memory_total_entries 1000');
    expect(prometheus).toContain('solvent_cache_hit_total 1');
  });
});
