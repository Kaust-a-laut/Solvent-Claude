import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { AnimatePresence } from 'framer-motion';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { MessageItem } from './MessageItem';
import { cn } from '../lib/utils';

export const ChatView = () => {
  const { messages, isProcessing, backend, selectedCloudModel, selectedLocalModel, deviceInfo } = useAppStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  const isMobile = deviceInfo.isMobile;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const downloadImage = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full relative bg-transparent neural-scan overflow-hidden">
      <ChatHeader />

      {/* Messages */}
      <div className={cn(
        "flex-1 overflow-y-auto pt-44 pb-32 space-y-16 scrollbar-thin scroll-smooth",
        isMobile ? "p-6" : "p-12"
      )} ref={scrollRef}>
        {/* Invisible spacer to ensure first message is well below the header */}
        <div className="h-4 w-full shrink-0" />
        
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <MessageItem 
              key={i}
              message={m}
              isUser={m.role === 'user'}
              modelName={m.role === 'user' ? 'User' : (backend === 'gemini' ? selectedCloudModel : selectedLocalModel)}
              time={getTime()}
              onDownloadImage={downloadImage}
            />
          ))}
        </AnimatePresence>
        
        {isProcessing && (
           <div className="max-w-4xl mx-auto flex items-center gap-6 px-6">
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 animate-pulse">Processing...</span>
           </div>
        )}
      </div>

      <ChatInput />
    </div>
  );
};