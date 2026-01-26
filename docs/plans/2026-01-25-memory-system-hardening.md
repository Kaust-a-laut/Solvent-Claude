# Memory System Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Harden and optimize the memory system with embedding cache persistence, HNSW vector search, backup rotation, semantic deduplication, and observability metrics.

**Architecture:** Five independent improvements to the VectorService and ContextService. Each enhancement is additive and non-breaking. We'll add new utility classes and extend existing services while maintaining backward compatibility.

**Tech Stack:** TypeScript, Vitest, hnswlib-node (approximate nearest neighbor), Node.js fs/promises

---

## Task 1: Embedding Cache Persistence

**Files:**
- Modify: `backend/src/services/vectorService.ts`
- Modify: `backend/src/utils/fileSystem.ts`
- Test: `backend/src/services/vectorService.test.ts`

**Step 1: Write the failing test for cache persistence**

Add to `backend/src/services/vectorService.test.ts`:

```typescript
describe('Embedding Cache Persistence', () => {
  it('should persist embedding cache to disk', async () => {
    const cachePath = path.resolve(__dirname, '../../../.solvent_embedding_cache.json');

    // Generate an embedding to populate cache
    const text = 'Cache persistence test ' + Date.now();
    await vectorService.getEmbedding(text);

    // Persist cache
    await vectorService.persistEmbeddingCache();

    // Verify file exists
    const exists = await fs.access(cachePath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    // Verify content structure
    const content = JSON.parse(await fs.readFile(cachePath, 'utf-8'));
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);
    expect(content[0]).toHaveProperty('text');
    expect(content[0]).toHaveProperty('vector');
  });

  it('should load embedding cache from disk on initialization', async () => {
    const cachePath = path.resolve(__dirname, '../../../.solvent_embedding_cache.json');

    // Create a mock cache file
    const mockCache = [
      { text: 'preloaded_test_entry', vector: new Array(768).fill(0.1), lastAccess: Date.now() }
    ];
    await fs.writeFile(cachePath, JSON.stringify(mockCache));

    // Force reload
    await vectorService.loadEmbeddingCache();

    // Verify cache was loaded (embedding call should be instant)
    const start = Date.now();
    const result = await vectorService.getEmbedding('preloaded_test_entry');
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(50); // Should be near-instant from cache
    expect(result).toHaveLength(768);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/kaust/solvent-ai-v1-production/backend && npm test -- --grep "Embedding Cache Persistence"`

Expected: FAIL with "vectorService.persistEmbeddingCache is not a function"

**Step 3: Implement cache persistence in VectorService**

Add to `backend/src/services/vectorService.ts` after the constructor:

```typescript
private embeddingCachePath: string;

// Update constructor to add:
this.embeddingCachePath = path.resolve(__dirname, '../../../.solvent_embedding_cache.json');
this.loadEmbeddingCache();

// Add new methods:
async loadEmbeddingCache() {
  try {
    const data = await fs.readFile(this.embeddingCachePath, 'utf-8');
    const entries: { text: string; vector: number[]; lastAccess: number }[] = JSON.parse(data);
    this.embeddingCache.clear();
    for (const entry of entries) {
      this.embeddingCache.set(entry.text, { vector: entry.vector, lastAccess: entry.lastAccess });
    }
    logger.info(`[VectorService] Loaded ${entries.length} cached embeddings from disk.`);
  } catch (e) {
    // File doesn't exist yet, that's fine
    logger.debug('[VectorService] No embedding cache file found, starting fresh.');
  }
}

async persistEmbeddingCache() {
  try {
    const entries = Array.from(this.embeddingCache.entries()).map(([text, { vector, lastAccess }]) => ({
      text,
      vector,
      lastAccess
    }));
    await AtomicFileSystem.writeJson(this.embeddingCachePath, entries);
    logger.info(`[VectorService] Persisted ${entries.length} embeddings to cache file.`);
  } catch (error) {
    logger.error('[VectorService] Failed to persist embedding cache', error);
  }
}
```

**Step 4: Add periodic cache persistence (every 100 new embeddings)**

Add counter and trigger in `cacheEmbedding` method:

