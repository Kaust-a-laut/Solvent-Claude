import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, ShieldAlert, Code2, Briefcase, Play, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchWithRetry } from '../lib/api-client';
import { API_BASE_URL } from '../lib/config';
import { socket } from '../lib/socket';
import { useAppStore } from '../store/useAppStore';

interface AgentOpinion {
  role: string;
  opinion: string;
  status: 'pending' | 'completed';
}

type MissionStatus = 'idle' | 'queued' | 'active' | 'complete' | 'failed';

const MISSION_TEMPLATES = [
  { id: 'consultation', label: 'Consultation', description: 'PM + Engineer + Security review' },
  { id: 'refinement', label: 'Refinement', description: 'Adversarial critic + optimizer' },
];

function phaseLabel(progress: number): string {
  if (progress < 5) return 'Queued...';
  if (progress < 75) return 'Agents analyzing...';
  if (progress < 90) return 'Synthesizing consensus...';
  if (progress < 100) return 'Saving to memory...';
  return 'Complete';
}

export const CollaborateArea = () => {
  const [goal, setGoal] = useState('');
  const [missionType, setMissionType] = useState('consultation');
  const [missionStatus, setMissionStatus] = useState<MissionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [opinions, setOpinions] = useState<AgentOpinion[]>([]);
  const [synthesis, setSynthesis] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { upsertMission, addActivity } = useAppStore();

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback((id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const status = await fetchWithRetry(`${API_BASE_URL}/tasks/${id}`);
        setProgress(status.progress ?? 0);
        if (status.status === 'completed') {
          stopPolling();
          setMissionStatus('complete');
          setProgress(100);
          const result = status.result;
          if (result?.expertOpinions) setOpinions(result.expertOpinions.map((o: any) => ({ ...o, status: 'completed' })));
          if (result?.synthesis) setSynthesis(result.synthesis);
          upsertMission({ jobId: id, status: 'complete', progress: 100, result });
          addActivity({ type: 'success', message: 'Multi-agent mission completed', source: 'Collaborate' });
        } else if (status.status === 'failed') {
          stopPolling();
          setMissionStatus('failed');
          setErrorMsg(status.error || 'Mission failed');
          upsertMission({ jobId: id, status: 'failed', error: status.error });
        } else {
          setMissionStatus('active');
          upsertMission({ jobId: id, progress: status.progress ?? 0, status: 'active' });
        }
      } catch { /* non-fatal, retry next interval */ }
    }, 2500);
  }, [stopPolling, upsertMission, addActivity]);

  useEffect(() => {
    const handleProgress = ({ jobId: id, progress: p }: { jobId: string; progress: number }) => {
      if (id === jobId) { setProgress(p); setMissionStatus('active'); }
    };
    const handleComplete = ({ jobId: id, result }: { jobId: string; result: any }) => {
      if (id !== jobId) return;
      stopPolling(); setMissionStatus('complete'); setProgress(100);
      if (result?.expertOpinions) setOpinions(result.expertOpinions.map((o: any) => ({ ...o, status: 'completed' })));
      if (result?.synthesis) setSynthesis(result.synthesis);
    };
    const handleFailed = ({ jobId: id, error }: { jobId: string; error: string }) => {
      if (id !== jobId) return;
      stopPolling(); setMissionStatus('failed'); setErrorMsg(error);
    };
    socket.on('MISSION_PROGRESS', handleProgress);
    socket.on('MISSION_COMPLETE', handleComplete);
    socket.on('MISSION_FAILED', handleFailed);
    return () => {
      socket.off('MISSION_PROGRESS', handleProgress);
      socket.off('MISSION_COMPLETE', handleComplete);
      socket.off('MISSION_FAILED', handleFailed);
    };
  }, [jobId, stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const startMission = async () => {
    if (!goal.trim()) return;
    setMissionStatus('queued'); setProgress(0); setOpinions([]); setSynthesis(''); setErrorMsg(''); setJobId(null);
    try {
      const data = await fetchWithRetry(`${API_BASE_URL}/collaborate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, missionType, async: true }),
      });
      if (data.jobId) {
        const id = data.jobId;
        setJobId(id);
        upsertMission({ jobId: id, goal, missionType, status: 'queued', progress: 0 });
        addActivity({ type: 'provider', message: `Mission: ${goal.slice(0, 60)}`, source: 'Collaborate' });
        startPolling(id);
      } else if (data.expertOpinions) {
        setMissionStatus('complete'); setProgress(100);
        setOpinions(data.expertOpinions.map((o: any) => ({ ...o, status: 'completed' })));
        if (data.synthesis) setSynthesis(data.synthesis);
      }
    } catch (e: any) {
      setMissionStatus('failed');
      setErrorMsg(e.message || 'Mission failed to start');
    }
  };

  const isRunning = missionStatus === 'queued' || missionStatus === 'active';

  return (
    <div className="flex-1 flex flex-col bg-slate-950 p-6 overflow-hidden">
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg"><Users className="text-indigo-400" size={24} /></div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Agentic War Room</h2>
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Multi-Agent Orchestration Engine</p>
            </div>
          </div>
          <button
            onClick={startMission}
            disabled={isRunning || !goal.trim()}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-full transition-all shadow-lg shadow-indigo-500/20"
          >
            {isRunning ? <><Loader2 size={16} className="animate-spin" /> Running...</> : <><Play size={16} fill="currentColor" /> Launch Mission</>}
          </button>
        </div>

        {/* Input + Template Selector */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Define the engineering mission goal..."
            className="w-full bg-transparent text-slate-300 outline-none resize-none h-24 text-sm font-medium"
          />
          <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Template:</span>
            {MISSION_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => setMissionType(t.id)} title={t.description}
                className={cn('px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all',
                  missionType === t.id ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'
                )}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        {missionStatus !== 'idle' && (
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
              <div className="flex items-center gap-2">
                {missionStatus === 'complete' && <CheckCircle2 size={12} className="text-emerald-400" />}
                {missionStatus === 'failed' && <XCircle size={12} className="text-rose-400" />}
                {isRunning && <Loader2 size={12} className="animate-spin text-indigo-400" />}
                <span className={cn(missionStatus === 'complete' ? 'text-emerald-400' : missionStatus === 'failed' ? 'text-rose-400' : 'text-slate-400')}>
                  {missionStatus === 'failed' ? errorMsg : phaseLabel(progress)}
                </span>
              </div>
              <span className="text-slate-600">{progress}%</span>
            </div>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-500',
                missionStatus === 'complete' ? 'bg-emerald-500' : missionStatus === 'failed' ? 'bg-rose-500' : 'bg-indigo-500'
              )} style={{ width: `${progress}%` }} />
            </div>
            {jobId && <p className="text-[9px] text-slate-700 font-mono">JOB {jobId.slice(0, 20)}...</p>}
          </div>
        )}

        {/* Consensus Synthesis */}
        {synthesis && (
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-xl p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-2">Consensus Synthesis</p>
            <p className="text-xs text-slate-300 leading-relaxed">{synthesis}</p>
          </div>
        )}

        {/* Agent Opinion Cards */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto pr-2 no-scrollbar">
          {opinions.map((op, i) => (
            <div key={i} className={cn('p-4 rounded-2xl border flex flex-col space-y-3 transition-all duration-500',
              op.status === 'pending' ? 'bg-slate-900/50 border-slate-800 animate-pulse' : 'bg-slate-900 border-slate-800 shadow-lg'
            )}>
              <div className="flex items-center gap-2">
                {op.role === 'pm' && <Briefcase size={16} className="text-blue-400" />}
                {op.role === 'engineer' && <Code2 size={16} className="text-indigo-400" />}
                {op.role === 'security' && <ShieldAlert size={16} className="text-red-400" />}
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {op.role === 'pm' ? 'Product Manager' : op.role === 'engineer' ? 'Lead Engineer' : op.role === 'security' ? 'Security Auditor' : op.role}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-slate-300 leading-relaxed font-mono">{op.opinion}</p>
              </div>
              {op.status === 'completed' && (
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center gap-2 text-[10px] text-emerald-500 font-bold">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> REVIEW COMPLETED
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
