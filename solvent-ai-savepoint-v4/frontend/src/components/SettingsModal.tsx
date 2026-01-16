import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, Cloud, Zap, Shield, Sliders, ChevronDown, MessageSquare, ScanEye, Brain, Globe } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { API_BASE_URL } from '../lib/config';
import { cn } from '../lib/utils';

export const SettingsModal = () => {
  const { 
    settingsOpen, setSettingsOpen, 
    modeConfigs, setModeConfig,
    temperature, setTemperature,
    maxTokens, setMaxTokens
  } = useAppStore();

  const [availableModels, setAvailableModels] = useState<{ollama: any[], gemini: string[], deepseek: string[]}>({ ollama: [], gemini: [], deepseek: [] });

  useEffect(() => {
    if (settingsOpen) {
      fetch(`${API_BASE_URL}/models`)
        .then(res => res.json())
        .then(data => setAvailableModels(data))
        .catch(err => console.error("Failed to fetch models", err));
    }
  }, [settingsOpen]);

  if (!settingsOpen) return null;

  const modes = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'vision', label: 'Vision', icon: ScanEye },
    { id: 'deep_thought', label: 'Thinking', icon: Brain },
    { id: 'browser', label: 'Web Search', icon: Globe },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setSettingsOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-3xl bg-[#050508] border border-white/10 rounded-[32px] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-jb-accent/20 flex items-center justify-center border border-jb-accent/30 text-jb-accent">
                 <Sliders size={20} />
              </div>
              <div>
                 <h2 className="text-xl font-black text-white tracking-tight">AI Configuration</h2>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Laboratory Parameters</p>
              </div>
           </div>
           <button 
             onClick={() => setSettingsOpen(false)}
             className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
           >
              <X size={20} />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-thin">
           
           {/* Mode Specific Config */}
           <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Mode Assignments</h3>
              <div className="grid grid-cols-1 gap-4">
                 {modes.map((mode) => {
                    const config = modeConfigs[mode.id] || { provider: 'auto', model: 'gemini-2.0-flash-exp' };
                    return (
                       <div key={mode.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
                                   <mode.icon size={16} />
                                </div>
                                <span className="font-bold text-white text-sm">{mode.label}</span>
                             </div>
                             
                             <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                                {['auto', 'gemini', 'deepseek', 'ollama'].map((p) => (
                                   <button
                                     key={p}
                                     onClick={() => setModeConfig(mode.id, { ...config, provider: p as any })}
                                     className={cn(
                                       "px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all",
                                       config.provider === p 
                                         ? "bg-white/10 text-white shadow-sm" 
                                         : "text-slate-600 hover:text-slate-400"
                                     )}
                                   >
                                      {p}
                                   </button>
                                ))}
                             </div>
                          </div>

                          {config.provider !== 'auto' && (
                             <div className="relative group">
                                <select 
                                  value={config.model}
                                  onChange={(e) => setModeConfig(mode.id, { ...config, model: e.target.value })}
                                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-300 outline-none appearance-none focus:border-white/20 transition-all cursor-pointer"
                                >
                                   {config.provider === 'gemini' ? (
                                      (availableModels?.gemini || ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp']).map(m => (
                                        <option key={m} value={m} className="bg-[#050508]">{m}</option>
                                      ))
                                   ) : config.provider === 'deepseek' ? (
                                      (availableModels?.deepseek || ['deepseek-chat', 'deepseek-coder']).map(m => (
                                        <option key={m} value={m} className="bg-[#050508]">{m}</option>
                                      ))
                                   ) : (
                                      (availableModels?.ollama || []).map((m: any) => (
                                        <option key={m.name} value={m.name} className="bg-[#050508]">{m.name}</option>
                                      ))
                                   )}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                             </div>
                          )}
                       </div>
                    );
                 })}
              </div>
           </div>

           {/* Global Parameters */}
           <div className="space-y-8 pt-4 border-t border-white/5">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Global Parameters</h3>
              <div className="grid grid-cols-2 gap-10">
                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Temperature</label>
                       <span className="text-xs font-mono text-jb-accent">{temperature}</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.1" 
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-jb-accent"
                    />
                 </div>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] ml-1">Max Tokens</label>
                       <span className="text-xs font-mono text-jb-purple">{maxTokens}</span>
                    </div>
                    <input 
                      type="range" min="512" max="8192" step="512" 
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-jb-purple"
                    />
                 </div>
              </div>
           </div>

        </div>

        {/* Modal Footer */}
        <div className="p-8 bg-white/[0.02] border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
              <Shield size={12} />
              <span>Configuration locked to local session</span>
           </div>
           <button 
             onClick={() => setSettingsOpen(false)}
             className="px-8 py-3 bg-white text-black rounded-xl font-bold text-xs hover:bg-slate-200 transition-all shadow-xl"
           >
              Synchronize
           </button>
        </div>
      </motion.div>
    </div>
  );
};