import { fetchWithRetry } from '../lib/api-client';
import { API_BASE_URL, BASE_URL } from '../lib/config';
import { parseGraphData } from '../lib/graph-parser';

export interface ChatParams {
  messages: any[];
  currentMode: string;
  modeConfigs: Record<string, any>;
  selectedLocalModel: string;
  selectedCloudModel: string;
  selectedCloudProvider: string;
  globalProvider: 'cloud' | 'local' | 'auto';
  temperature: number;
  maxTokens: number;
  deviceInfo: any;
  notepadContent: string;
  openFiles?: Array<{ path: string; content: string }>;
  codingHistory?: any[];
  browserContext?: {
    history: string[];
    lastSearchResults?: any;
  };
  apiKeys: Record<string, string>;
  thinkingModeEnabled?: boolean;
  imageProvider?: string;
}

export class ChatService {
  static async sendMessage(params: ChatParams, content: string, image: string | null = null) {
    const { 
      messages, currentMode, modeConfigs, selectedCloudModel, 
      selectedLocalModel, selectedCloudProvider, globalProvider, 
      temperature, maxTokens, deviceInfo, notepadContent, apiKeys,
      thinkingModeEnabled, openFiles, browserContext, imageProvider,
      codingHistory
    } = params;

    // 1. Resolve Provider and Model
    const config = modeConfigs[currentMode] || { provider: 'auto', model: selectedCloudModel };
    let provider = config.provider;
    let model = config.model;

    if (thinkingModeEnabled) {
      // Force high-IQ models when thinking mode is active
      if (globalProvider === 'local') {
        provider = 'ollama';
        model = 'deepseek-r1:8b';
      } else {
        provider = 'groq';
        model = 'openai/gpt-oss-120b';
      }
    } else if (provider === 'auto') {
      if (globalProvider === 'local') {
        provider = 'ollama';
        model = selectedLocalModel;
      } else {
        // Use the globally selected cloud provider (Gemini, Groq, etc.)
        provider = selectedCloudProvider || 'gemini';
        model = selectedCloudModel;
      }
    } else if (globalProvider === 'local' && provider !== 'ollama') {
      // Force local if requested globally, unless already local
      provider = 'ollama';
      model = selectedLocalModel;
    }

    const smartRouter = config.provider === 'auto' && provider === 'gemini' && !thinkingModeEnabled;
    const userMessage = { role: 'user', content, image };

    // 2. Puter Provider Implementation (Client-side)
    if (provider === 'puter') {
      try {
        const puterMessages = messages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        }));
        puterMessages.push({ role: 'user', content });

        const response = await window.puter.ai.chat(puterMessages, { 
          model: model || 'deepseek-chat' 
        });
        
        return {
          response: typeof response === 'string' ? response : response.message?.content || response.toString(),
          updatedNotepad: null,
          newGraphData: { nodes: [], edges: [] },
          model: model || 'deepseek-chat',
          info: 'Direct Puter.js delivery'
        };
      } catch (err: any) {
        console.error('[Puter] Client-side failure:', err);
        // Fallback to backend if puter fails
      }
    }

    // 3. Execute Request (Backend)
    const data = await fetchWithRetry(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider,
        model,
        messages: [...messages, userMessage],
        image,
        mode: currentMode,
        smartRouter,
        temperature: thinkingModeEnabled ? 0.3 : temperature, // Lower temperature for more focused thinking
        maxTokens,
        deviceInfo,
        notepadContent,
        openFiles,
        codingHistory,
        browserContext,
        apiKeys,
        thinkingModeEnabled,
        imageProvider
      }),
      retries: 3
    });

    if (!data.response) throw new Error('Invalid response from server.');

    // 3. Parse and Process Response
    let finalResponse = data.response;
    let updatedNotepad: string | null = null;

    const notepadMatch = finalResponse.match(/<update_notepad>([\s\S]*?)<\/update_notepad>/);
    if (notepadMatch && notepadMatch[1]) {
      updatedNotepad = notepadMatch[1].trim();
      finalResponse = finalResponse.replace(/<update_notepad>[\s\S]*?<\/update_notepad>/, '').trim();
    }

    const newGraphData = parseGraphData(data.response);

    // Prepend BASE_URL if it's a relative path for generated images
    let imageUrl = data.imageUrl;
    if (imageUrl && !imageUrl.startsWith('http')) {
      imageUrl = `${BASE_URL}${imageUrl}`;
    }

    return {
      response: finalResponse,
      updatedNotepad,
      newGraphData,
      model: data.model || model,
      info: data.info,
      isGeneratedImage: data.isGeneratedImage,
      imageUrl: imageUrl,
      provenance: data.provenance // Pass through the provenance metadata
    };
  }

  static async generateImage(prompt: string, provider?: string, apiKeys?: Record<string, string>, options: any = {}) {
    const data = await fetchWithRetry(`${API_BASE_URL}/generate-image`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prompt, 
        provider: provider || 'gemini', 
        apiKeys, 
        ...options 
      }),
      retries: 2
    });

    if (!data.imageUrl) {
      throw new Error(data.error || 'Failed to generate image');
    }

    // Prepend BASE_URL if it's a relative path
    const fullImageUrl = data.imageUrl.startsWith('http') ? data.imageUrl : `${BASE_URL}${data.imageUrl}`;
    return fullImageUrl;
  }

  static async search(query: string) {
    const data = await fetchWithRetry(`${API_BASE_URL}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
      retries: 2
    });

    return data;
  }

  static async deprecateMemory(id: string, reason: string) {
    const data = await fetchWithRetry(`${API_BASE_URL}/memory/deprecate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, reason }),
      retries: 2
    });
    return data;
  }

  static async checkLocalImageStatus() {
    try {
      const data = await fetchWithRetry(`${API_BASE_URL}/local-image-status`);
      return data;
    } catch (e) {
      return { loaded: false };
    }
  }
}
