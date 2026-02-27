import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown, ChevronUp, X, Sparkles, AlertTriangle, Lightbulb } from 'lucide-react';
import { cn } from '../lib/utils';

interface InsightEntry {
  id: string;
  message: string;
  timestamp: Date;
  type: 'insight' | 'warning' | 'decision' | 'nudge';
}

export const SupervisorHistory = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [insights, setInsights] = useState<InsightEntry[]>([]);
  const { supervisorInsight, setSupervisorInsight } = useAppStore();

  // Capture new insights into history
  useEffect(() => {
    if (supervisorInsight) {
      const newInsight: InsightEntry = {
        id: `insight-${Date.now()}`,
        message: supervisorInsight,
        timestamp: new Date(),
        type: supervisorInsight.toLowerCase().includes('warning') ? 'warning'
            : supervisorInsight.toLowerCase().includes('decision') ? 'decision'
            : 'insight'
      };
      setInsights(prev => [newInsight, ...prev.slice(0, 19)]); // Keep last 20

      // Don't auto-clear anymore - user controls dismissal
    }
  }, [supervisorInsight]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'warning': return <AlertTriangle size={14} className="text-amber-400" />;
      case 'decision': return <Sparkles size={14} className="text-jb-purple" />;
      case 'nudge': return <Lightbulb size={14} className="text-cyan-400" />;
      default: return <Brain size={14} className="text-jb-purple" />;
    }
  };

  const clearHistory = () => {
    setInsights([]);
    setSupervisorInsight(null);
  };

  // Don't render if no insights ever
  if (insights.length === 0 && !supervisorInsight) return null;

  // Minimized state - just a floating indicator
  if (isMinimized) {
    return (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 bg-black/90 backdrop-blur-xl border border-jb-purple/30 rounded-full shadow-2xl hover:border-jb-purple/50 transition-all group"
      >
        <div className="relative">
          <Brain size={16} className="text-jb-purple" />
          <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-jb-purple animate-pulse" />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-white">
          {insights.length} Insights
        </span>
        <ChevronUp size={14} className="text-slate-500 group-hover:text-white transition-colors" />
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4"
    >
      <div className="bg-black/95 backdrop-blur-2xl border border-jb-purple/30 rounded-2xl shadow-[0_25px_50px_-12px_rgba(157,91,210,0.25)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-9 h-9 rounded-xl bg-jb-purple/20 flex items-center justify-center relative">
              <Brain size={18} className="text-jb-purple" />
              {insights.length > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-jb-purple flex items-center justify-center">
                  <span className="text-[8px] font-black text-white">{insights.length}</span>
                </div>
              )}
            </div>
            <div className="text-left">
              <p className="text-[11px] font-black uppercase tracking-widest text-white">
                Supervisor Insights
              </p>
              <p className="text-[9px] text-slate-500">
                {insights.length > 0 ? `${insights.length} recorded` : 'Monitoring...'}
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            {insights.length > 0 && (
              <button
                onClick={clearHistory}
                className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                title="Clear history"
              >
                <X size={14} />
              </button>
            )}
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition-all"
              title="Minimize"
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>

        {/* Expandable Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
                {insights.map((insight, i) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "p-3 rounded-xl transition-all duration-300",
                      i === 0
                        ? "bg-jb-purple/10 border border-jb-purple/20"
                        : "bg-white/[0.02] border border-transparent hover:border-white/5 opacity-70 hover:opacity-100"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "text-xs leading-relaxed",
                          i === 0 ? "text-white font-medium" : "text-slate-300"
                        )}>
                          {insight.message}
                        </p>
                        <p className="text-[9px] text-slate-500 mt-1.5 font-mono">
                          {insight.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {insights.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-[10px] text-slate-500">
                      No insights yet. The supervisor is observing...
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
