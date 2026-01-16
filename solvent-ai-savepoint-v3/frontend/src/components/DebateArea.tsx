import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { API_BASE_URL } from '../lib/config';
import { Swords, Bot, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { parse } from 'marked';
import { motion, AnimatePresence } from 'framer-motion';

export const DebateArea = () => {
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
         // Round 1: Gemini Proposes
         const leftResponse = await callModel('gemini', 'gemini-1.5-flash', [], `Present a strong argument for: "${topic}". Be concise and provocative.`);
         setLeftHistory([{ agent: 'Gemini Pro', content: leftResponse }]);
         
         // Round 1: Ollama Rebuts
         const rightResponse = await callModel('ollama', 'qwen2.5:3b', [], `Critique this argument aggressively: "${leftResponse}". Defend the opposing view.`);
         setRightHistory([{ agent: 'Qwen 2.5', content: rightResponse }]);
         
         // Round 2: Gemini Counter-Rebuts
         const leftRebuttal = await callModel('gemini', 'gemini-1.5-flash', [], `Your argument was critiqued: "${rightResponse}". Counter this critique effectively.`);
         setLeftHistory(prev => [...prev, { agent: 'Gemini Pro', content: leftRebuttal }]);

     } catch (e: any) {
         console.error(e);
         setError(e.message);
     } finally {
         setIsDebating(false);
     }
  };

  return (
    <div className="flex flex-col h-full bg-jb-dark/50 backdrop-blur-3xl rounded-tl-2xl border-l border-t border-white/5 overflow-hidden shadow-2xl p-8">
      
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-jb-pink/20 rounded-2xl flex items-center justify-center border border-jb-pink/30">
                <Swords className="text-jb-pink" size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Adversarial Debate Lab</h2>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Cross-Model Dialectical Synthesis</p>
            </div>
        </div>

        <div className="flex gap-3">
            <input 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 w-[400px] text-sm outline-none focus:border-jb-pink transition-all text-white placeholder:text-slate-600 font-medium"
              placeholder="Enter debate topic..."
            />
            <button 
                onClick={handleStartDebate} 
                disabled={isDebating}
                className="bg-jb-pink text-white hover:bg-rose-600 px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all disabled:opacity-20 shadow-xl"
            >
                {isDebating ? <RefreshCw className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                {isDebating ? 'Simulating...' : 'Ignite Debate'}
            </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm flex items-center gap-3">
            <AlertCircle size={18} />
            <span className="font-bold">Error:</span> {error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-2 gap-8 overflow-hidden">
        
        {/* Gemini Column */}
        <div className="flex flex-col gap-4 bg-white/2 border border-white/5 rounded-[32px] p-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3 text-jb-accent font-black text-xs uppercase tracking-widest">
                    <Bot size={18} /> Gemini Pro
                </div>
                <div className="w-2 h-2 rounded-full bg-jb-accent animate-pulse" />
            </div>
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-6">
                <AnimatePresence>
                  {leftHistory.map((m, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-jb-accent/5 border border-jb-accent/20 p-5 rounded-2xl text-sm text-slate-200 leading-relaxed shadow-lg"
                    >
                        <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: parse(m.content || '') as string }} />
                    </motion.div>
                  ))}
                </AnimatePresence>
            </div>
        </div>

        {/* Ollama Column */}
        <div className="flex flex-col gap-4 bg-white/2 border border-white/5 rounded-[32px] p-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3 text-jb-orange font-black text-xs uppercase tracking-widest">
                    <Bot size={18} /> Qwen 2.5
                </div>
                <div className="w-2 h-2 rounded-full bg-jb-orange animate-pulse" />
            </div>
             <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide space-y-6">
                <AnimatePresence>
                  {rightHistory.map((m, i) => (
                    <motion.div 
                      key={i} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-jb-orange/5 border border-jb-orange/20 p-5 rounded-2xl text-sm text-slate-200 leading-relaxed shadow-lg"
                    >
                         <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: parse(m.content || '') as string }} />
                    </motion.div>
                  ))}
                </AnimatePresence>
            </div>
        </div>

      </div>
    </div>
  );
};