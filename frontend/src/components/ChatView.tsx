import React from 'react';
import { ChatHeader } from './ChatHeader';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { SessionHistory } from './SessionHistory';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

interface ChatViewProps {
  compact?: boolean;
}

export const ChatView = ({ compact }: ChatViewProps) => {
  return (
    <div className="flex flex-col h-full relative bg-transparent overflow-hidden">
      <ChatHeader compact={compact} />
      
      <div className={cn(
        "flex flex-1 overflow-hidden",
        compact ? "pt-[64px]" : "pt-[80px]"
      )}>
        {!compact && <SessionHistory />}
        
        <div className="flex-1 flex flex-col relative overflow-hidden">
          <MessageList compact={compact} />
          <ChatInput compact={compact} />
        </div>
      </div>
    </div>
  );
};
