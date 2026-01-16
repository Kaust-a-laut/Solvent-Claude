import { create } from 'zustand';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string | null;
  thinking?: string;
  isGeneratedImage?: boolean;
  imageUrl?: string;
}

export interface GraphNode {
  id: string;
  title: string;
  description?: string;
  mode?: string;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  data?: string; // Raw text or JSON of communication
}

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  windowSize: {
    width: number;
    height: number;
  };
}

interface AppState {
  messages: Message[];
  isProcessing: boolean;
  backend: 'gemini' | 'ollama' | 'deepseek' | 'openrouter';
  currentMode: 'chat' | 'browser' | 'deep_thought' | 'debate' | 'compare' | 'collaborate' | 'vision' | 'waterfall' | 'coding';
  smartRouterEnabled: boolean;
  selectedLocalModel: string;
  selectedCloudModel: string;
  selectedOpenRouterModel: string;
  modeConfigs: Record<string, { provider: 'gemini' | 'ollama' | 'deepseek' | 'openrouter' | 'auto', model: string }>;
  temperature: number;
  maxTokens: number;
  settingsOpen: boolean;
  auraMode: 'off' | 'static' | 'organic';
  notepadContent: string;
  globalProvider: 'cloud' | 'local' | 'auto';
  deviceInfo: DeviceInfo;
  
  // Graph State
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  showKnowledgeMap: boolean;
  supervisorInsight: string | null; // New state for nudges
  activities: any[]; // History of reported actions
  addGraphNode: (node: GraphNode) => void;
  addGraphEdge: (edge: GraphEdge) => void;
  setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  setShowKnowledgeMap: (show: boolean) => void;
  setSupervisorInsight: (insight: string | null) => void;
  addActivity: (activity: any) => void;
  setNotepadContent: (content: string) => void;

  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  setMessages: (messages: Message[]) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setBackend: (backend: 'gemini' | 'ollama' | 'deepseek' | 'openrouter') => void;
  setCurrentMode: (mode: any) => void;
  setSmartRouterEnabled: (enabled: boolean) => void;
  setSelectedLocalModel: (model: string) => void;
  setSelectedCloudModel: (model: string) => void;
  setSelectedOpenRouterModel: (model: string) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  setSettingsOpen: (open: boolean) => void;
  setAuraMode: (auraMode: 'off' | 'static' | 'organic') => void;
  setGlobalProvider: (provider: 'cloud' | 'local' | 'auto') => void;
  setModeConfig: (mode: string, config: { provider: 'gemini' | 'ollama' | 'deepseek' | 'openrouter' | 'auto', model: string }) => void;
  setDeviceInfo: (info: DeviceInfo) => void;
  
