import { getModelContextLimit } from '../constants/models';

// Character-to-token ratios (conservative — overestimate to avoid overflow)
const CHARS_PER_TOKEN_TEXT = 4;
const CHARS_PER_TOKEN_CODE = 3.5;
const MESSAGE_OVERHEAD_TOKENS = 4; // role markers, separators per message

// Budget allocation constants
const SYSTEM_PROMPT_RESERVE = 2500; // static parts of system prompt
const DEFAULT_OUTPUT_TOKENS = 2048;
const MEMORY_BUDGET_RATIO = 0.25; // 25% of remaining space for memory

/**
 * Estimate the number of tokens in a text string.
 * Uses a character-ratio heuristic — no external tokenizer dependency.
 * Intentionally conservative (overestimates) to avoid context overflow.
 */
export function estimateTokens(text: string, contentType: 'text' | 'code' | 'mixed' = 'text'): number {
  if (!text) return 0;
  const ratio = contentType === 'code' ? CHARS_PER_TOKEN_CODE
    : contentType === 'mixed' ? (CHARS_PER_TOKEN_TEXT + CHARS_PER_TOKEN_CODE) / 2
    : CHARS_PER_TOKEN_TEXT;
  return Math.ceil(text.length / ratio);
}

/**
 * Estimate total tokens for an array of chat messages.
 * Accounts for role markers and message separators.
 */
export function estimateMessagesTokens(messages: Array<{ role: string; content: string }>): number {
  let total = 0;
  for (const msg of messages) {
    total += estimateTokens(msg.content || '') + MESSAGE_OVERHEAD_TOKENS;
  }
  return total;
}

export interface ContextBudget {
  /** Total context window for this model */
  total: number;
  /** Reserved for static system prompt parts */
  system: number;
  /** Reserved for LLM output */
  output: number;
  /** Budget for retrieved memory/context items */
  memory: number;
  /** Budget for conversation history */
  history: number;
}

/**
 * Compute a token budget allocation for a given model and output size.
 * Splits the context window into: system + output + memory + history.
 */
export function getContextBudget(model: string, maxOutputTokens?: number): ContextBudget {
  const total = getModelContextLimit(model);
  const output = maxOutputTokens || DEFAULT_OUTPUT_TOKENS;
  const system = SYSTEM_PROMPT_RESERVE;

  const remaining = Math.max(0, total - system - output);
  const memory = Math.floor(remaining * MEMORY_BUDGET_RATIO);
  const history = remaining - memory;

  return { total, system, output, memory, history };
}
