import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, ShieldAlert, Code2, Briefcase, Play, Loader2,
  CheckCircle2, XCircle, RotateCcw, Swords, Zap, GitMerge,
  Search, BarChart2, AlertTriangle, Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { fetchWithRetry } from '../lib/api-client';
import { API_BASE_URL } from '../lib/config';
import { socket } from '../lib/socket';
import { useAppStore } from '../store/useAppStore';
import { AgentCard } from './collaborate/AgentCard';
import type { AgentConfig, AgentOpinion } from './collaborate/AgentCard';
import { ActivityLog } from './collaborate/ActivityLog';
import type { ActivityEntry } from './collaborate/ActivityLog';
import { MissionHistory } from './collaborate/MissionHistory';
import { AnalysisPanel } from './collaborate/AnalysisPanel';
import type { AnalysisStatus } from './collaborate/AnalysisPanel';

// ─── Types ──────────────────────────────────────────────────────────────────────

type MissionStatus = 'idle' | 'queued' | 'active' | 'complete' | 'failed';

// ─── Agent configs ───────────────────────────────────────────────────────────────

const AGENT_CONFIGS: Record<string, AgentConfig[]> = {
  consultation: [
    {
      role: 'pm', displayName: 'PRODUCT MANAGER', icon: Briefcase,
      color: 'jb-purple', borderColor: 'border-jb-purple',
      bgColor: 'bg-jb-purple/10', textColor: 'text-jb-purple',
      glowRgba: 'rgba(157,91,210,0.25)', borderRgba: 'rgba(157,91,210,',
    },
    {
      role: 'engineer', displayName: 'LEAD ENGINEER', icon: Code2,
      color: 'jb-accent', borderColor: 'border-jb-accent',
      bgColor: 'bg-jb-accent/10', textColor: 'text-jb-accent',
      glowRgba: 'rgba(60,113,247,0.25)', borderRgba: 'rgba(60,113,247,',
    },
    {
      role: 'security', displayName: 'SECURITY AUDITOR', icon: ShieldAlert,
      color: 'jb-orange', borderColor: 'border-jb-orange',
      bgColor: 'bg-jb-orange/10', textColor: 'text-jb-orange',
      glowRgba: 'rgba(251,146,60,0.25)', borderRgba: 'rgba(251,146,60,',
    },
  ],
  refinement: [
    {
      role: 'critic', displayName: 'ADVERSARIAL CRITIC', icon: Swords,
      color: 'jb-orange', borderColor: 'border-jb-orange',
      bgColor: 'bg-jb-orange/10', textColor: 'text-jb-orange',
      glowRgba: 'rgba(251,146,60,0.25)', borderRgba: 'rgba(251,146,60,',
    },
    {
      // ⚠ backend uses id:'optimist' — must match exactly
      role: 'optimist', displayName: 'OPTIMIZER', icon: Zap,
      color: 'jb-accent', borderColor: 'border-jb-accent',
      bgColor: 'bg-jb-accent/10', textColor: 'text-jb-accent',
      glowRgba: 'rgba(60,113,247,0.25)', borderRgba: 'rgba(60,113,247,',
    },
    {
      role: 'synthesizer', displayName: 'SYNTHESIZER', icon: GitMerge,
      color: 'jb-purple', borderColor: 'border-jb-purple',
      bgColor: 'bg-jb-purple/10', textColor: 'text-jb-purple',
      glowRgba: 'rgba(157,91,210,0.25)', borderRgba: 'rgba(157,91,210,',
    },
  ],
  research: [
    {
      role: 'researcher', displayName: 'RESEARCHER', icon: Search,
      color: 'emerald-500', borderColor: 'border-emerald-500',
      bgColor: 'bg-emerald-500/10', textColor: 'text-emerald-400',
      glowRgba: 'rgba(16,185,129,0.25)', borderRgba: 'rgba(16,185,129,',
    },
    {
      role: 'analyst', displayName: 'ANALYST', icon: BarChart2,
      color: 'jb-accent', borderColor: 'border-jb-accent',
      bgColor: 'bg-jb-accent/10', textColor: 'text-jb-accent',
      glowRgba: 'rgba(60,113,247,0.25)', borderRgba: 'rgba(60,113,247,',
    },
    {
      role: 'devil', displayName: "DEVIL'S ADVOCATE", icon: AlertTriangle,
      color: 'jb-orange', borderColor: 'border-jb-orange',
      bgColor: 'bg-jb-orange/10', textColor: 'text-jb-orange',
      glowRgba: 'rgba(251,146,60,0.25)', borderRgba: 'rgba(251,146,60,',
    },
  ],
  'code-review': [
    {
      role: 'architect', displayName: 'ARCHITECT', icon: Layers,
      color: 'jb-purple', borderColor: 'border-jb-purple',
      bgColor: 'bg-jb-purple/10', textColor: 'text-jb-purple',
      glowRgba: 'rgba(157,91,210,0.25)', borderRgba: 'rgba(157,91,210,',
    },
    {
      role: 'reviewer', displayName: 'CODE REVIEWER', icon: Code2,
      color: 'jb-accent', borderColor: 'border-jb-accent',
      bgColor: 'bg-jb-accent/10', textColor: 'text-jb-accent',
      glowRgba: 'rgba(60,113,247,0.25)', borderRgba: 'rgba(60,113,247,',
    },
    {
      role: 'security', displayName: 'SECURITY AUDITOR', icon: ShieldAlert,
      color: 'jb-orange', borderColor: 'border-jb-orange',
      bgColor: 'bg-jb-orange/10', textColor: 'text-jb-orange',
      glowRgba: 'rgba(251,146,60,0.25)', borderRgba: 'rgba(251,146,60,',
    },
  ],
};

