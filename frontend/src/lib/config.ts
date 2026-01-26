const isBrowser = typeof window !== 'undefined';
const isElectron = isBrowser && /Electron/i.test(navigator.userAgent);

// In Electron with file://, window.location.hostname is empty. Default to localhost.
const host = (isBrowser && window.location.hostname && window.location.hostname !== '') 
  ? window.location.hostname 
  : 'localhost';

export const BASE_URL = isElectron ? `http://${host}:3001` : '';
export const API_BASE_URL = `${BASE_URL}/api/v1`;

/**
 * Centralized Application Configuration
 * Resolves "Hardcoded Values" and "Configuration Management" observations.
 */
export const APP_CONFIG = {
  models: {
    cloud: {
      primary: 'llama-3.3-70b-versatile',
      fallback: 'gemini-1.5-flash',
      reasoning: 'llama-3.3-70b-versatile',
      vision: 'gemini-1.5-flash'
    },
    local: {
      primary: 'qwen2.5:3b',
      reasoning: 'deepseek-r1:8b',
      vision: 'llama3.2-vision'
    }
  },
  providers: {
    primary: 'groq' as const,
    fallback: 'gemini' as const,
    local: 'ollama' as const
  },
  modeConfigs: {
    chat: { provider: 'auto', model: 'llama-3.3-70b-versatile' },
    vision: { provider: 'gemini', model: 'gemini-1.5-flash' },
    coding: { provider: 'auto', model: 'llama-3.3-70b-versatile' },
    deep_thought: { provider: 'auto', model: 'llama-3.3-70b-versatile' },
    browser: { provider: 'gemini', model: 'gemini-1.5-flash' },
    waterfall: { provider: 'auto', model: 'llama-3.3-70b-versatile' },
    model_playground: { provider: 'auto', model: 'llama-3.3-70b-versatile' },
  },
  defaults: {
    temperature: 0.7,
    maxTokens: 4096,
    imageProvider: 'huggingface' as const
  }
};