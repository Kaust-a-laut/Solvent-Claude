export interface MetricsSnapshot {
  retrieval: {
    avgLatencyMs: number;
    maxLatencyMs: number;
    minLatencyMs: number;
    totalCount: number;
    avgCandidates: number;
    avgResults: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
  };
  memory: {
    totalEntries: number;
    maxEntries: number;
    saturationPercent: number;
    byTier: { [tier: string]: number };
    byType: { [type: string]: number };
  };
  deduplication: {
    totalDeduped: number;
    avgSimilarity: number;
  };
  uptime: number;
  lastUpdated: string;
}

export class MemoryMetrics {
  private retrievalLatencies: number[] = [];
  private retrievalCandidates: number[] = [];
  private retrievalResults: number[] = [];
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  private cacheSize: number = 0;
  private memoryStats = { total: 0, max: 0, byTier: {} as Record<string, number>, byType: {} as Record<string, number> };
  private dedupStats = { count: 0, similarities: [] as number[] };
  private startTime: number = Date.now();

  recordRetrieval(latencyMs: number, candidates: number, results: number): void {
    this.retrievalLatencies.push(latencyMs);
    this.retrievalCandidates.push(candidates);
    this.retrievalResults.push(results);

    // Keep only last 1000 for rolling average
    if (this.retrievalLatencies.length > 1000) {
      this.retrievalLatencies.shift();
      this.retrievalCandidates.shift();
      this.retrievalResults.shift();
    }
  }

  recordCacheHit(): void {
    this.cacheHits++;
  }

  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  updateCacheSize(size: number): void {
    this.cacheSize = size;
  }

  updateMemoryStats(total: number, max: number, byTier: Record<string, number>, byType: Record<string, number>): void {
    this.memoryStats = { total, max, byTier, byType };
  }

  recordDeduplication(similarity: number): void {
    this.dedupStats.count++;
    this.dedupStats.similarities.push(similarity);
    if (this.dedupStats.similarities.length > 100) {
      this.dedupStats.similarities.shift();
    }
  }

  private avg(arr: number[]): number {
    return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  getStats(): MetricsSnapshot {
    const totalCacheOps = this.cacheHits + this.cacheMisses;

    return {
      retrieval: {
        avgLatencyMs: Math.round(this.avg(this.retrievalLatencies)),
        maxLatencyMs: Math.max(0, ...this.retrievalLatencies),
        minLatencyMs: this.retrievalLatencies.length ? Math.min(...this.retrievalLatencies) : 0,
        totalCount: this.retrievalLatencies.length,
        avgCandidates: Math.round(this.avg(this.retrievalCandidates)),
        avgResults: Math.round(this.avg(this.retrievalResults) * 10) / 10
      },
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: totalCacheOps === 0 ? 0 : this.cacheHits / totalCacheOps,
        size: this.cacheSize
      },
      memory: {
        totalEntries: this.memoryStats.total,
        maxEntries: this.memoryStats.max,
        saturationPercent: this.memoryStats.max === 0 ? 0 : Math.round((this.memoryStats.total / this.memoryStats.max) * 100),
        byTier: this.memoryStats.byTier,
        byType: this.memoryStats.byType
      },
      deduplication: {
        totalDeduped: this.dedupStats.count,
        avgSimilarity: Math.round(this.avg(this.dedupStats.similarities) * 1000) / 1000
      },
      uptime: Date.now() - this.startTime,
      lastUpdated: new Date().toISOString()
    };
  }

  reset(): void {
    this.retrievalLatencies = [];
    this.retrievalCandidates = [];
    this.retrievalResults = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.dedupStats = { count: 0, similarities: [] };
  }

  toPrometheus(): string {
    const stats = this.getStats();
    const lines: string[] = [
      '# HELP solvent_memory_total_entries Total entries in vector memory',
      '# TYPE solvent_memory_total_entries gauge',
      `solvent_memory_total_entries ${stats.memory.totalEntries}`,
      '',
      '# HELP solvent_memory_max_entries Maximum entries allowed',
      '# TYPE solvent_memory_max_entries gauge',
      `solvent_memory_max_entries ${stats.memory.maxEntries}`,
      '',
      '# HELP solvent_cache_hit_total Total cache hits',
      '# TYPE solvent_cache_hit_total counter',
      `solvent_cache_hit_total ${stats.cache.hits}`,
      '',
      '# HELP solvent_cache_miss_total Total cache misses',
      '# TYPE solvent_cache_miss_total counter',
      `solvent_cache_miss_total ${stats.cache.misses}`,
      '',
      '# HELP solvent_retrieval_latency_ms Average retrieval latency',
      '# TYPE solvent_retrieval_latency_ms gauge',
      `solvent_retrieval_latency_ms ${stats.retrieval.avgLatencyMs}`,
      '',
      '# HELP solvent_dedup_total Total deduplicated entries',
      '# TYPE solvent_dedup_total counter',
      `solvent_dedup_total ${stats.deduplication.totalDeduped}`
    ];
    return lines.join('\n');
  }
}

// Singleton instance
export const memoryMetrics = new MemoryMetrics();
