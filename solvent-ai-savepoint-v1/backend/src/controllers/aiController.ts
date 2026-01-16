import { Request, Response } from 'express';
import { GeminiService } from '../services/geminiService';
import { OllamaService } from '../services/ollamaService';
import { SearchService } from '../services/searchService';
import { z, ZodError } from 'zod';

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

export class AIController {
  
  static async chat(req: Request, res: Response) {
    try {
      const { provider, model, messages, image, mode, smartRouter, fallbackModel } = chatSchema.parse(req.body);
      const isSmartRouterEnabled = smartRouter !== false; // Default to true if not provided
      let lastMessage = messages[messages.length - 1].content;

      // --- BROWSER MODE: Manual Search Injection ---
      if (mode === 'browser') {
        try {
          console.log(`Executing search for: "${lastMessage}"`);
          const results = await searchService.search(lastMessage);
          
          if (results.length > 0) {
            const context = results.map(r => `[${r.source}] ${r.title} (${r.link}): ${r.snippet}`).join('\n\n');
            lastMessage = `
            [SYSTEM: WEB BROWSING]
            You are a helpful research assistant with access to real-time web search results.
            
            User Query: "${lastMessage}"
            
            Search Results:
            ${context}
            
            Instructions:
            1. Answer the user's query using ONLY the search results provided above.
            2. Cite your sources using [1], [2] notation or direct links.
            3. If the results are irrelevant, state that you couldn't find specific information.
            4. Be concise and factual.
            `;
          } else {
            lastMessage = `[SYSTEM] Search performed but no results found for: "${lastMessage}". Answer to the best of your knowledge.`;
          }
        } catch (searchError) {
          console.error('Search failed:', searchError);
          // Continue without search results
        }
      }

      // --- DEEP THOUGHT MODE ---
      if (mode === 'deep_thought') {
        const reasoningPrompt = `
        [SYSTEM INSTRUCTION: DEEP THOUGHT MODE]
        You are a deep reasoning engine. You MUST output your internal chain of thought before your final answer. 
        Enclose your reasoning process inside <thinking> ... </thinking> tags. 
        Analyze the request step-by-step, consider edge cases, and validate your logic.
        After the thinking block, provide the final clear response.
        `;
        lastMessage = `${reasoningPrompt}\n\nUser Query: ${lastMessage}`;
      }

      // --- GRAPH EXTRACTION (Gemini Only for now) ---
      if (provider === 'gemini') {
        const graphPrompt = `
        [SYSTEM: KNOWLEDGE GRAPH]
        If the response involves connected concepts, you may append a Knowledge Graph JSON block at the very end.
        Format: <graph_data>{ "nodes": [{"id": "term_id", "title": "Term", "mode": "chat"}], "edges": [{"source": "term_id", "target": "other_id"}] }</graph_data>
        Use "mode" values like: "chat", "vision", "coding", "deep_thought".
        Keep titles concise (1-3 words). Only generate if relevant.
        `;
        lastMessage = `${graphPrompt}\n\n${lastMessage}`;
      }

      if (provider === 'gemini') {
        try {
            if (image) {
              // Handle Vision Request
              const matches = image.match(/^data:(.+);base64,(.+)$/);
              if (!matches) return res.status(400).json({ error: 'Invalid image format.' });

              const mimeType = matches[1];
              const data = matches[2];

              const imagePart = {
                inlineData: {
                  data,
                  mimeType
                }
              };

              // Vision requests are typically single-turn in this architecture for now
              const response = await geminiService.generateVisionContent(lastMessage, [imagePart], model);
              res.json({ response, model });

            } else {
              // Text-only request
              const messagesWithContext = [...messages];
              messagesWithContext[messagesWithContext.length - 1].content = lastMessage;

              // Enable search by default unless explicitly disabled
              // CRITICAL: If mode is 'browser', we already injected Serper results, 
              // so we set shouldSearch to false to avoid redundant calls/quota usage.
              const shouldSearch = mode === 'browser' ? false : isSmartRouterEnabled;
              
              const response = await geminiService.generateChatCompletion(messagesWithContext, model, shouldSearch);
              res.json({ response, model });
            }
        } catch (error: any) {
             const isQuotaError = error.message?.includes('QUOTA') || error.message?.includes('SERVICE_OVERLOAD') || error.message?.includes('429');
             
             if (isQuotaError) {
                 console.warn('⚠️ Gemini Quota Exhausted. Initiating Fallback Strategy...');
                 
                 const targetLocalModel = fallbackModel || 'qwen2.5:3b';
                 let fallbackPrompt = lastMessage;

                 // If we haven't already searched (i.e. not browser mode), do it now to help the local model
                 if (mode !== 'browser') {
                     console.log('Fetching search context for local fallback...');
                     try {
                        const originalQuery = messages[messages.length - 1].content;
                        const results = await searchService.search(originalQuery);
                        const searchContext = results.map(r => `• ${r.title}: ${r.snippet}`).join('\n');
                        
                        fallbackPrompt = `
                        [SYSTEM: FALLBACK MODE]
                        The primary cloud model is unavailable. You are answering via a local model with search assistance.
                        
                        Search Context:
                        ${searchContext}
                        
                        User Query: ${originalQuery}
                        `;
                     } catch (e) {
                         console.error('Fallback search failed:', e);
                     }
                 }

                 // Prepare messages for Ollama
                 const messagesWithFallback = [...messages];
                 messagesWithFallback[messagesWithFallback.length - 1].content = fallbackPrompt;

                 try {
                     const response = await ollamaService.generateChatCompletion(targetLocalModel, messagesWithFallback);
                     res.json({
                         response: response.message.content, 
                         model: targetLocalModel, 
                         info: 'Fallback: Served by local model due to high traffic.' 
                     });
                     return;
                 } catch (ollamaError) {
                     console.error('Fallback failed:', ollamaError);
                     throw new Error('All services unavailable (Cloud Quota + Local Error).');
                 }
             }
             throw error;
        }

      } else if (provider === 'ollama') {
        // Update the last message in the array to include the search context
        const messagesWithContext = [...messages];
        messagesWithContext[messagesWithContext.length - 1].content = lastMessage;
        
        const response = await ollamaService.generateChatCompletion(model, messagesWithContext);
        res.json({ response: response.message.content });
      }
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ error: (error as ZodError).issues });
      } else {
        console.error('Detailed Error in AIController.chat:', error);
        const errorMessage = (error as any).message || 'Internal Server Error';
        res.status(500).json({ error: errorMessage, details: error });
      }
    }
  }

  static async listModels(req: Request, res: Response) {
      try {
          const ollamaModels = await ollamaService.listModels();
          res.json({
              ollama: ollamaModels.models,
              gemini: ['gemini-2.5-flash', 'gemini-pro-vision', 'gemini-pro'] 
          });
      } catch (error) {
          console.error('Error in AIController.listModels:', error);
          res.status(500).json({ error: 'Internal Server Error' });
      }
  }
}
