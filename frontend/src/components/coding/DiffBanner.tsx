import React from 'react';
import { Check, X, Sparkles } from 'lucide-react';

interface Props {
  description: string;
  onApplyAll: () => void;
  onReject: () => void;
}

export const DiffBanner: React.FC<Props> = ({ description, onApplyAll, onReject }) => (
  <div className="h-10 flex items-center justify-between px-4 bg-jb-accent/10 border-b border-jb-accent/20 shrink-0">
    <div className="flex items-center gap-2">
      <Sparkles size={13} className="text-jb-accent" />
      <span className="text-[11px] font-semibold text-white/70">AI Suggestion:</span>
      <span className="text-[11px] text-white/50 truncate max-w-[300px]">{description}</span>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={onApplyAll}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/25 transition-colors"
      >
        <Check size={12} /> Apply All
      </button>
      <button
        onClick={onReject}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold hover:bg-rose-500/20 transition-colors"
      >
        <X size={12} /> Reject
      </button>
    </div>
  </div>
);
