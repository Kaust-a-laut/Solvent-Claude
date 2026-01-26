# PnP Provider Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable dynamic provider resolution with graceful fallbacks, capability-based model selection, and offline-first resilience.

**Architecture:** The PluginManager becomes the single source of truth for provider availability. A new `resolveProvider()` helper implements 3-tier fallback (explicit → default → first-ready). Provider plugins gain a `capabilities` interface for mission-aware model selection.

**Tech Stack:** TypeScript, BullMQ (existing), existing plugin system (`IProviderPlugin`, `PluginManager`)

---

## Current State Analysis

| Component | Status | Notes |
|-----------|--------|-------|
| `IProviderPlugin` | Exists | Has `isReady()`, `complete()`, `vision()`, `embed()` |
| `PluginManager` | Exists | Has `getProvider()`, `getAllProviders()` |
| Provider plugins | 3 exist | `gemini.ts`, `groq.ts`, `ollama.ts` in `plugins/providers/` |
| `AIProviderFactory` | Thin wrapper | Just calls `pluginManager.getProvider()` |
| `aiService` | Hardcoded logic | Has provider-specific code, fallback chains baked in |
| `orchestrationService` | Hardcoded | Uses `'gemini'` / `'gemini-2.0-flash'` defaults |
| Config | No default provider | Missing `DEFAULT_PROVIDER` setting |

---

## Task 1: Add Capabilities Interface to IProviderPlugin

**Files:**
- Modify: `backend/src/types/plugins.ts:23-50`

**Step 1: Write the test**

```typescript
// backend/src/types/plugins.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/types/plugins.test.ts`
Expected: FAIL - `ProviderCapabilities` not exported

**Step 3: Add ProviderCapabilities interface**

```typescript
// Add after line 21 in backend/src/types/plugins.ts

export interface ProviderCapabilities {
  /** Supports vision/image input */
  supportsVision?: boolean;
  /** Supports streaming responses */
  supportsStreaming?: boolean;
  /** Supports embedding generation */
  supportsEmbeddings?: boolean;
  /** Maximum context window in tokens */
  contextWindow?: number;
  /** Maximum output tokens */
  maxOutputTokens?: number;
  /** Supports function/tool calling */
  supportsFunctionCalling?: boolean;
}

// Modify IProviderPlugin to add:
export interface IProviderPlugin extends IPlugin {
  /** Default model for this provider */
  defaultModel?: string;

  /** Provider capabilities */
  capabilities?: ProviderCapabilities;

  // ... rest unchanged
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx vitest run src/types/plugins.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/types/plugins.ts backend/src/types/plugins.test.ts
git commit -m "feat(plugins): add ProviderCapabilities interface"
```

---

## Task 2: Add DEFAULT_PROVIDER to Config

**Files:**
- Modify: `backend/src/config.ts:8-25`

**Step 1: Write the test**

```typescript
// backend/src/config.test.ts
import { config } from './config';

describe('config', () => {
  it('should have DEFAULT_PROVIDER with fallback to gemini', () => {
    expect(config.DEFAULT_PROVIDER).toBeDefined();
    // Default should be 'gemini' if not set in env
    expect(typeof config.DEFAULT_PROVIDER).toBe('string');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/config.test.ts`
Expected: FAIL - `DEFAULT_PROVIDER` undefined

**Step 3: Add DEFAULT_PROVIDER to schema**

```typescript
// In backend/src/config.ts, add to envSchema:
const envSchema = z.object({
  PORT: z.string().transform(Number).default('3001'),
  GEMINI_API_KEY: z.string().optional(),
  // Provider configuration
  DEFAULT_PROVIDER: z.string().default('gemini'),
  // ... rest unchanged
});
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx vitest run src/config.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/config.ts backend/src/config.test.ts
git commit -m "feat(config): add DEFAULT_PROVIDER setting"
```

---

## Task 3: Add Capabilities to Existing Provider Plugins

**Files:**
- Modify: `backend/src/plugins/providers/gemini.ts:6-12`
- Modify: `backend/src/plugins/providers/groq.ts:6-12`
- Modify: `backend/src/plugins/providers/ollama.ts:6-12`

**Step 1: Write the test**

