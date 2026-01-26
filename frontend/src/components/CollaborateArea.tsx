import React, { useState } from 'react';
import { Users, ShieldAlert, Code2, Briefcase, Play, MessageSquareQuote } from 'lucide-react';
import { cn } from '../lib/utils';

interface AgentOpinion {
  role: 'pm' | 'engineer' | 'security';
  opinion: string;
  status: 'pending' | 'completed';
}

export const CollaborateArea = () => {
  const [goal, setGoal] = useState('');
  const [isDebating, setIsDebating] = useState(false);
  const [opinions, setOpinions] = useState<AgentOpinion[]>([]);

  const startDebate = async () => {
    if (!goal) return;
    setIsDebating(true);
    setOpinions([
      { role: 'pm', opinion: 'Analyzing business requirements and user impact...', status: 'pending' },
      { role: 'engineer', opinion: 'Evaluating technical feasibility and architectural impact...', status: 'pending' },
      { role: 'security', opinion: 'Auditing for potential vulnerabilities...', status: 'pending' },
    ]);

    try {
      // Logic to call the backend with different system personas
      const response = await fetch('http://localhost:3001/api/ai/collaborate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal })
      });
      const data = await response.json();
      setOpinions(data.opinions);
    } catch (e) {
      console.error("Debate failed", e);
    } finally {
      setIsDebating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-950 p-6 overflow-hidden">
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Users className="text-indigo-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Agentic War Room</h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Multi-Agent Orchestration Engine</p>
            </div>
          </div>
          <button 
            onClick={startDebate}
            disabled={isDebating || !goal}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-full transition-all shadow-lg shadow-indigo-500/20"
          >
            <Play size={16} fill="currentColor" /> {isDebating ? 'Debating...' : 'Start Collaboration'}
          </button>
        </div>

        {/* Input Area */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
           <textarea 
             value={goal}
             onChange={(e) => setGoal(e.target.value)}
             placeholder="Define the engineering mission goal..."
             className="w-full bg-transparent text-slate-300 outline-none resize-none h-24 text-sm font-medium"
           />
        </div>

        {/* Debate Results */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto pr-2 no-scrollbar">
          {opinions.map((op, i) => (
            <div key={i} className={cn(
              "p-4 rounded-2xl border flex flex-col space-y-3 transition-all duration-500",
              op.status === 'pending' ? "bg-slate-900/50 border-slate-800 animate-pulse" : "bg-slate-900 border-slate-800 shadow-lg"
            )}>
              <div className="flex items-center gap-2">
                {op.role === 'pm' && <Briefcase size={16} className="text-blue-400" />}
                {op.role === 'engineer' && <Code2 size={16} className="text-indigo-400" />}
                {op.role === 'security' && <ShieldAlert size={16} className="text-red-400" />}
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {op.role === 'pm' ? 'Product Manager' : op.role === 'engineer' ? 'Lead Engineer' : 'Security Auditor'}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  {op.opinion}
                </p>
              </div>
              {op.status === 'completed' && (
                <div className="pt-2 border-t border-slate-800">
                   <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> REVIEW COMPLETED
                   </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
