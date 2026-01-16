import React, { useEffect, useState } from 'react';
import { FlaskConical, Wifi, AlertTriangle, Cloud, Cpu, Zap, Activity, BarChart3 } from 'lucide-react';
import { API_BASE_URL } from '../lib/config';
import { fetchWithRetry } from '../lib/api-client';
import { useAppStore } from '../store/useAppStore';

interface ServiceStatus {
  ollama: 'online' | 'offline' | 'unknown';
  gemini: 'configured' | 'missing_key' | 'unknown';
  search: 'configured' | 'missing_key' | 'unknown';
}

export const SystemStatus = () => {
  const { setSettingsOpen } = useAppStore();
  const [status, setStatus] = useState<ServiceStatus>({
    ollama: 'unknown',
    gemini: 'unknown',
    search: 'unknown'
  });
  const [overall, setOverall] = useState<'healthy' | 'degraded'>('healthy');
  
  // Model Awareness State
  const [modelStatus, setModelStatus] = useState({ status: 'primary', model: 'Cloud' });
  const [usage, setUsage] = useState({ tokens: 0, cost: 0, requests: 0 });

  const checkHealth = async () => {
    try {
      const data = await fetchWithRetry(`${API_BASE_URL}/health/services`, { retries: 1 });
      setStatus(data.services);
      setOverall(data.status);
    } catch (e) {
      setOverall('degraded');
      setStatus({ ollama: 'offline', gemini: 'unknown', search: 'unknown' });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    
    // Model Manager Integration
    if (window.electron?.model) {
       window.electron.model.getUsage().then(setUsage);
       const unsub = window.electron.model.onStatusChange((s) => setModelStatus(s));
       
       const usageInterval = setInterval(() => {
          window.electron?.model.getUsage().then(setUsage);
       }, 5000);
       
       return () => {
         clearInterval(interval);
         clearInterval(usageInterval);
         unsub();
       };
    }
    
    return () => clearInterval(interval);
  }, []);

  const StatusDot = ({ status }: { status: string }) => {
    const color = status === 'online' || status === 'configured' ? 'bg-green-500' : 'bg-red-500';
    return (
      <div className={`w-1.5 h-1.5 rounded-full ${color} shadow-[0_0_10px_rgba(34,197,94,0.6)] ${status === 'online' ? 'animate-pulse' : ''}`} />
    );
  };

  // Determine Signal Visuals
  const isFallback = modelStatus.status === 'fallback';
  const isLocal = modelStatus.model.toLowerCase().includes('ollama') || modelStatus.model.toLowerCase().includes('local');
  
  const SignalIcon = isFallback ? Zap : (isLocal ? Cpu : Cloud);
  const signalColor = isFallback ? 'text-yellow-400' : (isLocal ? 'text-green-400' : 'text-blue-400');
  const signalText = isFallback ? 'Failover Active' : (isLocal ? 'Local Neural' : 'Cloud Prime');

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-[24px] p-5 backdrop-blur-md relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      {/* Model Awareness Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <SignalIcon size={14} className={`${signalColor} drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-white uppercase tracking-widest">{signalText}</span>
             <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{isFallback ? 'Recovering...' : 'Optimal'}</span>
          </div>
        </div>
        <div className={`w-2 h-2 rounded-full ${isFallback ? 'bg-yellow-400 animate-ping' : (overall === 'healthy' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]' : 'bg-red-500')}`} />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Ollama</span>
            <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-black uppercase tracking-wider ${status.ollama === 'online' ? 'text-jb-orange' : 'text-red-400'}`}>
                    {status.ollama === 'online' ? 'Online' : 'Offline'}
                </span>
                <StatusDot status={status.ollama} />
            </div>
        </div>
        
        {/* Gemini Status - Clickable if Missing Key */}
        <div className="flex items-center justify-between group/item">
            <span className="text-[11px] font-bold text-slate-400">Gemini</span>
            <div className="flex items-center gap-1.5">
                {status.gemini === 'missing_key' ? (
                  <button 
                    onClick={() => setSettingsOpen(true)}
                    className="text-[10px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 hover:underline decoration-red-400/50 underline-offset-2 transition-all cursor-pointer flex items-center gap-1"
                  >
                    Missing Key
                  </button>
                ) : (
                  <span className={`text-[10px] font-black uppercase tracking-wider ${status.gemini === 'configured' ? 'text-jb-accent' : 'text-red-400'}`}>
                      {status.gemini === 'configured' ? 'Ready' : 'Error'}
                  </span>
                )}
                <StatusDot status={status.gemini} />
            </div>
        </div>
      </div>

      {/* Usage Monitor */}
      <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
         <div className="flex justify-between items-center text-[10px]">
            <div className="flex items-center gap-1.5 text-slate-400">
               <BarChart3 size={10} />
               <span className="font-bold">Daily Usage</span>
            </div>
            <span className="font-mono text-jb-accent">{usage.requests} / 50</span>
         </div>
         <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div 
               className={`h-full ${usage.requests > 40 ? 'bg-red-500' : 'bg-gradient-to-r from-jb-accent to-jb-purple'}`}
               style={{ width: `${Math.min((usage.requests / 50) * 100, 100)}%` }} 
            />
         </div>
         <div className="flex justify-between text-[8px] text-slate-600 font-bold uppercase tracking-wider">
            <span>{usage.tokens.toLocaleString()} toks</span>
            <span>${usage.cost.toFixed(4)}</span>
         </div>
      </div>
    </div>
  );
};
