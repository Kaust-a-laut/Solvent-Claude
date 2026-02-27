import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Cpu, Cloud, Zap, Shield, Sliders, ChevronDown,
  MessageSquare, ScanEye, Brain, Globe, FlaskConical,
  CreditCard, ArrowUpRight, Key, Eye, EyeOff,
  Terminal, Sparkles, Code, GitCompare, Swords, Users,
  RefreshCw, CheckCircle2, AlertCircle, Database, Settings,
  HardDrive, Cog, Wrench, Network
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { API_BASE_URL } from '../lib/config';
import { cn } from '../lib/utils';
import { fetchWithRetry } from '../lib/api-client';
import { SettingsService } from '../services/SettingsService';

export const SettingsModal = () => {
  const {
    settingsOpen, setSettingsOpen,
    modeConfigs, setModeConfig,
    temperature, setTemperature,
    maxTokens, setMaxTokens,
    globalProvider, setGlobalProvider,
    deviceInfo,
    auraMode, setAuraMode,
    apiKeys, setApiKey,
    selectedCloudModel, setSelectedCloudModel,
    selectedLocalModel, setSelectedLocalModel,
    selectedCloudProvider, setSelectedCloudProvider,
    imageProvider, setImageProvider,
    localImageUrl, setLocalImageUrl,
    availableProviders, setAvailableProviders,
    providerConfigs, setProviderConfigs,
    updateProviderConfig
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'engine' | 'dynamics' | 'security' | 'intelligence' | 'providers' | 'routing'>('engine');
  const [availableModels, setAvailableModels] = useState<{
    ollama: any[], gemini: string[], deepseek: string[], groq: string[], openrouter: string[], puter: string[]
  }>({
    ollama: [],
    gemini: [],
    deepseek: [],
    groq: [],
    openrouter: [],
    puter: ['deepseek-chat', 'deepseek-coder', 'claude-3-5-sonnet', 'gpt-4o']
  });

  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [validationStatus, setValidationStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [errorLog, setErrorLog] = useState<string[]>([]);
  const [expandedProviders, setExpandedProviders] = useState<Record<string, boolean>>({});

  const logError = useCallback((msg: string) => {
    console.error(`[Settings] ${msg}`);
    setErrorLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
  }, []);

  const [serviceHealth, setServiceHealth] = useState<{ ollama: 'connected' | 'disconnected', timestamp?: string }>({ ollama: 'disconnected' });

  useEffect(() => {
    if (settingsOpen) {
      const checkHealth = async () => {
        try {
          const health = await fetchWithRetry(`${API_BASE_URL}/health/services`);
          setServiceHealth(health);
        } catch (e) {
          setServiceHealth({ ollama: 'disconnected' });
        }
      };
      checkHealth();
      const interval = setInterval(checkHealth, 10000);
      return () => clearInterval(interval);
    }
  }, [settingsOpen]);

  const toggleKeyVisibility = (providerId: string) => {
    setShowKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const fetchModels = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchWithRetry(`${API_BASE_URL}/models`);
      setAvailableModels(prev => ({
        ...prev,
        ollama: data.ollama || [],
        gemini: data.gemini || [],
        deepseek: data.deepseek || [],
        groq: data.groq || [],
        openrouter: data.openrouter || []
      }));
    } catch (err: any) {
      logError(`Model fetch failed: ${err.message}`);
    } finally {
      setIsRefreshing(false);
    }
  }, [logError]);

  // Load provider configurations when settings open
  useEffect(() => {
    if (settingsOpen) {
      fetchModels();
      
      // Load provider configurations from backend
      const loadProviderConfigs = async () => {
        try {
          const settings = await SettingsService.getSettings();
          setProviderConfigs(settings.providers);
          
          const providers = await SettingsService.getAvailableProviders();
          setAvailableProviders(providers);
        } catch (error) {
          logError(`Failed to load provider configs: ${error}`);
        }
      };
      
      loadProviderConfigs();
    }
  }, [settingsOpen, fetchModels, setProviderConfigs, setAvailableProviders, logError]);

  if (!settingsOpen) return null;

  const detectProvider = (model: string): string => {
    if (!model || model === 'auto') return 'auto';
    const m = model.toLowerCase();

    // Exact matches first from available models
    if (availableModels.puter.includes(model)) return 'puter';
    if (availableModels.groq.includes(model)) return 'groq';
    if (availableModels.deepseek.includes(model)) return 'deepseek';
    if (availableModels.gemini.includes(model)) return 'gemini';
    if (availableModels.openrouter.includes(model)) return 'openrouter';
    if (availableModels.ollama.some(opt => (opt.name || opt) === model)) return 'ollama';

    // Heuristics for unknown but likely models
    if (m.includes('llama') || m.includes('gemma2') || m.includes('groq/')) return 'groq';
    if (m.includes('deepseek')) return 'deepseek';
    if (m.includes('/') || m.includes(':free')) return 'openrouter';
    if (m.includes('gemini')) return 'gemini';

    return 'gemini';
  };

  const handleGlobalCloudModelChange = (model: string) => {
    setSelectedCloudModel(model);
    const provider = detectProvider(model);
    setSelectedCloudProvider(provider as any);
  };

  const handleModeModelChange = (modeId: string, model: string) => {
    const provider = detectProvider(model);
    setModeConfig(modeId, { provider, model: model === 'auto' ? selectedCloudModel : model });
  };

  const validateKey = async (provider: string) => {
    const key = apiKeys[provider];
    if (!key) return;
    setValidationStatus(prev => ({ ...prev, [provider]: 'loading' }));
    try {
      await fetchWithRetry(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model: 'ping', messages: [{ role: 'user', content: 'hi' }], apiKeys: { [provider]: key }, maxTokens: 1 })
      });
      setValidationStatus(prev => ({ ...prev, [provider]: 'success' }));
    } catch (err: any) {
      setValidationStatus(prev => ({ ...prev, [provider]: 'error' }));
    }
  };

  const updateProviderApiKey = async (providerId: string, apiKey: string) => {
    try {
      // Update the provider config in the store
      updateProviderConfig(providerId, { apiKey });
      
      // Also update the apiKeys store for compatibility
      setApiKey(providerId, apiKey);
      
      // Validate the key
      const validation = await SettingsService.validateProviderApiKey(providerId, apiKey);
      if (validation.valid) {
        setValidationStatus(prev => ({ ...prev, [providerId]: 'success' }));
      } else {
        setValidationStatus(prev => ({ ...prev, [providerId]: 'error' }));
      }
    } catch (error) {
      logError(`Failed to update provider ${providerId} config: ${error}`);
      setValidationStatus(prev => ({ ...prev, [providerId]: 'error' }));
    }
  };

  const toggleProvider = async (providerId: string, enabled: boolean) => {
    try {
      await SettingsService.updateProviderConfig(providerId, { enabled });
      updateProviderConfig(providerId, { enabled });
    } catch (error) {
      logError(`Failed to toggle provider ${providerId}: ${error}`);
    }
  };

  const toggleProviderSection = (providerId: string) => {
    setExpandedProviders(prev => ({
      ...prev,
      [providerId]: !prev[providerId]
    }));
  };

  const TabButton = ({ id, label, icon: Icon }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
        activeTab === id ? "bg-white/5 text-white shadow-xl" : "text-slate-500 hover:text-slate-300"
      )}
    >
      <Icon size={16} className={cn(activeTab === id ? "text-jb-accent" : "text-slate-600")} />
      <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
      {activeTab === id && <motion.div layoutId="tabGlow" className="ml-auto w-1 h-1 rounded-full bg-jb-accent shadow-[0_0_10px_rgba(60,113,247,1)]" />}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSettingsOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="w-full max-w-5xl h-[80vh] bg-[#050508] border border-white/5 rounded-[40px] shadow-2xl relative overflow-hidden flex"
      >
        {/* Left Navigation */}
        <div className="w-64 border-r border-white/5 bg-white/[0.01] p-8 flex flex-col gap-8">
           <div className="flex flex-col gap-1 px-2">
              <h2 className="text-xl font-black text-white tracking-tighter italic">SYNT_CORE</h2>
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.4em]">Engine Overrides</p>
           </div>

           <nav className="flex flex-col gap-2">
              <TabButton id="providers" label="Provider Hub" icon={Network} />
              <TabButton id="routing" label="Smart Routing" icon={Zap} />
              <TabButton id="intelligence" label="Project Memory" icon={Brain} />
              <TabButton id="dynamics" label="Core Dynamics" icon={Zap} />
              <TabButton id="security" label="Security & Privacy" icon={Shield} />
           </nav>

           <div className="mt-auto bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">System Status</span>
                <div className="flex items-center gap-1.5">
                   <span className="relative flex h-2 w-2">
                     <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", serviceHealth.ollama === 'connected' ? "bg-emerald-400" : "bg-rose-500")}></span>
                     <span className={cn("relative inline-flex rounded-full h-2 w-2", serviceHealth.ollama === 'connected' ? "bg-emerald-500" : "bg-rose-600")}></span>
                   </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                   <span className="text-[9px] font-bold text-slate-400">Local Node (Ollama)</span>
                   <span className={cn("text-[9px] font-black uppercase tracking-widest", serviceHealth.ollama === 'connected' ? "text-emerald-400" : "text-rose-400")}>
                      {serviceHealth.ollama === 'connected' ? 'Online' : 'Offline'}
                   </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                   <span className="text-[9px] font-bold text-slate-400">Cloud Uplink</span>
                   <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">Active</span>
                </div>
              </div>
           </div>
        </div>

        {/* Right Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
           <header className="p-8 pb-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex flex-col">
                 <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">
                    {activeTab === 'providers' ? 'Provider Configuration Hub' :
                     activeTab === 'routing' ? 'Smart Routing Configuration' :
                     activeTab === 'intelligence' ? 'Recursive Knowledge Index' :
                     activeTab === 'dynamics' ? 'System Fluidity & Aura' : 'Security & Privacy Controls'}
                 </h3>
                 <p className="text-[10px] font-bold text-slate-500 mt-1">Adjusting real-time inference parameters</p>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="p-2 hover:bg-white/5 rounded-full text-slate-500 hover:text-white transition-all"><X size={20} /></button>
           </header>

           <div className="flex-1 overflow-y-auto p-10 scrollbar-thin scroll-smooth focusable-container" tabIndex={0}>
              {activeTab === 'providers' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                  <h4 className="text-[10px] font-black text-jb-accent uppercase tracking-[0.4em]">Provider Configuration</h4>

                  <div className="space-y-4">
                    {availableProviders.map((provider: any) => {
                      const config = providerConfigs[provider.id] || { enabled: true };
                      const isExpanded = expandedProviders[provider.id] || false;

                      return (
                        <div key={provider.id} className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden">
                          <div
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                            onClick={() => toggleProviderSection(provider.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${provider.isReady ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              <div>
                                <h5 className="font-black text-white text-sm">{provider.name}</h5>
                                <p className="text-[9px] text-slate-500 font-bold">{provider.description}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="flex items-center">
                                <span className="text-[8px] font-black text-slate-500 uppercase mr-2">STATUS</span>
                                <span className={cn(
                                  "text-[8px] font-black uppercase tracking-widest",
                                  provider.isReady ? "text-emerald-400" : "text-rose-400"
                                )}>
                                  {provider.isReady ? 'READY' : 'UNAVAILABLE'}
                                </span>
                              </div>

                              <button
                                className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleProvider(provider.id, !config.enabled);
                                }}
                              >
                                <div className={`w-8 h-4 rounded-full p-0.5 transition-colors ${config.enabled ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                                  <div className={`bg-white w-3 h-3 rounded-full transition-transform ${config.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                              </button>

                              <ChevronDown
                                size={16}
                                className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              />
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                    {provider.id.toUpperCase()} API KEY
                                  </label>
                                  <div className="flex gap-2">
                                    <input
                                      type={showKeys[provider.id] ? "text" : "password"}
                                      value={apiKeys[provider.id] || config.apiKey || ''}
                                      onChange={(e) => updateProviderApiKey(provider.id, e.target.value)}
                                      placeholder="Enter API Key..."
                                      className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-2 text-xs font-mono text-indigo-400 outline-none focus:border-indigo-500/50 transition-all"
                                    />
                                    <button
                                      onClick={() => toggleKeyVisibility(provider.id)}
                                      className="px-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all"
                                    >
                                      {showKeys[provider.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                                    </button>
                                    <button
                                      onClick={() => validateKey(provider.id)}
                                      className="px-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center"
                                    >
                                      {validationStatus[provider.id] === 'loading' ? (
                                        <RefreshCw size={12} className="animate-spin" />
                                      ) : validationStatus[provider.id] === 'success' ? (
                                        <CheckCircle2 size={12} className="text-emerald-500" />
                                      ) : validationStatus[provider.id] === 'error' ? (
                                        <AlertCircle size={12} className="text-rose-500" />
                                      ) : (
                                        <span>TEST</span>
                                      )}
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                                    DEFAULT MODEL
                                  </label>
                                  <select
                                    value={config.defaultModel || provider.defaultModel || ''}
                                    onChange={(e) => updateProviderConfig(provider.id, { defaultModel: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-2 text-xs font-mono text-slate-300 outline-none focus:border-indigo-500/50 transition-all"
                                  >
                                    <option value="">Select default model...</option>
                                    {provider.id === 'ollama' && availableModels.ollama.map((model: any) => (
                                      <option key={model.name || model} value={model.name || model}>
                                        {model.name || model}
                                      </option>
                                    ))}
                                    {provider.id === 'gemini' && availableModels.gemini.map((model: string) => (
                                      <option key={model} value={model}>{model}</option>
                                    ))}
                                    {provider.id === 'groq' && availableModels.groq.map((model: string) => (
                                      <option key={model} value={model}>{model}</option>
                                    ))}
                                    {provider.id === 'openrouter' && availableModels.openrouter.map((model: string) => (
                                      <option key={model} value={model}>{model}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="mt-4 pt-4 border-t border-white/5">
                                <h6 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">CAPABILITIES</h6>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[8px]">
                                  <div className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${provider.capabilities?.supportsVision ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                    <span className="text-slate-500">Vision</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${provider.capabilities?.supportsStreaming ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                    <span className="text-slate-500">Streaming</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${provider.capabilities?.supportsFunctionCalling ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                    <span className="text-slate-500">Functions</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <div className={`w-2 h-2 rounded-full ${provider.capabilities?.contextWindow ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                                    <span className="text-slate-500">Context: {provider.capabilities?.contextWindow || 0}t</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === 'routing' && (
                 <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                    <section className="space-y-6">
                       <h4 className="text-[10px] font-black text-jb-accent uppercase tracking-[0.4em]">Global Routing</h4>
                       <div className="grid grid-cols-3 gap-4">
                          {[
                            { id: 'cloud', label: 'Cloud Prime', desc: 'Gemini / Groq / Puter' },
                            { id: 'local', label: 'Local Node', desc: 'Private Ollama' },
                            { id: 'auto', label: 'Smart Hybrid', desc: 'Auto Router' }
                          ].map(p => (
                             <button
                                key={p.id}
                                onClick={() => setGlobalProvider(p.id as any)}
                                className={cn(
                                  "p-6 rounded-3xl border text-left transition-all relative overflow-hidden group",
                                  globalProvider === p.id ? "bg-white/[0.04] border-white/20" : "bg-transparent border-white/5 opacity-40 hover:opacity-100"
                                )}
                             >
                                <span className="text-xs font-black text-white uppercase block mb-1">{p.label}</span>
                                <span className="text-[9px] text-slate-500 font-bold">{p.desc}</span>
                                {globalProvider === p.id && <div className="absolute top-0 right-0 w-16 h-16 bg-jb-accent/10 blur-2xl rounded-full" />}
                             </button>
                          ))}
                       </div>
                    </section>

                    <section className="space-y-6">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Visual Synthesis Engine</h4>
                       <div className="grid grid-cols-2 gap-4">
                          {[
                            { id: 'gemini', label: 'Gemini Imagen', desc: 'Imagen 3.0 High-Fidelity' },
                            { id: 'huggingface', label: 'Hugging Face', desc: 'Free SDXL / No Watermark' },
                            { id: 'local', label: 'Local SDXL', desc: 'Juggernaut XL / Local Node' },
                            { id: 'pollinations', label: 'Pollinations', desc: 'Open-Source Fallback' }
                          ].map(p => (
                             <button
                                key={p.id}
                                onClick={() => setImageProvider(p.id as any)}
                                className={cn(
                                  "p-5 rounded-3xl border text-left transition-all relative overflow-hidden group",
                                  imageProvider === p.id ? "bg-white/[0.04] border-white/20 shadow-lg" : "bg-transparent border-white/5 opacity-40 hover:opacity-100"
                                )}
                             >
                                <span className="text-[10px] font-black text-white uppercase block mb-1">{p.label}</span>
                                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">{p.desc}</span>
                                                             </button>
                                                          ))}
                                                       </div>

                                                       {imageProvider === 'local' && (
                                                          <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                             <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                                                                <Globe size={16} className="text-slate-500" />
                                                                <div className="flex-1">
                                                                   <label className="text-[8px] font-black text-slate-600 uppercase tracking-widest block mb-1">Local Node Endpoint</label>
                                                                   <input
                                                                      type="text"
                                                                      value={localImageUrl}
                                                                      onChange={(e) => setLocalImageUrl(e.target.value)}
                                                                      placeholder="http://127.0.0.1:7860/sdapi/v1/txt2img"
                                                                      className="w-full bg-transparent border-none outline-none text-[11px] font-mono text-indigo-400 placeholder:text-slate-700"
                                                                   />
                                                                </div>
                                                                <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/5 text-[8px] font-black text-slate-500 uppercase">A1111 / WebUI</div>
                                                             </div>
                                                          </div>
                                                       )}
                                                    </section>
                    <section className="space-y-6">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Default Engine Tiers</h4>
                       <div className="grid grid-cols-2 gap-6">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Cloud Powerhouse</label>
                             <select value={selectedCloudModel} onChange={e => handleGlobalCloudModelChange(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 text-xs font-bold text-slate-300 outline-none hover:border-white/20 transition-all cursor-pointer">
                                <optgroup label="Puter.js (Free)" className="bg-[#050508]">
                                   {availableModels.puter.map(m => <option key={m} value={m}>{m}</option>)}
                                </optgroup>
                                <optgroup label="Google Gemini" className="bg-[#050508]">
                                   {availableModels.gemini.map(m => <option key={m} value={m}>{m}</option>)}
                                </optgroup>
                                <optgroup label="Groq LPU" className="bg-[#050508]">
                                   {availableModels.groq.map(m => <option key={m} value={m}>{m}</option>)}
                                </optgroup>
                             </select>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Local Intelligence</label>
                             <select value={selectedLocalModel} onChange={e => setSelectedLocalModel(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3 text-xs font-bold text-slate-300 outline-none hover:border-white/20 transition-all cursor-pointer">
                                {availableModels.ollama.map((m: any) => <option key={m.name || m} value={m.name || m}>{m.name || m}</option>)}
                             </select>
                          </div>
                       </div>
                    </section>

                    <section className="space-y-6">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Smart Routing Configuration</h4>
                       <div className="space-y-4">
                          {Object.keys(modeConfigs).map(modeId => (
                             <div key={modeId} className="bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                                <h5 className="text-xs font-black text-white uppercase tracking-wider mb-3">{modeId} Mode</h5>
                                <div className="grid grid-cols-2 gap-4">
                                   <div>
                                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Provider</label>
                                      <select
                                         value={modeConfigs[modeId]?.provider || 'auto'}
                                         onChange={e => handleModeModelChange(modeId, e.target.value)}
                                         className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-xs font-mono text-slate-300 outline-none focus:border-indigo-500/50 transition-all"
                                      >
                                         <option value="auto">Auto Select</option>
                                         <option value="gemini">Google Gemini</option>
                                         <option value="groq">Groq</option>
                                         <option value="ollama">Local Ollama</option>
                                         <option value="openrouter">OpenRouter</option>
                                         <option value="puter">Puter.js</option>
                                      </select>
                                   </div>
                                   <div>
                                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">Model</label>
                                      <select
                                         value={modeConfigs[modeId]?.model || selectedCloudModel}
                                         onChange={e => handleModeModelChange(modeId, e.target.value)}
                                         className="w-full bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-xs font-mono text-slate-300 outline-none focus:border-indigo-500/50 transition-all"
                                      >
                                         <option value="auto">Default</option>
                                         {availableModels.gemini.map(m => <option key={m} value={m}>{m}</option>)}
                                         {availableModels.groq.map(m => <option key={m} value={m}>{m}</option>)}
                                         {availableModels.ollama.map((m: any) => <option key={m.name || m} value={m.name || m}>{m.name || m}</option>)}
                                      </select>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                    </section>
                 </div>
              )}

              {activeTab === 'intelligence' && (
                 <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="bg-jb-purple/5 border border-jb-purple/20 rounded-[32px] p-8 flex items-center justify-between">
                       <div className="flex gap-6 items-center">
                          <div className="w-16 h-16 rounded-2xl bg-jb-purple/20 flex items-center justify-center border border-jb-purple/30 text-jb-purple shadow-[0_0_30px_rgba(157,91,210,0.2)]">
                             <Database size={32} />
                          </div>
                          <div>
                             <h4 className="text-lg font-black text-white tracking-tight">Project Memory Resync</h4>
                             <p className="text-xs text-slate-500 font-bold max-w-xs leading-relaxed">Recursively index your local workspace to enable 'Solver Memory' across all agents.</p>
                          </div>
                       </div>
                       <button
                         onClick={async () => {
                           await fetchWithRetry(`${API_BASE_URL}/index`, { method: 'POST' });
                           alert('Neural Indexing sequence initiated.');
                         }}
                         className="px-8 py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                       >
                          Initiate Scan
                       </button>
                    </div>
                 </div>
              )}

              {activeTab === 'dynamics' && (
                 <div className="space-y-12 animate-in fade-in slide-in-from-right-4 duration-500">
                    <section className="space-y-8">
                       <div className="flex justify-between items-end">
                          <div>
                             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Inference Creativity</h4>
                             <p className="text-[9px] text-slate-600 font-bold mt-1">Adjusts the 'Temperature' of neural responses</p>
                          </div>
                          <span className="text-lg font-mono text-jb-accent">{temperature}</span>
                       </div>
                       <input type="range" min="0" max="1" step="0.1" value={temperature} onChange={e => setTemperature(parseFloat(e.target.value))} className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-jb-accent" />
                    </section>

                    <section className="space-y-8">
                       <div className="flex justify-between items-end">
                          <div>
                             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Signal Context Window</h4>
                             <p className="text-[9px] text-slate-600 font-bold mt-1">Maximum token allocation per request</p>
                          </div>
                          <span className="text-lg font-mono text-jb-purple">{maxTokens}</span>
                       </div>
                       <input type="range" min="512" max="16384" step="512" value={maxTokens} onChange={e => setMaxTokens(parseInt(e.target.value))} className="w-full h-1.5 bg-white/5 rounded-lg appearance-none cursor-pointer accent-jb-purple" />
                    </section>

                    <section className="space-y-6 pt-6 border-t border-white/5">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Environmental Aura</h4>
                       <div className="flex gap-4">
                          {[
                            { id: 'off', label: 'Minimalist', desc: 'Deep Black' },
                            { id: 'static', label: 'Static', desc: 'Predictable' },
                            { id: 'organic', label: 'Organic', desc: 'Dynamic Fluid' }
                          ].map(mode => (
                             <button
                                key={mode.id}
                                onClick={() => setAuraMode(mode.id as any)}
                                className={cn(
                                  "flex-1 p-5 rounded-2xl border text-left transition-all relative overflow-hidden group",
                                  auraMode === mode.id ? "bg-white/[0.04] border-white/20 shadow-lg" : "bg-transparent border-white/5 opacity-40 hover:opacity-100"
                                )}
                             >
                                <span className="text-[11px] font-black text-white uppercase block mb-1 tracking-wider">{mode.label}</span>
                                <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{mode.desc}</span>
                                {auraMode === mode.id && <div className="absolute top-0 right-0 w-8 h-8 bg-jb-accent/10 blur-xl rounded-full" />}
                             </button>
                          ))}
                       </div>
                    </section>
                 </div>
              )}

              {activeTab === 'security' && (
                 <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                    <section className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Privacy Controls</h4>
                       <div className="space-y-3">
                          <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                             <div>
                                <span className="text-sm font-black text-white">Data Encryption</span>
                                <p className="text-[9px] text-slate-500 font-bold">Encrypt all conversations locally</p>
                             </div>
                             <div className="w-10 h-5 bg-emerald-500 rounded-full p-0.5 flex items-center">
                                <div className="bg-white w-4 h-4 rounded-full" />
                             </div>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                             <div>
                                <span className="text-sm font-black text-white">Telemetry</span>
                                <p className="text-[9px] text-slate-500 font-bold">Send anonymous usage data</p>
                             </div>
                             <div className="w-10 h-5 bg-slate-700 rounded-full p-0.5 flex items-center">
                                <div className="bg-white w-4 h-4 rounded-full translate-x-0" />
                             </div>
                          </div>
                          <div className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                             <div>
                                <span className="text-sm font-black text-white">Local Processing</span>
                                <p className="text-[9px] text-slate-500 font-bold">Prioritize local models</p>
                             </div>
                             <div className="w-10 h-5 bg-emerald-500 rounded-full p-0.5 flex items-center">
                                <div className="bg-white w-4 h-4 rounded-full translate-x-5" />
                             </div>
                          </div>
                       </div>
                    </section>

                    <section className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">API Security</h4>
                       <div className="space-y-4">
                          {['gemini', 'groq', 'openrouter', 'huggingface'].map(provider => (
                             <div key={provider} className="bg-white/[0.02] border border-white/5 rounded-3xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{provider} ACCESS_KEY</span>
                                   <button onClick={() => toggleKeyVisibility(provider)} className="text-slate-600 hover:text-white transition-colors">{showKeys[provider] ? <EyeOff size={14} /> : <Eye size={14} />}</button>
                                </div>
                                <div className="flex gap-2">
                                   <input type={showKeys[provider] ? "text" : "password"} value={apiKeys[provider] || ''} onChange={e => setApiKey(provider, e.target.value)} placeholder="Enter API Key..." className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-3 py-2 text-xs font-mono text-indigo-400 outline-none focus:border-indigo-500/50 transition-all" />
                                   <button onClick={() => validateKey(provider)} className="px-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all">Test</button>
                                </div>
                             </div>
                          ))}
                       </div>
                    </section>
                 </div>
              )}
           </div>

           <footer className="p-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
              <div className="flex items-center gap-2">
                 <Shield size={14} className="text-slate-700" />
                 <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">Protocol Protected - Local Session Only</span>
              </div>
              <button
                onClick={async () => {
                  // Save settings to backend
                  try {
                    await SettingsService.updateSettings({
                      providers: providerConfigs,
                      temperature,
                      maxTokens,
                      imageProvider,
                      globalProvider,
                      defaultProvider: selectedCloudProvider
                    });
                    alert('Settings saved successfully!');
                  } catch (error) {
                    logError(`Failed to save settings: ${error}`);
                    alert('Failed to save settings. Please check the console for details.');
                  }
                }}
                className="px-10 py-3 bg-white text-black rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all shadow-2xl"
              >
                 Synchronize
              </button>
           </footer>
        </div>
      </motion.div>
    </div>
  );
};