  // Actions
  sendMessage: (content: string, image?: string | null) => Promise<void>;
  generateImageAction: (prompt: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  messages: [],
  isProcessing: false,
  backend: 'gemini',
  currentMode: 'chat',
  smartRouterEnabled: true,
  selectedLocalModel: 'qwen2.5:3b',
  selectedCloudModel: 'gemini-3-pro-preview',
  selectedOpenRouterModel: 'qwen/qwen-2.5-coder-32b-instruct:free',
  modeConfigs: {
    chat: { provider: 'auto', model: 'gemini-3-pro-preview' },
    vision: { provider: 'gemini', model: 'gemini-3-flash-preview' },
    deep_thought: { provider: 'auto', model: 'gemini-3-pro-preview' },
    browser: { provider: 'gemini', model: 'gemini-3-flash-preview' },
    waterfall: { provider: 'auto', model: 'gemini-3-pro-preview' },
    coding: { provider: 'auto', model: 'gemini-3-pro-preview' },
  },
  temperature: 0.7,
  maxTokens: 2048,
  settingsOpen: false,
  auraMode: 'off',
  notepadContent: "",
  globalProvider: 'auto',
  deviceInfo: {
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    windowSize: { width: 0, height: 0 }
  },
  
  graphNodes: [],
  graphEdges: [],
  showKnowledgeMap: false,
  supervisorInsight: null,
  activities: [],

  addGraphNode: (node) => set((state) => ({
    graphNodes: [...state.graphNodes.filter(n => n.id !== node.id), node]
  })),
  addGraphEdge: (edge) => set((state) => ({
    graphEdges: [...state.graphEdges, edge]
  })),
  setGraphData: (nodes, edges) => set({ graphNodes: nodes, graphEdges: edges }),
  setShowKnowledgeMap: (show) => set({ showKnowledgeMap: show }),
  setSupervisorInsight: (insight) => set({ supervisorInsight: insight }),
  addActivity: (activity) => set((state) => ({ activities: [activity, ...state.activities].slice(0, 100) })),
  setNotepadContent: (content) => set({ notepadContent: content }),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (content) => set((state) => {
    const newMessages = [...state.messages];
    if (newMessages.length > 0) {
      newMessages[newMessages.length - 1].content += content;
    }
    return { messages: newMessages };
  }),
  setMessages: (messages) => set({ messages }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setBackend: (backend) => set({ backend }),
  setCurrentMode: (mode) => set({ currentMode: mode }),
  setSmartRouterEnabled: (enabled) => set({ smartRouterEnabled: enabled }),
  setSelectedLocalModel: (model) => set({ selectedLocalModel: model }),
  setSelectedCloudModel: (model) => set({ selectedCloudModel: model }),
  setSelectedOpenRouterModel: (model) => set({ selectedOpenRouterModel: model }),
  setTemperature: (temperature) => set({ temperature }),
  setMaxTokens: (maxTokens) => set({ maxTokens }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setAuraMode: (auraMode) => set({ auraMode }),
  setGlobalProvider: (globalProvider) => set({ globalProvider }),
  setModeConfig: (mode, config) => set((state) => ({
    modeConfigs: { ...state.modeConfigs, [mode]: config }
  })),
  setDeviceInfo: (deviceInfo) => set({ deviceInfo }),
  sendMessage: async (content: string, image: string | null = null) => {
    const { 
      messages, addMessage, setIsProcessing, currentMode, 
      modeConfigs, selectedCloudModel, selectedLocalModel,
      globalProvider, temperature, maxTokens,
      graphNodes, graphEdges, setGraphData,
      deviceInfo, notepadContent
    } = get();

    if (get().isProcessing) return;

    // Config Resolution
    const config = modeConfigs[currentMode] || { provider: 'auto', model: selectedCloudModel };
    let provider = config.provider;
    let model = config.model;

    if (provider === 'auto') {
       if (globalProvider === 'local') {
          provider = 'ollama';
          model = selectedLocalModel;
       } else {
          provider = 'gemini';
          model = selectedCloudModel;
       }
    } else {
       if (globalProvider === 'local' && provider === 'gemini') {
          provider = 'ollama';
          model = selectedLocalModel;
       }
    }

    const smartRouter = config.provider === 'auto' && provider === 'gemini';
    const userMessage: Message = { role: 'user', content, image };
    
    addMessage(userMessage);
    setIsProcessing(true);

    // Log to Supervisor
    if (window.electron?.logAction) {
       window.electron.logAction({ type: 'user_message', content, mode: currentMode });
    }

    try {
      const { fetchWithRetry } = await import('../lib/api-client');
      const { API_BASE_URL } = await import('../lib/config');
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
          temperature,
          maxTokens,
          deviceInfo,
          notepadContent
        }),
        retries: 3
      });
      
      if (!data.response) throw new Error('Invalid response from server.');

      let finalResponse = data.response;
      
      // Parse for Notepad Updates
      const notepadMatch = finalResponse.match(/<update_notepad>([\s\S]*?)<\/update_notepad>/);
      if (notepadMatch && notepadMatch[1]) {
         const newContent = notepadMatch[1].trim();
         get().setNotepadContent(newContent);
         // Clean the response for the UI
         finalResponse = finalResponse.replace(/<update_notepad>[\s\S]*?<\/update_notepad>/, '').trim();
      }

      addMessage({ role: 'assistant', content: finalResponse });

      const { parseGraphData } = await import('../lib/graph-parser');
      const newGraph = parseGraphData(data.response); // Use original for graph parser to be safe
      if (newGraph && newGraph.nodes) {
         const mergedNodes = [...graphNodes];
         newGraph.nodes.forEach((newNode: any) => {
            if (!mergedNodes.find(n => n.id === newNode.id)) {
               mergedNodes.push(newNode);
            }
         });
         const mergedEdges = [...graphEdges, ...(newGraph.edges || [])];
         setGraphData(mergedNodes, mergedEdges);
      }
    } catch (error: any) {
      const errorMessage = error.body?.error || error.message || 'Service unavailable.';
      const statusText = error.status ? ` [Status: ${error.status}]` : '';
      addMessage({ role: 'assistant', content: `Error: ${errorMessage}${statusText}` });
    } finally {
      setIsProcessing(false);
    }
  },

  generateImageAction: async (prompt: string) => {
    const { addMessage, setIsProcessing } = get();

    addMessage({ role: 'user', content: `Generate an image of: ${prompt}` });
    setIsProcessing(true);

    try {
      const { fetchWithRetry } = await import('../lib/api-client');
      const { API_BASE_URL } = await import('../lib/config');
      const data = await fetchWithRetry(`${API_BASE_URL}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        retries: 2
      });
      
      if (data.imageUrl) {
        addMessage({ 
          role: 'assistant', 
          content: `Here is the image I generated for: "${prompt}"`,
          isGeneratedImage: true,
          imageUrl: data.imageUrl
        });
      } else {
        throw new Error(data.error || 'Failed to generate image');
      }
    } catch (error: any) {
      const errorMessage = error.body?.error || error.message || 'Image generation failed.';
      const statusText = error.status ? ` [Status: ${error.status}]` : '';
      addMessage({ role: 'assistant', content: `Error: ${errorMessage}${statusText}` });
    } finally {
      setIsProcessing(false);
    }
  }
}));
