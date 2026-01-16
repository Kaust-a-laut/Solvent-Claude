import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { API_BASE_URL } from '../lib/config';
import { Users, Bot, Zap, Play, Loader2, ArrowRight, AlertCircle, Settings2, X, Network } from 'lucide-react';
import { cn } from '../lib/utils';
import { parse } from 'marked';
import { motion, AnimatePresence } from 'framer-motion';
import { KnowledgeMap } from './KnowledgeMap';

export const CollaborateArea = () => {
  const { deviceInfo } = useAppStore();
  const [isRunning, setIsRunning] = useState(false);
  const [steps, setSteps] = useState<{ agent: string, content: string, color: string }[]>([]);
  const [task, setTask] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Configuration State
  const [showConfig, setShowConfig] = useState(false);
  const [leadModel, setLeadModel] = useState<string>('gemini-3-pro-preview');
  const [criticModel, setCriticModel] = useState<string>('qwen2.5:3b');
  const [turns, setTurns] = useState<number>(5);
  const [availableModels, setAvailableModels] = useState<{ollama: any[], gemini: string[], deepseek: string[]}>({ ollama: [], gemini: [], deepseek: [] });

  useEffect(() => {
    fetch(`${API_BASE_URL}/models`)
      .then(res => res.json())
      .then(data => {
         setAvailableModels(data);
         if (!data.gemini?.includes(leadModel)) setLeadModel(data.gemini?.[0] || 'gemini-3-flash-preview');
         if (data.ollama?.length > 0) {
            const hasQwen = data.ollama.find((m: any) => m.name.includes('qwen'));
            setCriticModel(hasQwen ? hasQwen.name : data.ollama[0].name);
         }
      })
      .catch(err => console.error("Failed to fetch models", err));
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [steps]);

  const callModel = async (modelName: string, history: any[], prompt: string) => {
    let provider = 'ollama';
    if (modelName.includes('gemini')) provider = 'gemini';
    if (modelName.includes('deepseek') && !modelName.includes(':')) provider = 'deepseek';

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           provider,
           model: modelName,
           messages: [...history, { role: 'user', content: prompt }],
           temperature: 0.7 
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
    setShowConfig(false);

    let lastResponse = "";

    try {
      for (let i = 1; i <= turns; i++) {
         const isLead = i % 2 !== 0;
         const agentName = isLead ? `Lead Architect (${leadModel})` : `Critic (${criticModel})`;
         const color = isLead ? 'text-jb-accent' : 'text-jb-orange';
         const activeModel = isLead ? leadModel : criticModel;

         let prompt = "";
         if (i === 1) {
            prompt = `Task: "${task}". You are the Lead Architect. Propose a comprehensive, high-level solution structure and key components.`;
         } else if (!isLead) {
            prompt = `Review the previous proposal: \n\n"${lastResponse}"\n\n Identify potential flaws, security risks, or optimizations. Be critical and constructive.`;
         } else {
            prompt = `Based on the critique: \n\n"${lastResponse}"\n\n Refine and optimize the solution. Address the specific concerns raised.`;
         }

         const response = await callModel(activeModel, [], prompt);
         setSteps(prev => [...prev, { agent: agentName, content: response, color }]);
         lastResponse = response;
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-jb-dark/50 backdrop-blur-3xl border-white/5 overflow-y-auto shadow-2xl transition-all duration-500 relative",
      deviceInfo.isMobile ? "p-4 pt-28 pb-32" : "rounded-tl-2xl border-l border-t p-8"
    )}>
      
      {/* Config Panel Overlay */}
      <AnimatePresence>
         {showConfig && (
            <motion.div 
               initial={{ opacity: 0, y: -10 }} 
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               className={cn(
                  "absolute z-20 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl transition-all",
                  deviceInfo.isMobile ? "inset-x-4 top-28" : "top-20 right-8 w-80"
               )}
            >
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xs font-black text-white uppercase tracking-widest">Configuration</h3>
                  {deviceInfo.isMobile && (
                     <button onClick={() => setShowConfig(false)} className="text-slate-500"><X size={16}/></button>
                  )}
               </div>
               
               <div className="space-y-4">
                  <div>
                     <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Lead Agent</label>
                     <select 
                        value={leadModel} 
                        onChange={(e) => setLeadModel(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                     >
                        <optgroup label="Gemini (Cloud)">
                           {availableModels.gemini?.map(m => <option key={m} value={m}>{m}</option>)}
                        </optgroup>
                        <optgroup label="Local (Ollama)">
                           {availableModels.ollama?.map((m: any) => <option key={m.name} value={m.name}>{m.name}</option>)}
                        </optgroup>
                     </select>
                  </div>

                  <div>
                     <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Critic Agent</label>
                     <select 
                        value={criticModel} 
                        onChange={(e) => setCriticModel(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none"
                     >
                        <optgroup label="Local (Ollama)">
                           {availableModels.ollama?.map((m: any) => <option key={m.name} value={m.name}>{m.name}</option>)}
                        </optgroup>
                        <optgroup label="Gemini (Cloud)">
                           {availableModels.gemini?.map(m => <option key={m} value={m}>{m}</option>)}
                        </optgroup>
                     </select>
                  </div>

                  <div>
                     <div className="flex justify-between">
                        <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Interaction Turns</label>
                        <span className="text-xs font-mono text-jb-accent">{turns}</span>
                     </div>
                     <input 
                        type="range" min="2" max="10" step="1" 
                        value={turns} 
                        onChange={(e) => setTurns(parseInt(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-jb-purple"
                     />
                  </div>
               </div>
            </motion.div>
         )}
      </AnimatePresence>

      <div className={cn(
        "flex mb-10 gap-6",
        deviceInfo.isMobile ? "flex-col items-start" : "items-center justify-between"
      )}>
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-jb-purple/20 rounded-2xl flex items-center justify-center border border-jb-purple/30 shrink-0">
                <Users className="text-jb-purple" size={24} />
            </div>
            <div>
                <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Multi-Agent Collaboration</h2>
                <p className="text-[9px] md:text-[11px] text-slate-500 font-bold uppercase tracking-widest">Orchestrating Hierarchical Intelligence</p>
            </div>
        </div>

        <div className={cn(
          "flex gap-3 w-full",
          deviceInfo.isMobile ? "flex-wrap" : "md:w-auto"
        )}>
            <input 
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRun()}
              className={cn(
                "bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-sm outline-none focus:border-jb-purple transition-all text-white placeholder:text-slate-600 font-medium",
                deviceInfo.isMobile ? "flex-1 min-w-[200px]" : "w-[350px]"
              )}
              placeholder="Define the mission..."
            />
            <div className="flex gap-2">
               <button 
                  onClick={() => setShowConfig(!showConfig)}
                  className={cn(
                     "p-3 rounded-xl transition-all border border-white/10 hover:bg-white/5",
                     showConfig ? "bg-white/10 text-white" : "text-slate-500"
                  )}
               >
                  <Settings2 size={20} />
               </button>
               <button 
                   onClick={handleRun} 
                   disabled={isRunning || !task.trim()}
                   className="bg-jb-purple text-white hover:bg-fuchsia-600 px-8 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-20 shadow-xl grow"
               >
                   {isRunning ? <Loader2 className="animate-spin" size={16}/> : <Play size={16}/>}
                   {isRunning ? 'Deploying' : 'Deploy'}
               </button>
            </div>
        </div>
      </div>

      <div className={cn(
        "flex-1 space-y-8 pb-10 scrollbar-hide",
        deviceInfo.isMobile ? "" : "pr-4"
      )} ref={scrollRef}>
        <AnimatePresence>
          {steps.map((step, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn(
                "relative",
                deviceInfo.isMobile ? "pl-0" : "pl-10"
              )}
            >
               {!deviceInfo.isMobile && i < steps.length - 1 && (
                  <div className="absolute left-[19px] top-10 bottom-[-32px] w-px bg-white/5" />
               )}
               
               {!deviceInfo.isMobile && (
                 <div className="absolute left-0 top-1 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                    <span className="text-[10px] font-black text-slate-500">{i + 1}</span>
                 </div>
               )}

               <div className={cn(
                 "bg-white/2 border border-white/5 rounded-[32px] shadow-2xl",
                 deviceInfo.isMobile ? "p-6" : "p-8"
               )}>
                  <div className={cn("font-black text-xs uppercase tracking-[0.2em] mb-4 flex items-center gap-2", step.color)}>
                     <Bot size={14} /> {step.agent}
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: parse(step.content || '') as string }} />
               </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {error && (
            <div className={cn(
              "flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm",
              deviceInfo.isMobile ? "" : "ml-10"
            )}>
                <AlertCircle size={18} />
                <span className="font-bold">Execution Error:</span> {error}
            </div>
        )}

        {isRunning && (
           <div className={cn(
             "flex items-center gap-4",
             deviceInfo.isMobile ? "" : "pl-10"
           )}>
              <div className="w-10 h-10 rounded-full bg-jb-purple/10 border border-jb-purple/20 flex items-center justify-center shrink-0">
                 <Loader2 size={16} className="text-jb-purple animate-spin" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 animate-pulse">Syncing Cognitive Nodes</span>
           </div>
        )}

        {!isRunning && steps.length === 0 && !error && (
          <div className="absolute inset-0 top-32 flex flex-col items-center justify-center pointer-events-none">
             <div className="absolute inset-0 opacity-30">
                <KnowledgeMap />
             </div>
             <div className="relative z-10 text-center space-y-4">
               <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shadow-2xl inline-block">
                 <Network size={48} className="mx-auto mb-4 text-slate-500" />
                 <p className="font-bold text-sm text-slate-300">Mission Map Active</p>
                 <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Ready for Agent Deployment</p>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};