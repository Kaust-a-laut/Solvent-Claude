import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { Brain, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface ChatHeaderProps {
  compact?: boolean;
}

export const ChatHeader = ({ compact }: ChatHeaderProps) => {
  const { 
    currentMode, 
    selectedCloudModel, 
    selectedLocalModel, 
    selectedCloudProvider,
    globalProvider,
    thinkingModeEnabled,
    setThinkingModeEnabled,
    modeConfigs,
    deviceInfo 
  } = useAppStore();
  
  const isMobile = deviceInfo.isMobile;

  // Resolve active provider and model for display
  const config = modeConfigs[currentMode] || { provider: 'auto', model: selectedCloudModel };
  let displayProvider = selectedCloudProvider;
  let displayModel = selectedCloudModel;

  if (currentMode === 'vision') {
    const { imageProvider } = useAppStore.getState();
    displayProvider = imageProvider as any;
    displayModel = imageProvider === 'huggingface' ? 'Stable Diffusion' : 
                   imageProvider === 'local' ? 'Juggernaut XL' : 
                   imageProvider === 'pollinations' ? 'Flux (Free)' : 'Imagen 3';
  } else if (thinkingModeEnabled) {
    if (globalProvider === 'local') {
      displayProvider = 'ollama' as any;
      displayModel = 'deepseek-r1:8b';
    } else {
      displayProvider = 'groq' as any;
      displayModel = 'llama-3.3-70b-versatile'; // Standardize on a real Groq model
    }
  } else if (globalProvider === 'local') {
    displayProvider = 'ollama' as any;
    displayModel = selectedLocalModel;
  } else if (config.provider !== 'auto' && config.provider !== 'cloud') {
    displayProvider = config.provider as any;
    displayModel = config.model;
  } else {
    displayProvider = selectedCloudProvider;
    displayModel = selectedCloudModel;
  }

  return (
    <div 
      className={cn(
        "absolute top-0 left-0 right-0 z-[60] flex items-center border-b border-white/5 backdrop-blur-2xl transition-all duration-300",
        compact ? "h-[var(--header-height-compact,64px)] bg-black/80 px-6" : "h-[var(--header-height,80px)] bg-gradient-to-b from-black/60 to-transparent px-12",
        isMobile && !compact ? "px-6 pl-20" : ""
      )}
    >
      <div className={cn("flex items-center", compact ? "gap-6" : (isMobile ? "gap-4" : "gap-10"))}>
        <div className="flex flex-col">
          {!compact && <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mb-1.5 opacity-60">Mode</span>}
          <span className={cn("font-extrabold text-white uppercase tracking-[0.2em]", compact ? "text-[10px]" : "text-[12px]")}>
            {currentMode === 'coding' ? 'Code' : currentMode === 'chat' ? 'Chat' : currentMode}
          </span>
        </div>
        <div className={cn("bg-white/10", compact ? "h-4 w-[1px]" : "h-8 w-[1px]")} />
        <div className="flex flex-col">
          {!compact && <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mb-1.5 opacity-60">Model</span>}
          <div className="flex items-center gap-3">
            <span className={cn("font-extrabold text-jb-accent uppercase tracking-[0.2em]", compact ? "text-[10px]" : "text-[12px]")}>{displayProvider}</span>
            {!isMobile && (
              <span className={cn("font-mono font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase tracking-widest", compact ? "text-[8px]" : "text-[10px]")}>
                {displayModel}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
