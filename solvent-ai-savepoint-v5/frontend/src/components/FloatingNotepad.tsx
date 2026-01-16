import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { StickyNote, Maximize2, ExternalLink, Save, X, Activity, Zap, Cpu, Terminal, Search, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';

export const FloatingNotepad = () => {
  const { activities, addActivity, supervisorInsight } = useAppStore();
  const [pipWindow, setPipWindow] = useState<any>(null);
  const [note, setNote] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'scratchpad' | 'supervisor'>('scratchpad');
  const lastWriteRef = React.useRef(""); // The "Safety Mirror"
  
  // Load notes on mount and sync with Electron
  useEffect(() => {
    const savedOpenState = localStorage.getItem('solvent_notepad_visible');
    if (savedOpenState === 'false') setIsOpen(false);

    // Initial Fetch from Main Process (Disk)
    if (window.electron?.getNotepad) {
      window.electron.getNotepad().then((content) => {
        if (content) {
          setNote(content);
          lastWriteRef.current = content; // Sync mirror on load
        }
      });

      // 1. WATCH: Listen for AI updates from Electron
      const cleanupNotes = window.electron.onNotepadUpdated((updatedContent) => {
        if (updatedContent !== note && updatedContent !== lastWriteRef.current) {
          setNote(updatedContent);
          lastWriteRef.current = updatedContent;
        }
      });

      // 2. WATCH: Listen for Supervisor Data
      const cleanupSupervisor = window.electron.onSupervisorData((data) => {
        addActivity(data);
      });

      return () => {
        cleanupNotes();
        cleanupSupervisor();
      };
    } else {
      const savedNote = localStorage.getItem('solvent_notepad_content');
      if (savedNote) setNote(savedNote);
    }
  }, []);

  // WRITE: Send user input to the AI's "Eyes"
  useEffect(() => {
    if (window.electron?.saveNotepad) {
      const debounceTimer = setTimeout(() => {
        if (note !== lastWriteRef.current) {
          lastWriteRef.current = note;
          window.electron?.saveNotepad(note);
        }
      }, 700);
      return () => clearTimeout(debounceTimer);
    } else {
      localStorage.setItem('solvent_notepad_content', note);
    }
  }, [note]);

  // Save visibility
  useEffect(() => {
    localStorage.setItem('solvent_notepad_visible', String(isOpen));
  }, [isOpen]);

  const togglePiP = async () => {
    if (pipWindow) {
      pipWindow.close();
      setPipWindow(null);
      return;
    }

    if (!('documentPictureInPicture' in window)) {
        alert("Document Picture-in-Picture is not supported in your browser (use Chrome 116+).");
        return;
    }

    try {
        // @ts-ignore
        const nw = await window.documentPictureInPicture.requestWindow({
            width: 450,
            height: 600,
        });

        nw.document.body.style.backgroundColor = '#020617';
        nw.document.body.style.margin = '0';
        nw.document.body.style.padding = '0';
        nw.document.title = "Solvent Overseer";

        setTimeout(() => {
            [...document.styleSheets].forEach((styleSheet) => {
                try {
                    const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('');
                    const style = document.createElement('style');
                    style.textContent = cssRules;
                    nw.document.head.appendChild(style);
                } catch (e) { 
                    const link = document.createElement('link');
                    if (styleSheet.href) {
                        link.rel = 'stylesheet';
                        link.href = styleSheet.href;
                        nw.document.head.appendChild(link);
                    }
                }
            });
        }, 100);

        nw.addEventListener("pagehide", () => setPipWindow(null));
        setPipWindow(nw);
    } catch (err: any) {
        console.error("Failed to open PiP window", err);
        alert(`PiP Error: ${err.message || err}`);
    }
  };

  const ActivityIcon = ({ type }: { type: string }) => {
    switch (type) {
      case 'user_message': return <Activity size={12} className="text-blue-400" />;
      case 'web_search': return <Search size={12} className="text-cyan-400" />;
      case 'terminal': return <Terminal size={12} className="text-emerald-400" />;
      case 'llm_response': return <Cpu size={12} className="text-purple-400" />;
      default: return <Zap size={12} className="text-amber-400" />;
    }
  };

  const NotepadContent = (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* Tabs */}
      <div className="flex bg-white/[0.03] border-b border-white/5 shrink-0">
        <button 
          onClick={() => setActiveTab('scratchpad')}
          className={cn(
            "flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all",
            activeTab === 'scratchpad' ? "bg-white/5 text-jb-accent border-b-2 border-jb-accent" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <StickyNote size={12} /> Scratchpad
        </button>
        <button 
          onClick={() => setActiveTab('supervisor')}
          className={cn(
            "flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all",
            activeTab === 'supervisor' ? "bg-white/5 text-jb-purple border-b-2 border-jb-purple" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <Activity size={12} /> Supervisor
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'scratchpad' ? (
          <div className="flex flex-col h-full p-6">
            <div className="flex items-center justify-between mb-4 opacity-50">
              <div className="text-[10px] text-slate-600 font-mono flex items-center gap-1">
                  <Save size={10} /> Auto-saved to .solvent_notes.md
              </div>
            </div>
            <textarea
              className="flex-1 bg-transparent border-none outline-none resize-none text-base leading-relaxed placeholder:text-slate-800 scrollbar-thin scrollbar-thumb-white/5"
              placeholder="Type notes for Gemini here..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              spellCheck={false}
            />
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Thought Stream Header */}
            <div className="p-4 bg-jb-purple/5 border-b border-jb-purple/10 shrink-0">
               <div className="flex items-center gap-2 mb-2">
                  <Cpu size={12} className="text-jb-purple animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-jb-purple">Thought Stream</span>
               </div>
               <p className="text-[11px] text-slate-400 italic leading-relaxed">
                  {supervisorInsight || "Monitoring session activities for logic drift..."}
               </p>
            </div>

            {/* Reactive Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/5">
               {activities.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                    <Activity size={32} className="mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No activities recorded</p>
                 </div>
               ) : (
                 activities.map((act, i) => (
                   <motion.div 
                     initial={{ opacity: 0, x: -10 }} 
                     animate={{ opacity: 1, x: 0 }} 
                     key={i} 
                     className="flex gap-3 group"
                   >
                      <div className="flex flex-col items-center gap-1">
                         <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-colors">
                            <ActivityIcon type={act.type} />
                         </div>
                         {i < activities.length - 1 && <div className="w-px flex-1 bg-white/5" />}
                      </div>
                      <div className="pb-4">
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{act.type.replace('_', ' ')}</span>
                            <span className="text-[8px] font-mono text-slate-700">{new Date(act.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                         </div>
                         <p className="text-xs text-slate-300 line-clamp-3 group-hover:line-clamp-none transition-all cursor-default">
                            {act.content || JSON.stringify(act.data)}
                         </p>
                      </div>
                   </motion.div>
                 ))
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!isOpen) {
    return (
        <button 
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 p-4 bg-jb-accent text-white rounded-full shadow-2xl hover:bg-blue-600 transition-all hover:scale-110 group"
        >
            <StickyNote size={24} />
        </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
        <div className={cn(
            "w-80 bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-500 overflow-hidden ring-1 ring-white/5",
            pipWindow ? "h-12" : "h-[500px]"
        )}>
            {/* Header */}
            <div className="h-12 bg-white/5 border-b border-white/5 flex items-center justify-between px-4">
                <div className="flex items-center gap-2 text-slate-300">
                    <Activity size={14} className="text-jb-purple" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Overseer</span>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={togglePiP}
                        className="p-2 hover:bg-white/10 rounded-lg text-jb-accent transition-all hover:scale-110"
                        title={pipWindow ? "Dock to App" : "Pop Out (PiP)"}
                    >
                        {pipWindow ? <Maximize2 size={14} /> : <ExternalLink size={14} />}
                    </button>
                    {!pipWindow && (
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-all"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            {/* Content or PiP Link */}
            {!pipWindow ? (
                <div className="h-[calc(500px-48px)]">
                    {NotepadContent}
                </div>
            ) : (
                <div className="flex items-center justify-center h-full px-4 gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-jb-purple animate-pulse" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Overseer in Pop-out mode</span>
                </div>
            )}
        </div>
        
        {/* Portal for the PiP Window */}
        {pipWindow && createPortal(NotepadContent, pipWindow.document.body)}
    </div>
  );
};