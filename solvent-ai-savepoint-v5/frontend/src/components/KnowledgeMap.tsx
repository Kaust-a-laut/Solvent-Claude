import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useAppStore, GraphNode, GraphEdge } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { X, Save } from 'lucide-react';

export const KnowledgeMap = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { graphNodes, graphEdges, deviceInfo, setGraphData } = useAppStore();
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdge | null>(null);
  const [edgeData, setEdgeData] = useState("");
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Handle Resize for the Knowledge Map container
  useEffect(() => {
    if (!containerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || dimensions.width === 0 || dimensions.height === 0) return;

    const { width, height } = dimensions;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height])
      .attr("preserveAspectRatio", "xMidYMid meet");

    // Container for zoomable content
    const g = svg.append("g");

    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);

    const simulation = d3.forceSimulation(graphNodes as any)
      .force("link", d3.forceLink(graphEdges).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));

    // Define arrow markers
    svg.append("defs").selectAll("marker")
      .data(["end"])
      .enter().append("marker")
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 18)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "rgba(157, 91, 210, 0.4)");

    const link = g.append("g")
      .attr("stroke", "rgba(157, 91, 210, 0.2)")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(graphEdges)
      .join("line")
      .attr("cursor", "pointer")
      .on("mouseover", function() { d3.select(this).attr("stroke", "#3C71F7").attr("stroke-width", 3); })
      .on("mouseout", function() { d3.select(this).attr("stroke", "rgba(157, 91, 210, 0.2)").attr("stroke-width", 1.5); })
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedEdge(d);
        setEdgeData(d.data || JSON.stringify({ source: (d.source as any).id, target: (d.target as any).id, status: "pending" }, null, 2));
      });

    const node = g.append("g")
      .selectAll("g")
      .data(graphNodes)
      .join("g")
      .attr("cursor", "grab")
      .call(drag(simulation) as any)
      .on("mouseover", (event, d: any) => {
         d3.select(event.currentTarget).select("circle:nth-child(1)").attr("r", 10).attr("opacity", 0.8);
         setHoveredNode(d);
      })
      .on("mouseout", (event, d) => {
         d3.select(event.currentTarget).select("circle:nth-child(1)").attr("r", 6).attr("opacity", 0.6);
         setHoveredNode(null);
      });

    // Node Outer Glow
    node.append("circle")
      .attr("r", 6)
      .attr("fill", (d: any) => d.id.startsWith('node_') ? "#3C71F7" : "#9D5BD2")
      .attr("filter", "blur(2px)")
      .attr("opacity", 0.6)
      .style("transition", "all 0.3s ease");

    // Node Core
    node.append("circle")
      .attr("r", 4)
      .attr("fill", (d: any) => d.id.startsWith('node_') ? "#3C71F7" : "#9D5BD2")
      .attr("stroke", "white")
      .attr("stroke-width", 1);

    // Labels
    node.append("text")
      .text((d: any) => d.title)
      .attr("x", 10)
      .attr("y", 4)
      .style("font-size", "9px")
      .style("font-weight", "900")
      .style("text-transform", "uppercase")
      .style("letter-spacing", "0.1em")
      .style("fill", "rgba(255, 255, 255, 0.6)")
      .style("pointer-events", "none")
      .style("font-family", "'JetBrains Mono', monospace");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function drag(simulation: any) {
      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
        d3.select(event.sourceEvent.currentTarget).attr("cursor", "grabbing");
      }
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
        d3.select(event.sourceEvent.currentTarget).attr("cursor", "grab");
      }
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    return () => {
      simulation.stop();
    };
  }, [graphNodes, graphEdges, dimensions]);

  const handleSaveEdgeData = () => {
    if (!selectedEdge) return;
    
    // Update the edge data in the store
    const newEdges = graphEdges.map(e => {
        // d3 modifies the source/target objects, so we check IDs
        const sId = (e.source as any).id || e.source;
        const tId = (e.target as any).id || e.target;
        const selSId = (selectedEdge.source as any).id || selectedEdge.source;
        const selTId = (selectedEdge.target as any).id || selectedEdge.target;

        if (sId === selSId && tId === selTId) {
            return { ...e, data: edgeData };
        }
        return e;
    });
    
    setGraphData(graphNodes, newEdges);
    
    // Here we would also notify the Supervisor Agent via IPC
    // window.electron?.send('supervisor-edge-override', { 
    //   source: (selectedEdge.source as any).id, 
    //   target: (selectedEdge.target as any).id, 
    //   data: edgeData 
    // });

    setSelectedEdge(null);
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden pointer-events-auto" onClick={() => setSelectedEdge(null)}>
      <svg 
        ref={svgRef} 
        className="w-full h-full cursor-crosshair block" 
        style={{ touchAction: 'none' }}
        onClick={(e) => e.stopPropagation()}
      />
      
      {/* Empty State */}
      {graphNodes.length === 0 && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center opacity-20">
               <div className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Awaiting Data</div>
            </div>
         </div>
      )}

      {/* Info Card Overlay */}
      <AnimatePresence>
        {hoveredNode && !selectedEdge && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "absolute bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 pointer-events-none",
              deviceInfo.isMobile ? "bottom-4 left-4 right-4 p-4" : "bottom-8 left-8 right-8 p-5"
            )}
          >
             <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-black text-white uppercase tracking-wider">{hoveredNode.title}</h3>
                <span className="text-[9px] font-mono text-slate-500 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{hoveredNode.id}</span>
             </div>
             <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                {hoveredNode.description || "No detailed metrics available for this node."}
             </p>
             <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-jb-accent animate-pulse" />
                <span className="text-[9px] font-black text-jb-accent uppercase tracking-widest">Active Node</span>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edge Editor Modal */}
      <AnimatePresence>
        {selectedEdge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[60] overflow-hidden flex flex-col"
          >
            <div className="h-12 bg-white/5 border-b border-white/5 flex items-center justify-between px-4">
                <div className="flex items-center gap-2 text-slate-300">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Edge Interceptor</span>
                </div>
                <button 
                    onClick={() => setSelectedEdge(null)}
                    className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-all"
                >
                    <X size={14} />
                </button>
            </div>
            <div className="p-4 flex-1">
                <textarea 
                    value={edgeData}
                    onChange={(e) => setEdgeData(e.target.value)}
                    className="w-full h-40 bg-black/50 border border-white/10 rounded-xl p-3 text-xs font-mono text-slate-300 outline-none focus:border-jb-accent resize-none"
                    placeholder="Edge communication data..."
                />
            </div>
            <div className="p-4 pt-0">
                <button 
                    onClick={handleSaveEdgeData}
                    className="w-full py-2 bg-jb-accent hover:bg-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                    <Save size={12} /> Override & Re-Feed
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};