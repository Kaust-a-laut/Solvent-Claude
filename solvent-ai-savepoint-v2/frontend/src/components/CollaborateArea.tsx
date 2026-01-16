import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { API_BASE_URL } from '../lib/config';
import { Users, Bot, Zap, Play, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { parse } from 'marked';
import { motion, AnimatePresence } from 'framer-motion';

export const CollaborateArea = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<{ agent: string, content: string, color: string }[]>([]);
  const [task, setTask] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [steps]);

  const callModel = async (provider: string, model: string, history: any[], prompt: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           provider,
           model,
           messages: [...history, { role: 'user', content: prompt }]
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Agent failed to respond.');
      return data.response || 'No response generated.';
    } catch (err: any) {
      throw new Error(err.message || 'Connection lost.');
    }
  };

  const handleRun = async () => {
    if (!task.trim()) return;
    setIsRunning(true);
    setSteps([]);
    setError(null);

    try {
      // Step 1: Gemini Architect
      const archRes = await callModel('gemini', 'gemini-1.5-flash', [], `Task: "${task}". Act as an Architect. Propose a high-level solution structure and key components.`);
      setSteps(prev => [...prev, { agent: 'Gemini (Architect)', content: archRes, color: 'text-jb-accent' }]);
      
      // Step 2: Qwen Auditor
      const auditRes = await callModel('ollama', 'qwen2.5:3b', [], `Review this architecture: "${archRes}". Identify potential flaws or security risks in this approach. Be critical.`);
      setSteps(prev => [...prev, { agent: 'Qwen (Auditor)', content: auditRes, color: 'text-jb-orange' }]);
      
      // Step 3: Gemini Final Synthesis
      const finalRes = await callModel('gemini', 'gemini-1.5-flash', [], `Based on the proposal: "${archRes}" and the critique: "${auditRes}", provide a final, optimized implementation plan.`);
      setSteps(prev => [...prev, { agent: 'Gemini (Synthesizer)', content: finalRes, color: 'text-jb-purple' }]);

    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-jb-dark/50 backdrop-blur-3xl rounded-tl-2xl border-l border-t border-white/5 overflow-hidden shadow-2xl p-8">
      
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-jb-purple/20 rounded-2xl flex items-center justify-center border border-jb-purple/30">
                <Users className="text-jb-purple" size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Multi-Agent Collaboration</h2>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Orchestrating Hierarchical Intelligence</p>
            </div>
        </div>

        <div className="flex gap-3">
            <input 
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRun()}
              className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 w-[400px] text-sm outline-none focus:border-jb-purple transition-all text-white placeholder:text-slate-600 font-medium"
              placeholder="Define the mission..."
            />
            <button 
                onClick={handleRun} 
                disabled={isRunning || !task.trim()}
                className="bg-jb-purple text-white hover:bg-fuchsia-600 px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all disabled:opacity-20 shadow-xl"
            >
                {isRunning ? <Loader2 className="animate-spin" size={16}/> : <Play size={16}/>}
                {isRunning ? 'Orchestrating...' : 'Deploy Agents'}
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-4 scrollbar-hide" ref={scrollRef}>
        <AnimatePresence>
          {steps.map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="relative pl-10"
            >
               {i < steps.length - 1 && (
                  <div className="absolute left-[19px] top-10 bottom-[-32px] w-px bg-white/5" />
               )}
               
               <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-[10px] font-black text-slate-500">{i + 1}</span>
               </div>

               <div className="bg-white/2 border border-white/5 rounded-[32px] p-8 shadow-2xl">
                  <div className={cn("font-black text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2", step.color)}>
                     <Bot size={14} /> {step.agent}
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: parse(step.content || '') as string }} />
               </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {error && (
            <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm ml-10">
                <AlertCircle size={18} />
                <span className="font-bold">Execution Error:</span> {error}
            </div>
        )}

        {isRunning && (
           <div className="flex items-center gap-4 pl-10">
              <div className="w-10 h-10 rounded-full bg-jb-purple/10 border border-jb-purple/20 flex items-center justify-center">
                 <Loader2 size={16} className="text-jb-purple animate-spin" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 animate-pulse">Syncing Cognitive Nodes</span>
           </div>
        )}

        {!isRunning && steps.length === 0 && !error && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
             <Users size={64} className="mb-4" />
             <p className="font-bold text-sm">Enter a mission to begin multi-agent synthesis</p>
          </div>
        )}
      </div>
    </div>
  );
};