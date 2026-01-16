import React, { Suspense, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useDevice } from '../hooks/useDevice';
import AuraBackground from './AuraBackground';
import { Navigation } from './Navigation';
import { ChatView } from './ChatView';
import { FloatingNotepad } from './FloatingNotepad';
import { X, Network, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

import { TitleBar } from './TitleBar';

// Lazy Load Heavy Components
const DebateArea = React.lazy(() => import('./DebateArea').then(m => ({ default: m.DebateArea })));
const CompareArea = React.lazy(() => import('./CompareArea').then(m => ({ default: m.CompareArea })));
const CollaborateArea = React.lazy(() => import('./CollaborateArea').then(m => ({ default: m.CollaborateArea })));
const WaterfallArea = React.lazy(() => import('./WaterfallArea').then(m => ({ default: m.WaterfallArea })));
const CodingArea = React.lazy(() => import('./CodingArea').then(m => ({ default: m.CodingArea })));
const KnowledgeMap = React.lazy(() => import('./KnowledgeMap').then(m => ({ default: m.KnowledgeMap })));
const SettingsModal = React.lazy(() => import('./SettingsModal').then(m => ({ default: m.SettingsModal })));

const LoadingFallback = () => (
  <div className="flex items-center justify-center w-full h-full text-jb-accent animate-pulse">
    <Loader2 size={32} className="animate-spin" />
  </div>
);

export const ChatArea = () => {
  const { currentMode, graphNodes, graphEdges, showKnowledgeMap, setShowKnowledgeMap, setDeviceInfo, deviceInfo, setSupervisorInsight, supervisorInsight } = useAppStore();
  const device = useDevice();

  useEffect(() => {
    // Only update if dimensions or device type actually changed
    if (
      device.isMobile !== deviceInfo.isMobile ||
      device.isTablet !== deviceInfo.isTablet ||
      device.windowSize.width !== deviceInfo.windowSize.width ||
      device.windowSize.height !== deviceInfo.windowSize.height
    ) {
      setDeviceInfo(device);
    }
  }, [device, setDeviceInfo, deviceInfo]);

  // Listen for Supervisor Nudges
  useEffect(() => {
    if (window.electron?.onSupervisorNudge) {
      const cleanup = window.electron.onSupervisorNudge((nudge: any) => {
        setSupervisorInsight(nudge.message);
        // Auto-clear after 10s
        setTimeout(() => setSupervisorInsight(null), 10000);
      });
      return cleanup;
    }
  }, []);

  const renderContent = () => {
    switch (currentMode) {
      case 'debate':
        return <DebateArea />;
      case 'compare':
        return <CompareArea />;
      case 'collaborate':
        return <CollaborateArea />;
      case 'waterfall':
        return <WaterfallArea />;
      case 'coding':
        return <CodingArea />;
      default:
        return <ChatView />;
    }
  };

  return (
    <AuraBackground>
      <div className="flex flex-col h-[100dvh] w-screen overflow-hidden font-sans">
        <TitleBar />
        <div className="flex flex-1 overflow-hidden relative">
          <Navigation />
          <AnimatePresence>
             <Suspense fallback={null}>
                <SettingsModal />
             </Suspense>
          </AnimatePresence>
  
          <div className="flex-1 flex h-full overflow-hidden relative">
             
             {/* Main Center Area */}
             <div className="flex-1 h-full flex flex-col border-r border-white/5 relative z-10">
                <Suspense fallback={<LoadingFallback />}>
                   {renderContent()}
                </Suspense>
                
                {!showKnowledgeMap && (
                   <motion.button
                     initial={{ opacity: 0, x: 20 }}
                     animate={{ opacity: 1, x: 0 }}
                     onClick={() => setShowKnowledgeMap(true)}
                     className="absolute top-6 right-6 z-50 p-3 bg-black/60 backdrop-blur-md border border-white/10 rounded-xl text-jb-accent hover:bg-white/5 transition-all shadow-xl group"
                     title="Open Knowledge Map"
                   >
                      <Network size={20} className="group-hover:rotate-180 transition-transform duration-700" />
                   </motion.button>
                )}

                {/* Supervisor Nudge Toast */}
                <AnimatePresence>
                  {supervisorInsight && (
                    <motion.div 
                      initial={{ opacity: 0, y: 50, x: "-50%" }}
                      animate={{ opacity: 1, y: 0, x: "-50%" }}
                      exit={{ opacity: 0, y: 20, x: "-50%" }}
                      className="absolute bottom-8 left-1/2 z-50 bg-jb-purple/10 border border-jb-purple/20 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 max-w-lg"
                    >
                       <div className="w-8 h-8 rounded-full bg-jb-purple/20 flex items-center justify-center shrink-0">
                          <Network size={16} className="text-jb-purple" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-jb-purple mb-1">Supervisor Insight</p>
                          <p className="text-xs text-white font-medium">{supervisorInsight}</p>
                       </div>
                       <button onClick={() => setSupervisorInsight(null)} className="ml-2 text-slate-400 hover:text-white"><X size={14} /></button>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
  
             {/* Knowledge Map Panel */}
             <AnimatePresence>
               {showKnowledgeMap && (
                 <motion.div 
                   initial={{ x: deviceInfo.isMobile ? "100%" : 450, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   exit={{ x: deviceInfo.isMobile ? "100%" : 450, opacity: 0 }}
                   transition={{ type: "spring", stiffness: 300, damping: 30 }}
                   className={cn(
                     "h-full bg-slate-950/95 backdrop-blur-3xl flex flex-col relative z-[60] border-l border-white/5 shadow-2xl",
                     deviceInfo.isMobile ? "fixed inset-0 w-full" : "w-[450px]"
                   )}
                 >
                    <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-white/2">
                       <div className="flex items-center gap-2">
                          <Network size={14} className="text-jb-purple" />
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Knowledge Map</span>
                       </div>
                       <button 
                         onClick={() => setShowKnowledgeMap(false)}
                         className="text-slate-600 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md"
                       >
                          <X size={14} />
                       </button>
                    </div>
                    
                    <div className="flex-1 flex flex-col relative overflow-hidden">
                       <div className="absolute inset-0 pointer-events-none">
                          {/* Neural Pulse Background */}
                          <motion.div 
                             animate={{ 
                                scale: [1, 1.2, 1],
                                opacity: [0.05, 0.1, 0.05]
                             }}
                             transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-jb-purple rounded-full blur-[120px]" 
                          />
                       </div>
  
                       {/* The Interactive Map */}
                       <div className="flex-1 relative z-10">
                          <Suspense fallback={<LoadingFallback />}>
                             <KnowledgeMap />
                          </Suspense>
                       </div>
  
                       {/* Stats Overlay */}
                       <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-black/60 to-transparent pointer-events-none">
                          <div className="flex items-center justify-between text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">
                             <div className="flex flex-col gap-1">
                                <span className="text-jb-accent">{graphNodes.length.toString().padStart(2, '0')} Nodes</span>
                                <span className="opacity-40">Mapped</span>
                             </div>
                             <div className="flex flex-col gap-1 items-end text-right">
                                <span className="text-jb-orange">{graphEdges.length.toString().padStart(2, '0')} Edges</span>
                                <span className="opacity-40">Linked</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>
  
          </div>
        </div>
      </div>
      <FloatingNotepad />
    </AuraBackground>
  );
};