```typescript
// backend/src/plugins/providers/providers.test.ts
import { GeminiProviderPlugin } from './gemini';
import { GroqProviderPlugin } from './groq';
import { OllamaProviderPlugin } from './ollama';

describe('Provider Capabilities', () => {
  it('gemini should declare vision and embedding support', () => {
    const plugin = new GeminiProviderPlugin();
    expect(plugin.capabilities?.supportsVision).toBe(true);
    expect(plugin.capabilities?.supportsEmbeddings).toBe(true);
    expect(plugin.capabilities?.contextWindow).toBeGreaterThan(0);
  });

  it('groq should declare streaming support', () => {
    const plugin = new GroqProviderPlugin();
    expect(plugin.capabilities?.supportsStreaming).toBe(true);
    expect(plugin.capabilities?.supportsVision).toBe(false);
  });

  it('ollama should declare local-first capabilities', () => {
    const plugin = new OllamaProviderPlugin();
    expect(plugin.capabilities?.supportsStreaming).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/plugins/providers/providers.test.ts`
Expected: FAIL - `capabilities` undefined

**Step 3: Add capabilities to each plugin**

```typescript
// backend/src/plugins/providers/gemini.ts - add after line 11:
  capabilities = {
    supportsVision: true,
    supportsStreaming: true,
    supportsEmbeddings: true,
    contextWindow: 1000000,  // Gemini 1.5 Pro
    maxOutputTokens: 8192,
    supportsFunctionCalling: true
  };

// backend/src/plugins/providers/groq.ts - add after line 11:
  capabilities = {
    supportsVision: false,
    supportsStreaming: true,
    supportsEmbeddings: false,
    contextWindow: 128000,
    maxOutputTokens: 8192,
    supportsFunctionCalling: true
  };

// backend/src/plugins/providers/ollama.ts - add after line 11:
  capabilities = {
    supportsVision: false,  // Depends on model
    supportsStreaming: true,
    supportsEmbeddings: false,
    contextWindow: 32768,  // Varies by model
    maxOutputTokens: 4096,
    supportsFunctionCalling: false
  };
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx vitest run src/plugins/providers/providers.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/plugins/providers/*.ts
git commit -m "feat(plugins): add capabilities to provider plugins"
```

---

## Task 4: Add resolveProvider Helper to PluginManager

**Files:**
- Modify: `backend/src/services/pluginManager.ts:204-218`

**Step 1: Write the test**

```typescript
// backend/src/services/pluginManager.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/services/pluginManager.test.ts`
Expected: FAIL - `resolveProvider` not a function

**Step 3: Implement resolveProvider**

```typescript
// Add to backend/src/services/pluginManager.ts after getAllTools() method:

  /**
   * Resolve the best available provider using 3-tier fallback:
   * 1. Explicit request (if provided and ready)
   * 2. Default provider from config (if ready)
   * 3. First available ready provider
   *
   * @param requested - Explicitly requested provider ID
   * @param defaultProvider - Default provider ID (falls back to config.DEFAULT_PROVIDER)
   * @param requiredCapabilities - Optional capabilities filter
   */
  async resolveProvider(
    requested?: string,
    defaultProvider?: string,
    requiredCapabilities?: Partial<ProviderCapabilities>
  ): Promise<IProviderPlugin> {
    const { config } = await import('../config');
    const effectiveDefault = defaultProvider || config.DEFAULT_PROVIDER;

    // Helper to check if provider meets capability requirements
    const meetsCapabilities = (provider: IProviderPlugin): boolean => {
      if (!requiredCapabilities) return true;
      const caps = provider.capabilities || {};

      for (const [key, value] of Object.entries(requiredCapabilities)) {
        if (value === true && !caps[key as keyof ProviderCapabilities]) {
          return false;
        }
        if (typeof value === 'number' && (caps[key as keyof ProviderCapabilities] || 0) < value) {
          return false;
        }
      }
      return true;
    };

    // 1. Try explicitly requested provider
    if (requested) {
      const plugin = this.registry.providers.get(requested);
      if (plugin && plugin.isReady() && meetsCapabilities(plugin)) {
        logger.debug(`[PluginManager] Resolved explicit provider: ${requested}`);
        return plugin;
      }
      logger.warn(`[PluginManager] Requested provider ${requested} not ready or missing capabilities`);
    }

    // 2. Try default provider
    if (effectiveDefault) {
      const plugin = this.registry.providers.get(effectiveDefault);
      if (plugin && plugin.isReady() && meetsCapabilities(plugin)) {
        logger.debug(`[PluginManager] Resolved default provider: ${effectiveDefault}`);
        return plugin;
      }
    }

    // 3. Find first ready provider that meets capabilities
    for (const provider of this.registry.providers.values()) {
      if (provider.isReady() && meetsCapabilities(provider)) {
        logger.info(`[PluginManager] Resolved fallback provider: ${provider.id}`);
        return provider;
      }
    }

    throw new Error('No operational AI providers found in the plugin system.');
  }
```

