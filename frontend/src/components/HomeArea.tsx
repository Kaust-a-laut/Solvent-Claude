import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FlaskConical, Code, Brain, MessageSquare, 
  ScanEye, Globe, Sparkles, Terminal
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { BentoGrid, BentoCard } from './BentoGrid';
import { MissionControlPreview } from './MissionControlPreview';

export const HomeArea = () => {
  const { setCurrentMode, graphNodes, setIsCommandCenterOpen } = useAppStore();
  const [telemetry, setTelemetry] = useState({ cpu: 0, mem: 0, net: 0, disk: 0 });
  const [usage, setUsage] = useState({ tokens: 0, cost: 0, requests: 0 });

  useEffect(() => {
    if (window.electron?.onSystemTelemetry) {
      return window.electron.onSystemTelemetry((stats: any) => {
        setTelemetry(stats);
      });
    }
  }, []);

  useEffect(() => {
    if (window.electron?.model) {
      window.electron.model.getUsage()?.then(setUsage);
      const usageInterval = setInterval(() => {
        window.electron?.model.getUsage()?.then(setUsage);
      }, 5000);
      return () => clearInterval(usageInterval);
    }
  }, []);

  const features = [
    {
      id: 'waterfall',
      title: 'Waterfall Architect',
      desc: 'Autonomous multi-model reasoning pipeline. Collapses complex projects into 4-stage verified execution.',
      icon: FlaskConical,
      color: 'text-jb-purple',
      bg: 'bg-jb-purple/5',
      border: 'border-jb-purple/10',
      span: 'lg:col-span-2',
      badge: 'Core'
    },
    {
      id: 'command_center',
      title: 'Take control with the Solvent Command Center',
      desc: 'Deep-integrated persistent context and data storage. Detach your mission directives into a PiP window to maintain autonomous oversight across your entire OS and other applications.',
      icon: Terminal,
      color: 'text-jb-purple',
      bg: 'bg-jb-purple/5',
      border: 'border-jb-purple/10',
      span: 'lg:row-span-2',
      preview: <MissionControlPreview />,
      actionText: 'Launch Mission Control'
    },
    {
      id: 'coding',
      title: 'Agentic IDE',
      desc: 'Next-gen coding workspace with autonomous agents, real-time refactoring, and terminal integration.',
      icon: Code,
      color: 'text-jb-accent',
      bg: 'bg-jb-accent/5',
      border: 'border-jb-accent/10',
      span: 'lg:col-span-1'
    },
    {
      id: 'vision',
      title: 'SolventSee Lab',
      desc: 'High-fidelity vision & media forge. Analyze UI, generate assets, and edit imagery with precision.',
      icon: ScanEye,
      color: 'text-jb-orange',
      bg: 'bg-jb-orange/5',
      border: 'border-jb-orange/10',
      actionText: 'Dive into the SolventSee Lab'
    },
    {
      id: 'browser',
      title: 'Universal Browser',
      desc: 'AI-native web experience. Browse, scrape, and extract intelligence without leaving the interface.',
      icon: Globe,
      color: 'text-jb-cyan',
      bg: 'bg-jb-cyan/5',
      border: 'border-jb-cyan/10'
    },
    {
      id: 'model_playground',
      title: 'Model Playground',
      desc: 'Harness GPT, Gemini, and Ollama in a unified sandbox. High-fidelity reasoning with zero switching friction.',
      icon: MessageSquare,
      color: 'text-jb-cyan',
      bg: 'bg-jb-cyan/5',
      border: 'border-jb-cyan/10'
    },
    {
      id: 'deep_thought',
      title: 'Solvent Kernel',
      desc: 'Centralized intelligence layer managing long-term memory, vector knowledge, and system automation.',
      icon: Brain,
      color: 'text-jb-purple',
      bg: 'bg-jb-purple/5',
      border: 'border-jb-purple/10'
    }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-12 pt-2 md:pt-4 lg:pt-6 bg-transparent relative z-10 scrollbar-thin">
      <div className="max-w-[1400px] mx-auto space-y-8 md:space-y-12 relative">
        
        {/* Massive Background Beaker Logo - Refined positioning */}
        <div className="absolute -top-60 -left-60 w-[600px] h-[600px] md:w-[1000px] md:h-[1000px] opacity-[0.03] pointer-events-none blur-3xl overflow-hidden">
           <svg viewBox="0 0 100 100" className="w-full h-full fill-white">
              <path d="M38 20 L38 45 L18 82 Q15 88 22 88 L78 88 Q85 88 82 82 L62 45 L62 20 Z" />
           </svg>
        </div>

        {/* Hero Header - Left Aligned Layout with Right Logo */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-start relative z-10 pt-2 md:pt-4 gap-6 lg:gap-12">
           <div className="space-y-4 md:space-y-6 flex flex-col items-start max-w-5xl">
              <div className="space-y-3 w-full">
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tighter leading-[1.05] max-w-5xl"
                >
                   The Multitool <span className="text-vibrant">AI OS</span> for <span className="text-vibrant">Engineering</span> Physical <span className="text-vibrant">Reality</span>.
                </motion.h2>
                
                <motion.p 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-slate-500 text-lg md:text-xl lg:text-2xl max-w-3xl font-medium leading-relaxed tracking-tight"
                >
                   A consolidated digital workspace designed to bridge the gap between intelligence and execution. From autonomous code to physical outcomes, one interface for everything.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex flex-wrap gap-4 justify-start pt-4"
              >
                <button 
                  onClick={() => setCurrentMode('waterfall' as any)}
                  className="px-8 py-4 bg-white text-black rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-jb-accent hover:text-white transition-all duration-500 shadow-2xl shadow-white/5"
                >
                  Launch OS Kernel
                </button>
                <button 
                  onClick={() => setCurrentMode('coding' as any)}
                  className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-white/10 transition-all duration-500"
                >
                  Open Workspace
                </button>
              </motion.div>
           </div>

           <motion.div 
             initial={{ scale: 0.8, opacity: 0, x: 0 }}
             animate={{ scale: 1, opacity: 1, x: 0 }}
             transition={{ type: 'spring', damping: 20, stiffness: 80, delay: 0.4 }}
             className="relative w-40 h-40 sm:w-56 sm:h-56 md:w-64 md:h-64 lg:w-[380px] lg:h-[380px] xl:w-[450px] xl:h-[450px] flex items-center justify-center shrink-0 order-first lg:order-last mx-auto lg:ml-[-150px] lg:mr-auto lg:-mt-6 xl:-mt-8"
           >
              <div className="absolute inset-x-20 inset-y-10 bg-jb-purple/20 blur-[60px] md:blur-[80px] rounded-full animate-pulse" />
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_30px_rgba(157,91,210,0.4)] relative z-10">
                 <defs>
                    <linearGradient id="beakerFluidLarge" x1="0%" y1="0%" x2="0%" y2="100%">
                       <stop offset="0%" stopColor="#FB923C" />
                       <stop offset="40%" stopColor="#F43F5E" />
                       <stop offset="70%" stopColor="#9D5BD2" />
                       <stop offset="100%" stopColor="#3C71F7" />
                    </linearGradient>
                    <filter id="glowLarge" x="-50%" y="-50%" width="200%" height="200%">
                       <feGaussianBlur stdDeviation="3.5" result="blur" />
                       <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                 </defs>
                 <path d="M38 20 L38 45 L18 82 Q15 88 22 88 L78 88 Q85 88 82 82 L62 45 L62 20 Z" fill="none" stroke="white" strokeWidth="0.75" strokeOpacity="0.25" />
                 <motion.path
                   animate={{
                     d: [
                       "M40 48 L25 80 Q23 83 27 83 L73 83 Q77 83 75 80 L60 48 Q58 45 50 45 Q42 45 40 48 Z",
                       "M40 51 L25 83 Q23 86 27 86 L73 86 Q77 86 75 83 L60 51 Q58 48 50 48 Q42 48 40 51 Z",
                       "M40 48 L25 80 Q23 83 27 83 L73 83 Q77 83 75 80 L60 48 Q58 45 50 45 Q42 45 40 48 Z"
                     ]
                   }}
                   transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                   fill="url(#beakerFluidLarge)" fillOpacity="0.95" filter="url(#glowLarge)"
                 />
                 <path d="M32 20 L68 20" stroke="white" strokeWidth="2.5" strokeOpacity="0.5" strokeLinecap="round" />
                 {/* Brand Text Inside Beaker */}
                 <motion.g
                   animate={{ y: [0, 1.5, 0] }}
                   transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                 >
                   <text x="50" y="65" textAnchor="middle" fill="white" fontSize="5.5" fontWeight="900"
                     style={{ fontFamily: 'Inter Tight, sans-serif', letterSpacing: '0.15em', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.4))' }}>
                     SOLVENT
                   </text>
                   <text x="50" y="71" textAnchor="middle" fill="black" fillOpacity="0.5" fontSize="1.8" fontWeight="900"
                     style={{ fontFamily: 'Inter Tight, sans-serif', letterSpacing: '0.25em' }}>
                     BY KAUSTIKSOLUTIONS
                   </text>
                 </motion.g>
              </svg>
           </motion.div>
        </div>

        {/* Bento Grid - Enhanced scaling */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 grid-flow-dense gap-5 md:gap-8 pt-8">
           {features.map((feature, idx) => (
             <BentoCard
               key={feature.id}
               {...feature}
               onClick={() => {
                 if (feature.id === 'command_center') {
                   setIsCommandCenterOpen(true);
                 } else {
                   setCurrentMode(feature.id as any);
                 }
               }}
               delay={idx * 0.1}
             />
           ))}
        </div>

        {/* Footer Stats - Dynamic integration */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12 py-12 md:py-20 border-t border-white/[0.03]">
           <div className="space-y-2 group">
              <p className="technical-meta group-hover:text-jb-accent transition-colors">CPU LOAD</p>
              <p className="text-2xl md:text-4xl font-black text-white tracking-tighter">{telemetry.cpu}% <span className="text-xs md:text-sm text-jb-accent font-mono uppercase">System</span></p>
           </div>
           <div className="space-y-2 group">
              <p className="technical-meta group-hover:text-jb-purple transition-colors">Logic Memory</p>
              <p className="text-2xl md:text-4xl font-black text-white tracking-tighter">{graphNodes.length} <span className="text-xs md:text-sm text-jb-purple font-mono uppercase">Nodes</span></p>
           </div>
           <div className="space-y-2 group">
              <p className="technical-meta group-hover:text-emerald-500 transition-colors">Session Requests</p>
              <p className="text-2xl md:text-4xl font-black text-emerald-500 tracking-tighter">{usage.requests} <span className="text-xs md:text-sm text-emerald-500 font-mono uppercase">Calls</span></p>
           </div>
           <div className="space-y-2 group">
              <p className="technical-meta group-hover:text-jb-orange transition-colors">Kernel Status</p>
              <p className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase">Verified</p>
           </div>
        </div>
      </div>
    </div>
  );
};
