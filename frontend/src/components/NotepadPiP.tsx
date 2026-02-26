import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { 
  PenLine, X, GripHorizontal, Shield, Send, Terminal, 
  Zap, Activity, Cpu, HardDrive, LayoutGrid, 
  Code2, Globe, Users, Settings, Bell, SquareTerminal,
  Network, Database, Maximize, Minimize, MousePointer2,
  Layers, Waves, Hammer, Briefcase, Trash2,
  FileText, FolderOpen, MoreVertical, ChevronDown, Sparkles,
  FlaskConical, MessageSquare as ChatIcon, Brain
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatView } from './ChatView';
import { WaterfallVisualizer } from './WaterfallVisualizer';
import { KnowledgeMap } from './KnowledgeMap';

export const NotepadPiP = () => {
  const { 
    notepadContent, setNotepadContent, supervisorInsight, messages,
    thinkingModeEnabled, setThinkingModeEnabled, auraMode, setAuraMode,
    globalProvider, setGlobalProvider, setCurrentMode, activities,
    currentMode
  } = useAppStore();
  const [view, setView] = useState<'dash' | 'notes' | 'overseer' | 'chat' | 'coding' | 'browser' | 'waterfall'>('overseer');
  const [isCompact, setIsCompact] = useState(false);
  const [command, setCommand] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const sendCommand = async () => {
    if (!command.trim()) return;
    window.electron?.logAction({ type: 'command', detail: command });
    setCommand('');
  };

  const handleModeChange = (mode: string) => {
    setCurrentMode(mode as any);
    setView(mode as any); 
    if (window.electron?.setMode) {
      window.electron.setMode(mode);
    }
    window.electron?.logAction?.({ type: 'pip_mode_change', mode });
  };

  useEffect(() => {
    if (window.electron?.onModeChanged) {
      return window.electron.onModeChanged((mode: string) => {
        setCurrentMode(mode as any);
      });
    }
  }, [setCurrentMode]);

  const ActionButton = ({ icon: Icon, label, mode, color, desc }: any) => (
    <button 
      onClick={() => {
        handleModeChange(mode);
        setView(mode as any);
      }}
      className="group relative p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all text-left overflow-hidden h-full flex flex-col justify-between"
    >
      <div className="absolute top-0 right-0 w-12 h-[1px] bg-white/[0.05] group-hover:bg-white/20 transition-colors" />
      <div className="absolute top-0 right-0 w-[1px] h-12 bg-white/[0.05] group-hover:bg-white/20 transition-colors" />
      
      <div className="relative z-10 space-y-4">
        <div className={cn("p-3 rounded-xl bg-black/40 border border-white/5 w-fit group-hover:scale-110 transition-transform", color)}>
          <Icon size={18} strokeWidth={1.5} />
        </div>
        
        <div className="space-y-1">
          <h3 className="text-[11px] font-black text-white uppercase tracking-widest transition-all group-hover:text-vibrant">{label}</h3>
          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tight line-clamp-1">{desc}</p>
        </div>
      </div>
      
      <div className="relative z-10 pt-4 flex items-center gap-2 text-[7px] font-black uppercase tracking-[0.3em] text-white/10 group-hover:text-white transition-all">
        Open <ChevronDown size={10} className="rotate-[-90deg]" />
      </div>
    </button>
  );

  const isToolView = ['chat', 'coding', 'browser', 'waterfall', 'notes', 'dash'].includes(view);

  return (
    <div className={cn(
      "h-screen w-screen flex flex-col bg-[#050508] text-slate-300 border border-white/10 overflow-hidden font-sans transition-all duration-300",
      isCompact ? "p-1" : "p-0"
    )}>
      {/* Header - ultra slim */}
      <div 
        style={{ WebkitAppRegion: 'drag' } as any}
        className="flex items-center justify-between px-3 py-2 bg-[#0a0a0f] border-b border-white/5 cursor-move"
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-jb-purple animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/70">Solvent</span>
        </div>
        
        <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {isToolView && (
            <>
              <button onClick={() => setView('overseer')} className={cn("p-1.5 rounded-md transition-all", "text-slate-600 hover:text-slate-400")} title="Assistant">
                <Shield size={12} />
              </button>
              {view !== 'dash' && (
                <button onClick={() => setView('dash')} className={cn("p-1.5 rounded-md transition-all", "text-slate-600 hover:text-slate-400")} title="Tools">
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
             <button onClick={() => setView('dash')} className="p-1.5 rounded-md transition-all text-slate-600 hover:text-slate-400" title="Tools">
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
        {/* Settings Overlay Dropdown */}
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
                  <div className="flex items-center gap-2">
                    <Brain size={12} />
                    <span>Deep Thinking</span>
                  </div>
                  <div className={cn("w-2 h-2 rounded-full", thinkingModeEnabled ? "bg-jb-purple shadow-[0_0_8px_rgba(157,91,210,1)]" : "bg-slate-800")} />
                </button>

                <button 
                  onClick={() => setAuraMode(auraMode === 'off' ? 'organic' : 'off')}
                  className={cn(
                    "w-full flex items-center justify-between p-2 rounded-lg text-[9px] font-black uppercase transition-all",
                    auraMode !== 'off' ? "bg-jb-orange/20 text-jb-orange" : "bg-white/5 text-slate-500 hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={12} />
                    <span>Visual Effects</span>
                  </div>
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
          {view === 'dash' && (
            <motion.div 
              key="dash"
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
              className="flex-1 flex flex-col gap-4 p-3"
            >
              {/* Action Grid - Cinematic Bento */}
              <div className="grid grid-cols-2 gap-3">
                <ActionButton icon={ChatIcon} label="CHAT" mode="chat" color="text-blue-400" desc="Talk to your assistant" />
                <ActionButton icon={Code2} label="CODE" mode="coding" color="text-jb-accent" desc="Write and run code" />
                <ActionButton icon={Globe} label="SEARCH" mode="browser" color="text-emerald-400" desc="Find info on the web" />
                <ActionButton icon={Waves} label="FLOW" mode="waterfall" color="text-jb-purple" desc="Tiered intelligence" />
              </div>

              {/* Feed/Log */}
              <div className="flex-1 bg-black/40 rounded-xl border border-white/5 p-3 flex flex-col overflow-hidden group">
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Recent Activity</span>
                  </div>
                  <span className="text-[7px] font-mono opacity-40">UTC-8</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                  {activities.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center opacity-20">
                      <Database size={24} strokeWidth={1} />
                      <span className="text-[8px] font-black uppercase mt-2">Buffer Empty</span>
                    </div>
                  ) : (
                    activities.slice(0, 15).map((act, i) => (
                      <div key={i} className="text-[9px] leading-tight flex gap-2 group/msg">
                        <span className={cn(
                          "font-black uppercase text-[6px] px-1 py-0.5 rounded-sm shrink-0 h-fit mt-0.5",
                          act.type === 'user_message' ? "bg-blue-500/20 text-blue-400" : 
                          act.type === 'ai_code_update' ? "bg-emerald-500/20 text-emerald-400" :
                          act.type === 'command' ? "bg-jb-purple/20 text-jb-purple" : "bg-white/10 text-white/50"
                        )}>{act.type?.replace('_', ' ').slice(0, 10)}</span>
                        <span className="text-slate-400/80 line-clamp-2 font-mono">
                          {act.content || act.detail || act.path || JSON.stringify(act)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {(view === 'chat' || view === 'coding') && (
            <motion.div 
              key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col"
            >
              <ChatView compact />
            </motion.div>
          )}

          {view === 'browser' && (
            <motion.div 
              key="browser" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col p-3"
            >
               <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-center gap-4">
                  <Globe size={32} className="opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest max-w-[200px]">Web Search view coming soon. Use the chat for now.</p>
               </div>
               <div className="mt-auto">
                 <ChatView compact />
               </div>
            </motion.div>
          )}

          {view === 'waterfall' && (
            <motion.div 
              key="waterfall" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col overflow-y-auto no-scrollbar"
            >
              <div className="p-4">
                <WaterfallVisualizer />
              </div>
              <div className="mt-auto">
                <ChatView compact />
              </div>
            </motion.div>
          )}

          {view === 'notes' && (
            <motion.div 
              key="notes" initial={{ opacity: 0, x: 5 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -5 }}
              className="flex-1 flex flex-col gap-2 p-3"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Your Notes</span>
                <button 
                  onClick={() => {
                    setNotepadContent('');
                    window.electron?.saveNotepad('');
                  }}
                  className="p-1 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              </div>
              <textarea
                value={notepadContent}
                onChange={(e) => {
                  setNotepadContent(e.target.value);
                  window.electron?.saveNotepad(e.target.value);
                }}
                className="flex-1 bg-black/20 border border-white/5 rounded-xl p-3 text-[10px] font-mono leading-relaxed outline-none resize-none text-slate-300 placeholder:text-slate-800"
                placeholder="Type your notes here..."
                spellCheck={false}
              />
            </motion.div>
          )}

          {view === 'overseer' && (
            <motion.div 
              key="overseer" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex flex-col p-4 gap-4"
            >
              <div className="bg-emerald-500/[0.02] border border-emerald-500/10 rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden group min-h-[140px]">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full group-hover:bg-emerald-500/10 transition-all duration-700" />
                
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Assistant Helper</span>
                </div>
                
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <p className="text-[12px] text-slate-300 leading-relaxed font-medium">
                    {supervisorInsight || "I'm watching your progress. Need a hand with anything? I can summarize your work or take a look at your screen."}
                  </p>
                </div>

                <div className="pt-3 border-t border-emerald-500/10 flex justify-between items-center">
                   <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-[8px] font-black text-emerald-500/50 uppercase">Ready</span>
                   </div>
                   <Activity size={10} className="text-emerald-500/30" />
                </div>
              </div>

              {/* Unique Assistant Tools */}
              <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={() => {
                      window.electron?.logAction?.({ type: 'command', detail: 'Analyze my screen' });
                      setView('chat');
                    }}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
                 >
                    <MousePointer2 size={18} className="text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Read Screen</span>
                 </button>
                 <button 
                    onClick={() => {
                       const summaryPrompt = "Please summarize what we've done so far in this session.";
                       window.electron?.logAction?.({ type: 'command', detail: 'Summarize work' });
                       setView('chat');
                       // We'd need to trigger a message send here ideally
                    }}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
                 >
                    <FileText size={18} className="text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Summarize</span>
                 </button>
                 <button 
                    onClick={() => {
                       // clearActivities logic would go here if we add it to the slice
                       window.electron?.logAction?.({ type: 'command', detail: 'Clear logs' });
                    }}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
                 >
                    <Trash2 size={18} className="text-rose-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Clear Logs</span>
                 </button>
                 <button 
                    onClick={() => setView('notes')}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group"
                 >
                    <PenLine size={18} className="text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Open Notes</span>
                 </button>
              </div>

              {/* Feed/Log - Still visible in Helper view but smaller */}
              <div className="flex-1 bg-black/40 rounded-xl border border-white/5 p-3 flex flex-col overflow-hidden">
                <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                   <div className="w-1 h-1 rounded-full bg-emerald-500/40" />
                   <span>Recent Activity</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar">
                  {activities.slice(0, 5).map((act, i) => (
                    <div key={i} className="text-[8px] leading-tight flex gap-2">
                      <span className="text-slate-500 font-mono opacity-50">{new Date(act.timestamp || Date.now()).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-slate-400 line-clamp-1">{act.content || act.detail || act.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Command Input */}
      <div className="p-3 bg-[#0a0a0f] border-t border-white/5">
        <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-lg px-3 py-1.5 focus-within:border-jb-purple/40 transition-all shadow-inner">
          <Terminal size={10} className="text-slate-600" />
          <input 
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-[10px] outline-none text-slate-300 placeholder:text-slate-700 font-mono"
          />
          <button onClick={sendCommand} className="text-slate-600 hover:text-jb-purple transition-colors">
            <Send size={10} />
          </button>
        </div>
      </div>
    </div>
  );
};