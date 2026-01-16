import React, { useEffect, useState } from 'react';
import { Minus, Square, X, Hexagon } from 'lucide-react';
import { cn } from '../lib/utils';

export const TitleBar = () => {
  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.electron) {
      setIsElectron(true);
    }
  }, []);

  if (!isElectron) return null;

  return (
    <div className="h-8 bg-black flex items-center justify-between select-none z-[9999] border-b border-white/5">
      {/* Draggable Region */}
      <div className="flex-1 h-full flex items-center pl-4 app-drag-region">
        <div className="flex items-center gap-2 opacity-50">
          <Hexagon size={12} className="text-jb-accent fill-jb-accent/20" />
          <span className="text-[10px] font-mono tracking-widest text-slate-400">SOLVENT AI SUITE</span>
        </div>
      </div>

      {/* Window Controls (No Drag) */}
      <div className="flex h-full app-no-drag">
        <button 
          onClick={() => window.electron?.minimize()}
          className="h-full w-10 flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <Minus size={14} />
        </button>
        
        <button 
          onClick={() => {
            window.electron?.maximize();
            setIsMaximized(!isMaximized);
          }}
          className="h-full w-10 flex items-center justify-center hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <Square size={12} />
        </button>
        
        <button 
          onClick={() => window.electron?.close()}
          className="h-full w-10 flex items-center justify-center hover:bg-red-500/80 text-slate-400 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      <style>{`
        .app-drag-region {
          -webkit-app-region: drag;
        }
        .app-no-drag {
          -webkit-app-region: no-drag;
        }
      `}</style>
    </div>
  );
};
