import React, { useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MessageItem } from './MessageItem';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { downloadImage } from '../lib/file-utils';
import { WaterfallVisualizer } from './WaterfallVisualizer';

interface MessageListProps {
  compact?: boolean;
}

export const MessageList = ({ compact }: MessageListProps) => {
  const currentMode = useAppStore(state => state.currentMode);
  const messages = useAppStore(state => state.messages);
  const isProcessing = useAppStore(state => state.isProcessing);
  const modeConfigs = useAppStore(state => state.modeConfigs);
  const selectedCloudModel = useAppStore(state => state.selectedCloudModel);
  const selectedLocalModel = useAppStore(state => state.selectedLocalModel);
  const globalProvider = useAppStore(state => state.globalProvider);
  const deviceInfo = useAppStore(state => state.deviceInfo);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = deviceInfo.isMobile;

  // Resolve Active Model Name for the prompt/header area 
  // (Individual messages might vary, but for the 'AI' label we use the current config)
  const config = modeConfigs[currentMode] || { provider: 'auto', model: selectedCloudModel };
  let activeModel = config.model;

  if (currentMode === 'vision') {
    const { imageProvider } = useAppStore.getState();
    activeModel = imageProvider === 'huggingface' ? 'Stable Diffusion' : 
                  imageProvider === 'local' ? 'Juggernaut XL' : 
                  imageProvider === 'pollinations' ? 'Flux (Free)' : 'Imagen 3';
  } else if (config.provider === 'auto') {
    activeModel = globalProvider === 'local' ? selectedLocalModel : selectedCloudModel;
  } else if (globalProvider === 'local' && config.provider === 'gemini') {
    activeModel = selectedLocalModel;
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const getTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isVision = currentMode === 'vision';
  const isCoding = currentMode === 'coding';
  const isCompact = compact || isCoding || isVision;

  return (
    <div className={cn(
      "flex-1 overflow-y-auto scrollbar-thin scroll-smooth focusable-container",
      isCompact ? "pt-20 pb-20 space-y-4" : "pt-[100px] pb-32 space-y-8",
      isMobile ? (compact ? "p-3 pt-16 pb-20" : "p-4 pt-20 pb-24") : "p-6"
    )} ref={scrollRef} tabIndex={0}>
      
      {/* Waterfall Visualization at the top (or contextually could be interspersed, but top is safe) */}
      <WaterfallVisualizer />

      <AnimatePresence initial={false}>
        {messages.map((m, i) => (
          <MessageItem 
            key={i}
            message={m}
            isUser={m.role === 'user'}
            modelName={m.role === 'user' ? 'User' : (m.model || activeModel)}
            time={getTime()}
            onDownloadImage={downloadImage}
            compact={isCompact}
          />
        ))}
      </AnimatePresence>
      
      {isProcessing && (
         <div className="max-w-4xl mx-auto flex items-center gap-6 px-6">
            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 animate-pulse">Processing...</span>
         </div>
      )}
    </div>
  );
};