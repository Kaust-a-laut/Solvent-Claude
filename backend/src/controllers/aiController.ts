import { Request, Response } from 'express';
import { aiService } from '../services/aiService';
import { metaMemoryService } from '../services/metaMemoryService';
import { taskService } from '../services/taskService';
import { z } from 'zod';

export class AIController {
  static async chat(req: Request, res: Response) {
    try {
      const result = await aiService.processChat(req.body);
      res.json(result);
    } catch (error: any) {
      console.error('[AIController] Chat Error:', error);
      res.status(error.status || 500).json({ error: error.message || 'Chat processing failed' });
    }
  }

  static async generateImage(req: Request, res: Response) {
    try {
      const imageSchema = z.object({
        prompt: z.string(),
        model: z.string().optional(),
        provider: z.string().optional(),
        localUrl: z.string().optional(),
        apiKeys: z.record(z.string()).optional()
      });
      const { prompt, model, provider, localUrl, apiKeys } = imageSchema.parse(req.body);
      const result = await aiService.generateImage(prompt, model, apiKeys?.gemini, provider, { localUrl, apiKeys });
      res.json(result);
    } catch (error: any) {
      console.error('[AIController] Image Generation Error:', error);
      res.status(500).json({ error: error.message || 'Image generation failed' });
    }
  }

  static async search(req: Request, res: Response) {
    try {
      const { query } = req.body;
      const result = await aiService.performSearch(query);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async compare(req: Request, res: Response) {
    try {
      const { messages } = req.body;
      const result = await aiService.compareModels(messages);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async waterfall(req: Request, res: Response) {
    const controller = new AbortController();
    
    // SSE Setup
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    req.on('close', () => {
      controller.abort();
      res.end();
    });

    try {
      const { prompt, globalProvider, notepadContent, openFiles, forceProceed } = req.body;
      
      const result = await aiService.runAgenticWaterfall(
        prompt, 
        globalProvider, 
        undefined, 
        (phase, data) => {
          if (!controller.signal.aborted) {
            res.write(`data: ${JSON.stringify({ phase, ...data })}\n\n`);
          }
        },
        notepadContent,
        openFiles,
        controller.signal,
        forceProceed
      );

      if (!controller.signal.aborted) {
        res.write(`data: ${JSON.stringify({ phase: 'final', ...result })}\n\n`);
        res.end();
      }
    } catch (error: any) {
      if (!controller.signal.aborted) {
        // If cancelled, connection is already closed
        res.write(`data: ${JSON.stringify({ phase: 'error', message: error.message })}\n\n`);
        res.end();
      }
    }
  }

  static async waterfallStep(req: Request, res: Response) {
    try {
      const { step, input, context, globalProvider } = req.body;
      const result = await (aiService as any).runStep(step, input, context, globalProvider);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async indexProject(req: Request, res: Response) {
    try {
      // Use the task service to dispatch the indexing job asynchronously
      const jobId = await taskService.dispatchIndexingJob(process.cwd());
      res.json({
        status: 'queued',
        jobId,
        message: 'Project indexing has been queued for processing'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async listModels(req: Request, res: Response) {
    try {
      const result = await aiService.listAvailableModels();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async checkLocalImageStatus(req: Request, res: Response) {
    try {
      const result = await aiService.checkLocalImageStatus();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async checkHealth(req: Request, res: Response) {
    try {
      const result = await aiService.checkHealth();
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  static async synthesizeMemory(req: Request, res: Response) {
    try {
      const summary = await metaMemoryService.synthesizeStateOfTheUnion();
      res.json({ status: 'success', summary });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