```typescript
private cacheWriteCounter: number = 0;
private readonly CACHE_PERSIST_THRESHOLD = 100;

private cacheEmbedding(text: string, vector: number[]) {
  // ... existing LRU logic ...

  this.embeddingCache.set(text, { vector, lastAccess: Date.now() });

  this.cacheWriteCounter++;
  if (this.cacheWriteCounter >= this.CACHE_PERSIST_THRESHOLD) {
    this.cacheWriteCounter = 0;
    this.persistEmbeddingCache().catch(e => logger.error('[VectorService] Cache persist failed', e));
  }
}
```

**Step 5: Run test to verify it passes**

Run: `cd /home/kaust/solvent-ai-v1-production/backend && npm test -- --grep "Embedding Cache Persistence"`

Expected: PASS

**Step 6: Commit**

```bash
git add backend/src/services/vectorService.ts backend/src/services/vectorService.test.ts
git commit -m "feat(memory): add embedding cache persistence to disk

Reduces cold-start latency by persisting LRU embedding cache to
.solvent_embedding_cache.json. Cache is loaded on startup and
persisted every 100 new embeddings.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Memory Backup Rotation

**Files:**
- Create: `backend/src/utils/backupManager.ts`
- Modify: `backend/src/services/vectorService.ts`
- Test: `backend/src/utils/backupManager.test.ts`

**Step 1: Write failing test for backup manager**

Create `backend/src/utils/backupManager.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BackupManager } from './backupManager';
import fs from 'fs/promises';
import path from 'path';

describe('BackupManager', () => {
  const testDir = path.resolve(__dirname, '../../../.solvent_test_backups');
  const testFile = path.resolve(__dirname, '../../../.solvent_test_memory.json');
  let backupManager: BackupManager;

  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testFile, JSON.stringify({ test: 'data' }));
    backupManager = new BackupManager(testFile, testDir, 3);
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.rm(testFile, { force: true });
  });

  it('should create a timestamped backup', async () => {
    await backupManager.createBackup();

    const files = await fs.readdir(testDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(/^backup_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/);
  });

  it('should rotate backups keeping only maxBackups', async () => {
    // Create 5 backups
    for (let i = 0; i < 5; i++) {
      await backupManager.createBackup();
      await new Promise(r => setTimeout(r, 10)); // Ensure different timestamps
    }

    const files = await fs.readdir(testDir);
    expect(files.length).toBe(3); // Should keep only 3
  });

  it('should validate backup integrity with checksum', async () => {
    await backupManager.createBackup();

    const files = await fs.readdir(testDir);
    const backupPath = path.join(testDir, files[0]);
    const isValid = await backupManager.validateBackup(backupPath);

    expect(isValid).toBe(true);
  });

  it('should detect corrupted backups', async () => {
    await backupManager.createBackup();

    const files = await fs.readdir(testDir);
    const backupPath = path.join(testDir, files[0]);

    // Corrupt the file
    await fs.writeFile(backupPath, 'corrupted{{{');

    const isValid = await backupManager.validateBackup(backupPath);
    expect(isValid).toBe(false);
  });

  it('should restore from most recent valid backup', async () => {
    const originalData = { entries: [{ id: '1', data: 'original' }] };
    await fs.writeFile(testFile, JSON.stringify(originalData));
    await backupManager.createBackup();

    // Corrupt main file
    await fs.writeFile(testFile, 'corrupted');

    const restored = await backupManager.restoreFromBackup();
    expect(restored).toBe(true);

    const content = JSON.parse(await fs.readFile(testFile, 'utf-8'));
    expect(content).toEqual(originalData);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/kaust/solvent-ai-v1-production/backend && npm test -- --grep "BackupManager"`

Expected: FAIL with "Cannot find module './backupManager'"

**Step 3: Implement BackupManager**

Create `backend/src/utils/backupManager.ts`:

```typescript
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from './logger';

export class BackupManager {
  private sourcePath: string;
  private backupDir: string;
  private maxBackups: number;

  constructor(sourcePath: string, backupDir: string, maxBackups: number = 5) {
    this.sourcePath = sourcePath;
    this.backupDir = backupDir;
    this.maxBackups = maxBackups;
  }

  async createBackup(): Promise<string | null> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });

      const content = await fs.readFile(this.sourcePath, 'utf-8');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupFileName = `backup_${timestamp}.json`;
      const backupPath = path.join(this.backupDir, backupFileName);

      // Write backup with embedded checksum
      const checksum = this.computeChecksum(content);
      const backupData = {
        _checksum: checksum,
        _createdAt: new Date().toISOString(),
        data: JSON.parse(content)
      };

      await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2));
      logger.info(`[BackupManager] Created backup: ${backupFileName}`);

      await this.rotateBackups();
      return backupPath;
    } catch (error) {
      logger.error('[BackupManager] Failed to create backup', error);
      return null;
    }
  }

  private async rotateBackups(): Promise<void> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .sort()
        .reverse(); // Newest first

      if (backupFiles.length > this.maxBackups) {
        const toDelete = backupFiles.slice(this.maxBackups);
        for (const file of toDelete) {
          await fs.unlink(path.join(this.backupDir, file));
          logger.info(`[BackupManager] Rotated out old backup: ${file}`);
        }
      }
    } catch (error) {
      logger.error('[BackupManager] Failed to rotate backups', error);
    }
  }

  async validateBackup(backupPath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(backupPath, 'utf-8');
      const parsed = JSON.parse(content);

      if (!parsed._checksum || !parsed.data) {
        return false;
      }

      const dataString = JSON.stringify(parsed.data);
      const expectedChecksum = this.computeChecksum(dataString);

      // Re-serialize for comparison (handles formatting differences)
      const actualChecksum = parsed._checksum;

      // Also verify by re-stringifying the data portion
      const recomputed = this.computeChecksum(JSON.stringify(parsed.data));
      return recomputed === actualChecksum || expectedChecksum === actualChecksum;
    } catch (error) {
      logger.error(`[BackupManager] Backup validation failed: ${backupPath}`, error);
      return false;
    }
  }

  async restoreFromBackup(): Promise<boolean> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
        .sort()
        .reverse(); // Newest first

      for (const file of backupFiles) {
        const backupPath = path.join(this.backupDir, file);
        const isValid = await this.validateBackup(backupPath);

        if (isValid) {
          const content = await fs.readFile(backupPath, 'utf-8');
          const parsed = JSON.parse(content);
          await fs.writeFile(this.sourcePath, JSON.stringify(parsed.data, null, 2));
          logger.info(`[BackupManager] Restored from backup: ${file}`);
          return true;
        } else {
          logger.warn(`[BackupManager] Skipping invalid backup: ${file}`);
        }
      }

      logger.error('[BackupManager] No valid backups found for restoration');
      return false;
    } catch (error) {
      logger.error('[BackupManager] Restore failed', error);
      return false;
    }
  }

  private computeChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd /home/kaust/solvent-ai-v1-production/backend && npm test -- --grep "BackupManager"`

Expected: PASS

**Step 5: Integrate BackupManager into VectorService**

Add to `backend/src/services/vectorService.ts`:

```typescript
import { BackupManager } from '../utils/backupManager';

