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
        whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.03)' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setCurrentMode(mode)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-300 group relative",
          isActive 
            ? "bg-white/5 text-white shadow-sm" 
            : "text-slate-500 hover:text-slate-200"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon size={18} className={cn("transition-colors duration-300", isActive ? (color || "text-jb-accent") : "group-hover:text-slate-300")} />
          <span className={cn("font-bold text-[13px] tracking-tight transition-colors duration-300", isActive ? "text-white" : "")}>{label}</span>
        </div>
        
        {isActive && (
          <motion.div layoutId="navIndicator" className="flex items-center">
             <div className="w-1 h-4 bg-jb-accent rounded-full mr-2 shadow-[0_0_8px_rgba(60,113,247,0.6)]" />
             <ChevronRight size={12} className="text-jb-accent opacity-50" />
          </motion.div>
        )}
      </motion.button>
    );
  };

  return (
    <div className="w-64 h-full bg-black/10 backdrop-blur-3xl border-r border-white/5 flex flex-col relative z-20">
      <div className="p-8 pb-10">
        <div className="flex items-center gap-3 group cursor-pointer">
           <motion.div 
             whileHover={{ rotate: 10, scale: 1.1 }}
             className="w-10 h-10 rounded-xl bg-gradient-to-br from-jb-accent via-jb-purple to-jb-orange p-[1px] shadow-lg shadow-jb-purple/20"
           >
              <div className="w-full h-full bg-[#050508] rounded-[11px] flex items-center justify-center relative overflow-hidden">
                 <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
                 <span className="text-white font-black text-sm relative z-10">S</span>
                 <motion.div 
                   animate={{ opacity: [0.2, 0.5, 0.2] }}
                   transition={{ duration: 2, repeat: Infinity }}
                   className="absolute inset-0 bg-jb-accent blur-xl" 
                 />
              </div>
           </motion.div>
           <h1 className="text-2xl font-black tracking-tighter text-vibrant group-hover:brightness-110 transition-all">
              Solvent
           </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 space-y-10 scrollbar-hide">
        
        <div className="space-y-1">
          <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 opacity-50">Workspace</p>
          <NavItem mode="chat" icon={MessageSquare} label="Chat" />
          <NavItem mode="vision" icon={ScanEye} label="Vision" color="text-jb-orange" />
          <NavItem mode="deep_thought" icon={Brain} label="Thinking" color="text-jb-purple" />
          <NavItem mode="browser" icon={Globe} label="Browser" color="text-jb-cyan" />
        </div>

        <div className="space-y-1">
           <p className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-4 opacity-50 flex items-center gap-2">
             <FlaskConical size={10} /> Model Lab
           </p>
           <NavItem mode="compare" icon={GitCompare} label="Compare" />
           <NavItem mode="debate" icon={Swords} label="Debate" />
           <NavItem mode="collaborate" icon={Users} label="Multi-Agent" />
        </div>
      </div>

      <div className="p-6">
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 backdrop-blur-md">
           <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60">System</span>
              <div className="flex gap-1">
                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
              </div>
           </div>
           <div className="text-[11px] font-bold text-slate-200 flex items-center justify-between">
              <span className="opacity-80">Local Qwen</span>
              <span className="text-jb-orange font-black">3.5B</span>
           </div>
        </div>
      </div>
    </div>
  );
};