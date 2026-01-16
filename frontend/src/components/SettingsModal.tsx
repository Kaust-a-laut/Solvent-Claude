import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cpu, Cloud, Zap, Shield, Sliders, ChevronDown, MessageSquare, ScanEye, Brain, Globe, FlaskConical, CreditCard, ArrowUpRight } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { API_BASE_URL } from '../lib/config';
import { cn } from '../lib/utils';

export const SettingsModal = () => {
  const { 
    settingsOpen, setSettingsOpen, 
    modeConfigs, setModeConfig,
    temperature, setTemperature,
    maxTokens, setMaxTokens,
    globalProvider, setGlobalProvider,
    deviceInfo,
    auraMode, setAuraMode
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
    { id: 'waterfall', label: 'Waterfall', icon: FlaskConical },
  ];

  return (
    <div className={cn(
      "fixed inset-0 z-[100] flex items-center justify-center",
      deviceInfo.isMobile ? "p-0" : "p-6"
    )}>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setSettingsOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      
      <motion.div 
        initial={deviceInfo.isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={deviceInfo.isMobile ? { y: "100%" } : { scale: 0.9, opacity: 0, y: 20 }}
        className={cn(
          "w-full bg-[#050508] border-white/10 shadow-2xl relative overflow-hidden flex flex-col transition-all duration-500",
          deviceInfo.isMobile 
            ? "h-full rounded-t-[32px] mt-20" 
            : "max-w-3xl rounded-[32px] max-h-[90vh] border"
        )}
      >
        {/* Modal Header */}
        <div className={cn(
          "border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0",
          deviceInfo.isMobile ? "p-6" : "p-8"
        )}>
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-jb-accent/20 flex items-center justify-center border border-jb-accent/30 text-jb-accent shrink-0">
                 <Sliders size={20} />
              </div>
              <div>
                 <h2 className="text-lg md:text-xl font-black text-white tracking-tight">AI Configuration</h2>
                 <p className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Laboratory Parameters</p>
              </div>
           </div>
           <button 
             onClick={() => setSettingsOpen(false)}
             className="p-2 hover:bg-white/5 rounded-xl text-slate-500 hover:text-white transition-all"
           >
              <X size={20} />
           </button>
        </div>

        <div className={cn(
          "flex-1 overflow-y-auto space-y-12 scrollbar-thin",
          deviceInfo.isMobile ? "p-6" : "p-8"
        )}>
           
           {/* Global Provider Selection */}
           <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Global System Architecture</h3>
              <div className={cn(
                "grid gap-4",
                deviceInfo.isMobile ? "grid-cols-1" : "grid-cols-3"
              )}>
                 {[
                   { id: 'cloud', label: 'Cloud Prime', icon: Cloud, desc: 'Gemini/DeepSeek' },
                   { id: 'local', label: 'Local Node', icon: Cpu, desc: 'Ollama Instance' },
                   { id: 'auto', label: 'Smart Hybrid', icon: Zap, desc: 'Router Control' },
                 ].map((p) => {
                    const active = (globalProvider || 'auto') === p.id;
                    return (
                       <button
                         key={p.id}
                         onClick={() => setGlobalProvider(p.id as any)}
                         className={cn(
                           "p-5 rounded-2xl border transition-all text-left group relative overflow-hidden",
                           active 
                             ? "bg-white/[0.04] border-white/20 shadow-xl" 
                             : "bg-transparent border-white/5 opacity-40 hover:opacity-100"
                         )}
                       >
                          {active && <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 blur-xl rounded-full -mr-4 -mt-4" />}
                          <p.icon size={20} className={cn("mb-3", active ? "text-white" : "text-slate-500")} />
                          <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1">{p.label}</h4>
                          <p className="text-[10px] text-slate-500 font-bold">{p.desc}</p>
                       </button>
                    );
                 })}
              </div>
           </div>

           {/* Mode Specific Config */}
           <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Mode Assignments</h3>
              <div className="grid grid-cols-1 gap-4">
                 {modes.map((mode) => {
                    const config = modeConfigs[mode.id] || { provider: 'auto', model: 'gemini-3-pro-preview' };
                    return (
                       <div key={mode.id} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 md:p-5 flex flex-col gap-4">
                          <div className={cn(
                            "flex items-center justify-between",
                            deviceInfo.isMobile ? "flex-col items-start gap-4" : ""
                          )}>
                             <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
                                   <mode.icon size={16} />
                                </div>
                                <span className="font-bold text-white text-sm">{mode.label}</span>
                             </div>
                             
                             <div className="flex bg-black/40 rounded-lg p-1 border border-white/5 w-full md:w-auto overflow-x-auto scrollbar-hide">
                                {['auto', 'gemini', 'deepseek', 'ollama'].map((p) => (
                                   <button
                                     key={p}
                                     onClick={() => setModeConfig(mode.id, { ...config, provider: p as any })}
                                     className={cn(
                                       "px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
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
                                      (availableModels?.gemini || ['gemini-3-pro-preview', 'gemini-3-flash-preview', 'gemini-flash-latest', 'gemini-1.5-pro']).map(m => (
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

           {/* Interface & Theme */}
           <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Interface & Theme</h3>
              <div className={cn(
                "bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex items-center justify-between",
                deviceInfo.isMobile ? "flex-col gap-6" : ""
              )}>
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-jb-pink/20 flex items-center justify-center border border-jb-pink/30 text-jb-pink shrink-0">
                       <Zap size={20} />
                    </div>
                    <div>
                       <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1">Aura Synthesis</h4>
                       <p className="text-[10px] text-slate-500 font-bold">
                          {auraMode === 'organic' ? 'Dynamic, adaptive resource scaling' : 
                           auraMode === 'static' ? 'Predictable, fixed resource allocation' : 
                           'Maximum performance / Minimum overhead'}
                       </p>
                    </div>
                 </div>
                 
                 <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                    {[
                      { id: 'off', label: 'Off' },
                      { id: 'static', label: 'Static' },
                      { id: 'organic', label: 'Organic' },
                    ].map((opt) => (
                       <button
                         key={opt.id}
                         onClick={() => setAuraMode(opt.id as any)}
                         className={cn(
                           "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                           auraMode === opt.id 
                             ? "bg-white/10 text-white shadow-xl" 
                             : "text-slate-600 hover:text-slate-400"
                         )}
                       >
                          {opt.label}
                       </button>
                    ))}
                 </div>
              </div>
           </div>

           {/* Global Parameters */}
           <div className="space-y-8 pt-4 border-t border-white/5">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Global Parameters</h3>
              <div className={cn(
                "grid gap-10",
                deviceInfo.isMobile ? "grid-cols-1" : "grid-cols-2"
              )}>
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

           {/* Billing & Limits */}
           <div className="space-y-6 pt-4 border-t border-white/5">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-1">Billing & Limits</h3>
              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center border border-green-500/30 text-green-400 shrink-0">
                       <CreditCard size={20} />
                    </div>
                    <div>
                       <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1">OpenRouter Free Tier</h4>
                       <p className="text-[10px] text-slate-500 font-bold">Limit: 20 reqs/min (Current: Free)</p>
                    </div>
                 </div>
                 
                 <a 
                   href="https://openrouter.ai/credits" 
                   target="_blank" 
                   rel="noreferrer"
                   className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition-all group"
                 >
                    <span className="text-[10px] font-black uppercase tracking-widest">Top Up</span>
                    <ArrowUpRight size={12} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                 </a>
              </div>
           </div>

        </div>

        {/* Modal Footer */}
        <div className={cn(
          "bg-white/[0.02] border-t border-white/5 flex items-center justify-between shrink-0",
          deviceInfo.isMobile ? "p-6 flex-col gap-6" : "p-8"
        )}>
           <div className="flex items-center gap-2 text-[9px] font-black text-slate-600 uppercase tracking-widest">
              <Shield size={12} />
              <span>Configuration locked to local session</span>
           </div>
           <button 
             onClick={() => setSettingsOpen(false)}
             className={cn(
               "bg-white text-black rounded-xl font-bold text-xs hover:bg-slate-200 transition-all shadow-xl",
               deviceInfo.isMobile ? "w-full py-4" : "px-8 py-3"
             )}
           >
              Synchronize
           </button>
        </div>
      </motion.div>
    </div>
  );
};