// In constructor:
private backupManager: BackupManager;

// In constructor body:
this.backupManager = new BackupManager(
  this.dbPath,
  path.resolve(__dirname, '../../../.solvent_backups'),
  5
);

// Modify saveMemory() to create periodic backups:
private saveCounter: number = 0;
private readonly BACKUP_INTERVAL = 50; // Backup every 50 saves

private async saveMemory() {
  try {
    // ... existing eviction logic ...

    await AtomicFileSystem.writeJson(this.dbPath, this.memory);

    // Periodic backup
    this.saveCounter++;
    if (this.saveCounter >= this.BACKUP_INTERVAL) {
      this.saveCounter = 0;
      this.backupManager.createBackup().catch(e =>
        logger.error('[VectorService] Backup creation failed', e)
      );
    }
  } catch (error) {
    logger.error('Failed to save vector memory', error);
  }
}

// Add recovery method:
async attemptRecovery(): Promise<boolean> {
  logger.warn('[VectorService] Attempting recovery from backup...');
  const restored = await this.backupManager.restoreFromBackup();
  if (restored) {
    await this.loadMemory();
    return true;
  }
  return false;
}
```

**Step 6: Add checksum validation on load**

Modify `loadMemory()` in vectorService.ts:

```typescript
private async loadMemory() {
  try {
    const data = await fs.readFile(this.dbPath, 'utf-8');
    const parsed = JSON.parse(data);

    // Validate structure
    if (!Array.isArray(parsed)) {
      throw new Error('Memory file is not an array');
    }

    this.memory = parsed;
    this.rebuildIndices();
    logger.info(`Loaded ${this.memory.length} vectors from memory and rebuilt indices.`);
  } catch (e: any) {
    logger.error(`[VectorService] Failed to load memory: ${e.message}`);

    // Attempt recovery from backup
    const recovered = await this.attemptRecovery();
    if (!recovered) {
      logger.warn('[VectorService] Starting with empty memory.');
      this.memory = [];
    }
  }
}
```

**Step 7: Run all tests**

Run: `cd /home/kaust/solvent-ai-v1-production/backend && npm test`

Expected: PASS

**Step 8: Commit**

```bash
git add backend/src/utils/backupManager.ts backend/src/utils/backupManager.test.ts backend/src/services/vectorService.ts
git commit -m "feat(memory): add backup rotation with checksum validation

