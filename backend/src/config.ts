import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });

const envSchema = z.object({
  PORT: z.string().transform(Number).default('3001'),
  GEMINI_API_KEY: z.string().optional(),
  // Optional keys
  SERPER_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  HUGGINGFACE_API_KEY: z.string().optional(),
  OLLAMA_HOST: z.string().default('http://127.0.0.1:11434'),
  // Feature flags
  ENABLE_OLLAMA: z.string().transform(v => v === 'true').default('true'),
  // Security
  BACKEND_INTERNAL_SECRET: z.string().default('solvent_dev_insecure_default'),
  // Memory System
  MEMORY_CACHE_SIZE: z.string().transform(Number).default('1000'),
  MEMORY_MAX_ENTRIES: z.string().transform(Number).default('1500'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const config = parsedEnv.data;

export const APP_CONSTANTS = {
  WATERFALL: {
    MAX_RETRIES: 2,
    SCORE_THRESHOLD: 80,
    MAX_STEPS: 10
  },
  MODELS: {
    VISION_DEFAULT: 'gemini-1.5-flash',
    CODING_DEFAULT: 'llama-3.3-70b-versatile'
  }
};

