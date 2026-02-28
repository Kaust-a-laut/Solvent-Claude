import { StateCreator } from 'zustand';
import { AppState } from './types';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  fileContext?: string;
  codeBlocks?: CodeSuggestion[];
}

export interface CodeSuggestion {
  id: string;
  language: string;
  code: string;
  applied: boolean;
  rejected: boolean;
}

export interface PendingDiff {
  original: string;
  modified: string;
  filePath: string;
  description: string;
}

export interface CodingSlice {
  pendingDiff: PendingDiff | null;
  agentMessages: AgentMessage[];
  panelWidths: { fileTree: number; chat: number };
  fileTreeVisible: boolean;
  chatPanelVisible: boolean;
  terminalVisible: boolean;

  setPendingDiff: (diff: PendingDiff) => void;
  clearPendingDiff: () => void;
  addAgentMessage: (msg: AgentMessage) => void;
  updateAgentMessage: (id: string, updates: Partial<AgentMessage>) => void;
  clearAgentMessages: () => void;
  setPanelWidths: (widths: { fileTree: number; chat: number }) => void;
  setFileTreeVisible: (v: boolean) => void;
  setChatPanelVisible: (v: boolean) => void;
  setTerminalVisible: (v: boolean) => void;
}

export const createCodingSlice: StateCreator<AppState, [], [], CodingSlice> = (set) => ({
  pendingDiff: null,
  agentMessages: [],
  panelWidths: { fileTree: 240, chat: 360 },
  fileTreeVisible: true,
  chatPanelVisible: true,
  terminalVisible: false,

  setPendingDiff: (diff) => set({ pendingDiff: diff }),
  clearPendingDiff: () => set({ pendingDiff: null }),
  addAgentMessage: (msg) => set((state) => ({ agentMessages: [...state.agentMessages, msg] })),
  updateAgentMessage: (id, updates) =>
    set((state) => ({
      agentMessages: state.agentMessages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  clearAgentMessages: () => set({ agentMessages: [] }),
  setPanelWidths: (panelWidths) => set({ panelWidths }),
  setFileTreeVisible: (fileTreeVisible) => set({ fileTreeVisible }),
  setChatPanelVisible: (chatPanelVisible) => set({ chatPanelVisible }),
  setTerminalVisible: (terminalVisible) => set({ terminalVisible }),
});