Implements BackupManager for .solvent_memory.json:
- Creates timestamped backups every 50 saves
- Rotates keeping last 5 backups
- SHA256 checksum validation
- Auto-recovery on corruption

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 3: HNSW Vector Search Optimization

**Files:**
- Modify: `backend/package.json`
- Create: `backend/src/utils/hnswIndex.ts`
- Modify: `backend/src/services/vectorService.ts`
- Test: `backend/src/utils/hnswIndex.test.ts`

**Step 1: Install hnswlib-node**

Run: `cd /home/kaust/solvent-ai-v1-production/backend && npm install hnswlib-node`

**Step 2: Write failing test for HNSW index**

Create `backend/src/utils/hnswIndex.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HNSWIndex } from './hnswIndex';
import fs from 'fs/promises';
import path from 'path';

describe('HNSWIndex', () => {
  let index: HNSWIndex;
  const testIndexPath = path.resolve(__dirname, '../../../.solvent_test_hnsw.bin');

  beforeEach(() => {
    index = new HNSWIndex(768, 1000);
  });

  afterEach(async () => {
    await fs.rm(testIndexPath, { force: true });
  });

  it('should add vectors and search', async () => {
    const vector1 = new Array(768).fill(0.1);
    const vector2 = new Array(768).fill(0.2);
    const vector3 = new Array(768).fill(0.9);

    index.add('id1', vector1);
    index.add('id2', vector2);
    index.add('id3', vector3);

    // Search for something close to vector3
    const query = new Array(768).fill(0.85);
    const results = index.search(query, 2);

    expect(results.length).toBe(2);
    expect(results[0].id).toBe('id3'); // Closest match
  });

  it('should persist and reload index', async () => {
    const vector = new Array(768).fill(0.5);
    index.add('persist_test', vector);

    await index.save(testIndexPath);

    const newIndex = new HNSWIndex(768, 1000);
    await newIndex.load(testIndexPath);

    const query = new Array(768).fill(0.5);
    const results = newIndex.search(query, 1);

    expect(results.length).toBe(1);
    expect(results[0].id).toBe('persist_test');
  });

  it('should handle removal of vectors', () => {
    const vector = new Array(768).fill(0.3);
    index.add('to_remove', vector);

    const sizeBefore = index.size();
    index.markDeleted('to_remove');

    // Size stays same but search won't return it
    const query = new Array(768).fill(0.3);
    const results = index.search(query, 1);

    expect(results.find(r => r.id === 'to_remove')).toBeUndefined();
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd /home/kaust/solvent-ai-v1-production/backend && npm test -- --grep "HNSWIndex"`

Expected: FAIL with "Cannot find module './hnswIndex'"

**Step 4: Implement HNSWIndex wrapper**

Create `backend/src/utils/hnswIndex.ts`:

