import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Send, Brain, Code, Cpu, Sparkles, Loader2, ChevronRight, ShieldCheck } from 'lucide-react';
import { parse } from 'marked';
import { cn } from '../lib/utils';
import { API_BASE_URL } from '../lib/config';
import { motion, AnimatePresence } from 'framer-motion';

export const WaterfallArea = () => {
  const { deviceInfo, globalProvider } = useAppStore();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResult] = useState<{ architect: string, reasoner: string, executor: string, review: string } | null>(null);

  const handleExecute = async () => {
    if (!input.trim() || isProcessing) return;
    setIsProcessing(true);
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/waterfall`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ prompt: input, globalProvider })
      });
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }
      
      const data = await response.json();
      setResult(data);
    } catch (error: any) {
      console.error('[Waterfall] Execution failed:', error);
      alert(`Waterfall Error: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const Panel = ({ title, icon: Icon, content, color, delay }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        "flex-1 bg-black/40 backdrop-blur-3xl border border-white/5 rounded-[32px] overflow-hidden flex flex-col shadow-2xl transition-all duration-500",
        deviceInfo.isMobile ? "min-w-full" : "min-w-[350px]"
      )}
    >
      <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", color)}>
            <Icon size={16} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white">{title}</span>
        </div>
        <div className="text-[8px] font-mono text-slate-600">PROT_V1.4</div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin">
        <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-black/40" dangerouslySetInnerHTML={{ __html: parse(content || '') as string }} />
      </div>
    </motion.div>
  );

  return (
    <div className="flex flex-col h-full relative overflow-y-auto">
      {/* Header */}
      <div className={cn(
        "flex items-center border-b border-white/5 bg-gradient-to-b from-black/60 to-transparent transition-all duration-500",
        deviceInfo.isMobile ? "px-6 pt-28 pb-6 h-auto" : "px-12 h-24"
      )}>
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mb-1">Developer Lab</span>
          <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight italic">Neural Waterfall</h2>
        </div>
      </div>

      {/* Main Workspace */}
      <div className={cn(
        "flex-1 flex flex-col gap-8 transition-all duration-500",
        deviceInfo.isMobile ? "p-6" : "p-12"
      )}>
        
        {/* Input Bar */}
        <div className="max-w-4xl w-full mx-auto">
          <div className="vibrant-border rounded-full overflow-hidden shadow-2xl">
            <div className="bg-black/60 backdrop-blur-3xl p-1.5 px-6 flex items-center gap-4">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleExecute();
                  }
                }}
                placeholder="Architect a new feature..."
                className="flex-1 bg-transparent border-none outline-none text-sm font-semibold text-white placeholder:text-slate-800 py-3"
              />
              <button 
                type="button"
                onClick={() => handleExecute()}
                disabled={isProcessing || !input.trim()}
                className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-10 shadow-xl shrink-0"
              >
                {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Results Grid - Responsive layout */}
        <div className={cn(
          "flex-1 flex gap-6 pb-6",
          deviceInfo.isMobile ? "flex-col overflow-y-visible" : "overflow-x-auto scrollbar-thin"
        )}>
          <AnimatePresence>
            {!results && isProcessing && (
               <div className="flex-1 flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-6">
                     <div className="flex gap-2">
                        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-3 h-3 bg-jb-accent rounded-full" />
                        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-3 h-3 bg-jb-purple rounded-full" />
                        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-3 h-3 bg-jb-orange rounded-full" />
                     </div>
                     <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Executing Pipeline...</span>
                  </div>
               </div>
            )}

            {results && (
              <>
                <Panel 
                  title="Architect" 
                  icon={Brain} 
                  content={results.architect} 
                  color="text-jb-accent border-jb-accent/20"
                  delay={0.1}
                />
                <Panel 
                  title="Reasoner" 
                  icon={Cpu} 
                  content={results.reasoner} 
                  color="text-jb-purple border-jb-purple/20"
                  delay={0.2}
                />
                <Panel 
                  title="Executor" 
                  icon={Code} 
                  content={results.executor} 
                  color="text-jb-orange border-jb-orange/20"
                  delay={0.3}
                />
                <Panel 
                  title="Senior Review" 
                  icon={ShieldCheck} 
                  content={results.review} 
                  color="text-green-500 border-green-500/20"
                  delay={0.4}
                />
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};