**Step 4: Add import for ProviderCapabilities**

```typescript
// At top of pluginManager.ts, update import:
import { IProviderPlugin, IToolPlugin, ProviderCapabilities } from '../types/plugins';
```

**Step 5: Run test to verify it passes**

Run: `cd backend && npx vitest run src/services/pluginManager.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add backend/src/services/pluginManager.ts backend/src/services/pluginManager.test.ts
git commit -m "feat(plugins): add resolveProvider with 3-tier fallback"
```

---

## Task 5: Update OrchestrationService to Use resolveProvider

**Files:**
- Modify: `backend/src/services/orchestrationService.ts:1-5,113-155`

**Step 1: Write the test**

```typescript
// backend/src/services/orchestrationService.test.ts
import { OrchestrationService } from './orchestrationService';

// Mock dependencies
jest.mock('./pluginManager', () => ({
  pluginManager: {
    resolveProvider: jest.fn().mockResolvedValue({
      id: 'mock-provider',
      complete: jest.fn().mockResolvedValue('Mock response'),
      isReady: () => true
    })
  }
}));

jest.mock('./vectorService', () => ({
  vectorService: {
    addEntry: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('OrchestrationService', () => {
  let service: OrchestrationService;

  beforeEach(() => {
    service = new OrchestrationService();
    jest.clearAllMocks();
  });

  it('should use pluginManager.resolveProvider instead of hardcoded provider', async () => {
    const { pluginManager } = require('./pluginManager');

    await service.runMission('consultation', 'Test goal', { async: false });

    expect(pluginManager.resolveProvider).toHaveBeenCalled();
  });

  it('should pass providerOverride to resolveProvider', async () => {
    const { pluginManager } = require('./pluginManager');

    await service.runMission('consultation', 'Test goal', {
      async: false,
      providerOverride: 'ollama'
    });

    expect(pluginManager.resolveProvider).toHaveBeenCalledWith(
      'ollama',
      expect.anything(),
      expect.anything()
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/services/orchestrationService.test.ts`
Expected: FAIL - still calling aiService with hardcoded provider

**Step 3: Refactor runMissionSync to use resolveProvider**