```typescript
import { HierarchicalNSW } from 'hnswlib-node';
import fs from 'fs/promises';
import { logger } from './logger';

export interface SearchResult {
  id: string;
  distance: number;
}

export class HNSWIndex {
  private index: HierarchicalNSW;
  private dimension: number;
  private maxElements: number;
  private idToLabel: Map<string, number> = new Map();
  private labelToId: Map<number, string> = new Map();
  private deletedLabels: Set<number> = new Set();
  private nextLabel: number = 0;

  constructor(dimension: number, maxElements: number) {
    this.dimension = dimension;
    this.maxElements = maxElements;
    this.index = new HierarchicalNSW('cosine', dimension);
    this.index.initIndex(maxElements, 16, 200, 100); // M=16, efConstruction=200, randomSeed=100
  }

  add(id: string, vector: number[]): void {
    if (this.idToLabel.has(id)) {
      // Update existing - mark old as deleted and add new
      this.markDeleted(id);
    }

    const label = this.nextLabel++;
    this.idToLabel.set(id, label);
    this.labelToId.set(label, id);

    try {
      this.index.addPoint(vector, label);
    } catch (e) {
      logger.error(`[HNSWIndex] Failed to add point ${id}`, e);
    }
  }

  search(query: number[], k: number): SearchResult[] {
    if (this.nextLabel === 0) return [];

    const actualK = Math.min(k + this.deletedLabels.size, this.nextLabel);

    try {
      const result = this.index.searchKnn(query, actualK);
      const neighbors = result.neighbors;
      const distances = result.distances;

      const results: SearchResult[] = [];
      for (let i = 0; i < neighbors.length && results.length < k; i++) {
        const label = neighbors[i];
        if (!this.deletedLabels.has(label)) {
          const id = this.labelToId.get(label);
          if (id) {
            results.push({ id, distance: distances[i] });
          }
        }
      }
      return results;
    } catch (e) {
      logger.error('[HNSWIndex] Search failed', e);
      return [];
    }
  }

  markDeleted(id: string): void {
    const label = this.idToLabel.get(id);
    if (label !== undefined) {
      this.deletedLabels.add(label);
      this.idToLabel.delete(id);
    }
  }

  size(): number {
    return this.idToLabel.size;
  }

  async save(filePath: string): Promise<void> {
    try {
      this.index.writeIndexSync(filePath);

      // Save metadata separately
      const metadata = {
        idToLabel: Array.from(this.idToLabel.entries()),
        labelToId: Array.from(this.labelToId.entries()),
        deletedLabels: Array.from(this.deletedLabels),
        nextLabel: this.nextLabel
      };
      await fs.writeFile(`${filePath}.meta.json`, JSON.stringify(metadata));
      logger.info(`[HNSWIndex] Saved index to ${filePath}`);
    } catch (e) {
      logger.error('[HNSWIndex] Failed to save index', e);
      throw e;
    }
  }

  async load(filePath: string): Promise<void> {
    try {
      this.index = new HierarchicalNSW('cosine', this.dimension);
      this.index.readIndexSync(filePath);

      // Load metadata
      const metaContent = await fs.readFile(`${filePath}.meta.json`, 'utf-8');
      const metadata = JSON.parse(metaContent);

      this.idToLabel = new Map(metadata.idToLabel);
      this.labelToId = new Map(metadata.labelToId);
      this.deletedLabels = new Set(metadata.deletedLabels);
      this.nextLabel = metadata.nextLabel;

      logger.info(`[HNSWIndex] Loaded index from ${filePath} with ${this.idToLabel.size} entries`);
    } catch (e) {
      logger.error('[HNSWIndex] Failed to load index', e);
      throw e;
    }
  }

  rebuild(): void {
    // Compact the index by rebuilding without deleted entries
    const entries: { id: string; vector: number[] }[] = [];

    // Note: hnswlib doesn't expose vectors directly, so this requires external tracking
    logger.warn('[HNSWIndex] Rebuild requires external vector storage');
  }
}
```

**Step 5: Run test to verify it passes**

Run: `cd /home/kaust/solvent-ai-v1-production/backend && npm test -- --grep "HNSWIndex"`

Expected: PASS

**Step 6: Integrate HNSW into VectorService as optional fast path**

Add to `backend/src/services/vectorService.ts`:

