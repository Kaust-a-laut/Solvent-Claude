import React, { useEffect, useState } from 'react';
import { FlaskConical, Wifi, AlertTriangle } from 'lucide-react';
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
    return () => clearInterval(interval);
  }, []);

  const StatusDot = ({ status }: { status: string }) => {
    const color = status === 'online' || status === 'configured' ? 'bg-green-500' : 'bg-red-500';
    return (
      <div className={`w-1.5 h-1.5 rounded-full ${color} shadow-[0_0_10px_rgba(34,197,94,0.6)] ${status === 'online' ? 'animate-pulse' : ''}`} />
    );
  };

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-[24px] p-5 backdrop-blur-md relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {overall === 'healthy' ? (
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
          ) : (
             <AlertTriangle size={12} className="text-red-500" />
          )}
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">System Status</span>
        </div>
        <Wifi size={10} className="text-slate-600" />
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

        <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400">Search</span>
            <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-black uppercase tracking-wider ${status.search === 'configured' ? 'text-jb-purple' : 'text-red-400'}`}>
                    {status.search === 'configured' ? 'Active' : 'Disabled'}
                </span>
                <StatusDot status={status.search} />
            </div>
        </div>
      </div>
    </div>
  );
};
