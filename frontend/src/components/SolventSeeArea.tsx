import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ScanEye, Sparkles, Wand2, Scissors, 
  Palette, MousePointer2, ZoomIn, Info,
  Upload, Download, Layers, Box, Loader2, Code as CodeIcon,
  MessageSquare, X, Send, Target, ChevronRight, Image as ImageIcon,
  Maximize2
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { MessageList } from './MessageList';
import { BentoItem, BentoCard } from './BentoGrid';
import { ChatService } from '../services/ChatService';
import { VisionToolControls } from './VisionToolControls';

export const SolventSeeArea = () => {
  const { 
    deviceInfo, sendMessage, isProcessing, generateImageAction, 
    lastGeneratedImage, setLastGeneratedImage, imageProvider, setImageProvider 
  } = useAppStore();
  const [activeTool, setActiveTool] = useState('analyze');
  const [isHovering, setIsHovering] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(true);
  const [instruction, setInstruction] = useState("");
  const [imageLoading, setImageLoading] = useState(false);
  const [isToolkitOpen, setIsToolkitOpen] = useState(false);
  const [localStatus, setLocalStatus] = useState<{loaded: boolean, model?: string, fileExists?: boolean}>({ loaded: false });
  
  // Sync with store-generated images
  useEffect(() => {
    if (lastGeneratedImage) {
      console.log('[SolventSee] Consuming generated image:', lastGeneratedImage);
      setSelectedImage(lastGeneratedImage);
      setImageLoading(false);
      setLastGeneratedImage(null); // Clear once consumed
    }
  }, [lastGeneratedImage, setLastGeneratedImage]);

  useEffect(() => {
    const checkStatus = async () => {
      const status = await ChatService.checkLocalImageStatus();
      setLocalStatus(status);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const isJuggernaut = localStatus.model?.toLowerCase().includes('juggernaut');

  // Dynamic Initial Width: Account for main app sidebar (~288px)
  const getInitialWidth = () => {
    if (deviceInfo.isMobile) return window.innerWidth;
    const available = window.innerWidth - 288; 
    return Math.min(400, available * 0.35); // Slightly more conservative
  };

  const [panelWidth, setPanelWidth] = useState(getInitialWidth());
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isResizing = useRef(false);

  const startResizing = (e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
  };

  const stopResizing = () => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const newWidth = containerRect.right - e.clientX;
    const maxPanelWidth = containerRect.width - 320; // Ensure center area doesn't get too small
    
    if (newWidth > 280 && newWidth < maxPanelWidth) {
      setPanelWidth(newWidth);
    }
  };

  const tools = [
    { id: 'analyze', icon: ScanEye, label: 'Logic Scan', desc: 'Deep structural analysis of visual components and UI hierarchy.', color: 'text-jb-accent', badge: 'Active' },
    { id: 'generate', icon: Sparkles, label: 'Gen-Fill', desc: 'Predict and generate missing visual elements using neural expansion.', color: 'text-jb-orange' },
    { id: 'edit', icon: Wand2, label: 'Agentic Edit', desc: 'Smart modification of visual elements with context-aware logic.', color: 'text-jb-purple' },
    { id: 'select', icon: MousePointer2, label: 'Smart Select', desc: 'Object detection and precise semantic selection of UI elements.', color: 'text-jb-cyan' },
    { id: 'colors', icon: Palette, label: 'Palette Extractor', desc: 'Extract and analyze the color DNA of any visual entity.', color: 'text-jb-orange' },
    { id: 'crop', icon: Scissors, label: 'Logic Crop', desc: 'Intelligent focus-based cropping for detailed component extraction.', color: 'text-jb-purple' },
  ];

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        handleAnalyze(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async (image: string) => {
    if (!image) return;
    await sendMessage("Analyze this UI mockup and provide a detailed structural breakdown. Then, generate the React/Tailwind code to implement it.", image);
  };

  const handleSendInstruction = async () => {
    if (!instruction.trim()) return;
    await sendMessage(instruction, selectedImage);
    setInstruction("");
  };

  const handleGenerate = async () => {
    if (!instruction.trim()) return;
    setImageLoading(true);
    await generateImageAction(instruction);
    setInstruction("");
  };

  const handleToolAction = async (action: string, data?: any) => {
    if (!selectedImage && action !== 'Gen-Fill') return;
    
    let prompt = "";
    switch (action) {
      case 'Deep Scan':
        prompt = "Perform a deep structural audit of this image. Identify every UI component, analyze the typography, spacing (px), and layout hierarchy. Provide a JSON-style summary followed by React implementation logic.";
        break;
      case 'Gen-Fill':
        prompt = `Using this image as context, generate or fill in the following: ${data}. Maintain the existing aesthetic and theme.`;
        setImageLoading(true);
        await generateImageAction(data); // Primary action for Gen-Fill
        return;
      case 'Agentic Edit':
        prompt = `I want to modify this image. Directive: ${data}. Please analyze how to do this and provide the technical reasoning.`;
        break;
      case 'Extract Palette':
        prompt = "Extract the primary and secondary color palette from this image. Provide the Hex codes and suggest a Tailwind CSS theme configuration based on these colors.";
        break;
      case 'Execute Crop':
        prompt = "Analyze the most important focal point of this UI/image and suggest the crop coordinates (top, left, width, height) to isolate it as a standalone component.";
        break;
      default:
        prompt = `Executing ${action} on current visual entity.`;
    }

    await sendMessage(prompt, selectedImage);
  };

  return (
    <div ref={containerRef} className="flex-1 flex overflow-hidden bg-black/20 backdrop-blur-3xl w-full">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        accept="image/*" 
        className="hidden" 
      />

      {/* Center: Neural Canvas */}
      <div className="flex-1 flex flex-col w-0 min-w-0 overflow-hidden relative border-r border-white/5">
         {/* CONSOLIDATED CINEMATIC TOOLBAR */}
         <div className="h-20 border-b border-white/5 flex items-center px-4 lg:px-8 bg-black/40 backdrop-blur-xl relative z-30 shadow-2xl gap-4 overflow-hidden">
            <div className="flex items-center gap-3 lg:gap-4 shrink-0">
               <div className="flex flex-col shrink-0">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1">SolventSee Lab</span>
                  <h3 className="text-white font-black text-xs uppercase tracking-tight truncate max-w-[120px]">
                    {selectedImage ? 'Visual_Entity_Alpha.png' : 'Awaiting Data...'}
                  </h3>
               </div>
               <div className="h-8 w-[1px] bg-white/10 shrink-0" />
            </div>

            {/* Agent Toolkit Button */}
            <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-2xl backdrop-blur-md shadow-inner">
               <button
                 onClick={() => setIsToolkitOpen(true)}
                 className="px-6 py-2.5 rounded-xl bg-jb-orange/10 border border-jb-orange/30 text-jb-orange text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-jb-orange hover:text-black transition-all group shadow-[0_0_20px_rgba(251,146,60,0.1)]"
               >
                  <Box size={16} className="group-hover:rotate-12 transition-transform" />
                  Agent Toolkit
               </button>
               
               <div className="h-6 w-[1px] bg-white/10 mx-2" />
               
               <div className="flex items-center gap-3 px-3">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Active Tool</span>
                  <div className="flex items-center gap-2">
                     {(() => {
                        const active = tools.find(t => t.id === activeTool) || tools[0];
                        return (
                           <>
                              <active.icon size={14} className={cn(active.color)} />
                              <span className="text-[10px] font-black text-white uppercase tracking-tight">{active.label}</span>
                           </>
                        );
                     })()}
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-2 lg:gap-3 shrink-0 ml-auto">
               <button 
                onClick={() => setSelectedImage(null)}
                className="px-3 lg:px-4 py-2 lg:py-2.5 rounded-xl bg-white/5 hover:bg-rose-500/10 hover:text-rose-500 text-[10px] font-black uppercase tracking-widest text-slate-300 transition-all border border-transparent hover:border-rose-500/20 hidden sm:block"
               >
                 Reset
               </button>
               
               <div className="w-[1px] h-6 bg-white/10 hidden sm:block" />

               <button 
                 onClick={() => setShowChat(!showChat)}
                 className={cn(
                    "flex items-center gap-2 px-4 lg:px-5 py-2 lg:py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-xl",
                    showChat ? "bg-jb-accent/10 border-jb-accent/20 text-jb-accent" : "bg-white/5 border-white/5 text-slate-400"
                 )}
               >
                  <MessageSquare size={16} /> <span className="hidden sm:inline">Creative Console</span>
               </button>
            </div>
         </div>

         {/* The Stage */}
         <div 
           className="flex-1 relative overflow-hidden flex items-center justify-center p-6 md:p-12"
           onMouseEnter={() => setIsHovering(true)}
           onMouseLeave={() => setIsHovering(false)}
         >
            <div className="absolute inset-0 neural-grid opacity-[0.03] pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-br from-jb-orange/[0.02] via-transparent to-jb-accent/[0.02] pointer-events-none" />
            
            {selectedImage ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedImage}
                    initial={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="relative group max-w-full max-h-full"
                  >
                      {/* Neural Scan Line Animation (while processing or loading) */}
                      {(isProcessing || imageLoading) && (
                        <div className="absolute inset-0 z-20 rounded-3xl overflow-hidden pointer-events-none">
                           <motion.div 
                             initial={{ top: '-10%' }}
                             animate={{ top: '110%' }}
                             transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                             className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-jb-orange to-transparent shadow-[0_0_20px_rgba(251,146,60,1)] z-30"
                           />
                           <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center">
                              <Loader2 size={40} className="text-jb-orange animate-spin mb-4" />
                              <span className="text-[10px] font-black text-jb-orange uppercase tracking-[0.5em] animate-pulse">Logic Reconstitution...</span>
                           </div>
                        </div>
                      )}

                      <img 
                        src={selectedImage} 
                        onLoad={() => setImageLoading(false)}
                        className={cn(
                          "max-w-full max-h-[75vh] rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.8)] border border-white/10 object-contain transition-all duration-1000",
                          (isProcessing || imageLoading) ? "brightness-50 grayscale contrast-125" : "brightness-100 grayscale-0 contrast-100"
                        )}
                      />
                      
                      {/* Interactive Overlays (Only show when not loading) */}
                      <AnimatePresence>
                        {!isProcessing && !imageLoading && (
                          <motion.div 
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 1 }}
                            className="absolute inset-0 rounded-[2.5rem] bg-black/20 pointer-events-none group-hover:pointer-events-auto transition-all duration-500 flex items-start justify-end p-6 gap-3"
                          >
                             <button 
                               onClick={() => {
                                 const link = document.createElement('a');
                                 link.href = selectedImage;
                                 link.download = 'solvent-ai-capture.png';
                                 link.click();
                               }}
                               className="p-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-white hover:bg-jb-orange hover:text-black transition-all shadow-2xl"
                               title="Export Image"
                             >
                                <Download size={18} />
                             </button>
                             <button 
                               onClick={() => window.open(selectedImage, '_blank')}
                               className="p-3 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-white hover:bg-jb-accent hover:text-white transition-all shadow-2xl"
                               title="Full Resolution"
                             >
                                <Maximize2 size={18} />
                             </button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div className="absolute inset-0 rounded-[2.5rem] border border-white/5 pointer-events-none group-hover:border-jb-orange/20 transition-colors duration-700" />
                      
                      {/* Diagnostic Corner Brackets */}
                      <div className="absolute -top-2 -left-2 w-8 h-8 border-t-2 border-l-2 border-jb-orange/30 rounded-tl-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:-translate-x-2 group-hover:-translate-y-2" />
                      <div className="absolute -top-2 -right-2 w-8 h-8 border-t-2 border-r-2 border-jb-orange/30 rounded-tr-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:translate-x-2 group-hover:-translate-y-2" />
                      <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-2 border-l-2 border-jb-orange/30 rounded-bl-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:-translate-x-2 group-hover:translate-y-2" />
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-2 border-r-2 border-jb-orange/30 rounded-br-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-all duration-500 transform group-hover:translate-x-2 group-hover:translate-y-2" />
                  </motion.div>
                </AnimatePresence>
              </div>
            ) : (
              /* Placeholder / Upload Zone */
              <motion.div 
                animate={{ scale: isHovering ? 1.01 : 1 }}
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-4xl aspect-video rounded-[3rem] border-2 border-dashed border-white/10 bg-black/40 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 relative group cursor-pointer hover:border-jb-orange/30 transition-all duration-500 shadow-2xl"
              >
                 <div className="w-24 h-24 rounded-3xl bg-jb-orange/5 border border-jb-orange/10 flex items-center justify-center text-jb-orange group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-[0_0_30px_rgba(251,146,60,0.1)]">
                    <Upload size={40} />
                 </div>
                 <div className="text-center space-y-3">
                    <p className="text-2xl font-[900] text-white tracking-tighter">Drop entity for <span className="text-vibrant">visual analysis</span></p>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">AI-Powered Visual-to-Logic Extraction</p>
                 </div>
                 
                 <div className="absolute top-8 left-8 w-6 h-6 border-t-2 border-l-2 border-white/10 rounded-tl-xl" />
                 <div className="absolute top-8 right-8 w-6 h-6 border-t-2 border-r-2 border-white/10 rounded-tr-xl" />
                 <div className="absolute bottom-8 left-8 w-6 h-6 border-b-2 border-l-2 border-white/10 rounded-bl-xl" />
                 <div className="absolute bottom-8 right-8 w-6 h-6 border-b-2 border-r-2 border-white/10 rounded-br-xl" />
              </motion.div>
            )}
         </div>
      </div>

      {/* Right: Intelligence Panel (Inspector + Chat) */}
      <AnimatePresence>
        {showChat && (
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: panelWidth }}
            exit={{ width: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
               "border-l border-white/5 bg-black/40 backdrop-blur-3xl flex flex-col relative z-40 shrink-0 overflow-hidden",
               deviceInfo.isMobile ? "fixed inset-0 pt-20" : "h-full"
            )}
          >
            {/* Resize Handle */}
            {!deviceInfo.isMobile && (
               <div 
                 onMouseDown={startResizing}
                 className="absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-jb-orange/40 transition-colors z-50 group"
               >
                  <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-[1px] h-8 bg-white/10 group-hover:bg-jb-orange/50" />
               </div>
            )}

            <div 
              className="h-full flex flex-col overflow-hidden w-full"
            >
                {/* Header Toggle */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 rounded-xl bg-jb-orange/10 border border-jb-orange/20 text-jb-orange">
                           <ScanEye size={18} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Creative Console</span>
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">SolventSee Studio // v2.1</span>
                        </div>
                    </div>
                    <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-all">
                        <X size={18} />
                    </button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col p-4 space-y-4">
                   <div className="shrink-0 space-y-2">
                      <VisionToolControls 
                        activeTool={activeTool} 
                        onAction={handleToolAction} 
                        isProcessing={isProcessing} 
                      />

                      <div className={cn(
                        "p-3 rounded-[1.5rem] border transition-all duration-500",
                        imageProvider === 'huggingface' ? "bg-jb-accent/5 border-jb-accent/20" :
                        "bg-white/[0.02] border-white/5 opacity-60"
                      )}>
                         <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                               <div className={cn(
                                 "w-1.5 h-1.5 rounded-full", 
                                 imageProvider === 'huggingface' ? "bg-jb-accent animate-pulse" : "bg-slate-600"
                               )} />
                               <span className="text-[8px] font-black text-white uppercase tracking-widest">Hugging Face Bridge</span>
                            </div>
                            {imageProvider !== 'huggingface' && (
                               <button 
                                 onClick={() => setImageProvider('huggingface')}
                                 className="text-[8px] font-black text-jb-accent uppercase tracking-tighter hover:underline"
                               >
                                  Switch
                               </button>
                            )}
                         </div>
                         <p className="text-[8px] font-bold text-slate-500 leading-tight">
                            Free SDXL / No Watermarks.
                         </p>
                      </div>

                      <div className={cn(
                        "p-3 rounded-[1.5rem] border transition-all duration-500",
                        imageProvider === 'local' ? "bg-jb-orange/5 border-jb-orange/20" : "bg-white/[0.02] border-white/5 opacity-60"
                      )}>
                         <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                               <div className={cn(
                                 "w-1.5 h-1.5 rounded-full animate-pulse", 
                                 localStatus.loaded ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" : 
                                 localStatus.fileExists ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" : "bg-red-500"
                               )} />
                               <span className="text-[8px] font-black text-white uppercase tracking-widest">Juggernaut_XL Status</span>
                            </div>
                         </div>
                         <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-bold text-slate-500 truncate">
                               {localStatus.loaded ? "Active" : 
                                localStatus.fileExists ? "Detected - Offline" : "Offline"}
                            </span>
                         </div>
                      </div>
                   </div>

                   {/* Unified Message History */}
                   <div className="flex-1 flex flex-col min-h-0 space-y-2">
                      <label className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em] shrink-0">Intelligence Stream</label>
                      <div className="flex-1 border border-white/5 rounded-[1.5rem] bg-black/20 overflow-hidden flex flex-col">
                         <MessageList />
                      </div>
                   </div>
                </div>

                {/* Bottom Action Area */}
                <div className="p-5 bg-black/60 border-t border-white/5 space-y-3">
                    <div className="flex gap-2">
                        <div className="flex-1 relative group">
                           <input 
                             value={instruction}
                             onChange={(e) => setInstruction(e.target.value)}
                             placeholder="Instruct agent..."
                             className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-[11px] font-bold text-white outline-none focus:border-jb-orange/40 transition-all placeholder:text-slate-700"
                             onKeyDown={(e) => e.key === 'Enter' && handleSendInstruction()}
                           />
                           <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                               <button 
                                 onClick={handleSendInstruction}
                                 className="p-1.5 bg-white text-black rounded-lg hover:bg-jb-accent hover:text-white transition-all shadow-xl"
                                 title="Execute Instruction"
                               >
                                  <Send size={12} />
                               </button>
                           </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={handleGenerate}
                          disabled={!instruction.trim() || isProcessing}
                          className="flex items-center justify-center gap-2 py-2.5 bg-jb-orange/10 border border-jb-orange/20 text-jb-orange rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-jb-orange hover:text-black transition-all disabled:opacity-20"
                        >
                            <ImageIcon size={12} /> Generate Image
                        </button>
                        <button 
                          onClick={() => handleAnalyze(selectedImage!)}
                          disabled={!selectedImage || isProcessing}
                          className="flex items-center justify-center gap-2 py-2.5 bg-jb-accent/10 border border-jb-accent/20 text-jb-accent rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-jb-accent hover:text-white transition-all disabled:opacity-20"
                        >
                            <Sparkles size={12} /> Refine Logic
                        </button>
                    </div>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toolkit BentoGrid Overlay */}
      <AnimatePresence>
        {isToolkitOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsToolkitOpen(false)} 
              className="absolute inset-0 bg-black/90 backdrop-blur-3xl" 
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-5xl overflow-hidden relative z-10 p-2 md:p-4"
            >
              <div className="flex flex-col gap-2 mb-4">
                 <div className="flex flex-col items-start gap-1 relative">
                    <span className="text-[8px] font-black text-jb-accent uppercase tracking-[0.5em]">Neural Extension</span>
                    <h2 className="text-2xl md:text-4xl font-black text-white tracking-tighter leading-none">Agent <span className="text-vibrant">Toolkit</span></h2>
                    
                    <button 
                      onClick={() => setIsToolkitOpen(false)}
                      className="absolute top-0 right-0 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all"
                    >
                        <X size={18} />
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                 {tools.map((tool, idx) => (
                    <BentoCard
                       key={tool.id}
                       title={tool.label}
                       desc={tool.desc}
                       icon={tool.icon}
                       color={tool.color}
                       badge={tool.id === activeTool ? 'Active' : undefined}
                       className="min-h-[140px] p-4 md:p-5 lg:p-5" // Drastically reduced min-height and padding
                       onClick={() => {
                          setActiveTool(tool.id);
                          setIsToolkitOpen(false);
                       }}
                       actionText="Engage"
                       delay={idx * 0.05}
                    />
                 ))}
              </div>

              <div className="mt-4 p-4 rounded-[1.5rem] border border-white/5 bg-white/[0.01] flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-jb-accent/10 flex items-center justify-center text-jb-accent">
                       <Box size={16} />
                    </div>
                    <div>
                       <p className="text-[9px] font-black text-white uppercase tracking-widest leading-none">Protocol Override</p>
                       <p className="text-[7px] text-slate-600 font-bold uppercase tracking-widest mt-1">Custom sequences available in v3.0</p>
                    </div>
                 </div>
                 <button 
                    onClick={() => setIsToolkitOpen(false)}
                    className="px-6 py-2 bg-white text-black rounded-xl font-black text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-2xl"
                 >
                    Return to Studio
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