// ─── Mission templates ───────────────────────────────────────────────────────────

const MISSION_TEMPLATES = [
  { id: 'consultation', label: 'Consultation', description: 'PM + Engineer + Security review',
    activeCls: 'bg-jb-purple/15 border-jb-purple/40 text-jb-purple' },
  { id: 'refinement',   label: 'Refinement',   description: 'Adversarial critic + optimizer',
    activeCls: 'bg-jb-accent/15 border-jb-accent/40 text-jb-accent' },
  { id: 'research',     label: 'Research',     description: "Researcher + Analyst + Devil's Advocate",
    activeCls: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400' },
  { id: 'code-review',  label: 'Code Review',  description: 'Architect + Code Reviewer + Security',
    activeCls: 'bg-jb-orange/15 border-jb-orange/40 text-jb-orange' },
];

// ─── Activity log milestones ─────────────────────────────────────────────────────

let activityIdCounter = 0;

type MilestoneType = ActivityEntry['type'];
const MILESTONES: Array<[number, MilestoneType, string]> = [
  [5,   'system',    'Mission queued — agents activating'],
  [15,  'pm',        'Analyzing scope and requirements...'],
  [30,  'engineer',  'Reviewing technical feasibility...'],
  [45,  'security',  'Assessing risk posture...'],
  [60,  'pm',        'Drafting strategic recommendations...'],
  [75,  'engineer',  'Finalizing analysis...'],
  [85,  'synthesis', 'All agents converging — synthesizing consensus...'],
  [100, 'synthesis', 'Mission complete'],
];

// ─── Component ──────────────────────────────────────────────────────────────────

export const CollaborateArea = () => {
  const [goal, setGoal]               = useState('');
  const [missionType, setMissionType] = useState('consultation');
  const [missionStatus, setMissionStatus] = useState<MissionStatus>('idle');
  const [progress, setProgress]       = useState(0);
  const [jobId, setJobId]             = useState<string | null>(null);
  const [opinions, setOpinions]       = useState<AgentOpinion[]>([]);
  const [synthesis, setSynthesis]     = useState('');
  const [errorMsg, setErrorMsg]       = useState('');
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('awaiting');
  const [analysis, setAnalysis]             = useState('');

  const pollRef            = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMilestoneRef   = useRef<number>(-1);

  const { upsertMission, addActivity, activeMissions } = useAppStore();

  // ── Polling ────────────────────────────────────────────────────────────────

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback((id: string) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const status = await fetchWithRetry(`${API_BASE_URL}/tasks/${id}`);
        setProgress((status as { progress?: number }).progress ?? 0);
        const s = (status as { status: string; result?: { expertOpinions?: { role: string; opinion: string }[]; synthesis?: string }; error?: string }).status;
        if (s === 'completed') {
          stopPolling();
          setMissionStatus('complete');
          setProgress(100);
          const result = (status as { result?: { expertOpinions?: { role: string; opinion: string }[]; synthesis?: string } }).result;
          if (result?.expertOpinions) setOpinions(result.expertOpinions.map((o) => ({ ...o, status: 'completed' as const })));
          if (result?.synthesis) setSynthesis(result.synthesis);
          upsertMission({ jobId: id, status: 'complete', progress: 100, result });
          addActivity({ type: 'success', message: 'Multi-agent mission completed', source: 'Collaborate' });
        } else if (s === 'failed') {
          stopPolling();
          setMissionStatus('failed');
          setErrorMsg((status as { error?: string }).error || 'Mission failed');
          upsertMission({ jobId: id, status: 'failed', error: (status as { error?: string }).error });
        } else {
          setMissionStatus('active');
          upsertMission({ jobId: id, progress: (status as { progress?: number }).progress ?? 0, status: 'active' });
        }
      } catch { /* non-fatal, retry next interval */ }
    }, 2500);
  }, [stopPolling, upsertMission, addActivity]);

  // ── WebSocket ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleProgress = ({ jobId: id, progress: p }: { jobId: string; progress: number }) => {
      if (id === jobId) { setProgress(p); setMissionStatus('active'); }
    };
    const handleComplete = ({ jobId: id, result }: { jobId: string; result: { expertOpinions?: { role: string; opinion: string }[]; synthesis?: string } }) => {
      if (id !== jobId) return;
      stopPolling(); setMissionStatus('complete'); setProgress(100);
      if (result?.expertOpinions) setOpinions(result.expertOpinions.map((o) => ({ ...o, status: 'completed' as const })));
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

  // ── Analysis status transitions ────────────────────────────────────────────

  useEffect(() => {
    if (missionStatus === 'complete') setAnalysisStatus('ready');
  }, [missionStatus]);

  // ── Activity log ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (missionStatus === 'idle') return;
    const newEntries: ActivityEntry[] = [];
    for (const [threshold, type, text] of MILESTONES) {
      if (progress >= threshold && lastMilestoneRef.current < threshold) {
        newEntries.push({ id: ++activityIdCounter, timestamp: Date.now(), text, type });
        lastMilestoneRef.current = threshold;
      }
    }
    if (newEntries.length > 0) {
      setActivityLog((prev) => [...prev, ...newEntries]);
    }
  }, [progress, missionStatus]);

  // ── Mission launch ─────────────────────────────────────────────────────────

  const startMission = async () => {
    if (!goal.trim()) return;
    setMissionStatus('queued');
    setProgress(0);
    setOpinions([]);
    setSynthesis('');
    setErrorMsg('');
    setJobId(null);
    setActivityLog([]);
    lastMilestoneRef.current = -1;
    setAnalysisStatus('awaiting');
    setAnalysis('');
    try {
      const data = await fetchWithRetry(`${API_BASE_URL}/collaborate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, missionType, async: true }),
      });
      const d = data as { jobId?: string; expertOpinions?: { role: string; opinion: string }[]; synthesis?: string };
      if (d.jobId) {
        const id = d.jobId;
        setJobId(id);
        upsertMission({ jobId: id, goal, missionType, status: 'queued', progress: 0 });
        addActivity({ type: 'provider', message: `Mission: ${goal.slice(0, 60)}`, source: 'Collaborate' });
        startPolling(id);
      } else if (d.expertOpinions) {
        setMissionStatus('complete');
        setProgress(100);
        setOpinions(d.expertOpinions.map((o) => ({ ...o, status: 'completed' as const })));
        if (d.synthesis) setSynthesis(d.synthesis);
      }
    } catch (e: unknown) {
      setMissionStatus('failed');
      setErrorMsg(e instanceof Error ? e.message : 'Mission failed to start');
    }
  };

  // ── Conclusive analysis ────────────────────────────────────────────────────

  const handleAnalyze = async (userContext: string) => {
    setAnalysisStatus('analyzing');
    try {
      const data = await fetchWithRetry(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opinions, synthesis, userContext, missionType }),
      });
      setAnalysis((data as { analysis: string }).analysis);
      setAnalysisStatus('complete');
    } catch {
      // Allow retry on failure
      setAnalysisStatus('ready');
    }
  };

  const resetMission = () => {
    stopPolling();
    setGoal('');
    setMissionStatus('idle');
    setProgress(0);
    setOpinions([]);
    setSynthesis('');
    setErrorMsg('');
    setJobId(null);
    setActivityLog([]);
    lastMilestoneRef.current = -1;
    setAnalysisStatus('awaiting');
    setAnalysis('');
  };

  // ── Derived state ──────────────────────────────────────────────────────────

  const isRunning = missionStatus === 'queued' || missionStatus === 'active';
  const isIdle    = missionStatus === 'idle';
  const agentConfigs = AGENT_CONFIGS[missionType] ?? AGENT_CONFIGS.consultation;

  const getOpinionForAgent = (config: AgentConfig): AgentOpinion | null =>
    opinions.find((op) => op.role === config.role) ?? null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col bg-jb-dark overflow-hidden">
      <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full p-6 gap-5 overflow-y-auto no-scrollbar">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 bg-jb-purple/10 border border-jb-purple/20 rounded-2xl">
                <Users className="text-jb-purple" size={22} />
              </div>
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-jb-purple"
                style={{ boxShadow: '0 0 6px rgba(157,91,210,0.8)' }}
              />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                Multi-Agent Orchestration Engine
              </p>
              <h2 className="text-lg font-black text-white tracking-tight">
                Agentic <span className="text-vibrant">War Room</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Reset button — shown after completion or failure */}
            <AnimatePresence>
              {(missionStatus === 'complete' || missionStatus === 'failed') && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onClick={resetMission}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-400 text-[10px] font-bold rounded-full transition-all uppercase tracking-wider"
                >
                  <RotateCcw size={11} /> New Mission
                </motion.button>
              )}
            </AnimatePresence>

            {/* Launch button */}
            <button
              onClick={startMission}
              disabled={isRunning || !goal.trim()}
              className={cn(
                'flex items-center gap-2 px-5 py-2 text-white text-[11px] font-black rounded-full transition-all uppercase tracking-wider',
                'bg-gradient-to-r from-jb-purple to-jb-accent disabled:opacity-40',
                !isRunning && goal.trim() && 'shadow-[0_0_20px_rgba(157,91,210,0.35)] hover:shadow-[0_0_28px_rgba(157,91,210,0.5)]',
              )}
            >
              {isRunning
                ? <><Loader2 size={13} className="animate-spin" /> Running...</>
                : <><Play size={13} fill="currentColor" /> Launch Mission</>}
            </button>
          </div>
        </div>

        {/* ── Mission Launcher ────────────────────────────────────────────── */}
        <div className="glass-panel rounded-[1.5rem] p-4 space-y-3 flex-shrink-0">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Define the engineering mission goal..."
            disabled={isRunning}
            className="w-full bg-transparent text-slate-300 outline-none resize-none h-20 text-sm font-medium placeholder:text-slate-700 disabled:opacity-50"
          />
          <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-white/5">
            <span className="text-[9px] text-slate-600 uppercase tracking-widest font-black">Template:</span>
            {MISSION_TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => !isRunning && setMissionType(t.id)}
                title={t.description}
                className={cn(
                  'px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all',
                  missionType === t.id
                    ? t.activeCls
                    : 'bg-white/5 border-white/10 text-slate-500 hover:text-slate-300',
                )}
              >
                {t.label}
              </button>
            ))}

            {/* Mission status indicator */}
            {missionStatus !== 'idle' && (
              <div className="ml-auto flex items-center gap-2">
                {missionStatus === 'complete' && (
                  <CheckCircle2 size={12} className="text-emerald-400" />
                )}
                {missionStatus === 'failed' && (
                  <XCircle size={12} className="text-rose-400" />
                )}
                {isRunning && (
                  <Loader2 size={12} className="animate-spin text-jb-purple" />
                )}
                <span className={cn(
                  'text-[9px] font-black uppercase tracking-wider',
                  missionStatus === 'complete' ? 'text-emerald-400'
                    : missionStatus === 'failed' ? 'text-rose-400'
                    : 'text-slate-500',
                )}>
                  {missionStatus === 'failed' ? errorMsg : `${progress}%`}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Activity Log ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {missionStatus !== 'idle' && activityLog.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="flex-shrink-0"
            >
              <ActivityLog entries={activityLog} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Agent Lanes ─────────────────────────────────────────────────── */}
        <div className="flex gap-4 flex-shrink-0">
          {agentConfigs.map((config) => (
            <AgentCard
              key={config.role}
              config={config}
              opinion={getOpinionForAgent(config)}
              isMissionRunning={isRunning}
              isIdle={isIdle}
            />
          ))}
        </div>

        {/* ── Synthesis Panel ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {synthesis && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="glass-panel rounded-[1.5rem] p-5 border-l-4 border-emerald-500/60 flex-shrink-0"
            >
              <div className="flex items-center gap-2 mb-3">
                <GitMerge size={14} className="text-emerald-400" />
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400">
                  Consensus Synthesis
                </span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                {synthesis}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Conclusive Analysis Panel ───────────────────────────────────── */}
        <AnimatePresence>
          {missionStatus !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.4 }}
              className="flex-shrink-0"
            >
              <AnalysisPanel
                status={analysisStatus}
                analysis={analysis}
                onAnalyze={handleAnalyze}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Mission History ─────────────────────────────────────────────── */}
        <div className="flex-shrink-0">
          <MissionHistory
            missions={activeMissions}
            isOpen={showHistory}
            onToggle={() => setShowHistory((v) => !v)}
          />
        </div>

      </div>
    </div>
  );
};
