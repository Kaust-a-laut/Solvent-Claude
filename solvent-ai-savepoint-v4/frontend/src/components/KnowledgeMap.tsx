import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useAppStore, GraphNode, GraphEdge } from '../store/useAppStore';

export const KnowledgeMap = () => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { graphNodes, graphEdges } = useAppStore();

  useEffect(() => {
    if (!svgRef.current || graphNodes.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous graph
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", [0, 0, width, height]);

    const simulation = d3.forceSimulation(graphNodes as any)
      .force("link", d3.forceLink(graphEdges).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("x", d3.forceX(width / 2).strength(0.1))
      .force("y", d3.forceY(height / 2).strength(0.1));

    const link = svg.append("g")
      .attr("stroke", "rgba(157, 91, 210, 0.2)")
      .attr("stroke-width", 1.5)
      .selectAll("line")
      .data(graphEdges)
      .join("line");

    const node = svg.append("g")
      .selectAll("g")
      .data(graphNodes)
      .join("g")
      .call(drag(simulation) as any);

    // Node Outer Glow
    node.append("circle")
      .attr("r", 6)
      .attr("fill", (d: any) => d.id.startsWith('node_') ? "#3C71F7" : "#9D5BD2")
      .attr("filter", "blur(2px)")
      .attr("opacity", 0.6);

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
      }
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    return () => simulation.stop();
  }, [graphNodes, graphEdges]);

  return (
    <div className="w-full h-full relative">
      <svg ref={svgRef} className="w-full h-full" />
      {graphNodes.length === 0 && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center opacity-20">
               <div className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Awaiting Data</div>
            </div>
         </div>
      )}
    </div>
  );
};