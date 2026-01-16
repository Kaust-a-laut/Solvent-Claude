import React, { useEffect, useRef, useState } from 'react';
import { useAppStore, Message } from '../store/useAppStore';
import { Send, Image as ImageIcon, Mic, X, Brain, Loader2, Sparkles, Plus, Command, Download } from 'lucide-react';
import { parse } from 'marked';
import { cn } from '../lib/utils';
import { API_BASE_URL } from '../lib/config';
import { parseGraphData } from '../lib/graph-parser';
import { motion, AnimatePresence } from 'framer-motion';

export const ChatView = () => {
  const { 
    messages, addMessage, isProcessing, setIsProcessing, 
    backend, currentMode, smartRouterEnabled,
    selectedLocalModel, selectedCloudModel,
    modeConfigs, temperature, maxTokens,
    setGraphData, graphNodes, graphEdges
  } = useAppStore();
  
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ latency: 0, velocity: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isProcessing) return;
    
    // Resolve Config for Current Mode
    const config = modeConfigs[currentMode] || { provider: 'auto', model: selectedCloudModel };
    const provider = config.provider === 'auto' ? 'gemini' : config.provider;
    const model = config.provider === 'auto' ? selectedCloudModel : config.model;
    const smartRouter = config.provider === 'auto';

    const userMessage: Message = { role: 'user', content: input, image: selectedImage };
    addMessage(userMessage);
    const startTime = Date.now();
    setInput('');
    setSelectedImage(null);
    setIsProcessing(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          model,
          messages: [...messages, userMessage],
          image: selectedImage,
          mode: currentMode,
          smartRouter,
          temperature,
          maxTokens
        })
      });
      const data = await response.json();
      const endTime = Date.now();
      const latency = endTime - startTime;
      const wordCount = data.response.split(' ').length;
      const velocity = Math.round((wordCount / (latency / 1000)) * 10) / 10;
      
      setMetrics({ latency, velocity });
      addMessage({ role: 'assistant', content: data.response });

      // Extract Graph Data
      const newGraph = parseGraphData(data.response);
      if (newGraph && newGraph.nodes) {
         const mergedNodes = [...graphNodes];
         newGraph.nodes.forEach((newNode: any) => {
            if (!mergedNodes.find(n => n.id === newNode.id)) {
               mergedNodes.push(newNode);
            }
         });
         const mergedEdges = [...graphEdges, ...(newGraph.edges || [])];
         setGraphData(mergedNodes, mergedEdges);
      }
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
    <div className="flex flex-col h-full relative bg-transparent neural-scan">
      
      {/* Header Info Overlay */}
      <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-black/60 to-transparent z-10 flex items-center px-12 border-b border-white/5 backdrop-blur-2xl">
         <div className="flex items-center gap-10">
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mb-1.5 opacity-60">Current Mode</span>
               <span className="text-[12px] font-extrabold text-white uppercase tracking-[0.2em]">{currentMode}</span>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="flex flex-col">
               <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.5em] mb-1.5 opacity-60">Active Model</span>
               <div className="flex items-center gap-3">
                  <span className="text-[12px] font-extrabold text-jb-accent uppercase tracking-[0.2em]">{backend}</span>
                  <span className="text-[10px] font-mono font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded border border-white/10 uppercase tracking-widest">
                     {backend === 'gemini' ? selectedCloudModel : selectedLocalModel}
                  </span>
               </div>
            </div>
         </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-12 pt-40 pb-40 space-y-16 scrollbar-thin" ref={scrollRef}>
        <AnimatePresence>
          {messages.map((m, i) => {
            const isUser = m.role === 'user';
            const modelName = isUser ? 'User' : (backend === 'gemini' ? selectedCloudModel : selectedLocalModel);
            
            return (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                key={i} 
                className={cn("flex flex-col gap-3 max-w-4xl mx-auto w-full", isUser ? "items-end" : "items-start")}
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
           <div className="max-w-4xl mx-auto flex items-center gap-6 px-6">
              <div className="flex gap-2">
                 <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-2 h-2 bg-jb-accent rounded-full shadow-[0_0_15px_rgba(60,113,247,0.8)]" />
                 <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-2 h-2 bg-jb-purple rounded-full shadow-[0_0_15px_rgba(157,91,210,0.8)]" />
                 <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3], y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-2 h-2 bg-jb-orange rounded-full shadow-[0_0_15px_rgba(251,146,60,0.8)]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 animate-pulse">Thinking...</span>
           </div>
        )}
      </div>

      {/* Futuristic Input Control Deck */}
      <div className="p-8 pt-0 absolute bottom-0 left-0 right-0 z-20">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            whileFocus-within={{ scale: 1.002, y: -1 }}
            className="vibrant-border rounded-[32px] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
          >
            <div className="liquid-input backdrop-blur-3xl p-2 px-6 flex items-center gap-2 border border-white/10">
              <div className="flex items-center gap-0.5">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 text-slate-500 hover:text-jb-orange transition-all hover:bg-white/5 rounded-xl group"
                >
                  <ImageIcon size={18} className="group-hover:scale-110 transition-transform" />
                </button>
                <button 
                   onClick={handleGenerateImage}
                   disabled={!input.trim() || isProcessing}
                   className="p-3 text-slate-500 hover:text-jb-accent transition-all hover:bg-white/5 rounded-xl disabled:opacity-10 group"
                   title="Generate Image"
                >
                  <Sparkles size={18} className="group-hover:rotate-12 transition-transform" />
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
                 placeholder="Message Solvent..."
                 className="flex-1 bg-transparent border-none outline-none text-[15px] font-semibold text-white placeholder:text-slate-800 py-3 px-2 resize-none h-[48px] scrollbar-hide"
                 rows={1}
              />

              <div className="flex items-center gap-2">
                <button className="p-3 text-slate-500 hover:text-white transition-colors hover:bg-white/5 rounded-xl">
                  <Mic size={18} />
                </button>
                <motion.button 
                  whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(60,113,247,0.3)' }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSend}
                  disabled={!input.trim() && !selectedImage}
                  className="w-11 h-11 bg-white text-black rounded-2xl flex items-center justify-center disabled:opacity-5 transition-all shadow-xl font-bold group"
                >
                  <Send size={18} className="ml-0.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};