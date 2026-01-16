import React from 'react';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import { parse } from 'marked';
import { cn } from '../lib/utils';
import { Message } from '../store/useAppStore';

interface MessageItemProps {
  message: Message;
  modelName: string;
  isUser: boolean;
  time: string;
  onDownloadImage: (url: string, filename: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ 
  message, modelName, isUser, time, onDownloadImage 
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("flex flex-col gap-3 max-w-4xl mx-auto w-full", isUser ? "items-end" : "items-start")}
    >
      <div className={cn(
        "group relative p-5 transition-all duration-500",
        isUser ? "chat-bubble-user rounded-tr-none" : "chat-bubble-ai rounded-tl-none",
        "sm:rounded-[40px] rounded-[24px]"
      )}>
        {message.image && (
          <div className="mb-6 relative group/img overflow-hidden rounded-2xl border border-white/10 shadow-2xl max-w-full">
             <img src={message.image} className="max-w-full w-auto" alt="User Upload" />
             <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
          </div>
        )}
        
        {message.isGeneratedImage && message.imageUrl && (
          <div className="mb-6 relative group/img overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black/20 p-2 max-w-full">
            <img src={message.imageUrl} className="max-w-full w-auto rounded-xl" alt="Generated" />
            <button 
              onClick={() => onDownloadImage(message.imageUrl!, `image-${Date.now()}.png`)}
              className="absolute bottom-6 right-6 p-3 bg-black/60 backdrop-blur-xl text-white rounded-2xl opacity-0 group-hover/img:opacity-100 transition-all hover:bg-jb-purple hover:scale-110 shadow-2xl"
            >
              <Download size={18} />
            </button>
          </div>
        )}

        <div className="prose prose-invert prose-sm max-w-none font-medium" 
          dangerouslySetInnerHTML={{ 
            __html: parse(message.content.replace(/<graph_data>[\s\S]*?<\/graph_data>/g, '')) as string 
          }} 
        />
      </div>
      
      <div className={cn("flex items-center gap-4 px-6", isUser ? "flex-row-reverse" : "flex-row")}>
         <span className={cn(
           "text-[9px] font-black uppercase tracking-[0.25em] py-1 px-2.5 rounded-lg border",
           isUser ? "text-jb-accent border-jb-accent/30 bg-jb-accent/5" : "text-slate-400 border-white/10 bg-white/5"
         )}>
            {modelName}
         </span>
         <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">{time}</span>
      </div>
    </motion.div>
  );
};
