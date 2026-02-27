import React, { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import {
  PenLine, X, Shield, Send, Terminal,
  Activity, Database, LayoutGrid,
  Code2, Settings, Bell,
  Layers, Trash2, FileText, ChevronDown, Sparkles,
  MessageSquare as ChatIcon, Brain,
  Play, Loader2, CheckCircle2, XCircle,
  Maximize, Minimize, Zap, Network, Users
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatView } from './ChatView';
import { WaterfallVisualizer } from './WaterfallVisualizer';
import { fetchWithRetry } from '../lib/api-client';
import { API_BASE_URL } from '../lib/config';
import { socket } from '../lib/socket';

// Local types for PiP window (separate Electron context = separate store)
interface LocalOverseerDecision {
  id: string;
  decision: string;
  intervention?: { needed: boolean; type: 'warning' | 'suggestion' | 'action'; message: string } | null;
  timestamp: number;
  trigger?: string;
}

interface LocalActiveMission {
  jobId: string;
  goal: string;
  missionType: string;
  status: 'queued' | 'active' | 'complete' | 'failed';
  progress: number;
  result?: any;
  error?: string;
}

const MISSION_TEMPLATES = [
  { id: 'consultation', label: 'Consultation', desc: 'PM + Engineer + Security' },
  { id: 'refinement', label: 'Refinement', desc: 'Adversarial critic + optimizer' },
];

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function phaseLabel(progress: number, status: string): string {
  if (status === 'queued') return 'Queued...';
  if (status === 'complete') return 'Complete';
  if (status === 'failed') return 'Failed';
  if (progress < 75) return 'Agents analyzing...';
  if (progress < 90) return 'Synthesizing...';
  return 'Saving to memory...';
}

const interventionColor = {
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  suggestion: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  action: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
};

export const NotepadPiP = () => {
  const {
    notepadContent, setNotepadContent, supervisorInsight, setSupervisorInsight,
    thinkingModeEnabled, setThinkingModeEnabled, auraMode, setAuraMode,
    globalProvider, setGlobalProvider, setCurrentMode, activities,
    messages
  } = useAppStore();

  const [view, setView] = useState<'dash' | 'notes' | 'overseer' | 'chat' | 'coding' | 'missions' | 'waterfall'>('overseer');
  const [isCompact, setIsCompact] = useState(false);
  const [command, setCommand] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Overseer state — local since PiP is a separate Electron window
  const [overseerDecisions, setOverseerDecisions] = useState<LocalOverseerDecision[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isThinking, setIsThinking] = useState(false);

  // Missions state
  const [activeMissions, setActiveMissions] = useState<LocalActiveMission[]>([]);
  const [missionGoal, setMissionGoal] = useState('');
  const [missionTemplate, setMissionTemplate] = useState('consultation');
  const [launchingMission, setLaunchingMission] = useState(false);
  const [expandedMission, setExpandedMission] = useState<string | null>(null);

  // Socket listeners — wired directly since PiP has its own socket
  useEffect(() => {
    const handleOverseerDecision = (d: any) => {
      const decision: LocalOverseerDecision = {
        id: d.id || `od_${Date.now()}`,
        decision: d.decision || d.message || JSON.stringify(d),
        intervention: d.intervention,
        timestamp: d.timestamp || Date.now(),
        trigger: d.trigger,
      };
      setOverseerDecisions(prev => [decision, ...prev].slice(0, 20));
      if (view !== 'overseer') setUnreadCount(c => c + 1);
    };

    const handleNudge = ({ message }: { message: string }) => {
      setSupervisorInsight(message);
    };

    const handleMissionProgress = ({ jobId, progress }: { jobId: string; progress: number }) => {
      setActiveMissions(prev => prev.map(m =>
        m.jobId === jobId ? { ...m, progress, status: 'active' } : m
      ));
    };

    const handleMissionComplete = ({ jobId, result }: { jobId: string; result: any }) => {
      setActiveMissions(prev => prev.map(m =>
        m.jobId === jobId ? { ...m, status: 'complete', progress: 100, result } : m
      ));
    };

    const handleMissionFailed = ({ jobId, error }: { jobId: string; error: string }) => {
      setActiveMissions(prev => prev.map(m =>
        m.jobId === jobId ? { ...m, status: 'failed', error } : m
      ));
    };

    socket.on('OVERSEER_DECISION', handleOverseerDecision);
    socket.on('supervisor-nudge', handleNudge);
    socket.on('MISSION_PROGRESS', handleMissionProgress);
    socket.on('MISSION_COMPLETE', handleMissionComplete);
    socket.on('MISSION_FAILED', handleMissionFailed);

    return () => {
      socket.off('OVERSEER_DECISION', handleOverseerDecision);
      socket.off('supervisor-nudge', handleNudge);
      socket.off('MISSION_PROGRESS', handleMissionProgress);
      socket.off('MISSION_COMPLETE', handleMissionComplete);
      socket.off('MISSION_FAILED', handleMissionFailed);
    };
  }, [view, setSupervisorInsight]);

  // Reset unread when switching to overseer
  useEffect(() => {
    if (view === 'overseer') setUnreadCount(0);
  }, [view]);

  const triggerOverseer = useCallback(async (focus?: string) => {
    setIsThinking(true);
    try {
      await fetchWithRetry(`${API_BASE_URL}/overseer/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          focus: focus || 'manual_check',
          notepadContent,
          recentMessages: messages.slice(-8),
        }),
        retries: 1,
      });
    } catch { /* non-fatal */ }
    finally { setIsThinking(false); }
  }, [notepadContent, messages]);

  const launchMission = useCallback(async () => {
    if (!missionGoal.trim()) return;
    setLaunchingMission(true);
    try {
      const data = await fetchWithRetry(`${API_BASE_URL}/collaborate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: missionGoal, missionType: missionTemplate, async: true }),
      });
      if (data.jobId) {
        setActiveMissions(prev => [{
          jobId: data.jobId,
          goal: missionGoal,
          missionType: missionTemplate,
          status: 'queued' as const,
          progress: 0,
        }, ...prev].slice(0, 10));
        setMissionGoal('');
      }
    } catch { /* non-fatal */ }
    finally { setLaunchingMission(false); }
  }, [missionGoal, missionTemplate]);

  const sendCommand = useCallback(async () => {
    const cmd = command.trim();
    if (!cmd) return;
    setCommand('');

    if (cmd.startsWith('/think')) {
      const focus = cmd.slice(6).trim() || 'manual_check';
      triggerOverseer(focus);
      setView('overseer');
    } else if (cmd.startsWith('/run ')) {
      const parts = cmd.slice(5).split(' ');
      const tmpl = MISSION_TEMPLATES.find(t => t.id === parts[0]);
      if (tmpl) {
        setMissionTemplate(tmpl.id);
        setMissionGoal(parts.slice(1).join(' '));
      } else {
        setMissionGoal(cmd.slice(5));
      }
      setView('missions');
    } else if (cmd === '/scan') {
      triggerOverseer('full_scan');
      setView('overseer');
    } else if (cmd === '/missions') {
      setView('missions');
    } else if (cmd === '/clear') {
      setOverseerDecisions([]);
      setUnreadCount(0);
    } else {
      setCurrentMode('chat');
      setView('chat');
    }
  }, [command, triggerOverseer, setCurrentMode]);

  const handleModeChange = (mode: string) => {
    setCurrentMode(mode as any);
    setView(mode as any);
    if (window.electron?.setMode) window.electron.setMode(mode);
    window.electron?.logAction?.({ type: 'pip_mode_change', mode });
  };

  useEffect(() => {
    if (window.electron?.onModeChanged) {
      return window.electron.onModeChanged((mode: string) => {
        setCurrentMode(mode as any);
      });
    }
  }, [setCurrentMode]);

  const isToolView = ['chat', 'coding', 'missions', 'waterfall', 'notes', 'dash'].includes(view);
  const isSocketConnected = socket.connected;
  const activeMissionCount = activeMissions.filter(m => m.status === 'queued' || m.status === 'active').length;

  const ActionButton = ({ icon: Icon, label, mode, color, desc }: any) => (
    <button
      onClick={() => { setView(mode as any); if (mode !== 'missions') handleModeChange(mode); }}
      className="group relative p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all text-left overflow-hidden h-full flex flex-col justify-between"
    >
      <div className="absolute top-0 right-0 w-12 h-[1px] bg-white/[0.05] group-hover:bg-white/20 transition-colors" />
      <div className="absolute top-0 right-0 w-[1px] h-12 bg-white/[0.05] group-hover:bg-white/20 transition-colors" />
      <div className="relative z-10 space-y-4">
        <div className={cn("p-3 rounded-xl bg-black/40 border border-white/5 w-fit group-hover:scale-110 transition-transform", color)}>
          <Icon size={18} strokeWidth={1.5} />
        </div>
        <div className="space-y-1">
          <h3 className="text-[11px] font-black text-white uppercase tracking-widest">{label}</h3>
          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tight line-clamp-1">{desc}</p>
        </div>
      </div>
      <div className="relative z-10 pt-4 flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.3em] text-white/10 group-hover:text-white transition-all">
        Open <ChevronDown size={10} className="rotate-[-90deg]" />
      </div>
    </button>
  );

  return (
    <div className={cn(
      "h-screen w-screen flex flex-col bg-[#050508] text-slate-300 border border-white/10 overflow-hidden font-sans transition-all duration-300",
      isCompact ? "p-1" : "p-0"
    )}>
      {/* Header */}
      <div
        style={{ WebkitAppRegion: 'drag' } as any}
        className="flex items-center justify-between px-3 py-2 bg-[#0a0a0f] border-b border-white/5 cursor-move"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-jb-purple animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/70">Solvent</span>
          {activeMissionCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 text-[7px] font-black">
              {activeMissionCount} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {isToolView && (
            <>
              <button
                onClick={() => setView('overseer')}
                className="relative p-1.5 rounded-md text-slate-600 hover:text-slate-400 transition-all"
                title="Overseer"
              >
                <Shield size={12} />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full text-[6px] font-black flex items-center justify-center text-black">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {view !== 'dash' && (
                <button onClick={() => setView('dash')} className="p-1.5 rounded-md text-slate-600 hover:text-slate-400 transition-all" title="Dashboard">
                  <LayoutGrid size={12} />
                </button>
              )}
              <div className="w-[1px] h-3 bg-white/10 mx-1" />
              <button onClick={() => handleModeChange('chat')} className={cn("p-1.5 rounded-md transition-all", view === 'chat' ? "text-blue-400 bg-blue-500/10" : "text-slate-600 hover:text-slate-400")} title="Chat">
                <ChatIcon size={12} />
              </button>
              <button onClick={() => handleModeChange('coding')} className={cn("p-1.5 rounded-md transition-all", view === 'coding' ? "text-jb-accent bg-jb-accent/10" : "text-slate-600 hover:text-slate-400")} title="Code">
                <Code2 size={12} />
              </button>
              <div className="w-[1px] h-3 bg-white/10 mx-1" />
            </>
          )}
          {view === 'overseer' && (
            <button onClick={() => setView('dash')} className="p-1.5 rounded-md text-slate-600 hover:text-slate-400 transition-all" title="Dashboard">
              <LayoutGrid size={12} />
            </button>
          )}
          <button onClick={() => setView('notes')} className={cn("p-1.5 rounded-md transition-all", view === 'notes' ? "text-amber-400 bg-amber-500/10" : "text-slate-600 hover:text-slate-400")} title="Notes">
            <PenLine size={12} />
          </button>
          <div className="w-[1px] h-3 bg-white/10 mx-1" />
          <button onClick={() => setShowSettings(!showSettings)} className={cn("p-1.5 rounded-md transition-all", showSettings ? "text-white bg-white/10" : "text-slate-600 hover:text-white")} title="Settings">
            <Settings size={12} />
          </button>
          <button onClick={() => setIsCompact(!isCompact)} className="p-1.5 text-slate-600 hover:text-white transition-all">
            {isCompact ? <Maximize size={12} /> : <Minimize size={12} />}
          </button>
          <button onClick={() => window.close()} className="p-1.5 text-slate-600 hover:text-red-400 transition-all">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col p-0 gap-0 relative">
        {/* Settings Overlay */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-3 left-3 right-3 z-[100] glass-panel rounded-xl border border-white/10 shadow-2xl p-3 flex flex-col gap-2 bg-[#0a0a0f]/95"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase text-white tracking-widest">Settings</span>
                <button onClick={() => setShowSettings(false)}><X size={10} /></button>
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => setThinkingModeEnabled(!thinkingModeEnabled)}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg text-[9px] font-black uppercase transition-all",
                    thinkingModeEnabled ? "bg-jb-purple/20 text-jb-purple" : "bg-white/5 text-slate-500 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2"><Brain size={12} /><span>Deep Thinking</span></div>
                  <div className={cn("w-2 h-2 rounded-full", thinkingModeEnabled ? "bg-jb-purple shadow-[0_0_8px_rgba(157,91,210,1)]" : "bg-slate-800")} />
                </button>
                <button
                  onClick={() => setAuraMode(auraMode === 'off' ? 'organic' : 'off')}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg text-[9px] font-black uppercase transition-all",
                    auraMode !== 'off' ? "bg-jb-orange/20 text-jb-orange" : "bg-white/5 text-slate-500 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2"><Sparkles size={12} /><span>Visual Effects</span></div>
                  <div className={cn("w-2 h-2 rounded-full", auraMode !== 'off' ? "bg-jb-orange shadow-[0_0_8px_rgba(251,146,60,1)]" : "bg-slate-800")} />
                </button>
                <div className="pt-2 mt-2 border-t border-white/5 flex flex-col gap-1">
                  <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest ml-1">AI Provider</span>
                  <div className="flex gap-1">
                    {['cloud', 'local', 'auto'].map(p => (
                      <button
                        key={p}
                        onClick={() => setGlobalProvider(p)}
                        className={cn(
                          "flex-1 py-1.5 rounded-md text-[8px] font-black uppercase transition-all border",
                          globalProvider === p ? "bg-white text-black border-white" : "bg-black/40 text-slate-500 border-white/5 hover:border-white/20"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">

          {/* ─── DASHBOARD ─── */}
          {view === 'dash' && (
            <motion.div
              key="dash"
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
              className="flex-1 flex flex-col gap-3 p-3 overflow-y-auto no-scrollbar"
            >
              {/* System Health */}
              <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-1.5 h-1.5 rounded-full", isSocketConnected ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" : "bg-rose-500")} />
                    <span className="text-[8px] font-black uppercase text-slate-500">Socket</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-black uppercase text-indigo-400">{activeMissionCount}</span>
                    <span className="text-[8px] font-black uppercase text-slate-600">Missions</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-black uppercase text-emerald-400">{overseerDecisions.length}</span>
                    <span className="text-[8px] font-black uppercase text-slate-600">Alerts</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { triggerOverseer('dashboard_scan'); setView('overseer'); }}
                    disabled={isThinking}
                    className="px-2 py-1 rounded-md text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                  >
                    {isThinking ? <Loader2 size={9} className="animate-spin" /> : 'Think'}
                  </button>
                  <button
                    onClick={() => setView('missions')}
                    className="px-2 py-1 rounded-md text-[8px] font-black uppercase bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all"
                  >
                    Mission
                  </button>
                </div>
              </div>

              {/* Action Grid */}
              <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                <ActionButton icon={ChatIcon} label="CHAT" mode="chat" color="text-blue-400" desc="Talk to your assistant" />
                <ActionButton icon={Code2} label="CODE" mode="coding" color="text-jb-accent" desc="Write and run code" />
                <ActionButton icon={Users} label="MISSIONS" mode="missions" color="text-indigo-400" desc="Multi-agent war room" />
                <ActionButton icon={Layers} label="FLOW" mode="waterfall" color="text-jb-purple" desc="Tiered intelligence" />
              </div>

              {/* Activity Feed */}
              <div className="flex-1 bg-black/40 rounded-xl border border-white/5 p-3 flex flex-col overflow-hidden">
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Recent Activity</span>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                  {activities.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                      <Database size={24} strokeWidth={1} />
                      <span className="text-[8px] font-black uppercase mt-2">Buffer Empty</span>
                    </div>
                  ) : (
                    activities.slice(0, 15).map((act: any, i: number) => (
                      <div key={i} className="text-[9px] leading-tight flex gap-2">
                        <span className={cn(
                          "font-black uppercase text-[6px] px-1 py-0.5 rounded-sm shrink-0 h-fit mt-0.5",
                          act.type === 'user_message' ? "bg-blue-500/20 text-blue-400" :
                          act.type === 'ai_code_update' ? "bg-emerald-500/20 text-emerald-400" :
                          act.type === 'command' ? "bg-jb-purple/20 text-jb-purple" : "bg-white/10 text-white/50"
                        )}>{String(act.type || '').replace('_', ' ').slice(0, 10)}</span>
                        <span className="text-slate-400/80 line-clamp-2 font-mono">
                          {act.content || act.detail || act.path || act.message || JSON.stringify(act)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── CHAT / CODING ─── */}
          {(view === 'chat' || view === 'coding') && (
            <motion.div
              key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              <ChatView compact />
            </motion.div>
          )}

          {/* ─── WATERFALL ─── */}
          {view === 'waterfall' && (
            <motion.div
              key="waterfall" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-y-auto no-scrollbar"
            >
              <div className="p-4"><WaterfallVisualizer /></div>
              <div className="mt-auto"><ChatView compact /></div>
            </motion.div>
          )}

          {/* ─── NOTES ─── */}
          {view === 'notes' && (
            <motion.div
              key="notes" initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }}
              className="flex-1 flex flex-col gap-2 p-3"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Your Notes</span>
                <button
                  onClick={() => { setNotepadContent(''); window.electron?.saveNotepad(''); }}
                  className="p-1 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              <textarea
                value={notepadContent}
                onChange={(e) => { setNotepadContent(e.target.value); window.electron?.saveNotepad(e.target.value); }}
                className="flex-1 bg-black/20 border border-white/5 rounded-xl p-3 text-[10px] font-mono leading-relaxed outline-none resize-none text-slate-300 placeholder:text-slate-800"
                placeholder="Type your notes here..."
                spellCheck={false}
              />
            </motion.div>
          )}

          {/* ─── OVERSEER ─── */}
          {view === 'overseer' && (
            <motion.div
              key="overseer" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col p-3 gap-3 overflow-hidden"
            >
              {/* Supervisor Insight Banner */}
              <div className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden flex-shrink-0">
                <div className="absolute -right-4 -top-4 w-20 h-20 bg-emerald-500/5 blur-3xl rounded-full" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={12} className="text-emerald-400" />
                    <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">Overseer</span>
                    {isThinking && <Loader2 size={9} className="animate-spin text-emerald-400" />}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => triggerOverseer('manual_check')}
                      disabled={isThinking}
                      title="Think Now"
                      className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all disabled:opacity-40"
                    >
                      {isThinking ? '...' : 'Think'}
                    </button>
                    <button
                      onClick={() => triggerOverseer('nudge_me')}
                      disabled={isThinking}
                      title="Ask for guidance"
                      className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-all disabled:opacity-40"
                    >
                      Nudge
                    </button>
                    <button
                      onClick={() => { setOverseerDecisions([]); setUnreadCount(0); }}
                      title="Clear decisions"
                      className="p-1 rounded-md text-slate-600 hover:text-rose-400 transition-all"
                    >
                      <Trash2 size={9} />
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-slate-300 leading-relaxed">
                  {supervisorInsight || "Watching your session. Hit Think to get a proactive insight, or Nudge for guidance."}
                </p>
              </div>

              {/* Decisions Feed */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <div className="w-1 h-1 rounded-full bg-emerald-500/50 animate-pulse" />
                  <span>Decision Feed</span>
                  <span className="text-slate-700">({overseerDecisions.length})</span>
                </div>

                {overseerDecisions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-20 gap-2">
                    <Shield size={28} strokeWidth={1} />
                    <span className="text-[8px] font-black uppercase">No decisions yet</span>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                    {overseerDecisions.map((d) => (
                      <div key={d.id} className="bg-black/30 border border-white/5 rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          {d.intervention?.needed && (
                            <span className={cn(
                              "text-[7px] font-black uppercase px-1.5 py-0.5 rounded border flex-shrink-0",
                              interventionColor[d.intervention.type] || interventionColor.suggestion
                            )}>
                              {d.intervention.type}
                            </span>
                          )}
                          <span className="text-[7px] text-slate-700 font-mono ml-auto flex-shrink-0">
                            {formatTime(d.timestamp)}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-300 leading-relaxed line-clamp-4">
                          {d.decision}
                        </p>
                        {d.intervention?.message && d.intervention.message !== d.decision && (
                          <p className="text-[8px] text-slate-500 leading-relaxed border-t border-white/5 pt-2">
                            {d.intervention.message}
                          </p>
                        )}
                        {d.trigger && (
                          <span className="text-[6px] text-slate-700 font-mono uppercase">trigger: {d.trigger}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── MISSIONS ─── */}
          {view === 'missions' && (
            <motion.div
              key="missions" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              className="flex-1 flex flex-col p-3 gap-3 overflow-hidden"
            >
              {/* Mission Launcher */}
              <div className="bg-indigo-500/[0.03] border border-indigo-500/15 rounded-xl p-3 space-y-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Users size={12} className="text-indigo-400" />
                  <span className="text-[9px] font-black uppercase text-indigo-400 tracking-widest">Launch Mission</span>
                </div>
                <textarea
                  value={missionGoal}
                  onChange={(e) => setMissionGoal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) launchMission(); }}
                  placeholder="Define the mission goal..."
                  className="w-full bg-black/30 border border-white/5 rounded-lg px-3 py-2 text-[10px] font-mono outline-none resize-none text-slate-300 placeholder:text-slate-700 h-16"
                />
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 flex-1">
                    {MISSION_TEMPLATES.map(t => (
                      <button
                        key={t.id}
                        onClick={() => setMissionTemplate(t.id)}
                        className={cn(
                          "px-2 py-1 rounded-full text-[8px] font-black uppercase border transition-all",
                          missionTemplate === t.id
                            ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-400"
                            : "bg-white/[0.02] border-white/5 text-slate-600 hover:text-white"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={launchMission}
                    disabled={!missionGoal.trim() || launchingMission}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-[9px] font-black rounded-full transition-all"
                  >
                    {launchingMission ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                    {launchingMission ? 'Launching...' : 'Launch'}
                  </button>
                </div>
              </div>

              {/* Active Missions List */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <div className={cn("w-1 h-1 rounded-full", activeMissionCount > 0 ? "bg-indigo-500 animate-pulse" : "bg-slate-700")} />
                  <span>Active Missions</span>
                  <span className="text-slate-700">({activeMissions.length})</span>
                </div>

                {activeMissions.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center opacity-20 gap-2">
                    <Users size={28} strokeWidth={1} />
                    <span className="text-[8px] font-black uppercase">No missions yet</span>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                    {activeMissions.map((m) => (
                      <div
                        key={m.jobId}
                        className="bg-black/30 border border-white/5 rounded-lg overflow-hidden cursor-pointer"
                        onClick={() => setExpandedMission(expandedMission === m.jobId ? null : m.jobId)}
                      >
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[9px] text-slate-300 font-medium line-clamp-1 flex-1">{m.goal}</p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span className={cn(
                                "text-[7px] font-black uppercase px-1.5 py-0.5 rounded",
                                m.status === 'complete' ? "bg-emerald-500/20 text-emerald-400" :
                                m.status === 'failed' ? "bg-rose-500/20 text-rose-400" :
                                m.status === 'active' ? "bg-indigo-500/20 text-indigo-400" :
                                "bg-slate-700/40 text-slate-500"
                              )}>{m.status}</span>
                              {(m.status === 'queued' || m.status === 'active') && (
                                <Loader2 size={9} className="animate-spin text-indigo-400" />
                              )}
                              {m.status === 'complete' && <CheckCircle2 size={9} className="text-emerald-400" />}
                              {m.status === 'failed' && <XCircle size={9} className="text-rose-400" />}
                            </div>
                          </div>

                          {(m.status === 'queued' || m.status === 'active') && (
                            <div className="space-y-1">
                              <div className="flex justify-between text-[7px]">
                                <span className="text-slate-600">{phaseLabel(m.progress, m.status)}</span>
                                <span className="text-slate-700">{m.progress}%</span>
                              </div>
                              <div className="h-0.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                  style={{ width: `${m.progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Expanded result */}
                        {expandedMission === m.jobId && m.result && (
                          <div className="border-t border-white/5 p-3 space-y-2">
                            {m.result.synthesis && (
                              <>
                                <span className="text-[7px] font-black uppercase text-indigo-400">Synthesis</span>
                                <p className="text-[8px] text-slate-400 leading-relaxed">{m.result.synthesis}</p>
                              </>
                            )}
                            {m.result.expertOpinions && (
                              <div className="space-y-1.5 mt-2">
                                {m.result.expertOpinions.map((op: any, i: number) => (
                                  <div key={i} className="text-[8px] text-slate-500 leading-relaxed">
                                    <span className="font-black text-slate-400 uppercase">{op.role}: </span>
                                    <span className="line-clamp-2">{op.opinion}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {expandedMission === m.jobId && m.error && (
                          <div className="border-t border-white/5 p-3">
                            <p className="text-[8px] text-rose-400">{m.error}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Command Bar */}
      <div className="p-3 bg-[#0a0a0f] border-t border-white/5">
        <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 focus-within:border-jb-purple/40 transition-all shadow-inner">
          <Terminal size={10} className="text-slate-600 flex-shrink-0" />
          <input
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
            placeholder="/think · /run · /scan · /missions · /clear"
            className="flex-1 bg-transparent text-[10px] outline-none text-slate-300 placeholder:text-slate-800 font-mono"
          />
          <button onClick={sendCommand} className="text-slate-600 hover:text-jb-purple transition-colors flex-shrink-0">
            <Send size={10} />
          </button>
        </div>
      </div>
    </div>
  );
};
