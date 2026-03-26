import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Code, Eye, FileJson, ChevronDown, CheckCircle2, CircleDashed, AlertCircle, Circle } from 'lucide-react';
import { cn } from '../lib/utils';
import { CodeBlock } from './CodeBlock';

export const WaterfallVisualizer = () => {
  const { waterfall } = useAppStore();
  const [expandedStep, setExpandedStep] = useState<string | null>(null);

  if (!waterfall.currentStep && waterfall.steps.architect.status === 'idle') return null;

  const steps = [
    { id: 'architect', label: 'Architect', icon: Brain, data: waterfall.steps.architect },
    { id: 'reasoner', label: 'Reasoner', icon: FileJson, data: waterfall.steps.reasoner },
    { id: 'executor', label: 'Executor', icon: Code, data: waterfall.steps.executor },
    { id: 'reviewer', label: 'Reviewer', icon: Eye, data: waterfall.steps.reviewer },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 size={16} className="text-green-400" />;
      case 'processing': return <CircleDashed size={16} className="text-blue-400 animate-spin" />;
      case 'error': return <AlertCircle size={16} className="text-red-400" />;
      default: return <Circle size={16} className="text-slate-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400 border-green-400/30 bg-green-400/10';
      case 'processing': return 'text-blue-400 border-blue-400/30 bg-blue-400/10 shadow-[0_0_15px_rgba(59,130,246,0.2)]';
      case 'error': return 'text-red-400 border-red-400/30 bg-red-400/10';
      default: return 'text-slate-600 border-slate-700 bg-slate-800/50';
    }
  };

  const renderDataPreview = (stepId: string, data: any) => {
    if (!data) return null;
    
    // Custom renderers for different step outputs
    if (stepId === 'architect' || stepId === 'reasoner') {
      return (
        <div className="mt-4">
           <CodeBlock language="json" code={JSON.stringify(data, null, 2)} />
        </div>
      );
    }
    
    if (stepId === 'executor') {
      return (
        <div className="mt-4">
           <div className="text-sm text-slate-400 mb-2">{data.explanation}</div>
           <CodeBlock language="typescript" code={data.code || '// No code generated'} />
        </div>
      );
    }

    if (stepId === 'reviewer') {
      return (
         <div className="mt-4 p-4 rounded bg-slate-900 border border-slate-700">
            <div className="flex justify-between items-center mb-4">
               <span className="text-sm font-bold text-slate-300">Score: {data.score}/100</span>
               <span className="text-xs uppercase tracking-wider text-slate-500">{data.summary}</span>
            </div>
            <ul className="space-y-2">
               {data.issues?.map((issue: string, idx: number) => (
                  <li key={idx} className="text-xs text-red-300 flex items-start gap-2">
                     <AlertCircle size={12} className="mt-0.5 shrink-0" />
                     {issue}
                  </li>
               ))}
            </ul>
         </div>
      );
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-8 space-y-4">
      <div className="flex items-center justify-between px-2 mb-4">
         <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Waterfall Pipeline</h3>
         {waterfall.currentStep && (
            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full border border-blue-500/20">
               Active: {waterfall.currentStep}
            </span>
         )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {steps.map((step, index) => {
          const isActive = waterfall.currentStep === step.id;
          const isCompleted = step.data.status === 'completed';
          const Icon = step.icon;

          return (
            <motion.div
              key={step.id}
              layout
              onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
              className={cn(
                "relative group cursor-pointer rounded-xl border p-4 transition-all duration-300",
                getStatusColor(step.data.status),
                isActive && "ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/10 scale-105 z-10",
                !isActive && !isCompleted && "opacity-50 grayscale"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon size={20} />
                {getStatusIcon(step.data.status)}
              </div>
              
              <div className="font-medium text-sm">{step.label}</div>
              <div className="text-[10px] opacity-70 mt-1 capitalize">{step.data.status}</div>
              
              {step.data.data && (
                 <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronDown size={14} className={cn("transition-transform", expandedStep === step.id && "rotate-180")} />
                 </div>
              )}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {expandedStep && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 rounded-xl border border-slate-700/50 bg-black/40 backdrop-blur-sm">
               <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-2">
                  <span className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                     {steps.find(s => s.id === expandedStep)?.label} Output
                  </span>
                  <button onClick={() => setExpandedStep(null)} className="text-slate-500 hover:text-white">Close</button>
               </div>
               {renderDataPreview(expandedStep, waterfall.steps[expandedStep as keyof typeof waterfall.steps].data)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