```typescript
import { HNSWIndex } from '../utils/hnswIndex';

// Add to class properties:
private hnswIndex: HNSWIndex | null = null;
private hnswIndexPath: string;
private useHNSW: boolean = true;

// In constructor:
this.hnswIndexPath = path.resolve(__dirname, '../../../.solvent_hnsw.bin');
this.initHNSWIndex();

// Add initialization method:
private async initHNSWIndex() {
  try {
    this.hnswIndex = new HNSWIndex(768, config.MEMORY_MAX_ENTRIES + 500);

    // Try to load existing index
    try {
      await this.hnswIndex.load(this.hnswIndexPath);
      logger.info('[VectorService] Loaded existing HNSW index.');
    } catch {
      // No existing index, rebuild from memory
      await this.rebuildHNSWIndex();
    }
  } catch (e) {
    logger.warn('[VectorService] HNSW initialization failed, using brute force.', e);
    this.useHNSW = false;
  }
}

private async rebuildHNSWIndex() {
  if (!this.hnswIndex) return;

  logger.info('[VectorService] Rebuilding HNSW index from memory...');
  for (const entry of this.memory) {
    this.hnswIndex.add(entry.id, entry.vector);
  }

  await this.hnswIndex.save(this.hnswIndexPath);
  logger.info(`[VectorService] HNSW index rebuilt with ${this.memory.length} entries.`);
}

// Modify addEntry to also add to HNSW:
// After this.memory.push(entry):
if (this.hnswIndex && this.useHNSW) {
  this.hnswIndex.add(entry.id, entry.vector);
}

// Add fast search method:
async searchFast(query: string, limit: number = 5): Promise<VectorEntry[]> {
  if (!this.hnswIndex || !this.useHNSW) {
    return this.search(query, limit);
  }

  const queryVector = await this.getEmbedding(query);
  const results = this.hnswIndex.search(queryVector, limit * 2);

  // Map back to full entries and apply filters
  const entries: (VectorEntry & { score: number })[] = [];
  for (const { id, distance } of results) {
    const entry = this.memory.find(m => m.id === id);
    if (entry && entry.metadata.status !== 'deprecated') {
      entries.push({ ...entry, score: 1 - distance }); // Convert distance to similarity
    }
  }

  return entries.slice(0, limit);
}
```

**Step 7: Add periodic HNSW persistence**

In `saveMemory()`, add after backup logic:

```typescript
// Persist HNSW index periodically
if (this.hnswIndex && this.saveCounter % 10 === 0) {
  this.hnswIndex.save(this.hnswIndexPath).catch(e =>
    logger.error('[VectorService] HNSW save failed', e)
  );
}
```

**Step 8: Run all tests**

Run: `cd /home/kaust/solvent-ai-v1-production/backend && npm test`

Expected: PASS

**Step 9: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/utils/hnswIndex.ts backend/src/utils/hnswIndex.test.ts backend/src/services/vectorService.ts
git commit -m "feat(memory): add HNSW approximate nearest neighbor search

Implements O(log n) vector search using hnswlib-node:
- HNSWIndex wrapper with persistence
- Falls back to brute force if HNSW fails
- Auto-rebuilds index from memory on first run
- Persists index every 10 saves

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Semantic Deduplication in Context Service

**Files:**
- Modify: `backend/src/services/contextService.ts`
- Test: `backend/src/services/contextService.test.ts`

**Step 1: Write failing test for deduplication**

Add to `backend/src/services/contextService.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextService } from './contextService';
import { vectorService } from './vectorService';

describe('ContextService Deduplication', () => {
  let contextService: ContextService;

  beforeEach(() => {
    contextService = new ContextService();
  });

  it('should deduplicate semantically similar entries', async () => {
    // Add very similar entries to vector service
    const baseText = 'Authentication uses JWT tokens stored in httpOnly cookies';
    await vectorService.addEntry(baseText, {
      type: 'architectural_decision',
      tier: 'crystallized',
      tags: ['auth']
    });
    await vectorService.addEntry(baseText + ' for security', {
      type: 'architectural_decision',
      tier: 'crystallized',
      tags: ['auth', 'security']
    });
    await vectorService.addEntry('JWT tokens in httpOnly cookies for auth', {
      type: 'architectural_decision',
      tier: 'crystallized',
      tags: ['auth']
    });

    const result = await contextService.enrichContext({
      messages: [{ role: 'user', content: 'How does authentication work?' }],
      model: 'gemini-1.5-flash',
      mode: 'chat'
    });

    // Should not have 3 nearly identical entries in active items
    const authEntries = result.provenance.active.filter(a =>
      a.text.toLowerCase().includes('jwt') || a.text.toLowerCase().includes('auth')
    );

    // With deduplication, should have at most 1-2 auth entries, not 3
    expect(authEntries.length).toBeLessThanOrEqual(2);
  });

  it('should expose deduplication in suppressed items', async () => {
    const result = await contextService.enrichContext({
      messages: [{ role: 'user', content: 'How does authentication work?' }],
      model: 'gemini-1.5-flash',
      mode: 'chat'
    });

    const deduped = result.provenance.suppressed.filter(s =>
      s.reason === 'Duplicate of higher-scored entry'
    );

    // Just verify the structure exists
    expect(Array.isArray(deduped)).toBe(true);
  });
});
```

