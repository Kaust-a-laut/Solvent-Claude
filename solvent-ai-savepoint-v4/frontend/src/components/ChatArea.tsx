import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { AuraBackground } from './AuraBackground';
import { Navigation } from './Navigation';
import { ChatView } from './ChatView';
import { DebateArea } from './DebateArea';
import { CompareArea } from './CompareArea';
import { CollaborateArea } from './CollaborateArea';
import { KnowledgeMap } from './KnowledgeMap';
import { SettingsModal } from './SettingsModal';
import { X, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ChatArea = () => {
  const { currentMode, graphNodes, graphEdges } = useAppStore();

  const renderContent = () => {
    switch (currentMode) {
      case 'debate':
        return <DebateArea />;
      case 'compare':
        return <CompareArea />;
      case 'collaborate':
        return <CollaborateArea />;
      default:
        return <ChatView />;
    }
  };

  return (
    <AuraBackground>
      <div className="flex h-screen w-screen overflow-hidden font-sans">
        <Navigation />
        <AnimatePresence>
           <SettingsModal />
        </AnimatePresence>

        <div className="flex-1 flex h-full overflow-hidden">
           
           {/* Main Center Area */}
           <div className="flex-1 h-full flex flex-col border-r border-white/5 relative z-10">
              {renderContent()}
           </div>

           {/* Knowledge Map Panel */}
           <motion.div 
             initial={{ x: 300, opacity: 0 }}
             animate={{ x: 0, opacity: 1 }}
             className="w-[450px] h-full bg-black/35 backdrop-blur-3xl flex flex-col relative z-20"
           >
              <div className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-white/2">
                 <div className="flex items-center gap-2">
                    <Network size={14} className="text-jb-purple" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Knowledge Map</span>
                 </div>
                 <button className="text-slate-600 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md">
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
                    <KnowledgeMap />
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

        </div>
      </div>
    </AuraBackground>
  );
};
