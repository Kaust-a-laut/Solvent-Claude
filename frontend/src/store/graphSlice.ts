import { StateCreator } from 'zustand';
import { AppState, GraphNode, GraphEdge } from './types';

export interface GraphSlice {
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  showKnowledgeMap: boolean;
  supervisorInsight: string | null;
  activities: any[];
  
  addGraphNode: (node: GraphNode) => void;
  addGraphEdge: (edge: GraphEdge) => void;
  removeGraphNode: (id: string) => void;
  setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  setShowKnowledgeMap: (show: boolean) => void;
  setSupervisorInsight: (insight: string | null) => void;
  addActivity: (activity: any) => void;
}

export const createGraphSlice: StateCreator<AppState, [], [], GraphSlice> = (set) => ({
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
  removeGraphNode: (id) => set((state) => ({
    graphNodes: state.graphNodes.filter(n => n.id !== id),
    graphEdges: state.graphEdges.filter(e => e.source !== id && e.target !== id)
  })),
  setGraphData: (nodes, edges) => set({ graphNodes: nodes, graphEdges: edges }),
  setShowKnowledgeMap: (show) => set({ showKnowledgeMap: show }),
  setSupervisorInsight: (insight) => set({ supervisorInsight: insight }),
  addActivity: (activity) => set((state) => ({ 
    activities: [activity, ...state.activities].slice(0, 100) 
  })),
});