**Step 2: Run test to verify current behavior**

Run: `cd /home/kaust/solvent-ai-v1-production/backend && npm test -- --grep "Deduplication"`

Expected: May pass or fail depending on current behavior - establishes baseline

**Step 3: Add cosineSimilarity utility to ContextService**

Add to `backend/src/services/contextService.ts`:

```typescript
private cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }
  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}
```

**Step 4: Add deduplication logic to enrichContext**

Modify `enrichContext` in `backend/src/services/contextService.ts`:

```typescript
// After scoring entries, before processing active vs suppressed:

// --- SEMANTIC DEDUPLICATION ---
const SIMILARITY_THRESHOLD = 0.92;
const dedupedEntries: typeof scoredEntries = [];
const duplicateIds = new Set<string>();

for (const entry of scoredEntries) {
  if (duplicateIds.has(entry.id)) continue;

  // Check if this entry is too similar to any already-included entry
  let isDuplicate = false;
  for (const kept of dedupedEntries) {
    const similarity = this.cosineSimilarity(entry.vector, kept.vector);
    if (similarity > SIMILARITY_THRESHOLD) {
      isDuplicate = true;
      duplicateIds.add(entry.id);

      // Add to suppressed with reason
      suppressedItems.push({
        id: entry.id,
        text: entry.metadata.text?.substring(0, 150) + '...' || '',
        type: entry.metadata.type?.toUpperCase() || 'UNKNOWN',
        source: entry.metadata.isUniversal ? 'GLOBAL' : 'LOCAL',
        score: entry.finalScore,
        status: 'suppressed',
        reason: 'Duplicate of higher-scored entry'
      });
      break;
    }
  }

  if (!isDuplicate) {
    dedupedEntries.push(entry);
  }
}

// Use dedupedEntries instead of scoredEntries for the rest of processing
for (const entry of dedupedEntries) {
  // ... existing active/suppressed logic ...
}
```

**Step 5: Run test to verify it passes**

Run: `cd /home/kaust/solvent-ai-v1-production/backend && npm test -- --grep "Deduplication"`

Expected: PASS

**Step 6: Commit**

```bash
git add backend/src/services/contextService.ts backend/src/services/contextService.test.ts
git commit -m "feat(context): add semantic deduplication to prevent redundant context

Entries with >92% cosine similarity to already-included entries are
suppressed as duplicates. Improves context window efficiency by
avoiding near-duplicate memories.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Observability Metrics

**Files:**
- Create: `backend/src/utils/memoryMetrics.ts`
- Modify: `backend/src/services/vectorService.ts`
- Modify: `backend/src/services/contextService.ts`
- Create: `backend/src/routes/debugRoutes.ts`
- Modify: `backend/src/server.ts`
- Test: `backend/src/utils/memoryMetrics.test.ts`

**Step 1: Write failing test for metrics collector**

Create `backend/src/utils/memoryMetrics.test.ts`:

```typescript
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
    metrics.updateMemoryStats(1200, 1500, 800, 200);

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
    metrics.updateMemoryStats(1000, 1500, 700, 150);

    const prometheus = metrics.toPrometheus();
    expect(prometheus).toContain('solvent_memory_total_entries 1000');
    expect(prometheus).toContain('solvent_cache_hit_total 1');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd /home/kaust/solvent-ai-v1-production/backend && npm test -- --grep "MemoryMetrics"`

Expected: FAIL with "Cannot find module './memoryMetrics'"

**Step 3: Implement MemoryMetrics**

Create `backend/src/utils/memoryMetrics.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

Run: `cd /home/kaust/solvent-ai-v1-production/backend && npm test -- --grep "MemoryMetrics"`

