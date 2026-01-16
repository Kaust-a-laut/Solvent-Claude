import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { AuraBackground } from './AuraBackground';
import { Navigation } from './Navigation';
import { ChatView } from './ChatView';
import { DebateArea } from './DebateArea';
import { CompareArea } from './CompareArea';
import { CollaborateArea } from './CollaborateArea';
import { X, Network } from 'lucide-react';
import { motion } from 'framer-motion';

export const ChatArea = () => {
  const { currentMode } = useAppStore();

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

        <div className="flex-1 flex h-full overflow-hidden">
           
           {/* Main Center Area */}
           <div className="flex-1 h-full flex flex-col border-r border-white/5 relative z-10">
              {renderContent()}
           </div>

           {/* Knowledge Graph Panel */}
           <motion.div 
             initial={{ x: 300, opacity: 0 }}
             animate={{ x: 0, opacity: 1 }}
             className="w-[450px] h-full bg-black/10 backdrop-blur-2xl flex flex-col relative z-20"
           >
              <div className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-white/2">
                 <div className="flex items-center gap-2">
                    <Network size={14} className="text-jb-purple" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Knowledge Graph</span>
                 </div>
                 <button className="text-slate-600 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-md">
                    <X size={14} />
                 </button>
              </div>
              
              <div className="flex-1 flex flex-col items-center justify-center p-12 relative overflow-hidden">
                 
                 <div className="absolute inset-0 pointer-events-none opacity-20">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-jb-purple/20 rounded-full blur-[100px]" />
                 </div>

                 <div className="relative w-full">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="glass-panel rounded-3xl p-8 text-center"
                    >
                       <div className="w-12 h-12 bg-jb-purple/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-jb-purple/30">
                          <Network size={24} className="text-jb-purple animate-pulse" />
                       </div>
                       <p className="text-[11px] font-black text-white uppercase tracking-[0.3em] mb-4">Neural Engine</p>
                       <div className="text-xs text-slate-400 leading-relaxed font-medium px-4 opacity-80">
                          The Knowledge Graph will manifest here as concepts are interconnected through discourse.
                       </div>
                       
                       <div className="mt-8 pt-6 border-t border-white/5 grid grid-cols-2 gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                          <div className="flex flex-col gap-1">
                             <span className="text-jb-accent">0 Nodes</span>
                             <span className="opacity-50">Mapped</span>
                          </div>
                          <div className="flex flex-col gap-1">
                             <span className="text-jb-orange">0 Edges</span>
                             <span className="opacity-50">Linked</span>
                          </div>
                       </div>
                    </motion.div>
                 </div>
              </div>
           </motion.div>

        </div>
      </div>
    </AuraBackground>
  );
};
