import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Brain, Code, Cpu, Sparkles, Loader2, ShieldCheck, Target } from 'lucide-react';
import { parse } from 'marked';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { BentoItem } from './BentoGrid';

export const WaterfallArea = () => {
  const { deviceInfo, waterfall, runFullWaterfall } = useAppStore();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExecute = async () => {
    if (!input.trim() || isProcessing) return;
    setIsProcessing(true);

    try {
      await runFullWaterfall(input);
    } catch (error: any) {
      console.error('[Waterfall] Execution failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPanelContent = (step: any) => {
    if (step.status === 'processing') return `_Processing logic trace: ${step.data?.message || 'Synchronizing models...'}_`;
    if (step.status === 'error') return `❌ **Diagnostic Failure**: ${step.error}`;
    if (step.status === 'completed') {
      const d = step.data;
      if (typeof d === 'string') return d;
      if (d?.code) return `\`\`\`typescript\n${d.code}\n\`\`\`\n\n**Files**: ${d.files?.join(', ') || 'N/A'}\n\n**Explanation**: ${d.explanation || ''}`;
      if (d?.plan) return `### Strategic Plan\n${d.plan}\n\n### Implementation Steps\n${d.steps?.map((s: any) => `- **${s.title}**: ${s.description}`).join('\n')}`;
      if (d?.logic) return `### Logic Trace\n${d.logic}\n\n### Complexity Assessment: ${d.complexity}\n\n### Architectural Assumptions\n${d.assumptions?.map((a: string) => `- ${a}`).join('\n')}`;
      if (d?.summary) return `### Quality Score: ${d.score}/100\n\n### Final Verdict\n${d.summary}\n\n### Optimizations Identified\n${d.issues?.map((i: string) => `- ${i}`).join('\n')}`;
      return JSON.stringify(d, null, 2);
    }
    return '';
  };

  const Panel = ({ title, icon: Icon, content, color, delay, status }: any) => (
    <BentoItem 
      delay={delay}
      className={cn(
        "flex-1 flex flex-col transition-all duration-700 min-h-[500px]",
        status === 'processing' ? "border-jb-accent/40 shadow-[0_0_40px_-10px_rgba(60,113,247,0.3)] ring-1 ring-jb-accent/20" : "",
        deviceInfo.isMobile ? "min-w-full" : "min-w-[400px]"
      )}
    >
      <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-6">
        <div className="flex items-center gap-4">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center border shadow-2xl transition-all duration-500", color)}>
            <Icon size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white">{title}</span>
            <span className="text-[8px] font-mono text-slate-600 uppercase tracking-widest mt-0.5">Core Processor // v1.4</span>
          </div>
        </div>
        {status === 'processing' && (
           <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-jb-accent animate-pulse shadow-[0_0_8px_rgba(60,113,247,0.8)]" />
              <span className="text-[9px] font-black text-jb-accent uppercase tracking-widest">Active</span>
           </div>
        )}
        {status === 'completed' && (
           <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-black uppercase tracking-widest">
              Success
           </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin focusable-container" tabIndex={0}>
        <div className="prose prose-invert prose-sm max-w-none prose-pre:bg-black/40" dangerouslySetInnerHTML={{ __html: parse(content || '') as string }} />
      </div>
    </BentoItem>
  );

  return (
    <div className="flex flex-col h-full relative overflow-y-auto bg-black/20 backdrop-blur-3xl scrollbar-thin">
      {/* Header */}
      <div className={cn(
        "flex items-center border-b border-white/5 bg-black/40 transition-all duration-500",
        deviceInfo.isMobile ? "px-6 pt-28 pb-8 h-auto" : "px-12 h-28"
      )}>
        <div className="flex items-center gap-8">
            <div className="w-16 h-16 bg-jb-purple/10 rounded-[2rem] flex items-center justify-center border border-jb-purple/20 shadow-2xl relative group">
                <div className="absolute inset-0 bg-jb-purple/20 rounded-[2rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <Target className="text-jb-purple relative z-10" size={32} />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-1">Architecture Pipeline</span>
              <h2 className="text-3xl md:text-4xl font-[900] text-white tracking-tighter italic">Logic <span className="text-vibrant">Waterfall</span></h2>
            </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className={cn(
        "flex-1 flex flex-col gap-10 transition-all duration-500",
        deviceInfo.isMobile ? "p-6 pt-10" : "p-12"
      )}>
        
        {/* Input Bar */}
        <div className="max-w-5xl w-full mx-auto">
          <div className="vibrant-border rounded-[2.5rem] overflow-hidden shadow-2xl transition-transform hover:scale-[1.01] duration-500">
            <div className="bg-black/80 backdrop-blur-3xl p-2 px-8 flex items-center gap-6 border border-white/5">
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleExecute();
                  }
                }}
                placeholder="Architect a complex feature..."
                className="flex-1 bg-transparent border-none outline-none text-[15px] font-bold text-white placeholder:text-slate-800 py-4"
              />
              <button 
                type="button"
                onClick={() => handleExecute()}
                disabled={isProcessing || !input.trim()}
                className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:bg-jb-accent hover:text-white transition-all disabled:opacity-10 shadow-2xl group shrink-0"
              >
                {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />}
              </button>
            </div>
          </div>
        </div>

        {/* Results Grid */}
        <div className={cn(
          "flex-1 flex gap-8 pb-10",
          deviceInfo.isMobile ? "flex-col overflow-y-visible" : "overflow-x-auto scrollbar-thin snap-x"
        )}>
          <AnimatePresence>
            {!waterfall.currentStep && isProcessing && (
               <div className="flex-1 flex items-center justify-center py-40">
                  <div className="flex flex-col items-center gap-8">
                     <div className="flex gap-4">
                        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-4 h-4 bg-jb-accent rounded-full shadow-[0_0_15px_rgba(60,113,247,0.5)]" />
                        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }} className="w-4 h-4 bg-jb-purple rounded-full shadow-[0_0_15px_rgba(157,91,210,0.5)]" />
                        <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.6 }} className="w-4 h-4 bg-jb-orange rounded-full shadow-[0_0_15px_rgba(251,146,60,0.5)]" />
                     </div>
                     <span className="text-[11px] font-black uppercase tracking-[0.6em] text-slate-500 animate-pulse">Initializing Multi-Stage Pipeline...</span>
                  </div>
               </div>
            )}

            {waterfall.currentStep && (
              <>
                <Panel 
                  title="Architect" 
                  icon={Brain} 
                  content={getPanelContent(waterfall.steps.architect)} 
                  color="text-jb-accent border-jb-accent/20 bg-jb-accent/5"
                  status={waterfall.steps.architect.status}
                  delay={0.1}
                />
                <Panel 
                  title="Reasoner" 
                  icon={Cpu} 
                  content={getPanelContent(waterfall.steps.reasoner)} 
                  color="text-jb-purple border-jb-purple/20 bg-jb-purple/5"
                  status={waterfall.steps.reasoner.status}
                  delay={0.2}
                />
                <Panel 
                  title="Executor" 
                  icon={Code} 
                  content={getPanelContent(waterfall.steps.executor)} 
                  color="text-jb-orange border-jb-orange/20 bg-jb-orange/5"
                  status={waterfall.steps.executor.status}
                  delay={0.3}
                />
                <Panel 
                  title="Senior Review" 
                  icon={ShieldCheck} 
                  content={getPanelContent(waterfall.steps.reviewer)} 
                  color="text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                  status={waterfall.steps.reviewer.status}
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