```typescript
// backend/src/services/orchestrationService.ts

// Update imports at top:
import { pluginManager } from './pluginManager';
import { logger } from '../utils/logger';
import { vectorService } from './vectorService';
import { taskService } from './taskService';
// Remove: import { aiService } from './aiService';

// Replace runMissionSync method:
  private async runMissionSync(
    templateId: string,
    goal: string,
    template: MissionTemplate,
    options: MissionOptions
  ): Promise<MissionResult> {
    logger.info(`[Orchestrator] Starting sync mission: ${templateId}`);

    // Resolve provider dynamically
    const provider = await pluginManager.resolveProvider(
      options.providerOverride,
      undefined,  // Use config default
      undefined   // No specific capabilities required
    );
    const model = options.modelOverride || provider.defaultModel || 'default';

    logger.info(`[Orchestrator] Using provider: ${provider.id}, model: ${model}`);

    // Phase 1: Parallel Agent Analysis
    const expertOpinions = await Promise.all(template.agents.map(async (agent) => {
      // Per-agent provider override if specified
      const agentProvider = agent.provider
        ? await pluginManager.resolveProvider(agent.provider)
        : provider;
      const agentModel = agent.model || model;

      const response = await agentProvider.complete(
        [{ role: 'user', content: `GOAL: ${goal}\n\nAs the ${agent.name}, provide your professional analysis. ${agent.instruction}` }],
        { model: agentModel }
      );
      return { agent: agent.name, opinion: response };
    }));

    // Phase 2: Anchored Synthesis Pass
    const synthesisPrompt = `I have gathered analysis from multiple experts regarding: "${goal}"

    INVARIANTS TO MAINTAIN:
    ${template.intentAssertions.map(a => `- ${a}`).join('\n')}

    EXPERT FEEDBACK:
    ${expertOpinions.map(o => `--- ${o.agent} ---\n${o.opinion}`).join('\n\n')}

    TASK:
    ${template.synthesisInstruction}

    Verify that the consensus meets all INVARIANTS.
    Output the synthesis followed by a 'VERIFICATION' section marking each invariant as PASSED or FAILED.`;

    const synthesis = await provider.complete(
      [{ role: 'user', content: synthesisPrompt }],
      { model }
    );

    // Phase 3: Memory Persistence
    await vectorService.addEntry(synthesis, {
      type: 'mission_synthesis',
      templateId,
      goal,
      timestamp: new Date().toISOString()
    });

    return {
      goal,
      expertOpinions,
      synthesis
    };
  }
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx vitest run src/services/orchestrationService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/orchestrationService.ts backend/src/services/orchestrationService.test.ts
git commit -m "refactor(orchestration): use pluginManager.resolveProvider"
```

---

## Task 6: Update orchestrationJob to Use resolveProvider

**Files:**
- Modify: `backend/src/jobs/orchestrationJob.ts:1-20,25-50`

**Step 1: Write the test**

```typescript
// backend/src/jobs/orchestrationJob.test.ts
import { orchestrationJob, OrchestrationJobData } from './orchestrationJob';
import { Job } from 'bullmq';

jest.mock('../services/pluginManager', () => ({
  pluginManager: {
    resolveProvider: jest.fn().mockResolvedValue({
      id: 'mock-provider',
      defaultModel: 'mock-model',
      complete: jest.fn().mockResolvedValue('Mock response'),
      isReady: () => true
    })
  }
}));

jest.mock('../services/vectorService', () => ({
  vectorService: {
    addEntry: jest.fn().mockResolvedValue(undefined)
  }
}));

describe('orchestrationJob', () => {
  it('should use resolveProvider with providerOverride', async () => {
    const { pluginManager } = require('../services/pluginManager');

    const mockJob = {
      data: {
        templateId: 'consultation',
        goal: 'Test goal',
        template: {
          agents: [{ id: 'test', name: 'Test Agent', instruction: 'Test' }],
          synthesisInstruction: 'Synthesize',
          intentAssertions: ['Test assertion']
        },
        providerOverride: 'ollama'
      },
      updateProgress: jest.fn()
    } as unknown as Job<OrchestrationJobData>;

    await orchestrationJob(mockJob);

    expect(pluginManager.resolveProvider).toHaveBeenCalledWith(
      'ollama',
      expect.anything(),
      expect.anything()
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd backend && npx vitest run src/jobs/orchestrationJob.test.ts`
Expected: FAIL - still using aiService

**Step 3: Refactor orchestrationJob**

