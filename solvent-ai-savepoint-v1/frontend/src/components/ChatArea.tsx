import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { AuraBackground } from './AuraBackground';
import { Navigation } from './Navigation';
import { ChatView } from './ChatView';
import { DebateArea } from './DebateArea';
import { X } from 'lucide-react';

export const ChatArea = () => {
  const { currentMode } = useAppStore();

  return (
    <AuraBackground>
      <div className="flex h-screen w-screen overflow-hidden">
        <Navigation />

        <div className="flex-1 flex h-full overflow-hidden">
           
           {/* Chat Center */}
           <div className="flex-1 h-full flex flex-col border-r border-jb-border/20">
              <ChatView />
           </div>

           {/* Knowledge Graph Panel (Matches Screenshot Layout) */}
           <div className="w-[450px] h-full bg-black/20 backdrop-blur-sm flex flex-col">
              <div className="h-14 flex items-center justify-between px-6 border-b border-jb-border/30">
                 <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest">Knowledge Graph</span>
                 <button className="text-slate-600 hover:text-white transition-colors">
                    <X size={16} />
                 </button>
              </div>
              
              <div className="flex-1 flex items-center justify-center p-12">
                 <div className="relative">
                    <div className="absolute inset-0 bg-jb-purple/20 rounded-full blur-3xl" />
                    <div className="relative border border-jb-border/50 rounded-2xl p-6 text-center glass-panel">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Neural Engine</p>
                       <div className="text-xs text-slate-400 leading-relaxed font-medium">
                          The Knowledge Graph will manifest here as concepts are interconnected through discourse.
                       </div>
                    </div>
                 </div>
              </div>
           </div>

        </div>
      </div>
    </AuraBackground>
  );
};
