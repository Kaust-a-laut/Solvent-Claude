import { Request, Response } from 'express';
import { GeminiService } from '../services/geminiService';
import { OllamaService } from '../services/ollamaService';
import { SearchService } from '../services/searchService';
import { z, ZodError } from 'zod';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const geminiService = new GeminiService();
const ollamaService = new OllamaService();
const searchService = new SearchService();

const chatSchema = z.object({
  provider: z.enum(['gemini', 'ollama']),
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
  temperature: z.number().optional()
});

const imageSchema = z.object({
  prompt: z.string(),
  model: z.string().optional()
});

export class AIController {
  
  static async generateImage(req: Request, res: Response) {
    try {
      const { prompt, model } = imageSchema.parse(req.body);
      const result = await geminiService.generateImage(prompt, model || 'gemini-2.0-flash-exp');
      
      const fileName = `generated_${uuidv4()}.png`;
      const filePath = path.join(__dirname, '../../generated_images', fileName);
      
      const buffer = Buffer.from(result.base64, 'base64');
      fs.writeFileSync(filePath, buffer);
      
      const imageUrl = `${req.protocol}://${req.get('host')}/generated_images/${fileName}`;
      
      res.json({ imageUrl, fileName });
    } catch (error) {
      console.error('Image Generation Error:', error);
      res.status(500).json({ error: (error as any).message || 'Failed to generate image' });
    }
  }

  static async chat(req: Request, res: Response) {
    try {
      const { provider, model, messages, image, mode, smartRouter, fallbackModel } = chatSchema.parse(req.body);
      const isSmartRouterEnabled = smartRouter !== false;
      let lastMessage = messages[messages.length - 1].content;

      // --- ADVANCED MODE ROUTING ---

      // 1. Browser/Search Mode
      if (mode === 'browser' || mode === 'scholarly') {
        try {
          console.log(`Executing search for [${mode}]: "${lastMessage}"`);
          const results = await searchService.search(lastMessage);
          
          if (results.length > 0) {
            const context = results.map(r => `[${r.source}] ${r.title}: ${r.snippet}`).join('\n\n');
            const systemPrompt = mode === 'scholarly' 
              ? "[SYSTEM: SCHOLARLY RESEARCH] Use the provided search results to write a deep, academic response with citations. Focus on factual accuracy and multiple perspectives."
              : "[SYSTEM: WEB BROWSING] Use the following real-time search results to answer the query accurately.";
            
            lastMessage = `
            ${systemPrompt}
            
            Context:
            ${context}
            
            User Query: "${lastMessage}"
            `;
          }
        } catch (searchError) {
          console.error('Search failed:', searchError);
        }
      }

      // 2. Deep Thought Mode
      if (mode === 'deep_thought') {
        const reasoningPrompt = `
        [SYSTEM: DEEP THOUGHT] 
        You are an elite reasoning engine. Analyze the query with extreme depth. 
        Output your internal reasoning inside <thinking> tags. 
        Consider contradictions, edge cases, and multi-step logic before providing the final answer.
        `;
        lastMessage = `${reasoningPrompt}\n\nUser Query: ${lastMessage}`;
      }

      // 3. Analysis / Graph Extraction Mode
      if (mode === 'analysis') {
        const analysisPrompt = `
        [SYSTEM: DATA ANALYSIS & GRAPHING]
        Analyze the following text for entities and relationships. 
        You MUST provide a detailed explanation AND a knowledge graph at the end.
        Format graph as: <graph_data>{ "nodes": [...], "edges": [...] }</graph_data>
        `;
        lastMessage = `${analysisPrompt}\n\n${lastMessage}`;
      }

      // --- EXECUTION ---

      if (provider === 'gemini') {
        try {
            if (image || mode === 'vision') {
              // Handle Vision
              const targetImage = image || (messages.find(m => m.image)?.image);
              if (!targetImage) throw new Error('No image provided for vision mode.');

              const matches = targetImage.match(/^data:(.+);base64,(.+)$/);
              if (!matches) throw new Error('Invalid image format.');

              const imagePart = { inlineData: { data: matches[2], mimeType: matches[1] } };
              const response = await geminiService.generateVisionContent(lastMessage, [imagePart], model);
              return res.json({ response, model });
            }

            // Standard Text / Hybrid
            const messagesWithContext = [...messages];
            messagesWithContext[messagesWithContext.length - 1].content = lastMessage;

            const shouldSearch = (mode !== 'browser' && mode !== 'scholarly') && isSmartRouterEnabled;
            const response = await geminiService.generateChatCompletion(messagesWithContext, model, shouldSearch);
            res.json({ response, model });

        } catch (error: any) {
             // Fallback Logic (simplified for brevity, keeping existing strategy)
             const isQuotaError = error.message?.includes('QUOTA') || error.message?.includes('429');
             if (isQuotaError) {
                 const targetLocalModel = fallbackModel || 'qwen2.5:3b';
                 const response = await ollamaService.generateChatCompletion(targetLocalModel, messages);
                 return res.json({ response: response.message.content, model: targetLocalModel, info: 'Fallback engaged.' });
             }
             throw error;
        }

      } else if (provider === 'ollama') {
        const messagesWithContext = [...messages];
        messagesWithContext[messagesWithContext.length - 1].content = lastMessage;
        const response = await ollamaService.generateChatCompletion(model, messagesWithContext);
        res.json({ response: response.message.content });
      }

    } catch (error) {
      console.error('AIController Error:', error);
      res.status(500).json({ error: (error as any).message || 'Internal Server Error' });
    }
  }

  static async compare(req: Request, res: Response) {
      try {
          const { messages } = req.body;
          const prompt = messages[messages.length - 1].content;

          const [geminiRes, ollamaRes] = await Promise.allSettled([
              geminiService.generateChatCompletion(messages, 'gemini-1.5-flash', false),
              ollamaService.generateChatCompletion('qwen2.5:3b', messages)
          ]);

          res.json({
              gemini: geminiRes.status === 'fulfilled' ? geminiRes.value : 'Gemini error.',
              ollama: ollamaRes.status === 'fulfilled' ? (ollamaRes.value as any).message.content : 'Ollama error.'
          });
      } catch (error) {
          res.status(500).json({ error: 'Comparison failed.' });
      }
  }

  static async listModels(req: Request, res: Response) {
      try {
          const ollamaModels = await ollamaService.listModels();
          res.json({
              ollama: ollamaModels.models,
              gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'] 
          });
      } catch (error) {
          res.status(500).json({ error: 'Failed to list models.' });
      }
  }
}
