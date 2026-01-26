import React, { Suspense, useEffect, lazy } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useDevice } from '../hooks/useDevice';
import AuraBackground from './AuraBackground';
import { Navigation } from './Navigation';
import { ChatView } from './ChatView';
import { HomeArea } from './HomeArea';
import { FloatingNotepad } from './FloatingNotepad';
import { X, Network, Loader2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { TitleBar } from './TitleBar';
import { SettingsModal } from './SettingsModal';

// Lazy load feature areas to slim down the main bundle
const DebateArea = lazy(() => import('./DebateArea').then(m => ({ default: m.DebateArea })));
const CompareArea = lazy(() => import('./CompareArea').then(m => ({ default: m.CompareArea })));
const CollaborateArea = lazy(() => import('./CollaborateArea').then(m => ({ default: m.CollaborateArea })));
const WaterfallArea = lazy(() => import('./WaterfallArea').then(m => ({ default: m.WaterfallArea })));
const CodingArea = lazy(() => import('./CodingArea').then(m => ({ default: m.CodingArea })));
const BrowserArea = lazy(() => import('./BrowserArea').then(m => ({ default: m.BrowserArea })));
const SolventSeeArea = lazy(() => import('./SolventSeeArea').then(m => ({ default: m.SolventSeeArea })));
const ModelPlaygroundArea = lazy(() => import('./ModelPlaygroundArea').then(m => ({ default: m.ModelPlaygroundArea })));

import { socket } from '../lib/socket';

const LoadingFallback = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-4">
    <Loader2 className="w-8 h-8 text-jb-purple animate-spin" />
    <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Initializing Neural Canvas...</span>
  </div>
);

export const ChatArea = () => {
  const { currentMode, setCurrentMode, setDeviceInfo, deviceInfo, setSupervisorInsight, supervisorInsight, addActivity } = useAppStore();
  const device = useDevice();
  const [clarificationRequest, setClarificationRequest] = React.useState<any>(null);

  useEffect(() => {
    socket.on('SUPERVISOR_CLARIFICATION', (req) => {
      setClarificationRequest(req);
    });
    return () => {
      socket.off('SUPERVISOR_CLARIFICATION');
    };
  }, []);

  const handleClarification = (approved: boolean) => {
    if (!clarificationRequest) return;
    
    // Respond to backend
    // We need a new tool or endpoint for this, or just a simple socket emit
    // For now, let's assume we emit back a decision
    // In a real implementation, we'd call an API endpoint to execute the invalidation
    
    if (approved) {
       // Trigger the invalidation logic (which we previously built as a tool, but now we need to trigger it manually)
       // Or better, tell the AI "Yes, do it".
       // For this prototype, we'll just log it.
       console.log("User approved memory invalidation:", clarificationRequest);
       // Ideally: api.post('/memory/resolve-conflict', { ... })
    }
    
    setClarificationRequest(null);
  };

  useEffect(() => {
    if (window.electron?.onModeChanged) {
      return window.electron.onModeChanged((mode: string) => {
        setCurrentMode(mode as any);
      });
    }
  }, [setCurrentMode]);

  useEffect(() => {
    if (
      device.isMobile !== deviceInfo.isMobile ||
      device.isTablet !== deviceInfo.isTablet ||
      device.windowSize.width !== deviceInfo.windowSize.width ||
      device.windowSize.height !== deviceInfo.windowSize.height
    ) {
      setDeviceInfo(device);
    }
  }, [device, setDeviceInfo, deviceInfo]);

  useEffect(() => {
    if (window.electron?.onSupervisorNudge) {
      const cleanup = window.electron.onSupervisorNudge((nudge: any) => {
        setSupervisorInsight(nudge.message);
        setTimeout(() => setSupervisorInsight(null), 10000);
      });
      return cleanup;
    }
  }, []);

  useEffect(() => {
    if (window.electron && (window.electron as any).onSupervisorData) {
      return (window.electron as any).onSupervisorData((activity: any) => {
        addActivity(activity);
      });
    }
  }, [addActivity]);

  const renderContent = () => {
    const areas: Record<string, React.ReactNode> = {
      home: <HomeArea />,
      model_playground: <ModelPlaygroundArea />,
      debate: <DebateArea />,
      compare: <CompareArea />,
      collaborate: <CollaborateArea />,
      waterfall: <WaterfallArea />,
      vision: <SolventSeeArea />,
      coding: <CodingArea />,
      browser: <BrowserArea />,
      chat: <ChatView />
    };

    return areas[currentMode] || <ChatView />;
  };

  return (
    <AuraBackground>
      <div className="flex flex-col h-[100dvh] w-screen overflow-hidden font-sans">
        <TitleBar />
        <div className="flex flex-1 overflow-hidden relative">
          <Navigation />
          <AnimatePresence>
             <SettingsModal />
          </AnimatePresence>
  
          <div className="flex-1 flex h-full overflow-hidden relative">
             <div className="flex-1 h-full flex flex-col border-r border-white/5 relative z-10 min-w-0 overflow-hidden">
                <Suspense fallback={<LoadingFallback />}>
                   {renderContent()}
                </Suspense>
                
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
                  
                  {clarificationRequest && (
                    <motion.div 
                      initial={{ opacity: 0, y: 50, x: "-50%" }}
                      animate={{ opacity: 1, y: 0, x: "-50%" }}
                      exit={{ opacity: 0, y: 20, x: "-50%" }}
                      className="absolute bottom-24 left-1/2 z-50 bg-amber-500/10 border border-amber-500/20 backdrop-blur-xl px-6 py-5 rounded-2xl shadow-2xl max-w-lg w-full"
                    >
                       <div className="flex items-start gap-4">
                         <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                            <Sparkles size={16} className="text-amber-500" />
                         </div>
                         <div className="flex-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">Memory Conflict Detected</p>
                            <p className="text-xs text-white font-medium mb-3 leading-relaxed">{clarificationRequest.question}</p>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => handleClarification(true)}
                                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/40 text-amber-500 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors"
                              >
                                Overwrite Rule
                              </button>
                              <button 
                                onClick={() => handleClarification(false)}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-400 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-colors"
                              >
                                Keep Existing
                              </button>
                            </div>
                         </div>
                       </div>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          </div>
        </div>
      </div>
      <FloatingNotepad />
    </AuraBackground>
  );
};