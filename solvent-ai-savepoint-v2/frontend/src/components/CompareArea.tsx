import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { API_BASE_URL } from '../lib/config';
import { GitCompare, Sparkles, RefreshCw, Bot, AlertCircle } from 'lucide-react';
import { parse } from 'marked';
import { motion, AnimatePresence } from 'framer-motion';

export const CompareArea = () => {
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
    <div className="flex flex-col h-full bg-jb-dark/50 backdrop-blur-3xl rounded-tl-2xl border-l border-t border-white/5 overflow-hidden shadow-2xl p-8">
      
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-jb-accent/20 rounded-2xl flex items-center justify-center border border-jb-accent/30">
                <GitCompare className="text-jb-accent" size={24} />
            </div>
            <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Model Comparison Lab</h2>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Cross-benchmarking Intelligence</p>
            </div>
        </div>

        <div className="flex gap-3">
            <input 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
              className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 w-[400px] text-sm outline-none focus:border-jb-accent transition-all text-white placeholder:text-slate-600 font-medium"
              placeholder="Enter prompt for benchmarking..."
            />
            <button 
                onClick={handleCompare} 
                disabled={isComparing || !prompt.trim()}
                className="bg-white text-black hover:bg-jb-accent hover:text-white px-8 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all disabled:opacity-20 shadow-xl"
            >
                {isComparing ? <RefreshCw className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                {isComparing ? 'Processing...' : 'Execute Test'}
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
        
        {/* Gemini Pro Column */}
        <div className="flex flex-col gap-4 bg-white/2 border border-white/5 rounded-[32px] p-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3 text-jb-accent font-black text-xs uppercase tracking-widest">
                    <Bot size={18} /> Gemini 1.5 Pro
                </div>
                <span className="text-[10px] font-bold text-slate-600">CLOUD / GOOGLE</span>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide text-slate-300">
                {results ? (
                    <div className="prose prose-invert prose-sm max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: parse(results.gemini || '') as string }} />
                ) : (
                    <div className="h-full flex items-center justify-center opacity-20 italic text-sm">Waiting for execution...</div>
                )}
            </div>
        </div>

        {/* Ollama Column */}
        <div className="flex flex-col gap-4 bg-white/2 border border-white/5 rounded-[32px] p-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3 text-jb-orange font-black text-xs uppercase tracking-widest">
                    <Bot size={18} /> Qwen 2.5 (Local)
                </div>
                <span className="text-[10px] font-bold text-slate-600">EDGE / PRIVATE</span>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-hide text-slate-300">
                {results ? (
                    <div className="prose prose-invert prose-sm max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: parse(results.ollama || '') as string }} />
                ) : (
                    <div className="h-full flex items-center justify-center opacity-20 italic text-sm">Waiting for execution...</div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};