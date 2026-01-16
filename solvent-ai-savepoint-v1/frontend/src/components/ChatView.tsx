import React, { useEffect, useRef, useState } from 'react';
import { useAppStore, Message } from '../store/useAppStore';
import { Send, Image as ImageIcon, Mic, X, Brain, Loader2, Sparkles, Plus, Command } from 'lucide-react';
import { parse } from 'marked';
import { cn } from '../lib/utils';
import { API_BASE_URL } from '../lib/config';
import { motion, AnimatePresence } from 'framer-motion';

export const ChatView = () => {
  const { 
    messages, addMessage, isProcessing, setIsProcessing, 
    backend, currentMode, smartRouterEnabled,
    selectedLocalModel
  } = useAppStore();
  
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isProcessing) return;
    const userMessage: Message = { role: 'user', content: input, image: selectedImage };
    addMessage(userMessage);
    setInput('');
    setSelectedImage(null);
    setIsProcessing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: backend,
          model: backend === 'gemini' ? 'gemini-1.5-flash' : selectedLocalModel,
          messages: [...messages, userMessage],
          image: selectedImage,
          mode: currentMode,
          smartRouter: smartRouterEnabled
        })
      });
      const data = await response.json();
      addMessage({ role: 'assistant', content: data.response });
    } catch (error) {
      addMessage({ role: 'assistant', content: `Error: Service unavailable.` });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      
      {/* Dynamic Header Overlay */}
      <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-jb-dark to-transparent z-20 pointer-events-none" />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 pt-20 space-y-12 scrollbar-thin" ref={scrollRef}>
        <AnimatePresence>
          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            return (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={i} 
                className={cn("flex flex-col gap-3 max-w-3xl mx-auto", isUser ? "items-end" : "items-start")}
              >
                <div className={cn(
                  "group relative p-5 px-6 rounded-[28px] shadow-2xl transition-all duration-500",
                  isUser 
                    ? "chat-bubble-user rounded-tr-none" 
                    : "chat-bubble-ai rounded-tl-none"
                )}>
                  {m.image && <img src={m.image} className="max-w-sm rounded-2xl mb-4 border border-white/10 shadow-2xl" />}
                  <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/30 prose-pre:border prose-pre:border-jb-border/50" dangerouslySetInnerHTML={{ __html: parse(m.content) as string }} />
                </div>
                <div className="flex items-center gap-2 px-3">
                   <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                      {isUser ? 'Operator' : (backend === 'gemini' ? 'Gemini 2.5' : 'Local Qwen')}
                   </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {isProcessing && (
           <div className="max-w-3xl mx-auto flex items-center gap-3 text-jb-accent">
              <div className="flex gap-1">
                 <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-jb-accent rounded-full" />
                 <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-jb-purple rounded-full" />
                 <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-jb-orange rounded-full" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Synthesizing</span>
           </div>
        )}
      </div>

      {/* Futuristic Input Bar */}
      <div className="p-10 pt-0">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial={false}
            animate={{ y: 0, opacity: 1 }}
            className="vibrant-border rounded-[32px] overflow-hidden shadow-2xl"
          >
            <div className="bg-jb-panel/90 backdrop-blur-3xl p-3 pr-4 flex items-center gap-2">
              <div className="flex items-center">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 text-slate-500 hover:text-jb-orange transition-all hover:scale-110"
                >
                  <ImageIcon size={20} />
                </button>
                <button className="p-4 text-slate-500 hover:text-jb-purple transition-all hover:scale-110">
                  <Command size={20} />
                </button>
              </div>

              <input 
                type="file" ref={fileInputRef} className="hidden" accept="image/*" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setSelectedImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} 
              />
              
              <textarea 
                 value={input}
                 onChange={(e) => setInput(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                 placeholder="Command the Intelligence..."
                 className="flex-1 bg-transparent border-none outline-none text-[16px] font-semibold text-slate-100 placeholder:text-slate-700 py-4 px-2 resize-none h-[56px] scrollbar-hide"
                 rows={1}
              />

              <div className="flex items-center gap-1">
                <button className="p-4 text-slate-500 hover:text-white transition-colors">
                  <Mic size={20} />
                </button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() && !selectedImage}
                  className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center hover:bg-jb-accent hover:text-white disabled:opacity-20 transition-all shadow-xl"
                >
                  <Send size={20} className="ml-0.5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
          
          <AnimatePresence>
            {selectedImage && (
               <motion.div 
                 initial={{ opacity: 0, scale: 0.8, y: 10 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.8, y: 10 }}
                 className="mt-4 inline-block relative group"
               >
                  <img src={selectedImage} className="h-20 w-20 object-cover rounded-2xl border-2 border-jb-orange shadow-2xl shadow-jb-orange/20" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-jb-pink text-white rounded-full p-1.5 shadow-xl scale-0 group-hover:scale-100 transition-transform">
                    <X size={12}/>
                  </button>
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
