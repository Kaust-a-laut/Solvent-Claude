export const MODELS = {
  GEMINI: {
    PRO_3: 'gemini-3-pro-preview',
    FLASH_3: 'gemini-3-flash-preview',
    PRO_2_5: 'gemini-2.5-pro',
    FLASH_2_5: 'gemini-2.5-flash',
    PRO_1_5: 'gemini-1.5-pro',
    FLASH_2_0: 'gemini-2.0-flash',
    FLASH_1_5: 'gemini-1.5-flash',
  },
  GROQ: {
    LLAMA_3_3_70B: 'llama-3.3-70b-versatile',
    LLAMA_3_1_8B: 'llama-3.1-8b-instant',
    MIXTRAL_8X7B: 'mixtral-8x7b-32768'
  },
  OLLAMA: {
    QWEN_CODER: 'qwen2.5-coder:7b',
    LLAMA_3: 'llama3',
    DEEPSEEK_CODER: 'deepseek-coder-v2'
  },
  OPENROUTER: {
    CLAUDE_3_5_SONNET: 'anthropic/claude-3.5-sonnet',
    GPT_4O: 'openai/gpt-4o',
    QWEN_CODER_32B: 'qwen/qwen-2.5-coder-32b-instruct',
  }
};

export const WATERFALL_CONFIG = {
  PHASE_1_ARCHITECT: {
    PRIMARY: 'gemini-2.0-flash',
    FALLBACK: 'llama-3.3-70b-versatile',
    LOCAL: 'qwen2.5-coder:7b'
  }
};

export const CONTEXT_LIMITS: Record<string, number> = {
  // Gemini: Massive Context
  'gemini-1.5-pro': 2000000, 
  'gemini-2.0-flash': 1000000,
  'gemini-1.5-flash': 1000000,
  
  // Groq: High Context
  'llama-3.3-70b-versatile': 128000,
  'mixtral-8x7b-32768': 32768,
  'llama-3.1-8b-instant': 128000,

  // Local/Ollama: Constrained (conservative defaults)
  'qwen2.5-coder:7b': 32768,
  'llama3': 8192,
  'deepseek-coder-v2': 16384,

  // Default fallback
  'default': 8192
};

export const getModelContextLimit = (modelName: string): number => {
  if (!modelName) return CONTEXT_LIMITS['default'];
  // Exact match
  if (CONTEXT_LIMITS[modelName]) return CONTEXT_LIMITS[modelName];
  // Fuzzy match
  if (modelName.includes('gemini')) return 1000000;
  if (modelName.includes('llama-3')) return 128000;
  if (modelName.includes('gpt-4')) return 128000;
  if (modelName.includes('claude-3')) return 200000;
  
  return CONTEXT_LIMITS['default'];
};