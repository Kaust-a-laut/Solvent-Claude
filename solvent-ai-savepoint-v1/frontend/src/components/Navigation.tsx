import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  MessageSquare, Globe, Brain, Swords, GitCompare, 
  Users, FlaskConical, ScanEye, Search, BookOpen, LineChart, ChevronRight 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

export const Navigation = () => {
  const { currentMode, setCurrentMode } = useAppStore();

  const NavItem = ({ mode, icon: Icon, label, color }: any) => {
    const isActive = currentMode === mode;
    return (
      <motion.button
        whileHover={{ x: 4 }}
        onClick={() => setCurrentMode(mode)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300 group relative",
          isActive 
            ? "bg-jb-accent/10 text-white" 
            : "text-slate-500 hover:text-slate-200"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className={cn("transition-colors", isActive ? (color || "text-jb-accent") : "group-hover:text-slate-300")} />
          <span className={cn("font-bold text-[13px] tracking-tight", isActive ? "text-white" : "")}>{label}</span>
        </div>
        
        {isActive && (
          <motion.div layoutId="navIndicator">
             <ChevronRight size={14} className="text-jb-accent opacity-50" />
          </motion.div>
        )}
      </motion.button>
    );
  };

  return (
    <div className="w-64 h-full bg-jb-panel/40 backdrop-blur-2xl border-r border-jb-border/20 flex flex-col">
      <div className="p-8 pb-10">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-jb-accent via-jb-purple to-jb-orange p-[1px]">
              <div className="w-full h-full bg-jb-dark rounded-[7px] flex items-center justify-center">
                 <div className="w-4 h-4 rounded-full bg-white blur-[8px] opacity-20 absolute" />
                 <span className="text-white font-black text-xs">S</span>
              </div>
           </div>
           <h1 className="text-2xl font-black tracking-tighter text-vibrant">
              Solvent
           </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-10 scrollbar-hide">
        
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">Workspace</p>
          <NavItem mode="chat" icon={MessageSquare} label="Chat" />
          <NavItem mode="vision" icon={ScanEye} label="Vision" color="text-jb-orange" />
          <NavItem mode="deep_thought" icon={Brain} label="Thinking" color="text-jb-purple" />
          <NavItem mode="browser" icon={Globe} label="Browser" color="text-jb-cyan" />
        </div>

        <div className="space-y-1">
           <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
             <FlaskConical size={10} /> Model Lab
           </p>
           <NavItem mode="compare" icon={GitCompare} label="Compare" />
           <NavItem mode="debate" icon={Swords} label="Debate" />
           <NavItem mode="collaborate" icon={Users} label="Multi-Agent" />
        </div>
      </div>

      <div className="p-6">
        <div className="bg-jb-hover/30 border border-jb-border/40 rounded-2xl p-4">
           <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System</span>
              <div className="flex gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
              </div>
           </div>
           <div className="text-[11px] font-bold text-white flex items-center justify-between">
              <span>Local Qwen</span>
              <span className="text-jb-orange">3.5B</span>
           </div>
        </div>
      </div>
    </div>
  );
};
