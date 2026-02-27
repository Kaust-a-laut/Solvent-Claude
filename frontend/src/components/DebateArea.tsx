import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { API_BASE_URL } from '../lib/config';
import { Swords, Bot, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { parse } from 'marked';
import { motion, AnimatePresence } from 'framer-motion';
import { BentoItem } from './BentoGrid';

export const DebateArea = () => {
  const { deviceInfo } = useAppStore();
  const [isDebating, setIsDebating] = useState(false);
  const [leftHistory, setLeftHistory] = useState<any[]>([]);
  const [rightHistory, setRightHistory] = useState<any[]>([]);
  const [topic, setTopic] = useState("The future of Artificial Intelligence");
  const [error, setError] = useState<string | null>(null);

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
      if (!response.ok) throw new Error(data.error || 'Agent failed.');
      return data.response;
    } catch (err: any) {
      throw new Error(err.message || 'Model unreachable.');
    }
  };

  const handleStartDebate = async () => {
     if (!topic.trim()) return;
     setIsDebating(true);
     setError(null);
     setLeftHistory([]);
     setRightHistory([]);

     try {
         const response = await fetch(`${API_BASE_URL}/debate`, {
           method: 'POST',
           headers: { 
             'Content-Type': 'application/json',
             'x-solvent-secret': 'solvent_dev_insecure_default' // Using default for now
           },
           body: JSON.stringify({ topic })
         });
         
         if (!response.ok) {
           const errData = await response.json();
           throw new Error(errData.error || 'Debate failed.');
         }

         const result = await response.json();
         
         // Map the result rounds to the UI columns
         // Result rounds: [proponent (Gemini), critic (Ollama), synthesizer (Gemini)]
         const proponent = result.rounds.find((r: any) => r.role === 'proponent');
         const critic = result.rounds.find((r: any) => r.role === 'critic');
         const synthesis = result.rounds.find((r: any) => r.role === 'synthesizer');

         if (proponent) setLeftHistory([{ agent: 'Gemini Pro', content: proponent.content }]);
         if (critic) setRightHistory([{ agent: 'Qwen 2.5', content: critic.content }]);
         if (synthesis) setLeftHistory(prev => [...prev, { agent: 'Gemini Pro (Synthesized)', content: synthesis.content }]);

     } catch (e: any) {
         console.error(e);
         setError(e.message);
     } finally {
         setIsDebating(false);
     }
  };

  return (
    <div className={cn(
      "flex flex-col h-full bg-black/20 backdrop-blur-3xl overflow-y-auto scrollbar-thin transition-all duration-500",
      deviceInfo.isMobile ? "p-4 pt-28 pb-32" : "p-12"
    )}>
      
      <div className={cn(
        "flex mb-12 gap-8",
        deviceInfo.isMobile ? "flex-col items-start" : "items-center justify-between"
      )}>
        <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-jb-pink/10 rounded-[2rem] flex items-center justify-center border border-jb-pink/20 shadow-2xl relative group">
                <div className="absolute inset-0 bg-jb-pink/20 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Swords className="text-jb-pink relative z-10" size={32} />
            </div>
            <div>
                <h2 className="text-3xl md:text-4xl font-[900] text-white tracking-tighter">Adversarial Debate <span className="text-vibrant">Lab</span></h2>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Cross-Model Dialectical Synthesis</p>
            </div>
        </div>

        <div className={cn(
          "flex gap-3 w-full",
          deviceInfo.isMobile ? "flex-col" : "md:w-auto"
        )}>
            <div className="relative group">
                <input 
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className={cn(
                    "bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:border-jb-pink/50 transition-all text-white placeholder:text-slate-600 font-bold backdrop-blur-xl",
                    deviceInfo.isMobile ? "w-full" : "w-[450px]"
                  )}
                  placeholder="Enter debate topic..."
                />
            </div>
            <button 
                onClick={handleStartDebate} 
                disabled={isDebating}
                className="bg-jb-pink text-white hover:bg-rose-600 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-20 shadow-[0_20px_40px_rgba(244,63,94,0.3)] group"
            >
                {isDebating ? <RefreshCw className="animate-spin" size={16}/> : <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />}
                {isDebating ? 'Simulating' : 'Ignite Debate'}
            </button>
        </div>
      </div>

      {error && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-8 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-4 backdrop-blur-md"
        >
            <AlertCircle size={20} />
            <div className="flex flex-col">
                <span className="font-black uppercase tracking-widest text-[10px]">Simulation Error</span>
                <span className="font-bold">{error}</span>
            </div>
        </motion.div>
      )}

      <div className={cn(
        "grid gap-8 pb-20",
        deviceInfo.isMobile ? "grid-cols-1" : "grid-cols-2"
      )}>
        
        {/* Gemini Column */}
        <BentoItem delay={0.1} className={cn(
          "min-h-[500px] flex flex-col transition-all duration-700",
          isDebating && leftHistory.length === rightHistory.length ? "border-jb-accent/40 shadow-[0_0_30px_-5px_rgba(60,113,247,0.2)]" : ""
        )}>
            <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-jb-accent/10 border border-jb-accent/20 text-jb-accent">
                        <Bot size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white font-black text-sm uppercase tracking-tight">Gemini Pro</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Aggressive Proponent</span>
                        </div>
                    </div>
                </div>
                {isDebating && leftHistory.length === rightHistory.length && (
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-jb-accent">Thinking</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-jb-accent animate-pulse shadow-[0_0_8px_rgba(60,113,247,0.8)]" />
                    </div>
                )}
            </div>
            <div className="flex-1 space-y-6">
                <AnimatePresence>
                  {leftHistory.map((m, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-jb-accent/5 border border-jb-accent/10 p-6 rounded-2xl text-sm text-slate-200 leading-relaxed shadow-lg relative overflow-hidden group"
                    >
                        <div className="absolute top-0 left-0 w-1 h-full bg-jb-accent/40" />
                        <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: parse(m.content || '') as string }} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isDebating && leftHistory.length === rightHistory.length && (
                   <div className="flex flex-col gap-3 opacity-20">
                      <div className="bg-white/10 animate-pulse rounded-full h-3 w-3/4" />
                      <div className="bg-white/10 animate-pulse rounded-full h-3 w-1/2" />
                   </div>
                )}
            </div>
        </BentoItem>

        {/* Ollama Column */}
        <BentoItem delay={0.2} className={cn(
          "min-h-[500px] flex flex-col transition-all duration-700",
          isDebating && leftHistory.length > rightHistory.length ? "border-jb-orange/40 shadow-[0_0_30px_-5px_rgba(249,115,22,0.2)]" : ""
        )}>
            <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-jb-orange/10 border border-jb-orange/20 text-jb-orange">
                        <Bot size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white font-black text-sm uppercase tracking-tight">Qwen 2.5</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Skeptical Opponent</span>
                        </div>
                    </div>
                </div>
                {isDebating && leftHistory.length > rightHistory.length && (
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono font-bold tracking-[0.2em] uppercase text-jb-orange">Processing</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-jb-orange animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                    </div>
                )}
            </div>
             <div className="flex-1 space-y-6">
                <AnimatePresence>
                  {rightHistory.map((m, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-jb-orange/5 border border-jb-orange/10 p-6 rounded-2xl text-sm text-slate-200 leading-relaxed shadow-lg relative overflow-hidden group"
                    >
                         <div className="absolute top-0 left-0 w-1 h-full bg-jb-orange/40" />
                         <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: parse(m.content || '') as string }} />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isDebating && leftHistory.length > rightHistory.length && (
                   <div className="flex flex-col gap-3 opacity-20">
                      <div className="bg-white/10 animate-pulse rounded-full h-3 w-3/4" />
                      <div className="bg-white/10 animate-pulse rounded-full h-3 w-1/2" />
                   </div>
                )}
            </div>
        </BentoItem>

      </div>
    </div>
  );
};