```typescript
// backend/src/jobs/orchestrationJob.ts - full replacement:
import { Job } from 'bullmq';
import { pluginManager } from '../services/pluginManager';
import { vectorService } from '../services/vectorService';
import { logger } from '../utils/logger';
import { MissionTemplate } from '../services/orchestrationService';

export interface OrchestrationJobData {
  templateId: string;
  goal: string;
  template: MissionTemplate;
  providerOverride?: string;
  modelOverride?: string;
}

export async function orchestrationJob(job: Job<OrchestrationJobData>): Promise<any> {
  const { templateId, goal, template, providerOverride, modelOverride } = job.data;

  logger.info(`[OrchestrationJob] Starting mission: ${templateId} for goal: ${goal.substring(0, 50)}...`);

  try {
    // Resolve provider dynamically
    const provider = await pluginManager.resolveProvider(providerOverride);
    const model = modelOverride || provider.defaultModel || 'default';

    logger.info(`[OrchestrationJob] Using provider: ${provider.id}, model: ${model}`);

    // Report initial progress (0-5%)
    await job.updateProgress(5);

    // Phase 1: Parallel expert analysis (5-75%)
    const agentCount = template.agents.length;
    const progressPerAgent = 70 / agentCount;

    const expertOpinions = await Promise.all(template.agents.map(async (agent, index) => {
      // Per-agent provider override if specified
      const agentProvider = agent.provider
        ? await pluginManager.resolveProvider(agent.provider)
        : provider;
      const agentModel = agent.model || model;

      const response = await agentProvider.complete(
        [{ role: 'user', content: `GOAL: ${goal}\n\nAs the ${agent.name}, provide your professional analysis. ${agent.instruction}` }],
        { model: agentModel }
      );

      // Update progress after each agent completes
      const currentProgress = 5 + (progressPerAgent * (index + 1));
      await job.updateProgress(Math.min(75, Math.round(currentProgress)));

      return { agent: agent.name, opinion: response };
    }));

    // Phase 2: Synthesis pass (75-90%)
    await job.updateProgress(75);

    const synthesisPrompt = `I have gathered analysis from multiple experts regarding: "${goal}"

    INVARIANTS TO MAINTAIN:
    ${template.intentAssertions.map(a => `- ${a}`).join('\n')}

    EXPERT FEEDBACK:
    ${expertOpinions.map(o => `--- ${o.agent} ---\n${o.opinion}`).join('\n\n')}

    TASK:
    ${template.synthesisInstruction}

    Verify that the consensus meets all INVARIANTS.
    Output the synthesis followed by a 'VERIFICATION' section marking each invariant as PASSED or FAILED.`;

    const synthesis = await provider.complete(
      [{ role: 'user', content: synthesisPrompt }],
      { model }
    );

    await job.updateProgress(90);

    // Phase 3: Memory persistence (90-100%)
    await vectorService.addEntry(synthesis, {
      type: 'mission_synthesis',
      templateId,
      goal,
      timestamp: new Date().toISOString()
    });

    await job.updateProgress(100);

    logger.info(`[OrchestrationJob] Completed mission: ${templateId} for goal: ${goal.substring(0, 50)}...`);

    return {
      success: true,
      goal,
      expertOpinions,
      synthesis,
      completedAt: new Date().toISOString()
    };
  } catch (error: any) {
    logger.error(`[OrchestrationJob] Failed mission: ${templateId}`, error);
    throw new Error(`Orchestration mission failed: ${error.message}`);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd backend && npx vitest run src/jobs/orchestrationJob.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/jobs/orchestrationJob.ts backend/src/jobs/orchestrationJob.test.ts
git commit -m "refactor(jobs): orchestrationJob uses resolveProvider"
```

---

## Task 7: Ensure PluginManager Initializes on Startup

**Files:**
- Modify: `backend/src/index.ts` (or main entry point)

**Step 1: Verify current startup behavior**

Run: `grep -n "pluginManager" backend/src/index.ts`

**Step 2: Add pluginManager.initialize() to startup if missing**

```typescript
// In backend/src/index.ts, add near the top after imports:
import { pluginManager } from './services/pluginManager';

// In the main startup sequence (before app.listen):
await pluginManager.initialize();
logger.info('[Server] Plugin system initialized');
```

**Step 3: Verify TypeScript compiles**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add backend/src/index.ts
git commit -m "chore(startup): ensure pluginManager initializes on boot"
```

---

## Task 8: Integration Test - Full Flow

**Files:**
- Create: `backend/src/tests/integration/providerResolution.test.ts`

**Step 1: Write integration test**

```typescript
// backend/src/tests/integration/providerResolution.test.ts
import { pluginManager } from '../../services/pluginManager';
import { orchestrationService } from '../../services/orchestrationService';

