import React, { useEffect, useState, Suspense } from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Save, X, Minimize2, Maximize2, ExternalLink, GripHorizontal, Network, Sparkles, Terminal, FileText } from 'lucide-react';
import { Rnd } from 'react-rnd';
import { cn } from '../lib/utils';
import { KnowledgeMap } from './KnowledgeMap';

import { socket } from '../lib/socket';

export const FloatingNotepad = () => {

  const {
    notepadContent, setNotepadContent, deviceInfo, isProcessing,
    showKnowledgeMap, setShowKnowledgeMap, graphNodes, graphEdges,
    addGraphNode, addGraphEdge, removeGraphNode, setSupervisorInsight,
    addOverseerDecision, upsertMission, addActivity,
    isCommandCenterOpen: isOpen, setIsCommandCenterOpen: setIsOpen
  } = useAppStore();

  const [isMinimized, setIsMinimized] = useState(false);

    const [lastContent, setLastContent] = useState(notepadContent);

    const [glow, setGlow] = useState(false);

  

    const [position, setPosition] = useState({
      x: typeof window !== 'undefined' ? window.innerWidth - (showKnowledgeMap ? 640 : 420) : 100,
      y: typeof window !== 'undefined' ? window.innerHeight - (showKnowledgeMap ? 620 : 520) : 100,
    });

  

    const [size, setSize] = useState({

      width: showKnowledgeMap ? 600 : 384,

      height: showKnowledgeMap ? 550 : 450

    });

  

    // Update position/size when map toggles or minimized

    useEffect(() => {

      if (isMinimized) {

        setSize(s => ({ ...s, height: 48 }));

      } else {

        setSize({

          width: showKnowledgeMap ? 600 : 384,

          height: showKnowledgeMap ? 550 : 450

        });

      }

    }, [showKnowledgeMap, isMinimized]);

  

    // Auto-load initial content from disk via Electron

  

  useEffect(() => {

    const loadNotes = async () => {
      if (window.electron?.getNotepad) {
        const content = await window.electron.getNotepad();
        if (content !== undefined) {
          setNotepadContent(content);
          setLastContent(content);
        }
      }
    };

    loadNotes();



    // Listen for external syncs

    if (window.electron?.onNotepadUpdated) {

      const cleanup = window.electron.onNotepadUpdated((content) => {

        setNotepadContent(content);
        setLastContent(content);
        setGlow(true);
        setTimeout(() => setGlow(false), 2000);

      });

      return cleanup;

    }

  }, [setNotepadContent]);

  // Listen for Memory Crystallization (Backend Socket)
  useEffect(() => {
    const handleCrystallize = (data: any) => {
      console.log("Memory Crystallized:", data);
      setGlow(true);
      setTimeout(() => setGlow(false), 3000);
    };
    
    socket.on('MEMORY_CRYSTALLIZED', handleCrystallize);
    return () => {
      socket.off('MEMORY_CRYSTALLIZED', handleCrystallize);
    };
  }, []);

  const handleSave = async () => {
    if (window.electron?.saveNotepad) {
       window.electron.saveNotepad(notepadContent);
       setLastContent(notepadContent);
    }
  };



    const [isFirstLoad, setIsFirstLoad] = useState(true);

    // Glow effect on AI update

    useEffect(() => {
      if (notepadContent !== lastContent) {
        setLastContent(notepadContent);
        
        // Don't auto-open on the very first load from disk
        if (isFirstLoad) {
          setIsFirstLoad(false);
          return;
        }

        if (!isOpen) setIsOpen(true); 
        setGlow(true);
        setTimeout(() => setGlow(false), 2000);
      }
    }, [notepadContent, isFirstLoad, isOpen, lastContent, setIsOpen]);



  



    // Real-time Logic Sync with Overseer



    useEffect(() => {



      const handleSupervisorUpdate = (analysis: any) => {



        console.log('[Overseer] State Update Received:', analysis);



        



        if (analysis.nodesToAdd) {



          analysis.nodesToAdd.forEach((n: any) => addGraphNode(n));



        }



        if (analysis.edgesToAdd) {



          analysis.edgesToAdd.forEach((e: any) => addGraphEdge(e));



        }



        if (analysis.nodesToRemove) {



          analysis.nodesToRemove.forEach((id: string) => removeGraphNode(id));



        }



        if (analysis.insight) {



          setSupervisorInsight(analysis.insight);



        }



      };



  



      socket.on('SUPERVISOR_UPDATE', handleSupervisorUpdate);

      return () => {
        socket.off('SUPERVISOR_UPDATE', handleSupervisorUpdate);
      };

    }, [addGraphNode, addGraphEdge, removeGraphNode, setSupervisorInsight]);

  // Overseer decisions, nudges, and mission progress events
  useEffect(() => {
    const handleOverseerDecision = (data: any) => {
      addOverseerDecision({ ...data, trigger: data.trigger || 'system' });
      if (data.intervention?.message) {
        setSupervisorInsight(data.intervention.message);
      }
      addActivity({ type: 'overseer', message: data.decision?.slice(0, 80) || 'Overseer decision', source: 'Overseer' });
    };

    const handleNudge = (data: { message: string }) => {
      setSupervisorInsight(data.message);
      addActivity({ type: 'supervisor', message: data.message?.slice(0, 80), source: 'Overseer Nudge' });
    };

    const handleMissionProgress = (data: { jobId: string; progress: number }) => {
      upsertMission({ jobId: data.jobId, progress: data.progress, status: 'active' });
    };

    const handleMissionComplete = (data: { jobId: string; result: unknown }) => {
      upsertMission({ jobId: data.jobId, status: 'complete', progress: 100, result: data.result });
      addActivity({ type: 'success', message: 'Mission completed', source: 'Orchestration' });
    };

    const handleMissionFailed = (data: { jobId: string; error: string }) => {
      upsertMission({ jobId: data.jobId, status: 'failed', error: data.error });
      addActivity({ type: 'warning', message: `Mission failed: ${data.error?.slice(0, 60)}`, source: 'Orchestration' });
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
  }, [addOverseerDecision, setSupervisorInsight, upsertMission, addActivity]);



  



        const openPiP = () => {



  



          const url = window.location.origin + '?pip=notepad';



  



          window.open(url, '_blank', 'width=400,height=600');



  



          setIsOpen(false);



  



        };



  



    if (!isOpen) return null;

  return (
    <Rnd
      size={{
        width: size.width,
        height: size.height
      }}
      position={{
        x: position.x,
        y: position.y,
      }}
      onDragStop={(e, d) => {
        setPosition({ x: d.x, y: d.y });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        setSize({
          width: ref.offsetWidth,
          height: ref.offsetHeight,
        });
        setPosition(position);
      }}
      minWidth={300}
      minHeight={isMinimized ? 48 : 200}
      dragHandleClassName="drag-handle"
      bounds="window"
      enableResizing={!isMinimized}
      className="z-50"
    >
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={cn(
           "h-full w-full flex flex-col rounded-2xl overflow-hidden border backdrop-blur-2xl transition-all duration-500",
           "bg-[#050508]/95 border-white/10 shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)]",
           glow ? "border-jb-purple/50" : 
           isProcessing ? "border-jb-accent/30" : ""
        )}
      >
         {/* Header */}
         <div className="drag-handle flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/5 cursor-move shrink-0">
            <div className="flex items-center gap-3">
               <GripHorizontal size={12} className="text-slate-700" />
               <div className="flex items-center gap-2">
                  <Terminal size={14} className="text-jb-purple" />
                  {!isMinimized && (
                     <span className="text-[10px] font-black text-white uppercase tracking-widest">Mission Control</span>
                  )}
               </div>
            </div>
            
            <div className="flex items-center gap-1.5">
               {/* New Integrated Knowledge Map Toggle */}
               <button 
                  onClick={() => setShowKnowledgeMap(!showKnowledgeMap)}
                  className={cn(
                     "flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all text-[9px] font-black uppercase tracking-wider",
                     showKnowledgeMap 
                        ? "bg-jb-accent/20 border-jb-accent/40 text-jb-accent shadow-[0_0_15px_-5px_rgba(60,113,247,0.5)]" 
                        : "bg-white/5 border-white/10 text-slate-500 hover:text-white hover:border-white/20"
                  )}
                  title="Toggle Logic Knowledge Map"
               >
                  {showKnowledgeMap ? <FileText size={12} /> : <Network size={12} className={cn(showKnowledgeMap && "animate-pulse")} />}
                  {!isMinimized && <span>{showKnowledgeMap ? 'Directives' : 'Logic Map'}</span>}
               </button>

               <div className="w-[1px] h-4 bg-white/5 mx-1" />

               <button onClick={handleSave} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors" title="Save to Project Memory">
                  <Save size={14} />
               </button>
               <button onClick={openPiP} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors" title="Detach (PiP Mode)">
                  <ExternalLink size={14} />
               </button>
               <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors">
                  {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
               </button>
               <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-lg text-slate-500 transition-all">
                  <X size={14} />
               </button>
            </div>
         </div>

         {/* Content Area */}
         <AnimatePresence mode="wait">
            {!isMinimized && (
               <motion.div
                  key={showKnowledgeMap ? 'map' : 'notes'}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 relative flex flex-col overflow-hidden"
               >
                  {showKnowledgeMap ? (
                     <div className="flex-1 flex flex-col relative bg-black/40">
                        {/* Logic Pulse Background for Map */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                           <motion.div 
                              animate={{ 
                                 scale: [1, 1.2, 1],
                                 opacity: [0.03, 0.08, 0.03]
                              }}
                              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-jb-purple rounded-full blur-[100px]" 
                           />
                        </div>

                        <div className="flex-1 relative z-10">
                           <Suspense fallback={<div className="flex items-center justify-center h-full"><Network size={24} className="text-jb-purple animate-pulse" /></div>}>
                              {showKnowledgeMap && <KnowledgeMap />}
                           </Suspense>
                        </div>

                        {/* Map HUD Overlay */}
                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-[8px] font-black text-slate-600 uppercase tracking-widest pointer-events-none bg-black/40 backdrop-blur-md p-2 rounded-lg border border-white/5">
                           <div className="flex items-center gap-3">
                              <span className="text-jb-accent">{graphNodes.length} NODES</span>
                              <span className="w-1 h-1 bg-white/10 rounded-full" />
                              <span className="text-jb-orange">{graphEdges.length} LINKS</span>
                           </div>
                           <span>Logic Mapping Active</span>
                        </div>
                     </div>
                  ) : (
                     <>
                        <textarea
                           value={notepadContent}
                           onChange={(e) => {
                              const newContent = e.target.value;
                              setNotepadContent(newContent);
                              if (window.electron?.saveNotepad) {
                                 window.electron.saveNotepad(newContent);
                              }
                           }}
                           placeholder="Mission directive context..."
                           className="flex-1 bg-transparent p-6 text-xs text-slate-300 resize-none focus:outline-none font-mono leading-relaxed placeholder:text-slate-800"
                           spellCheck={false}
                        />
                        <div className="p-3 px-6 border-t border-white/5 bg-white/[0.01] flex justify-between items-center shrink-0">
                           <div className="flex items-center gap-2">
                              <div className={cn("w-1.5 h-1.5 rounded-full", isProcessing ? "bg-jb-orange animate-pulse" : "bg-green-500")} />
                              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{isProcessing ? 'Processing' : 'Agent Ready'}</span>
                           </div>
                           <span className="text-[9px] font-mono text-slate-700 tracking-tighter">{notepadContent.length.toString().padStart(5, '0')} BYTES</span>
                        </div>
                     </>
                  )}
               </motion.div>
            )}
         </AnimatePresence>
      </motion.div>
    </Rnd>
  );
};
