import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Image as ImageIcon, Mic, MicOff, X, Loader2, Sparkles, Paperclip, FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useSpeechToText } from '../hooks/useSpeechToText';
import { cn } from '../lib/utils';

export const ChatInput = () => {
  const { sendMessage, generateImageAction, isProcessing, addMessage, deviceInfo } = useAppStore();
  const [input, setInput] = useState('');
  const [uploadMode, setUploadMode] = useState<'image' | 'file'>('image');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string; originalName: string; content?: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { isListening, transcript, startListening, stopListening, browserSupportsSpeechRecognition } = useSpeechToText();

  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage && !attachedFile) || isProcessing) return;

    if (isListening) stopListening();

    let finalContent = input;
    if (attachedFile) {
      if (attachedFile.content) {
        finalContent += `\n\n[System: The user attached a file named "${attachedFile.originalName}". Here is the content:]\n\n${attachedFile.content}`;
      } else {
        finalContent += `\n\n[System: User attached file: "${attachedFile.originalName}" available at ${attachedFile.url}]`;
      }
    }

    await sendMessage(finalContent, selectedImage);
    setInput('');
    setSelectedImage(null);
    setAttachedFile(null);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const { BASE_URL } = await import('../lib/config');
      const response = await fetch(`${BASE_URL}/api/files/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      
      if (data.filename) {
        setAttachedFile({
          name: data.filename,
          originalName: file.name,
          url: `${BASE_URL}/files/${data.filename}`,
          content: data.content
        });
      }
    } catch (error) {
      console.error('File upload failed:', error);
      addMessage({ role: 'assistant', content: 'Error: Could not upload file.' });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className={cn(
      "absolute bottom-0 left-0 right-0 z-20",
      deviceInfo.isMobile ? "p-4 pb-12" : "p-4"
    )}>
      <div className="max-w-4xl mx-auto">
        <AnimatePresence>
          {(selectedImage || attachedFile) && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mb-3 flex items-center gap-3 px-2"
            >
              {selectedImage && (
                <div className="relative group">
                  <img src={selectedImage} className="h-16 w-16 object-cover rounded-xl border border-white/20 shadow-lg" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12} />
                  </button>
                </div>
              )}
              {attachedFile && (
                <div className="relative group bg-white/10 backdrop-blur-md border border-white/10 p-3 pr-8 rounded-xl flex items-center gap-3 shadow-lg">
                  <div className="p-2 bg-jb-accent/20 rounded-lg text-jb-accent">
                    <FileText size={20} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white max-w-[150px] truncate">{attachedFile.originalName}</span>
                    <span className="text-[9px] font-mono text-slate-400">UPLOADED</span>
                  </div>
                  <button onClick={() => setAttachedFile(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <X size={12} />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          whileFocus-within={{ scale: 1.002, y: -1 }}
          className="vibrant-border rounded-[28px] relative group shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
          {/* Subtle Corner Accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-white/20 rounded-tl-[28px] pointer-events-none group-focus-within:border-jb-accent/40 z-20" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-white/20 rounded-br-[28px] pointer-events-none group-focus-within:border-jb-purple/40 z-20" />

          <div className={cn(
            "liquid-input backdrop-blur-3xl flex items-center gap-2 border border-white/10 relative z-10 rounded-[28px] overflow-hidden",
            deviceInfo.isMobile ? "p-1 px-3" : "p-1.5 px-6"
          )}>
            <div className="flex items-center gap-0.5 relative">
              <button 
                onClick={() => uploadMode === 'image' ? imageInputRef.current?.click() : fileInputRef.current?.click()}
                className={cn(
                  "text-slate-500 hover:text-jb-accent transition-all hover:bg-white/5 rounded-xl rounded-r-none group flex items-center justify-center",
                  deviceInfo.isMobile ? "p-2 w-10" : "p-3 w-12"
                )}
              >
                {isUploading ? <Loader2 size={18} className="animate-spin text-jb-accent" /> : (uploadMode === 'image' ? <ImageIcon size={deviceInfo.isMobile ? 16 : 18} /> : <Paperclip size={deviceInfo.isMobile ? 16 : 18} />)}
              </button>
              <button onClick={() => setUploadMode(prev => prev === 'image' ? 'file' : 'image')} className="p-1 h-full flex flex-col items-center justify-center text-slate-600 hover:text-white bg-white/5 hover:bg-white/10 rounded-r-xl border-l border-white/5 w-5">
                {uploadMode === 'image' ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
              </button>
            </div>

            <div className="w-[1px] h-6 bg-white/5 mx-1" />

            <button 
              onClick={() => { generateImageAction(input); setInput(''); }} 
              disabled={!input.trim() || isProcessing} 
              className={cn(
                "text-slate-500 hover:text-jb-purple transition-all hover:bg-white/5 rounded-xl disabled:opacity-10 group",
                deviceInfo.isMobile ? "p-2" : "p-3"
              )}
            >
              <Sparkles size={deviceInfo.isMobile ? 16 : 18} />
            </button>

            <div className="flex-1 relative">
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
                placeholder={uploadMode === 'image' ? "Message..." : "Attach..."}
                className={cn(
                  "w-full bg-transparent border-none outline-none font-semibold text-white placeholder:text-slate-700 resize-none h-[44px] scrollbar-hide",
                  deviceInfo.isMobile ? "text-sm py-3 px-1" : "text-[15px] py-3 px-2"
                )}
                rows={1}
              />
              {!input && !deviceInfo.isMobile && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.2em] border border-white/5 px-1.5 py-0.5 rounded">System Ready</span>
                </div>
              )}
            </div>

            <div className="w-[1px] h-6 bg-white/5 mx-1" />

            <div className="flex items-center gap-2">
              {browserSupportsSpeechRecognition && (
                <button 
                  onClick={toggleListening}
                  className={cn(
                    "transition-all rounded-xl relative",
                    isListening ? "text-red-500 bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "text-slate-500 hover:text-white hover:bg-white/5",
                    deviceInfo.isMobile ? "p-2" : "p-3"
                  )}
                >
                  {isListening ? (
                    <>
                      <MicOff size={deviceInfo.isMobile ? 16 : 18} />
                      <span className="absolute -top-1 -right-1 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    </>
                  ) : <Mic size={deviceInfo.isMobile ? 16 : 18} />}
                </button>
              )}
              <motion.button 
                whileHover={{ scale: 1.02, boxShadow: '0 0 15px rgba(60,113,247,0.3)' }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSend}
                disabled={(!input.trim() && !selectedImage && !attachedFile) || isProcessing}
                className={cn(
                  "bg-white text-black rounded-2xl flex items-center justify-center disabled:opacity-5 transition-all shadow-xl font-bold group",
                  deviceInfo.isMobile ? "w-9 h-9" : "w-11 h-11"
                )}
              >
                <Send size={deviceInfo.isMobile ? 16 : 18} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Hidden Inputs */}
      <input 
        type="file" 
        ref={imageInputRef} 
        onChange={handleImageSelect} 
        accept="image/*" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileSelect} 
        className="hidden" 
      />
    </div>
  );
};