describe('Provider Resolution Integration', () => {
  beforeAll(async () => {
    await pluginManager.initialize();
  });

  it('should resolve a provider and complete a request', async () => {
    // Skip if no providers are configured
    const providers = pluginManager.getAllProviders();
    if (providers.length === 0 || !providers.some(p => p.isReady())) {
      console.log('Skipping: No ready providers');
      return;
    }

    const provider = await pluginManager.resolveProvider();
    expect(provider).toBeDefined();
    expect(provider.isReady()).toBe(true);
  });

  it('should run a mission with dynamic provider resolution', async () => {
    const providers = pluginManager.getAllProviders();
    if (providers.length === 0 || !providers.some(p => p.isReady())) {
      console.log('Skipping: No ready providers');
      return;
    }

    // Run a simple consultation mission
    const result = await orchestrationService.runMission(
      'consultation',
      'What is 2+2?',
      { async: false }
    );

    expect(result).toHaveProperty('goal');
    expect(result).toHaveProperty('synthesis');
  });
});
```

**Step 2: Run integration test**

Run: `cd backend && npx vitest run src/tests/integration/providerResolution.test.ts`
Expected: PASS (or skip if no API keys)

**Step 3: Commit**

```bash
git add backend/src/tests/integration/providerResolution.test.ts
git commit -m "test(integration): add provider resolution tests"
```

---

## Task 9: Update Documentation

**Files:**
- Create: `docs/PROVIDER_SYSTEM.md`

**Step 1: Write documentation**

```markdown
# Provider System

## Overview

Solvent uses a plugin-based provider system for AI model access. Providers are dynamically resolved based on availability and capabilities.

## Resolution Order

1. **Explicit Request**: If a provider is explicitly requested and ready, use it
2. **Default Provider**: Fall back to `DEFAULT_PROVIDER` from config (default: `gemini`)
3. **First Available**: Use the first ready provider from the registry

## Configuration

Set your preferred default provider in `.env`:

```bash
DEFAULT_PROVIDER=gemini  # Options: gemini, groq, ollama
```

## Provider Capabilities

Each provider declares its capabilities:

| Provider | Vision | Streaming | Embeddings | Context Window |
|----------|--------|-----------|------------|----------------|
| Gemini   | Yes    | Yes       | Yes        | 1M tokens      |
| Groq     | No     | Yes       | No         | 128K tokens    |
| Ollama   | No*    | Yes       | No         | 32K tokens     |

*Ollama vision support depends on the model.

## Adding a New Provider

1. Create `backend/src/plugins/providers/yourprovider.ts`
2. Implement `IProviderPlugin` interface
3. Add capabilities declaration
4. Export as default for auto-discovery

## API Usage

```typescript
// Explicit provider
const result = await orchestrationService.runMission('consultation', goal, {
  providerOverride: 'ollama',
  modelOverride: 'llama3.2:latest'
});

// Let system choose best available
const result = await orchestrationService.runMission('consultation', goal);
```
```

**Step 2: Commit**

```bash
git add docs/PROVIDER_SYSTEM.md
git commit -m "docs: add provider system documentation"
```

---

## Verification Checklist

After all tasks complete:

1. **Unit tests pass**: `cd backend && npm test`
2. **TypeScript compiles**: `cd backend && npx tsc --noEmit`
3. **Manual test sync mode**:
   ```bash
   curl -X POST http://localhost:3001/api/collaborate \
     -H "Content-Type: application/json" \
     -d '{"goal":"Test goal","missionType":"consultation"}'
   ```
4. **Manual test with provider override**:
   ```bash
   curl -X POST http://localhost:3001/api/collaborate \
     -H "Content-Type: application/json" \
     -d '{"goal":"Test goal","missionType":"consultation","provider":"ollama"}'
   ```
5. **Verify fallback works**: Stop Ollama, request with `"provider":"ollama"`, should fall back

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Add ProviderCapabilities interface | `types/plugins.ts` |
| 2 | Add DEFAULT_PROVIDER config | `config.ts` |
| 3 | Add capabilities to providers | `plugins/providers/*.ts` |
| 4 | Implement resolveProvider | `pluginManager.ts` |
| 5 | Refactor orchestrationService | `orchestrationService.ts` |
| 6 | Refactor orchestrationJob | `jobs/orchestrationJob.ts` |
| 7 | Initialize plugins on startup | `index.ts` |
| 8 | Integration tests | `tests/integration/` |
| 9 | Documentation | `docs/PROVIDER_SYSTEM.md` |
