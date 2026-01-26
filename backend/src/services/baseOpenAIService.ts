import axios from 'axios';
import { AIProvider, ChatMessage, CompletionOptions } from '../types/ai';
import { toolService } from './toolService';
import { getOpenAITools } from '../constants/tools';
import { logger } from '../utils/logger';

/**
 * Abstract base class for OpenAI-compatible providers (Groq, DeepSeek, OpenRouter, etc.)
 * Provides standardized message mapping and recursive tool-calling logic.
 */
export abstract class BaseOpenAIService implements AIProvider {
  abstract readonly name: string;
  protected abstract baseUrl: string;
  protected abstract apiKey: string;
  protected defaultModel: string = '';

  protected getToolDefinitions() {
    return getOpenAITools();
  }

  protected normalizeMessages(messages: ChatMessage[]): any[] {
    return messages.map(m => ({
      role: m.role === 'model' ? 'assistant' : m.role,
      content: m.content
    }));
  }

  async generateChatCompletion(messages: ChatMessage[], options: CompletionOptions): Promise<string> {
    const apiKey = options.apiKey || this.apiKey;
    if (!apiKey) throw new Error(`${this.name} API Key missing`);

    const currentMessages: any[] = this.normalizeMessages(messages);
    const model = options.model || this.defaultModel;

    try {
      let iteration = 0;
      const maxIterations = 5;

      while (iteration < maxIterations) {
        const payload: any = {
          model,
          messages: currentMessages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 2048,
        };

        // CRITICAL FIX: Most providers (Groq, OpenAI) do not allow 
        // response_format: "json_object" and tools to be used simultaneously.
        if (options.jsonMode) {
          payload.response_format = { type: "json_object" };
        } else if (options.shouldSearch !== false) {
          payload.tools = this.getToolDefinitions();
          payload.tool_choice = "auto";
        }

        const response = await axios.post(
          `${this.baseUrl}/chat/completions`,
          payload,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              ...(this.getExtraHeaders?.() || {})
            },
            signal: options.signal
          }
        );

        const message = response.data.choices[0].message;
        const content = message.content || "";
        
        if (!message.tool_calls) {
          return typeof content === 'string' ? content : JSON.stringify(content);
        }

        // Handle Tool Calls
        logger.info(`[${this.name}] Tool calls detected: ${message.tool_calls.length}`);
        currentMessages.push(message);
        
        for (const toolCall of message.tool_calls) {
          const name = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          
          try {
            const result = await toolService.executeTool(name, args);
            currentMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: name,
              content: JSON.stringify(result)
            });
          } catch (toolError: any) {
            logger.error(`[${this.name}] Tool execution failed (${name}): ${toolError.message}`);
            currentMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: name,
              content: JSON.stringify({ error: toolError.message })
            });
          }
        }

        iteration++;
      }

      throw new Error(`${this.name} agent exceeded maximum tool-calling iterations.`);
    } catch (error: any) {
      const errorMsg = error.response?.data?.error?.message || error.message;
      logger.error(`[${this.name}] Request Failed: ${errorMsg}`);
      throw new Error(`${this.name} API failed: ${errorMsg}`);
    }
  }

  /**
   * Optional method for subclasses to provide extra headers (e.g. OpenRouter)
   */
  protected getExtraHeaders?(): Record<string, string>;
}
