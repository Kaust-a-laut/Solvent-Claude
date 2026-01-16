import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

export const ChatHeader = () => {
  const { currentMode, backend, selectedCloudModel, selectedLocalModel, deviceInfo } = useAppStore();
  
  const isMobile = deviceInfo.isMobile;

  return (
    <div className={cn(
      "absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/60 to-transparent z-10 flex items-center border-b border-white/5 backdrop-blur-2xl",
      isMobile ? "px-6 pl-20" : "px-12"
    )}>
      <div className={cn("flex items-center", isMobile ? "gap-4" : "gap-10")}>
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mb-1.5 opacity-60">Mode</span>
          <span className="text-[12px] font-extrabold text-white uppercase tracking-[0.2em]">{currentMode}</span>
        </div>
        {!isMobile && <div className="h-8 w-[1px] bg-white/10" />}
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mb-1.5 opacity-60">Model</span>
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-extrabold text-jb-accent uppercase tracking-[0.2em]">{backend}</span>
            {!isMobile && (
              <span className="text-[10px] font-mono font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase tracking-widest">
                {backend === 'gemini' ? selectedCloudModel : selectedLocalModel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
