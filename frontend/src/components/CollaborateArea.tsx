import React, { useState } from 'react';
import { Users, ShieldAlert, Code2, Briefcase, Play, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../lib/config';

interface AgentOpinion {
  role: 'pm' | 'engineer' | 'security';
  opinion: string;
  status: 'pending' | 'completed';
}

const agentConfig = {
  pm: {
    icon: Briefcase,
    label: 'Product Manager',
    color: 'text-jb-cyan',
    border: 'border-jb-cyan/20',
    bg: 'bg-jb-cyan/5',
    glow: 'shadow-[0_0_20px_rgba(6,182,212,0.05)]',
  },
  engineer: {
    icon: Code2,
    label: 'Lead Engineer',
    color: 'text-jb-accent',
    border: 'border-jb-accent/20',
    bg: 'bg-jb-accent/5',
    glow: 'shadow-[0_0_20px_rgba(60,113,247,0.05)]',
  },
  security: {
    icon: ShieldAlert,
    label: 'Security Auditor',
    color: 'text-jb-orange',
    border: 'border-jb-orange/20',
    bg: 'bg-jb-orange/5',
    glow: 'shadow-[0_0_20px_rgba(251,146,60,0.05)]',
  },
} as const;

export const CollaborateArea = () => {
  const [goal, setGoal] = useState('');
  const [isDebating, setIsDebating] = useState(false);
  const [opinions, setOpinions] = useState<AgentOpinion[]>([]);

  const startCollaboration = async () => {
    if (!goal.trim()) return;
    setIsDebating(true);
    setOpinions([
      { role: 'pm', opinion: 'Analyzing business requirements and user impact...', status: 'pending' },
      { role: 'engineer', opinion: 'Evaluating technical feasibility and architectural impact...', status: 'pending' },
      { role: 'security', opinion: 'Auditing for potential vulnerabilities...', status: 'pending' },
    ]);

    try {
      const response = await fetch(`${API_BASE_URL}/collaborate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      });
      const data = await response.json();
      if (data.expertOpinions) {
        setOpinions(data.expertOpinions.map((o: { id: string; opinion: string }) => ({
          role: o.id as AgentOpinion['role'],
          opinion: o.opinion,
          status: 'completed' as const,
        })));
      }
    } catch (e) {
      console.error('Collaboration failed', e);
    } finally {
      setIsDebating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 md:p-12 bg-transparent scrollbar-thin">
      <div className="max-w-5xl mx-auto w-full flex flex-col min-h-full space-y-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-jb-purple/10 border border-jb-purple/20 rounded-2xl">
              <Users className="text-jb-purple" size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">Agentic War Room</h2>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mt-0.5">Multi-Agent Orchestration Engine</p>
            </div>
          </div>

          <button
            onClick={startCollaboration}
            disabled={isDebating || !goal.trim()}
            className="flex items-center gap-2.5 px-6 py-3 bg-jb-purple/10 border border-jb-purple/30 hover:bg-jb-purple/20 text-jb-purple text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(157,91,210,0.1)] hover:shadow-[0_0_30px_rgba(157,91,210,0.2)]"
          >
            {isDebating
              ? <><Loader2 size={14} className="animate-spin" /> Collaborating...</>
              : <><Play size={14} fill="currentColor" /> Start Collaboration</>
            }
          </button>
        </motion.div>

        {/* Input Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass-panel rounded-2xl p-5"
        >
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Mission Objective</p>
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Define the engineering mission goal..."
            className="w-full bg-transparent text-slate-300 outline-none resize-none h-24 text-[13px] font-medium leading-relaxed placeholder:text-slate-700"
          />
        </motion.div>

        {/* Opinion Cards */}
        <AnimatePresence mode="wait">
          {opinions.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-8"
            >
              {opinions.map((op, i) => {
                const cfg = agentConfig[op.role];
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={op.role}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className={cn(
                      'glass-panel rounded-2xl p-5 flex flex-col space-y-4 transition-all duration-500',
                      op.status === 'completed' && cfg.glow
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2 rounded-xl border', cfg.bg, cfg.border)}>
                        <Icon size={15} className={cfg.color} />
                      </div>
                      <div>
                        <span className={cn('text-[10px] font-black uppercase tracking-widest', cfg.color)}>
                          {cfg.label}
                        </span>
                        {op.status === 'completed' && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-1 h-1 rounded-full bg-emerald-500" />
                            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Completed</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1">
                      <p className={cn(
                        'text-[13px] text-slate-300 leading-relaxed transition-opacity duration-500',
                        op.status === 'pending' && 'opacity-50'
                      )}>
                        {op.opinion}
                      </p>
                    </div>

                    {op.status === 'pending' && (
                      <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
                        <Loader2 size={10} className="animate-spin" />
                        Processing...
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {opinions.length === 0 && !isDebating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center gap-4 py-20 opacity-30 pointer-events-none"
          >
            <Users size={40} className="text-slate-700" />
            <p className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-600">Define a mission to begin</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
