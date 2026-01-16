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
        whileHover={{ x: 4, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setCurrentMode(mode)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden",
          isActive 
            ? "bg-white/5 text-white shadow-[inset_0_0_20px_rgba(255,255,255,0.02)]" 
            : "text-slate-500 hover:text-slate-200"
        )}
      >
        {isActive && (
          <motion.div 
            layoutId="navGlow"
            className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-white/40 to-transparent"
          />
        )}
        
        <div className="flex items-center gap-3 relative z-10">
          <Icon size={18} className={cn("transition-all duration-500", isActive ? (color || "text-jb-accent shadow-[0_0_10px_rgba(60,113,247,0.5)]") : "group-hover:text-slate-300")} />
          <span className={cn("font-bold text-[13px] tracking-tight transition-colors duration-300", isActive ? "text-white" : "font-semibold")}>{label}</span>
        </div>
        
        {isActive && (
          <motion.div layoutId="navIndicator" className="flex items-center relative z-10">
             <ChevronRight size={12} className="text-white/30" />
          </motion.div>
        )}
      </motion.button>
    );
  };

  return (
    <div className="w-72 h-full bg-black/40 backdrop-blur-3xl border-r border-white/5 flex flex-col relative z-20">
      <div className="p-8 pb-10">
        <div className="flex items-center gap-4 group cursor-pointer">
           <motion.div 
             whileHover={{ scale: 1.1, rotate: -5 }}
             className="relative w-12 h-12 flex items-center justify-center"
           >
              {/* Beaker SVG Concept */}
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]">
                 <defs>
                    <linearGradient id="beakerFluid" x1="0%" y1="0%" x2="0%" y2="100%">
                       <stop offset="0%" stopColor="#FB923C" />
                       <stop offset="50%" stopColor="#F43F5E" />
                       <stop offset="100%" stopColor="#9D5BD2" />
                    </linearGradient>
                    <filter id="glow">
                       <feGaussianBlur stdDeviation="2" result="blur" />
                       <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                 </defs>
                 
                 {/* Flask Body */}
                 <path 
                    d="M35 20 L35 45 L15 85 Q12 90 18 90 L82 90 Q88 90 85 85 L65 45 L65 20 Z" 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="1.5" 
                    strokeOpacity="0.2" 
                 />
                 
                 {/* Neural Fluid inside Flask */}
                 <motion.path 
                    animate={{ 
                       d: [
                          "M38 48 L22 82 Q20 85 24 85 L76 85 Q80 85 78 82 L62 48 Q60 45 50 45 Q40 45 38 48 Z",
                          "M38 46 L22 82 Q20 85 24 85 L76 85 Q80 85 78 82 L62 46 Q60 43 50 43 Q40 43 38 46 Z",
                          "M38 48 L22 82 Q20 85 24 85 L76 85 Q80 85 78 82 L62 48 Q60 45 50 45 Q40 45 38 48 Z"
                       ]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    d="M38 48 L22 82 Q20 85 24 85 L76 85 Q80 85 78 82 L62 48 Q60 45 50 45 Q40 45 38 48 Z" 
                    fill="url(#beakerFluid)" 
                    fillOpacity="0.85"
                    filter="url(#glow)"
                 />

                 {/* Bubbles */}
                 <motion.circle 
                    animate={{ y: [-10, -40], opacity: [0, 1, 0], x: [0, 5, -5] }}
                    transition={{ duration: 3, repeat: Infinity, delay: 0 }}
                    cx="50" cy="75" r="3" fill="white" fillOpacity="0.4" 
                 />
                 <motion.circle 
                    animate={{ y: [-5, -30], opacity: [0, 1, 0], x: [0, -3, 3] }}
                    transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
                    cx="42" cy="70" r="2" fill="white" fillOpacity="0.4" 
                 />
                 <motion.circle 
                    animate={{ y: [-15, -45], opacity: [0, 1, 0], x: [0, 4, -2] }}
                    transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
                    cx="58" cy="80" r="2.5" fill="white" fillOpacity="0.4" 
                 />
                 
                 {/* Glass Rim */}
                 <path d="M32 20 L68 20" stroke="white" strokeWidth="2" strokeOpacity="0.4" strokeLinecap="round" />
              </svg>
           </motion.div>

           <div className="flex flex-col">
              <h1 className="text-[26px] font-[800] tracking-[-0.04em] text-white group-hover:text-vibrant transition-all leading-none">
                 Solvent
              </h1>
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.45em] mt-1.5 ml-0.5 opacity-60">Neural Suite</span>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 space-y-10 scrollbar-hide">
        
        <div className="space-y-1.5">
          <p className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 opacity-40">Intelligence</p>
          <NavItem mode="chat" icon={MessageSquare} label="Core Chat" />
          <NavItem mode="vision" icon={ScanEye} label="Neural Vision" color="text-jb-orange" />
          <NavItem mode="deep_thought" icon={Brain} label="Thinking" color="text-jb-purple" />
          <NavItem mode="browser" icon={Globe} label="Live Browser" color="text-jb-cyan" />
        </div>

        <div className="space-y-1.5">
           <p className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 opacity-40 flex items-center gap-2">
              Model Lab
           </p>
           <NavItem mode="compare" icon={GitCompare} label="Compare" />
           <NavItem mode="debate" icon={Swords} label="Debate" />
           <NavItem mode="collaborate" icon={Users} label="Multi-Agent" />
        </div>
      </div>

      <div className="p-8">
        <div className="bg-white/[0.03] border border-white/5 rounded-[24px] p-5 backdrop-blur-md relative overflow-hidden group">
           <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
           
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
                 <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Engine</span>
              </div>
              <FlaskConical size={10} className="text-slate-600" />
           </div>

           <div className="space-y-3">
              <div className="flex items-center justify-between">
                 <span className="text-[11px] font-bold text-slate-400">Local Model</span>
                 <span className="text-[10px] font-black text-jb-orange px-2 py-0.5 bg-jb-orange/10 rounded-md border border-jb-orange/20 tracking-wider uppercase">Qwen 3.5B</span>
              </div>
              <div className="flex items-center justify-between">
                 <span className="text-[11px] font-bold text-slate-400">Cloud Model</span>
                 <span className="text-[10px] font-black text-jb-accent px-2 py-0.5 bg-jb-accent/10 rounded-md border border-jb-accent/20 tracking-wider uppercase">Gemini 2.0</span>
              </div>
           </div>

           <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[8px] font-black text-slate-600 uppercase tracking-widest">
              <span>Latency</span>
              <span className="text-green-500/80">14ms</span>
           </div>
        </div>
      </div>
    </div>
  );
};