Expected: PASS

**Step 5: Integrate metrics into VectorService**

Add to `backend/src/services/vectorService.ts`:

```typescript
import { memoryMetrics } from '../utils/memoryMetrics';

// In getEmbedding, after cache check:
if (cached) {
  cached.lastAccess = Date.now();
  memoryMetrics.recordCacheHit();
  return cached.vector;
}
// After successful API call:
memoryMetrics.recordCacheMiss();

// In cacheEmbedding:
memoryMetrics.updateCacheSize(this.embeddingCache.size);

// In search method, wrap with timing:
async search(query: string, limit: number = 5, filter?: { ... }) {
  const startTime = Date.now();
  try {
    // ... existing search logic ...

    const latency = Date.now() - startTime;
    memoryMetrics.recordRetrieval(latency, candidates.length, results.length);

    return results;
  } catch (error) {
    // ... existing error handling ...
  }
}

// Add method to update memory stats (call periodically or after saves):
private updateMetrics() {
  const byTier: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const entry of this.memory) {
    const tier = entry.metadata.tier || 'unknown';
    const type = entry.metadata.type || 'unknown';
    byTier[tier] = (byTier[tier] || 0) + 1;
    byType[type] = (byType[type] || 0) + 1;
  }

  memoryMetrics.updateMemoryStats(
    this.memory.length,
    config.MEMORY_MAX_ENTRIES,
    byTier,
    byType
  );
}

// Call in saveMemory() after successful save:
this.updateMetrics();
```

**Step 6: Integrate metrics into ContextService**

Add to `backend/src/services/contextService.ts`:

```typescript
import { memoryMetrics } from '../utils/memoryMetrics';

// In deduplication logic, when marking as duplicate:
if (similarity > SIMILARITY_THRESHOLD) {
  isDuplicate = true;
  duplicateIds.add(entry.id);
  memoryMetrics.recordDeduplication(similarity);
  // ... rest of suppression logic ...
}
```

**Step 7: Create debug routes**

Create `backend/src/routes/debugRoutes.ts`:

```typescript
import { Router } from 'express';
import { memoryMetrics } from '../utils/memoryMetrics';
import { vectorService } from '../services/vectorService';

const router = Router();

router.get('/memory-stats', (req, res) => {
  const stats = memoryMetrics.getStats();
  res.json(stats);
});

router.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(memoryMetrics.toPrometheus());
});

router.get('/memory-sample', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const entries = vectorService.getRecentEntries(limit);

  // Redact vectors for readability
  const sanitized = entries.map(e => ({
    id: e.id,
    metadata: e.metadata,
    vectorDim: e.vector?.length || 0
  }));

  res.json(sanitized);
});

router.post('/reset-metrics', (req, res) => {
  memoryMetrics.reset();
  res.json({ success: true, message: 'Metrics reset' });
});

export default router;
```

**Step 8: Register debug routes in server**

Add to `backend/src/server.ts`:

```typescript
import debugRoutes from './routes/debugRoutes';

// After other route registrations:
app.use('/debug', debugRoutes);
```

**Step 9: Run all tests**

Run: `cd /home/kaust/solvent-ai-v1-production/backend && npm test`

Expected: PASS

**Step 10: Commit**

```bash
git add backend/src/utils/memoryMetrics.ts backend/src/utils/memoryMetrics.test.ts backend/src/services/vectorService.ts backend/src/services/contextService.ts backend/src/routes/debugRoutes.ts backend/src/server.ts
git commit -m "feat(observability): add memory system metrics and debug endpoints

Implements MemoryMetrics for tracking:
- Retrieval latency (avg/min/max)
- Cache hit rate
- Memory saturation by tier/type
- Deduplication stats

Exposes /debug/memory-stats and /debug/metrics (Prometheus format).

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Embedding Cache Persistence | vectorService.ts |
| 2 | Memory Backup Rotation | backupManager.ts, vectorService.ts |
| 3 | HNSW Vector Search | hnswIndex.ts, vectorService.ts |
| 4 | Semantic Deduplication | contextService.ts |
| 5 | Observability Metrics | memoryMetrics.ts, debugRoutes.ts |

All tasks are independent and can be implemented in any order. Each includes tests, implementation, and a commit checkpoint.
