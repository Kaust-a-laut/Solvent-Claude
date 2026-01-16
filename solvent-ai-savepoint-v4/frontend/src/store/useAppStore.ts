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
  mode?: string;
  x?: number;
  y?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}

interface AppState {
  messages: Message[];
  isProcessing: boolean;
  backend: 'gemini' | 'ollama';
  currentMode: 'chat' | 'browser' | 'deep_thought' | 'debate' | 'compare' | 'collaborate';
  smartRouterEnabled: boolean;
  selectedLocalModel: string;
  selectedCloudModel: string;
  modeConfigs: Record<string, { provider: 'gemini' | 'ollama' | 'deepseek' | 'auto', model: string }>;
  temperature: number;
  maxTokens: number;
  settingsOpen: boolean;
  
  // Graph State
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  addGraphNode: (node: GraphNode) => void;
  addGraphEdge: (edge: GraphEdge) => void;
  setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void;

  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  setIsProcessing: (isProcessing: boolean) => void;
  setBackend: (backend: 'gemini' | 'ollama') => void;
  setCurrentMode: (mode: 'chat' | 'browser' | 'deep_thought' | 'debate' | 'compare' | 'collaborate' | 'vision') => void;
  setSmartRouterEnabled: (enabled: boolean) => void;
  setSelectedLocalModel: (model: string) => void;
  setSelectedCloudModel: (model: string) => void;
  setTemperature: (temp: number) => void;
  setMaxTokens: (tokens: number) => void;
  setSettingsOpen: (open: boolean) => void;
  setModeConfig: (mode: string, config: { provider: 'gemini' | 'ollama' | 'deepseek' | 'auto', model: string }) => void;
}

export const useAppStore = create<AppState>((set) => ({
  messages: [],
  isProcessing: false,
  backend: 'gemini',
  currentMode: 'chat',
  smartRouterEnabled: true,
  selectedLocalModel: 'qwen2.5:3b',
  selectedCloudModel: 'gemini-2.0-flash-exp',
  modeConfigs: {
    chat: { provider: 'auto', model: 'gemini-2.0-flash-exp' },
    vision: { provider: 'gemini', model: 'gemini-1.5-flash' },
    deep_thought: { provider: 'auto', model: 'gemini-2.0-flash-exp' },
    browser: { provider: 'gemini', model: 'gemini-1.5-flash' },
  },
  temperature: 0.7,
  maxTokens: 2048,
  settingsOpen: false,
  
  graphNodes: [],
  graphEdges: [],

  addGraphNode: (node) => set((state) => ({ 
    graphNodes: [...state.graphNodes.filter(n => n.id !== node.id), node] 
  })),
  addGraphEdge: (edge) => set((state) => ({ 
    graphEdges: [...state.graphEdges, edge] 
  })),
  setGraphData: (nodes, edges) => set({ graphNodes: nodes, graphEdges: edges }),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setMessages: (messages) => set({ messages }),
  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setBackend: (backend) => set({ backend }),
  setCurrentMode: (mode) => set({ currentMode: mode }),
  setSmartRouterEnabled: (enabled) => set({ smartRouterEnabled: enabled }),
  setSelectedLocalModel: (model) => set({ selectedLocalModel: model }),
  setSelectedCloudModel: (model) => set({ selectedCloudModel: model }),
  setTemperature: (temperature) => set({ temperature }),
  setMaxTokens: (maxTokens) => set({ maxTokens }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setModeConfig: (mode, config) => set((state) => ({
    modeConfigs: { ...state.modeConfigs, [mode]: config }
  })),
}));
