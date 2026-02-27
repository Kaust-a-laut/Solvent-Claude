import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { API_BASE_URL } from '../lib/config';
import { GitCompare, Sparkles, RefreshCw, Bot, AlertCircle, Cloud, Shield } from 'lucide-react';
import { parse } from 'marked';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { BentoItem } from './BentoGrid';

export const CompareArea = () => {
  const { deviceInfo } = useAppStore();
  const [isComparing, setIsComparing] = useState(false);
  const [results, setResults] = useState<{ gemini: string; ollama: string } | null>(null);
  const [prompt, setPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCompare = async () => {
    if (!prompt.trim()) return;
    setIsComparing(true);
    setResults(null);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }]
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Comparison failed.');
      setResults(data);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setIsComparing(false);
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
            <div className="w-16 h-16 bg-jb-accent/10 rounded-[2rem] flex items-center justify-center border border-jb-accent/20 shadow-2xl relative group">
                <div className="absolute inset-0 bg-jb-accent/20 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <GitCompare className="text-jb-accent relative z-10" size={32} />
            </div>
            <div>
                <h2 className="text-3xl md:text-4xl font-[900] text-white tracking-tighter">Model Comparison <span className="text-vibrant">Lab</span></h2>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Cross-benchmarking Neural Intelligence</p>
            </div>
        </div>

        <div className={cn(
          "flex gap-3 w-full",
          deviceInfo.isMobile ? "flex-col" : "md:w-auto"
        )}>
            <div className="relative group">
                <input 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
                  className={cn(
                    "bg-black/40 border border-white/10 rounded-2xl px-6 py-4 text-sm outline-none focus:border-jb-accent/50 transition-all text-white placeholder:text-slate-600 font-bold backdrop-blur-xl",
                    deviceInfo.isMobile ? "w-full" : "w-[450px]"
                  )}
                  placeholder="Enter benchmarking objective..."
                />
            </div>
            <button 
                onClick={handleCompare} 
                disabled={isComparing || !prompt.trim()}
                className="bg-white text-black hover:bg-jb-accent hover:text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-20 shadow-[0_20px_40px_rgba(0,0,0,0.3)] group"
            >
                {isComparing ? <RefreshCw className="animate-spin" size={16}/> : <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />}
                {isComparing ? 'Processing' : 'Execute Test'}
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
                <span className="font-black uppercase tracking-widest text-[10px]">Diagnostic Error</span>
                <span className="font-bold">{error}</span>
            </div>
        </motion.div>
      )}

      <div className={cn(
        "grid gap-8 pb-20",
        deviceInfo.isMobile ? "grid-cols-1" : "grid-cols-2"
      )}>
        
        {/* Gemini Pro Column */}
        <BentoItem delay={0.1} className="min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-jb-accent/10 border border-jb-accent/20 text-jb-accent">
                        <Bot size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white font-black text-sm uppercase tracking-tight">Gemini 1.5 Pro</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Cloud size={10} className="text-slate-500" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Global Cloud Node</span>
                        </div>
                    </div>
                </div>
                <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase tracking-widest">
                   Nominal
                </div>
            </div>
            <div className="flex-1 text-slate-300">
                {results ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="prose prose-invert prose-sm max-w-none leading-relaxed" 
                      dangerouslySetInnerHTML={{ __html: parse(results.gemini || '') as string }} 
                    />
                ) : (
                    <div className="h-full flex flex-col justify-center gap-4 opacity-20">
                        <div className="bg-white/10 animate-pulse rounded-full h-4 w-3/4" />
                        <div className="bg-white/10 animate-pulse rounded-full h-4 w-1/2" />
                        <div className="bg-white/10 animate-pulse rounded-full h-4 w-5/6" />
                        <div className="bg-white/10 animate-pulse rounded-full h-4 w-2/3" />
                    </div>
                )}
            </div>
        </BentoItem>

        {/* Ollama Column */}
        <BentoItem delay={0.2} className="min-h-[500px] flex flex-col">
            <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-jb-orange/10 border border-jb-orange/20 text-jb-orange">
                        <Bot size={20} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white font-black text-sm uppercase tracking-tight">Qwen 2.5</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <Shield size={10} className="text-slate-500" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Private Edge Model</span>
                        </div>
                    </div>
                </div>
                <div className="px-3 py-1 rounded-lg bg-jb-orange/10 border border-jb-orange/20 text-jb-orange text-[9px] font-black uppercase tracking-widest">
                   Local
                </div>
            </div>
            <div className="flex-1 text-slate-300">
                {results ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="prose prose-invert prose-sm max-w-none leading-relaxed" 
                      dangerouslySetInnerHTML={{ __html: parse(results.ollama || '') as string }} 
                    />
                ) : (
                    <div className="h-full flex flex-col justify-center gap-4 opacity-20">
                        <div className="bg-white/10 animate-pulse rounded-full h-4 w-3/4" />
                        <div className="bg-white/10 animate-pulse rounded-full h-4 w-1/2" />
                        <div className="bg-white/10 animate-pulse rounded-full h-4 w-5/6" />
                        <div className="bg-white/10 animate-pulse rounded-full h-4 w-2/3" />
                    </div>
                )}
            </div>
        </BentoItem>

      </div>
    </div>
  );
};