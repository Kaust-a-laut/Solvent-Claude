import { Router } from 'express';
import { AIController } from '../controllers/aiController';
import { aiService } from '../services/aiService';
import { debateService } from '../services/debateService';

const router = Router();

router.post('/chat', AIController.chat);
router.post('/search', AIController.search);
router.post('/compare', AIController.compare);
router.post('/debate', async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: 'Topic is required' });
  
  try {
    const result = await debateService.conductDebate(topic);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
router.post('/generate-image', AIController.generateImage);
router.get('/local-image-status', AIController.checkLocalImageStatus);
router.get('/health/services', AIController.checkHealth);
router.get('/session-context', async (req, res) => {
  try {
    const context = await aiService.getSessionContext();
    res.json({ context });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
router.post('/memory/synthesize', AIController.synthesizeMemory);
router.post('/memory/deprecate', async (req, res) => {
  const { id, reason } = req.body;
  try {
    const success = await aiService.deprecateMemory(id, reason);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
router.post('/waterfall', AIController.waterfall);
router.post('/waterfall/step', AIController.waterfallStep);
router.post('/index', AIController.indexProject);
router.get('/models', AIController.listModels);
router.post('/process', async (req, res) => {
  try {
    const result = await aiService.processChat(req.body);
    res.json(result);
  } catch (error: any) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

router.post('/collaborate', async (req, res) => {
  const { goal } = req.body;

  const personas = [
    { role: 'pm', name: 'Product Manager', instruction: 'Focus on business value, user experience, and roadmap alignment.' },
    { role: 'engineer', name: 'Lead Engineer', instruction: 'Focus on technical architecture, scalability, and code quality.' },
    { role: 'security', name: 'Security Auditor', instruction: 'Focus on potential vulnerabilities, data privacy, and security best practices.' }
  ];

  try {
    const opinions = await Promise.all(personas.map(async (p) => {
      const response = await aiService.processChat({
        messages: [{ role: 'user', content: `Mission Goal: ${goal}\n\nAs the ${p.name}, provide your professional opinion on this mission. ${p.instruction}` }],
        provider: 'gemini',
        model: 'gemini-3-flash-preview',
        smartRouter: false
      });
      return { role: p.role, opinion: response.response, status: 'completed' };
    }));
    res.json({ opinions });
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
