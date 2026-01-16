import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().transform(Number).default('3001'),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY is required"),
  // Optional keys
  SERPER_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  OLLAMA_HOST: z.string().default('http://127.0.0.1:11434'),
  // Feature flags
  ENABLE_OLLAMA: z.string().transform(v => v === 'true').default('true'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const config = parsedEnv.data;
