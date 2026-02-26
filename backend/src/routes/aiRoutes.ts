import { Router } from 'express';
import { AIController } from '../controllers/aiController';
import { aiService } from '../services/aiService';
import { debateService } from '../services/debateService';
import { supervisorService } from '../services/supervisorService';
import { orchestrationService } from '../services/orchestrationService';

const router = Router();

// ── Core Chat ──────────────────────────────────────────────────────────────
router.post('/chat', AIController.chat);

// ── Waterfall (SSE streaming) ──────────────────────────────────────────────
router.post('/waterfall', AIController.waterfall);

// ── Image Generation ──────────────────────────────────────────────────────
router.post('/generate-image', AIController.generateImage);

// ── Web Search ────────────────────────────────────────────────────────────
router.post('/search', AIController.search);

// ── Model / Health Discovery ──────────────────────────────────────────────
router.get('/models', AIController.listModels);
router.get('/health/services', AIController.checkHealth);
router.get('/local-image-status', AIController.checkLocalImageStatus);

// ── Agentic Compare ───────────────────────────────────────────────────────
router.post('/compare', AIController.compare);

// ── Multi-Agent Collaborate ───────────────────────────────────────────────
router.post('/collaborate', async (req, res) => {
  const { goal, missionType = 'consultation', async: isAsync, provider, model } = req.body;
  if (!goal) return res.status(400).json({ error: 'Goal is required' });

  try {
    const result = await orchestrationService.runMission(missionType, goal, {
      async: isAsync,
      providerOverride: provider,
      modelOverride: model
    });

    // Return 202 Accepted for async requests
    if (isAsync && 'jobId' in result) {
      return res.status(202).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Task Status Polling Endpoint
router.get('/tasks/:jobId', async (req, res) => {
  const { jobId } = req.params;

  try {
    const { taskService } = await import('../services/taskService');
    const status = await taskService.getJobStatus(jobId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Plugin Discovery Endpoint
router.get('/plugins', async (req, res) => {
  try {
    const { pluginManager } = await import('../services/pluginManager');
    await pluginManager.initialize(); // Ensure plugins are loaded

    const registry = pluginManager.getRegistry();
    const pluginsInfo = {
      providers: Array.from(registry.providers.values()).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        version: p.version,
        defaultModel: p.defaultModel
      })),
      tools: Array.from(registry.tools.values()).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        version: t.version,
        schema: t.schema
      }))
    };

    res.json(pluginsInfo);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
