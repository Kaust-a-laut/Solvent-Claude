import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { StickyNote, Maximize2, ExternalLink, Save, X, Activity, Zap, Cpu, Terminal, Search, GripHorizontal } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { Rnd } from 'react-rnd';

export const FloatingNotepad = () => {
  const { activities, addActivity, supervisorInsight, setNotepadContent } = useAppStore();
  const [pipWindow, setPipWindow] = useState<any>(null);
  const [note, setNote] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'scratchpad' | 'supervisor'>('scratchpad');
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('solvent_notepad_pos');
    return saved ? JSON.parse(saved) : { x: window.innerWidth - 360, y: 100 };
  });
  const [size, setSize] = useState(() => {
     const saved = localStorage.getItem('solvent_notepad_size');
     return saved ? JSON.parse(saved) : { width: 340, height: 500 };
  });

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
    setNotepadContent(note);
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

  const saveConfig = (newPos: any, newSize: any) => {
     localStorage.setItem('solvent_notepad_pos', JSON.stringify(newPos));
     localStorage.setItem('solvent_notepad_size', JSON.stringify(newSize));
  };

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
            width: size.width,
            height: size.height,
        });

        // Copy styles for cohesion
        nw.document.body.style.backgroundColor = '#020617';
        nw.document.body.style.margin = '0';
        nw.document.body.style.fontFamily = 'JetBrains Mono, monospace'; // Enforce app font
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
    <div className="flex flex-col h-full bg-[#050508] text-slate-200 font-sans overflow-hidden border border-white/10">
      {/* Tabs */}
      <div className="flex bg-white/[0.02] border-b border-white/5 shrink-0 select-none">
        <button 
          onClick={() => setActiveTab('scratchpad')}
          className={cn(
            "flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all hover:bg-white/5",
            activeTab === 'scratchpad' ? "text-jb-accent border-b border-jb-accent bg-white/5" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <StickyNote size={12} /> Scratchpad
        </button>
        <button 
          onClick={() => setActiveTab('supervisor')}
          className={cn(
            "flex-1 py-3 text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all hover:bg-white/5",
            activeTab === 'supervisor' ? "text-jb-purple border-b border-jb-purple bg-white/5" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <Activity size={12} /> Supervisor
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'scratchpad' ? (
          <div className="flex flex-col h-full">
            <div className="p-2 px-4 flex items-center justify-between border-b border-white/5 bg-white/[0.01]">
              <div className="text-[9px] text-slate-600 font-black uppercase tracking-widest flex items-center gap-1.5">
                  <Save size={10} className="text-jb-accent" /> Auto-Sync Active
              </div>
              <span className="text-[8px] font-mono text-slate-700">.solvent_notes.md</span>
            </div>
            <textarea
              className="flex-1 bg-transparent border-none outline-none resize-none text-[13px] font-mono leading-relaxed placeholder:text-slate-700 scrollbar-thin scrollbar-thumb-white/10 p-4 text-slate-300 selection:bg-jb-accent/30"
              placeholder="// Type notes here..."
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
                  <span className="text-[10px] font-black uppercase tracking-wider text-jb-purple">Context Stream</span>
               </div>
               <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                  {supervisorInsight || "Awaiting system activity..."}
               </p>
            </div>

            {/* Reactive Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
               {activities.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
                    <Activity size={32} className="mb-2 text-slate-500" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">No signals detected</p>
                 </div>
               ) : (
                 activities.map((act, i) => (
                   <div key={i} className="flex gap-3 group">
                      <div className="flex flex-col items-center gap-1">
                         <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-colors shrink-0">
                            <ActivityIcon type={act.type} />
                         </div>
                         {i < activities.length - 1 && <div className="w-px flex-1 bg-white/5" />}
                      </div>
                      <div className="pb-4 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 truncate">{act.type.replace('_', ' ')}</span>
                            <span className="text-[8px] font-mono text-slate-700 shrink-0">{new Date(act.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                         </div>
                         <p className="text-[11px] font-mono text-slate-400 line-clamp-3 group-hover:line-clamp-none transition-all cursor-text break-words">
                            {act.content || JSON.stringify(act.data)}
                         </p>
                      </div>
                   </div>
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
            className="fixed bottom-6 right-6 z-50 p-3 bg-jb-accent text-white rounded-xl shadow-2xl hover:bg-blue-600 transition-all hover:scale-105 group border border-white/10 hover:border-white/20"
            title="Open Notepad"
        >
            <StickyNote size={20} />
        </button>
    );
  }

  return (
    <>
        <Rnd
            size={{ width: size.width, height: size.height }}
            position={{ x: position.x, y: position.y }}
            onDragStop={(e, d) => {
                setPosition({ x: d.x, y: d.y });
                saveConfig({ x: d.x, y: d.y }, size);
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
                setSize({ width: parseInt(ref.style.width), height: parseInt(ref.style.height) });
                setPosition(position);
                saveConfig(position, { width: parseInt(ref.style.width), height: parseInt(ref.style.height) });
            }}
            minWidth={300}
            minHeight={250}
            bounds="window"
            dragHandleClassName="notepad-drag-handle"
            className="z-[100]"
        >
            <div className="w-full h-full flex flex-col bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden ring-1 ring-white/5 transition-all">
                {/* Drag Handle Header */}
                <div 
                    className="notepad-drag-handle h-9 bg-white/5 border-b border-white/5 flex items-center justify-between px-3 cursor-grab active:cursor-grabbing shrink-0 select-none"
                    onDoubleClick={() => setSize({ width: 340, height: 500 })} // Reset size on double click
                >
                    <div className="flex items-center gap-2 text-slate-400 group">
                        <GripHorizontal size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-white transition-colors">Solvent OS</span>
                    </div>
                    <div className="flex items-center gap-1 app-no-drag" onMouseDown={(e) => e.stopPropagation()}>
                        <button 
                            onClick={togglePiP}
                            className={cn(
                                "p-1.5 hover:bg-white/10 rounded-md transition-all hover:scale-105",
                                pipWindow ? "text-jb-purple" : "text-slate-400 hover:text-white"
                            )}
                            title={pipWindow ? "Dock Window" : "Pop Out"}
                        >
                            {pipWindow ? <Maximize2 size={12} /> : <ExternalLink size={12} />}
                        </button>
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="p-1.5 hover:bg-red-500/20 rounded-md text-slate-500 hover:text-red-400 transition-all"
                            title="Close"
                        >
                            <X size={12} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                {!pipWindow ? (
                    <div className="flex-1 overflow-hidden">
                        {NotepadContent}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-3 bg-black/20">
                        <div className="w-12 h-12 rounded-full bg-jb-purple/10 flex items-center justify-center border border-jb-purple/20 animate-pulse">
                            <ExternalLink size={20} className="text-jb-purple" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white uppercase tracking-widest">External Mode</p>
                            <p className="text-[10px] text-slate-500 mt-1">Notepad is active in another window.</p>
                        </div>
                        <button 
                            onClick={togglePiP}
                            className="text-[9px] font-bold text-jb-accent hover:text-white hover:underline uppercase tracking-wider"
                        >
                            Bring Back
                        </button>
                    </div>
                )}
            </div>
        </Rnd>
        
        {/* Portal for the PiP Window */}
        {pipWindow && createPortal(NotepadContent, pipWindow.document.body)}
    </>
  );
};