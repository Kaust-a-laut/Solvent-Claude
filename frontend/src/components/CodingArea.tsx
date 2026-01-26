import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { FileExplorer } from './FileExplorer';
import { 
  X, Save, Play, Terminal as TerminalIcon, FileCode, 
  Globe, RefreshCw, Maximize2, ExternalLink, 
  Loader2, Zap, Bug, Sparkles, ChevronRight, 
  Layout, Cpu, Check, Copy, Wand2, TestTube,
  FlaskConical, MessageSquare, MessageSquareX,
  PanelLeftClose, PanelLeftOpen, ChevronDown,
  Menu as MenuIcon, Command, Search, Settings, Box
} from 'lucide-react';
import { cn } from '../lib/utils';
import { WebContainer } from '@webcontainer/api';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL, BASE_URL } from '../lib/config';
import { ChatView } from './ChatView';
import { fetchWithRetry } from '../lib/api-client';
import { ReviewScorecard } from './ReviewScorecard';

export const CodingArea = () => {
  const { 
    openFiles, setOpenFiles, activeFile, setActiveFile, 
    deviceInfo, selectedCloudModel, selectedCloudProvider, modeConfigs,
    showCodingChat, setShowCodingChat, apiKeys
  } = useAppStore();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>(["[SYSTEM]: Agentic IDE Core Initialized.", "[SYSTEM]: Ready for mission directives."]);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBooting, setIsBooting] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isAISidebarOpen, setIsAISidebarOpen] = useState(false);
  const [reviewState, setReviewState] = useState<any>(null);
  
  // WebContainer State
  const [webContainer, setWebContainer] = useState<WebContainer | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [iframeLoading, setIframeLoading] = useState(false);
  const [availablePorts, setAvailablePorts] = useState<{port: number, url: string}[]>([]);
  const [currentUrl, setCurrentUrl] = useState("");
  const [bootStatus, setBootStatus] = useState<'idle' | 'booting' | 'ready' | 'error'>('idle');

  const currentFile = openFiles.find(f => f.path === activeFile);

  // Auto-scroll terminal
  useEffect(() => {
    const terminal = document.getElementById('terminal-content');
    if (terminal) {
      terminal.scrollTop = terminal.scrollHeight;
    }
  }, [terminalOutput]);

  const bootWebContainer = async () => {
    if (bootStatus !== 'idle') return;
    setBootStatus('booting');
    setTerminalOutput(prev => [...prev, "[SYSTEM]: Initiating WebContainer virtualization..."]);
    
    try {
      const instance = await WebContainer.boot();
      setWebContainer(instance);
      setBootStatus('ready');
      setTerminalOutput(prev => [...prev, "[SYSTEM]: WebContainer environment booted successfully."]);
      
      instance.on('server-ready', (port, url) => {
        setAvailablePorts(prev => {
          if (prev.find(p => p.port === port)) return prev;
          return [...prev, { port, url }];
        });
        setIframeUrl(url);
        setCurrentUrl(url);
        setIframeLoading(true);
        if (!deviceInfo.isMobile) setShowPreview(true);
      });

      instance.on('error', (err) => {
        setTerminalOutput(prev => [...prev, `[WC-ERROR]: ${err.message}`]);
      });
    } catch (error: any) {
      console.error("Failed to boot WebContainer:", error);
      setTerminalOutput(prev => [...prev, `[ERROR]: Failed to boot WebContainer: ${error.message}`]);
      setBootStatus('error');
    }
  };

  // Sync files to WebContainer
  useEffect(() => {
    if (!webContainer || openFiles.length === 0) return;

    const mountFiles = async () => {
      const fileTree: any = {};
      for (const file of openFiles) {
        const parts = file.path.split('/');
        let current = fileTree;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) current[parts[i]] = { directory: {} };
          current = current[parts[i]].directory;
        }
        current[parts[parts.length - 1]] = {
          file: { contents: file.content }
        };
      }
      await webContainer.mount(fileTree);
    };

    mountFiles();
  }, [webContainer, openFiles]);

  const handleFileSelect = async (path: string) => {
    if (openFiles.find(f => f.path === path)) {
      setActiveFile(path);
      return;
    }

    try {
      const data = await fetchWithRetry(`${BASE_URL}/api/files/read?path=${encodeURIComponent(path)}`);
      const newFiles = [...openFiles, { path, content: data.content }];
      setOpenFiles(newFiles);
      setActiveFile(path);
    } catch (e) {
      console.error("Failed to read file", e);
    }
  };

  const closeFile = (path: string) => {
    const newFiles = openFiles.filter(f => f.path !== path);
    setOpenFiles(newFiles);
    if (activeFile === path) {
      setActiveFile(newFiles.length > 0 ? newFiles[newFiles.length - 1].path : null);
    }
  };

  const handleSave = async () => {
    if (!activeFile || !currentFile) return;
    try {
      const data = await fetchWithRetry(`${BASE_URL}/api/files/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFile, content: currentFile.content })
      });
      if (data.status === 'success') {
        setTerminalOutput(prev => [...prev, `[SYSTEM]: File ${activeFile} saved to disk.`]);
      }
    } catch (e) {
      setTerminalOutput(prev => [...prev, `[ERROR]: Failed to save ${activeFile}`]);
    }
  };

  const handleRun = async () => {
    setIsTerminalOpen(true);
    if (!webContainer || isRunning) {
      if (!activeFile) return;
      setTerminalOutput(prev => [...prev, `[SYSTEM]: Executing ${activeFile} on host...`]);
      try {
        const data = await fetchWithRetry(`${BASE_URL}/api/files/shell`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: `node ${activeFile}` })
        });
        if (data.stdout) setTerminalOutput(prev => [...prev, data.stdout]);
        if (data.stderr) setTerminalOutput(prev => [...prev, `[STDERR]: ${data.stderr}`]);
      } catch (e) {
        setTerminalOutput(prev => [...prev, `[ERROR]: Execution failed.`]);
      }
      return;
    }

    setIsRunning(true);
    setTerminalOutput(prev => [...prev, "[SYSTEM]: Starting execution pipeline..."]);
    try {
      if (openFiles.some(f => f.path.endsWith('package.json'))) {
        setTerminalOutput(prev => [...prev, "> npm install"]);
        const installProcess = await webContainer.spawn('npm', ['install']);
        installProcess.output.pipeTo(new WritableStream({
          write(data) { setTerminalOutput(prev => [...prev, data]); }
        }));
        if ((await installProcess.exit) !== 0) throw new Error("Installation failed");
      }

      let startCmd = 'node';
      let args = [activeFile || 'index.js'];
      const pkgFile = openFiles.find(f => f.path.endsWith('package.json'));
      if (pkgFile) {
        try {
          const pkg = JSON.parse(pkgFile.content);
          if (pkg.scripts?.start) {
            startCmd = 'npm';
            args = ['start'];
          }
        } catch (e) {}
      }

      setTerminalOutput(prev => [...prev, `> ${startCmd} ${args.join(' ')}`]);
      const process = await webContainer.spawn(startCmd, args);
      process.output.pipeTo(new WritableStream({
        write(data) { setTerminalOutput(prev => [...prev, data]); }
      }));
    } catch (error: any) {
      setTerminalOutput(prev => [...prev, `[ERROR]: Execution failed: ${error.message}`]);
      setIsRunning(false);
    }
  };

  const handleAIAction = async (action: string) => {
    if (isGenerating || !currentFile) return;
    setIsTerminalOpen(true);
    setIsGenerating(true);
    setTerminalOutput(prev => [...prev, `[AGENT]: Initiating ${action} sequence for ${activeFile}...`]);

    try {
      if (action === 'Waterfall') {
        const response = await fetch(`${API_BASE_URL}/waterfall`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Solvent-Secret': 'solvent_internal_dev_secret'
          },
          body: JSON.stringify({
            prompt: `Refactor and enhance the logic in ${activeFile}. Ensure robustness and modern patterns.`, 
            globalProvider: selectedCloudProvider,
            openFiles
          })
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error("Stream reader not available");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
          
          for (const line of lines) {
            const data = JSON.parse(line.replace('data: ', ''));
            if (data.phase) setTerminalOutput(prev => [...prev, `[WATERFALL]: ${data.phase.toUpperCase()}...`]);
            
            if (data.phase === 'reviewing') {
              setReviewState({
                 status: 'analyzing',
                 score: 0,
                 breakdown: { syntax: 0, security: 0, logic: 0, efficiency: 0 },
                 issues: [],
                 attempt: data.attempt || 1
              });
              setTerminalOutput(prev => [...prev, `[AUDITOR]: Senior Architect reviewing code (Attempt ${data.attempt})...`]);
            }
         
            if (data.phase === 'retrying') {
              setReviewState({
                 status: 'rejected',
                 score: data.reviewer?.score || 65,
                 breakdown: data.reviewer?.breakdown || { syntax: 10, security: 10, logic: 25, efficiency: 10 },
                 issues: data.reviewer?.issues || data.issues || [],
                 attempt: data.attempt || 1
              });
              setTerminalOutput(prev => [...prev, `[AUDITOR]: Rejected (Score: ${data.reviewer?.score}). Triggering re-write...`]);
            }

            if (data.phase === 'final') {
              if (data.reviewer) {
                setReviewState({
                  status: 'approved',
                  score: data.reviewer.score,
                  breakdown: data.reviewer.breakdown,
                  issues: [],
                  attempt: data.attempts
                });
                setTimeout(() => setReviewState(null), 8000);
              }

              if (data.executor?.code) {
                 const newFiles = openFiles.map(f => 
                   f.path === activeFile ? { ...f, content: data.executor.code } : f
                 );
                 setOpenFiles(newFiles);
              }
            }
          }
        }
        setTerminalOutput(prev => [...prev, `[AGENT]: Waterfall Architect completed successfully.`]);
      } else {
        const data = await fetchWithRetry(`${API_BASE_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: selectedCloudProvider || 'gemini',
            model: selectedCloudModel,
            openFiles,
            messages: [
              { role: 'system', content: `You are a Senior Lead Engineer. ${action} the provided code. Maintain style and safety. Return ONLY the full updated code.` },
              { role: 'user', content: `File: ${activeFile}\nCode:\n${currentFile.content}` }
            ],
            apiKeys
          })
        });
        
        if (data.response) {
          const cleanedCode = data.response.replace(/```[a-z]*\n/g, '').replace(/```/g, '').trim();
          const newFiles = openFiles.map(f => 
            f.path === activeFile ? { ...f, content: cleanedCode } : f
          );
          setOpenFiles(newFiles);
          setTerminalOutput(prev => [...prev, `[AGENT]: ${action} completed.`]);
        }
      }
    } catch (e: any) {
      setTerminalOutput(prev => [...prev, `[ERROR]: Agentic workflow failed: ${e.message}`]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#020205] text-slate-300 font-sans relative">
      
      {/* Floating Sidebar Explorer */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute left-4 top-20 bottom-4 w-64 z-40 glass-panel rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden"
          >
            <div className="h-full flex flex-col">
              <div className="p-4 border-b border-white/[0.03] flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">File System</span>
                <X size={14} className="text-white/20 hover:text-white cursor-pointer" onClick={() => setIsSidebarOpen(false)} />
              </div>
              <div className="flex-1 overflow-y-auto">
                <FileExplorer onFileSelect={handleFileSelect} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Toolkit Sidebar */}
      <AnimatePresence>
        {isAISidebarOpen && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="absolute right-4 top-20 bottom-4 w-72 z-40 glass-panel rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
          >
            <div className="p-5 border-b border-white/[0.03] flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">AI Engineering Toolkit</span>
              <X size={14} className="text-white/20 hover:text-white cursor-pointer" onClick={() => setIsAISidebarOpen(false)} />
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
               <div className="space-y-3">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Active File Context</span>
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                     <p className="text-[10px] font-bold text-white/60 truncate">{activeFile || 'No file selected'}</p>
                     <p className="text-[8px] text-slate-500 mt-1 uppercase">Ready for Neural Refactoring</p>
                  </div>
               </div>

               <div className="space-y-2">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Agentic Procedures</span>
                  <div className="grid grid-cols-1 gap-2">
                     {[ 
                        { id: 'Refactor', icon: Wand2, color: 'text-jb-accent', desc: 'Modernize patterns' },
                        { id: 'Optimize', icon: Zap, color: 'text-amber-400', desc: 'Performance logic' },
                        { id: 'Debug', icon: Bug, color: 'text-rose-500', desc: 'Logic scan' },
                        { id: 'Test', icon: TestTube, color: 'text-emerald-400', desc: 'Unit coverage' }
                     ].map(tool => (
                        <button 
                           key={tool.id}
                           onClick={() => handleAIAction(tool.id)}
                           className="w-full p-4 rounded-2xl bg-white/[0.03] border border-white/[0.05] hover:border-white/10 hover:bg-white/[0.05] transition-all text-left group"
                        >
                           <div className="flex items-center gap-3">
                              <tool.icon size={16} className={cn(tool.color)} />
                              <div>
                                 <p className="text-[10px] font-black text-white uppercase tracking-wider">{tool.id}</p>
                                 <p className="text-[8px] text-slate-500 font-bold uppercase">{tool.desc}</p>
                              </div>
                           </div>
                        </button>
                     ))}
                  </div>
               </div>

               <div className="space-y-3 pt-4 border-t border-white/[0.03]">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Architectural Flow</span>
                  <button 
                     onClick={() => handleAIAction('Waterfall')}
                     className="w-full p-5 rounded-3xl bg-jb-purple/10 border border-jb-purple/20 hover:border-jb-purple/40 transition-all text-left group relative overflow-hidden"
                  >
                     <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <FlaskConical size={40} className={cn(isGenerating && "animate-spin")} />
                     </div>
                     <div className="relative z-10">
                        <p className="text-[11px] font-black text-jb-purple uppercase tracking-widest">Initiate Architect</p>
                        <p className="text-[8px] text-slate-400 font-bold mt-1 leading-relaxed">4-Stage Reasoning Pipeline</p>
                     </div>
                  </button>
               </div>
            </div>

            <div className="p-5 border-t border-white/[0.03] bg-white/[0.01]">
               <div className="flex items-center gap-3 text-emerald-500/60">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em]">Neural Link: Stable</span>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        
        {/* CONSOLIDATED COMMAND CENTER */}
        <div className="h-16 flex items-center px-6 gap-6 select-none shrink-0 z-30 relative">
           {/* Section 1: Navigation & Menu */}
           <div className="flex items-center gap-2 relative z-10">
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl border glass-panel border-white/[0.03] text-white/40">
                <TerminalIcon size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] hidden md:inline">Agentic IDE</span>
              </div>
           </div>

           {/* Section 2: Agentic Identity */}
           <div className="flex-1 flex justify-center min-w-0 relative z-10">
              <div className="flex items-center gap-3 px-6 py-2 rounded-2xl border border-white/[0.03] glass-panel">
                 <div className="w-2 h-2 rounded-full bg-jb-accent animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">System Core Synchronized</span>
              </div>
           </div>

           {/* Section 3: View, Run & Status */}
           <div className="flex items-center gap-3 shrink-0 relative z-10">
              {bootStatus === 'idle' && (
                <button 
                  onClick={bootWebContainer}
                  className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-jb-orange/30 bg-jb-orange/5 text-jb-orange hover:bg-jb-orange/10 transition-all shadow-[0_0_15px_rgba(251,146,60,0.1)]"
                >
                  <Box size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Initialize Sandbox</span>
                </button>
              )}

              {bootStatus === 'booting' && (
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-white/5 text-white/40">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Booting Core...</span>
                </div>
              )}

              <button 
                onClick={() => setShowCodingChat(!showCodingChat)}
                className={cn(
                  "flex items-center gap-2.5 px-5 py-2 rounded-xl transition-all border glass-panel button-glow-hover",
                  showCodingChat 
                    ? "text-jb-accent border-jb-accent/40 bg-jb-accent/10" 
                    : "text-white/40 border-white/[0.03]"
                )}
              >
                <MessageSquare size={15} />
                <span className="text-[10px] font-black uppercase tracking-widest">Logic</span>
              </button>
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handleSave}
                  disabled={!activeFile}
                  className="p-2.5 rounded-2xl glass-panel border-white/[0.03] text-white/40 hover:text-white disabled:opacity-10"
                >
                  <Save size={18} />
                </button>
                <button 
                  onClick={handleRun} 
                  className="p-2.5 rounded-2xl glass-panel border-white/[0.03] text-jb-accent button-glow-hover"
                >
                  <Play size={18} fill="currentColor" fillOpacity={0.2} />
                </button>
              </div>
           </div>
        </div>

        {/* Editor & Preview Split */}
        <div className="flex-1 flex overflow-hidden relative px-4 pb-4 gap-4">
          
          <AnimatePresence>
            {showCodingChat && (
              <motion.div 
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                className="absolute right-4 top-0 bottom-24 w-[400px] z-40 glass-panel rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden"
              >
                <div className="h-full flex flex-col">
                   <div className="p-5 border-b border-white/[0.03] flex items-center justify-between">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Logic Inspector</span>
                        <div className="flex items-center gap-1.5 mt-1">
                           <div className="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                           <span className="text-[7px] font-black text-emerald-500/60 uppercase tracking-widest">Connected</span>
                        </div>
                     </div>
                     <X size={14} className="text-white/20 hover:text-white cursor-pointer" onClick={() => setShowCodingChat(false)} />
                   </div>
                   <div className="flex-1">
                     <ChatView compact />
                   </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Editor Area */}
          <div className="flex-1 glass-panel rounded-3xl overflow-hidden border-white/[0.03]">
             {/* FILE TABS */}
             <div className="h-12 bg-black/20 border-b border-white/[0.03] flex items-center px-4 gap-2 overflow-x-auto no-scrollbar">
                {openFiles.map(file => (
                  <div 
                    key={file.path}
                    onClick={() => setActiveFile(file.path)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all border",
                      activeFile === file.path 
                        ? "bg-jb-accent/10 text-jb-accent border-jb-accent/30 shadow-[0_0_15px_rgba(60,113,247,0.1)]" 
                        : "text-white/20 border-transparent hover:text-white/40 hover:bg-white/5"
                    )}
                  >
                    <FileCode size={13} />
                    <span>{file.path.split('/').pop()}</span>
                    <X size={12} className="hover:text-jb-orange" onClick={(e) => { e.stopPropagation(); closeFile(file.path); }} />
                  </div>
                ))}
             </div>
             
             <div className="flex-1 h-[calc(100%-48px)]">
                {currentFile ? (
                  <Editor
                    key={activeFile}
                    height="100%"
                    language={currentFile.path.split('.').pop() === 'js' ? 'javascript' : (currentFile.path.split('.').pop() === 'ts' ? 'typescript' : 'javascript')}
                    value={currentFile.content}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: true, scale: 0.75 },
                      fontSize: 13,
                      fontFamily: "'JetBrains Mono', monospace",
                      fontLigatures: true,
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 20 }
                    }}
                    onChange={(value) => {
                      const newFiles = openFiles.map(f => 
                        f.path === activeFile ? { ...f, content: value || "" } : f
                      );
                      setOpenFiles(newFiles);
                    }}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-10 gap-6">
                     <Cpu size={60} strokeWidth={1} />
                     <span className="text-[10px] font-black uppercase tracking-[0.5em]">Central Intelligence Offline</span>
                  </div>
                )}
             </div>
          </div>

          {/* Preview Panel - Fixed to right side when open */}
          {showPreview && !deviceInfo.isMobile && (
             <motion.div 
               initial={{ width: 0, opacity: 0 }}
               animate={{ width: '40%', opacity: 1 }}
               className="glass-panel rounded-3xl overflow-hidden border-white/[0.03] bg-white flex flex-col"
             >
                <div className="h-12 bg-slate-50 border-b border-slate-200 flex items-center px-4 justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                   </div>
                   <div className="flex-1 max-w-sm mx-4 bg-white border border-slate-200 rounded-lg px-3 py-1 flex items-center gap-2">
                      <Globe size={12} className="text-slate-400" />
                      <span className="text-[10px] font-mono text-slate-500 truncate">{iframeUrl || 'localhost:3000'}</span>
                   </div>
                   <X size={16} className="text-slate-400 cursor-pointer hover:text-slate-600" onClick={() => setShowPreview(false)} />
                </div>
                <div className="flex-1 bg-white relative">
                   {iframeUrl ? (
                     <iframe src={iframeUrl} className="w-full h-full border-none" />
                   ) : (
                     <div className="h-full flex items-center justify-center text-slate-200">
                        <Layout size={48} strokeWidth={1} />
                     </div>
                   )}
                </div>
             </motion.div>
          )}
        </div>

        {/* Agentic Console Toggle */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3">
           <button 
             onClick={() => setIsSidebarOpen(!isSidebarOpen)}
             className={cn(
               "flex items-center gap-3 px-6 py-2.5 rounded-full glass-panel border-white/[0.03] transition-all button-glow-hover",
               isSidebarOpen ? "text-jb-accent border-jb-accent/30 bg-jb-accent/10" : "text-white/40 hover:text-white"
             )}
           >
             <Layout size={16} />
             <span className="text-[10px] font-black uppercase tracking-widest">Files</span>
           </button>

           <button 
             onClick={() => setIsTerminalOpen(!isTerminalOpen)}
             className={cn(
               "flex items-center gap-3 px-6 py-2.5 rounded-full glass-panel border-white/[0.03] transition-all button-glow-hover",
               isTerminalOpen ? "text-jb-orange border-jb-orange/30 bg-jb-orange/10" : "text-white/40 hover:text-white"
             )}
           >
             <TerminalIcon size={16} />
             <span className="text-[10px] font-black uppercase tracking-widest">System Console</span>
             <div className={cn("ml-2 w-1.5 h-1.5 rounded-full", isTerminalOpen ? "bg-jb-orange animate-pulse" : "bg-white/20")} />
           </button>

           <button 
             onClick={() => setIsAISidebarOpen(!isAISidebarOpen)}
             className={cn(
               "flex items-center gap-3 px-6 py-2.5 rounded-full glass-panel border-white/[0.03] transition-all button-glow-hover",
               isAISidebarOpen ? "text-jb-purple border-jb-purple/30 bg-jb-purple/10" : "text-white/40 hover:text-white"
             )}
           >
             <Box size={16} />
             <span className="text-[10px] font-black uppercase tracking-widest">AI Toolkit</span>
           </button>
        </div>

        {/* Terminal Overlay */}
        <AnimatePresence>
          {isTerminalOpen && (
            <motion.div 
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-4xl h-64 z-40 glass-panel rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col"
            >
              <div className="px-6 py-3 border-b border-white/[0.03] flex items-center justify-between shrink-0">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">IDE Console</span>
                <X size={14} className="text-white/20 hover:text-white cursor-pointer" onClick={() => setIsTerminalOpen(false)} />
              </div>
              <div id="terminal-content" className="flex-1 p-6 overflow-y-auto font-mono text-[11px] leading-relaxed scrollbar-thin">
                {terminalOutput.map((line, i) => (
                  <div key={i} className={cn(
                    "mb-1",
                    line.startsWith('[SYSTEM]') ? "text-jb-accent" :
                    line.startsWith('[AGENT]') ? "text-jb-purple" :
                    line.startsWith('[ERROR]') ? "text-rose-500" : "text-white/40"
                  )}>{line}</div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {reviewState && (
            <ReviewScorecard 
              score={reviewState.score}
              breakdown={reviewState.breakdown}
              issues={reviewState.issues}
              status={reviewState.status}
              attempt={reviewState.attempt}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
