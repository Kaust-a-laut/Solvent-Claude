import { create } from 'zustand';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  image?: string | null;
  thinking?: string;
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
  setCurrentMode: (mode: 'chat' | 'browser' | 'deep_thought' | 'debate' | 'compare' | 'collaborate') => void;
  setSmartRouterEnabled: (enabled: boolean) => void;
  setSelectedLocalModel: (model: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  messages: [],
  isProcessing: false,
  backend: 'gemini',
  currentMode: 'chat',
  smartRouterEnabled: true,
  selectedLocalModel: 'qwen2.5:3b',
  
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
}));
