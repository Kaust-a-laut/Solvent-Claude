import { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { z } from 'zod';

const chatSchema = z.object({
  provider: z.enum(['gemini', 'ollama', 'deepseek', 'openrouter']),
  model: z.string(),
  mode: z.string().optional(),
  image: z.string().nullable().optional(),
  smartRouter: z.boolean().optional(),
  fallbackModel: z.string().optional(),
  messages: z.array(z.object({
    role: z.string(),
    content: z.string(),
    image: z.string().nullable().optional()
  })),
  temperature: : z.number().optional(),
  maxTokens: z.number().optional(),
  notepadContent: z.string().optional(),
  deviceInfo: z.object({
    isMobile: z.boolean(),
    isTablet: z.boolean(),
    isDesktop: z.boolean(),
    windowSize: z.object({
      width: z.number(),
      height: z.number()
    })
  }).optional()
});

const imageSchema = z.object({
  prompt: z.string(),
  model: z.string().optional()
});

export class AIController {
  
  static async checkHealth(req: Request, res: Response) {
    const models = await aiService.listAvailableModels();
    const status = models.ollama.length > 0 ? 'healthy' : 'degraded';
    res.json({ 
      status, 
      timestamp: new Date().toISOString(),
      services: {
        ollama: models.ollama.length > 0 ? 'online' : 'offline',
        gemini: 'configured',
        search: 'configured'
      }
    });
  }

  static async generateImage(req: Request, res: Response) {
    try {
      const { prompt, model } = imageSchema.parse(req.body);
      const result = await aiService.generateImage(prompt, model, req.get('host'), req.protocol);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Failed to generate image' });
    }
  }

  static async chat(req: Request, res: Response) {
    try {
      const data = chatSchema.parse(req.body);
      const result = await aiService.processChat(data);
      res.json(result);
    } catch (error: any) {
      console.error('[AIController] Chat Error:', error);
      const status = error.status || error.response?.status || 500;
      res.status(status).json({ 
        error: error.message || 'Internal Server Error',
        details: error.errorDetails || undefined
      });
    }
  }

  static async compare(req: Request, res: Response) {
    try {
      const result = await aiService.compareModels(req.body.messages);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Comparison failed.' });
    }
  }

  static async listModels(req: Request, res: Response) {
    try {
      const result = await aiService.listAvailableModels();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to list models.' });
    }
  }

  static async waterfall(req: Request, res: Response) {
    try {
      const { prompt, globalProvider } = req.body;
      const result = await aiService.runWaterfall(prompt, globalProvider);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Waterfall pipeline failed' });
    }
  }
}
