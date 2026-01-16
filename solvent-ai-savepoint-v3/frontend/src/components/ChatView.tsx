import React, { useEffect, useRef, useState } from 'react';
import { useAppStore, Message } from '../store/useAppStore';
import { Send, Image as ImageIcon, Mic, X, Brain, Loader2, Sparkles, Plus, Command, Download } from 'lucide-react';
import { parse } from 'marked';
import { cn } from '../lib/utils';
import { API_BASE_URL } from '../lib/config';
import { motion, AnimatePresence } from 'framer-motion';

export const ChatView = () => {
  const { 
    messages, addMessage, isProcessing, setIsProcessing, 
    backend, currentMode, smartRouterEnabled,
    selectedLocalModel, selectedCloudModel
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
          model: backend === 'gemini' ? selectedCloudModel : selectedLocalModel,
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

  const handleGenerateImage = async () => {
    if (!input.trim() || isProcessing) return;
    
    const userMessage: Message = { role: 'user', content: `Generate an image of: ${input}` };
    addMessage(userMessage);
    const prompt = input;
    setInput('');
    setIsProcessing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/generate-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const data = await response.json();
      
      if (data.imageUrl) {
        addMessage({ 
          role: 'assistant', 
          content: `Here is the image I generated for: "${prompt}"`,
          isGeneratedImage: true,
          imageUrl: data.imageUrl
        });
      } else {
        throw new Error(data.error || 'Failed to generate image');
      }
    } catch (error: any) {
      addMessage({ role: 'assistant', content: `Error: ${error.message || 'Image generation failed.'}` });
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadImage = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'generated-image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const getTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full relative bg-transparent">
      
      {/* Header Info Overlay */}
      <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/20 to-transparent z-10 flex items-center px-8 border-b border-white/5 backdrop-blur-md">
         <div className="flex items-center gap-4">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Session</div>
            <div className="h-1 w-1 rounded-full bg-slate-700" />
            <div className="text-[11px] font-bold text-white uppercase tracking-wider">{currentMode}</div>
         </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 pt-28 space-y-12 scrollbar-thin" ref={scrollRef}>
        <AnimatePresence>
          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            const modelName = isUser ? 'Operator' : (backend === 'gemini' ? selectedCloudModel : selectedLocalModel);
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                key={i} 
                className={cn("flex flex-col gap-3 max-w-3xl mx-auto w-full", isUser ? "items-end" : "items-start")}
              >
                <div className={cn(
                  "group relative p-8 rounded-[40px] transition-all duration-500",
                  isUser 
                    ? "chat-bubble-user rounded-tr-none" 
                    : "chat-bubble-ai rounded-tl-none"
                )}>
                  {m.image && (
                    <div className="mb-6 relative group/img overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
                       <img src={m.image} className="max-w-sm" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity" />
                    </div>
                  )}
                  
                  {m.isGeneratedImage && m.imageUrl && (
                    <div className="mb-6 relative group/img overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black/20 p-2">
                      <img 
                        src={m.imageUrl} 
                        className="max-w-sm rounded-xl" 
                        alt="Generated"
                      />
                      <button 
                        onClick={() => downloadImage(m.imageUrl!, `image-${i}.png`)}
                        className="absolute bottom-6 right-6 p-3 bg-black/60 backdrop-blur-xl text-white rounded-2xl opacity-0 group-hover/img:opacity-100 transition-all hover:bg-jb-purple hover:scale-110 shadow-2xl"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  )}

                  <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-black/40 prose-pre:border prose-pre:border-white/5 font-medium" dangerouslySetInnerHTML={{ __html: parse(m.content) as string }} />
                </div>
                
                <div className={cn("flex items-center gap-4 px-6", isUser ? "flex-row-reverse" : "flex-row")}>
                   <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-[0.25em] py-1 px-2.5 rounded-lg border",
                        isUser 
                          ? "text-jb-accent border-jb-accent/30 bg-jb-accent/5" 
                          : "text-slate-400 border-white/10 bg-white/5"
                      )}>
                         {modelName}
                      </span>
                   </div>
                   <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest">{getTime()}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {isProcessing && (
           <div className="max-w-3xl mx-auto flex items-center gap-6 px-6">
              <div className="flex gap-2">
                 <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-2 h-2 bg-jb-accent rounded-full shadow-[0_0_15px_rgba(60,113,247,0.8)]" />
                 <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-2 h-2 bg-jb-purple rounded-full shadow-[0_0_15px_rgba(157,91,210,0.8)]" />
                 <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-2 h-2 bg-jb-orange rounded-full shadow-[0_0_15px_rgba(251,146,60,0.8)]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 animate-pulse">Neural Processing</span>
           </div>
        )}
      </div>

      {/* Futuristic Input Control Deck */}
      <div className="p-12 pt-0">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            whileFocus-within={{ scale: 1.005, y: -2 }}
            className="vibrant-border rounded-[40px] overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.6)]"
          >
            <div className="bg-black/40 backdrop-blur-3xl p-4 pr-6 flex items-center gap-3 border border-white/5">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 text-slate-500 hover:text-jb-orange transition-all hover:bg-white/5 rounded-2xl group"
                >
                  <ImageIcon size={20} className="group-hover:scale-110 transition-transform" />
                </button>
                <button 
                   onClick={handleGenerateImage}
                   disabled={!input.trim() || isProcessing}
                   className="p-4 text-slate-500 hover:text-jb-accent transition-all hover:bg-white/5 rounded-2xl disabled:opacity-10 group"
                   title="Generate Neural Image"
                >
                  <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
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
                 className="flex-1 bg-transparent border-none outline-none text-[16px] font-semibold text-white placeholder:text-slate-800 py-4 px-2 resize-none h-[60px] scrollbar-hide"
                 rows={1}
              />

              <div className="flex items-center gap-3">
                <button className="p-4 text-slate-500 hover:text-white transition-colors hover:bg-white/5 rounded-2xl">
                  <Mic size={20} />
                </button>
                <motion.button 
                  whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(60,113,247,0.4)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSend}
                  disabled={!input.trim() && !selectedImage}
                  className="w-14 h-14 bg-white text-black rounded-[20px] flex items-center justify-center disabled:opacity-5 transition-all shadow-2xl font-bold group"
                >
                  <Send size={20} className="ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
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
                 className="mt-6 flex gap-4 p-4 glass-panel rounded-2xl inline-block relative group border border-jb-orange/30"
               >
                  <img src={selectedImage} className="h-20 w-20 object-cover rounded-xl shadow-2xl" />
                  <div className="flex flex-col justify-center pr-4">
                     <span className="text-[10px] font-black text-jb-orange uppercase tracking-widest mb-1">Attachment</span>
                     <span className="text-[11px] text-slate-400 font-bold">Image ready for analysis</span>
                  </div>
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-jb-pink text-white rounded-full p-1.5 shadow-xl hover:scale-110 transition-transform">
                    <X size={10}/>
                  </button>
               </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};