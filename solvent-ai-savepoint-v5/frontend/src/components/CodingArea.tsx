import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { API_BASE_URL } from '../lib/config';
import { Code, Terminal, Play, Save, Copy, FileCode, Check, Loader2, Cpu, ChevronRight, Globe, RefreshCw, Layout, Sparkles, Bug, Zap, TestTube, Wand2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { WebContainer } from '@webcontainer/api';
import Editor from '@monaco-editor/react';

interface CodeFile {
  name: string;
  language: string;
  content: string;
}

export const CodingArea = () => {
  const { modeConfigs, selectedCloudModel, deviceInfo } = useAppStore();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [files, setFiles] = useState<CodeFile[]>([
    { name: 'index.js', language: 'javascript', content: `const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello from Solvent AI WebContainer!');
});

app.listen(port, () => {
  console.log("App listening at http://localhost:\${port}");
});` },
    { name: 'package.json', language: 'json', content: `{ 
  "name": "example-app",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "latest"
  }
}` }
  ]);
  const [streamedResponse, setStreamedResponse] = useState("");
  const [showPrompt, setShowPrompt] = useState(true);
  
  // WebContainer State
  const [webContainer, setWebContainer] = useState<WebContainer | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [isBooting, setIsBooting] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(false);

  const config = modeConfigs['coding'] || { provider: 'auto', model: 'gemini-3-pro-preview' };

  useEffect(() => {
    if (deviceInfo.isMobile) {
      setShowPrompt(false);
    } else {
      setShowPrompt(true);
    }
  }, [deviceInfo.isMobile]);

  // 9. Document communication protocol
  // Protocol: Messages from the iframe should be JSON objects.
  // Example: { type: 'LOG', payload: '...' } or { type: 'ERROR', payload: '...' }
  // 4. Implement postMessage for iframe communication
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Basic security check: ensure we are receiving from a valid source if possible.
      // Since WebContainer URLs are dynamic/local, we log for now.
      console.log("[Parent] Received message:", event.data);
      if (event.data?.type === 'ERROR') {
         setTerminalOutput(prev => [...prev, `[App Error] ${event.data.payload}`]);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Boot WebContainer
  useEffect(() => {
    async function boot() {
      try {
        const instance = await WebContainer.boot();
        setWebContainer(instance);
        setIsBooting(false);
        
        // 1. Listen for the container to say "I am listening on a port"
        instance.on('server-ready', (port, url) => {
          // 2. Set your iframe to that URL
          setIframeUrl(url);
          setIframeLoading(true);
          if (!deviceInfo.isMobile) setShowPreview(true);
        });
      } catch (error) {
        console.error("Failed to boot WebContainer:", error);
        setTerminalOutput(prev => [...prev, "Error: Failed to boot WebContainer enviroment."]);
        setIsBooting(false);
      }
    }
    boot();
  }, []);

  // Sync files to WebContainer
  useEffect(() => {
    if (!webContainer || files.length === 0) return;

    const fileTree = files.reduce((acc, file) => {
      acc[file.name] = {
        file: { contents: file.content }
      };
      return acc;
    }, {} as any);

    webContainer.mount(fileTree);
  }, [webContainer, files]);

  // Parse files from the LLM response
  useEffect(() => {
    if (!streamedResponse) return;

    const fileRegex = /```(\w+)?(?:\s+(?:filename=|title=)?([a-zA-Z0-9_./-]+))?\n([\s\S]*?)```/g;
    const newFiles: CodeFile[] = [];
    let match;

    while ((match = fileRegex.exec(streamedResponse)) !== null) {
      const language = match[1] || 'text';
      const name = match[2] || `untitled_${newFiles.length + 1}.${language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'txt'}`;
      const content = match[3];
      newFiles.push({ name, language, content });
    }

    if (newFiles.length > 0) {
        setFiles(newFiles);
    }
  }, [streamedResponse]);

  const handleAIAction = async (action: 'refactor' | 'optimize' | 'bugs' | 'tests') => {
    if (isGenerating || files.length === 0) return;
    setIsGenerating(true);
    
    // Check if we are generating for a specific file or all
    const currentFile = files[activeFileIndex];
    const fileContext = `Filename: ${currentFile.name}\nLanguage: ${currentFile.language}\nContent:\n${currentFile.content}`;

    let promptPrefix = "";
    switch (action) {
        case 'refactor': 
            promptPrefix = "Refactor the following code to be more readable, maintainable, and idiomatic. Remove any redundancy."; 
            break;
        case 'optimize': 
            promptPrefix = "Analyze the following code for performance bottlenecks and optimize it. Explain your optimizations."; 
            break;
        case 'bugs': 
            promptPrefix = "Analyze the following code for potential bugs, security vulnerabilities, and logic errors. Fix them."; 
            break;
        case 'tests': 
            promptPrefix = "Generate comprehensive unit tests for the following code. Use the same language/framework conventions."; 
            break;
    }

    const systemPrompt = `
    [SYSTEM: SENIOR ENGINEER - ${action.toUpperCase()} SPECIALIST]
    ${promptPrefix}
    
    CRITICAL OUTPUT FORMAT:
    Return ONLY the code block(s) with the updated/new code. 
    Wrap files in:
    \`\`\`language filename=...
    ...
    \`\`\`
    If generating tests, create a new file (e.g., .test.js or _test.py).
    If refactoring, output the updated file with the SAME filename.
    `;

    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'gemini',
                model: selectedCloudModel,
                messages: [
                    { role: 'user', content: `${systemPrompt}\n\n${fileContext}` }
                ]
            })
        });

        const data = await response.json();
        setStreamedResponse(data.response); // This will trigger the useEffect to parse and update files
        
    } catch (error) {
        console.error("AI Action failed", error);
        setTerminalOutput(prev => [...prev, `Error: ${action} failed.`]);
    } finally {
        setIsGenerating(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    setIsGenerating(true);
    if (deviceInfo.isMobile) setShowPrompt(false);
    setStreamedResponse("");
    // setFiles([]); // Optional: clear files or append/replace

    const systemPrompt = `
    [SYSTEM: CODING SUITE]
    You are an expert AI Software Engineer.
    Generate high-quality, production-ready code.
    Prefer Node.js/Express for web applications as they can be previewed instantly.
    
    CRITICAL OUTPUT FORMAT:
    You MUST wrap every file in a code block with its language and filename.
    Example:
    \
    \
    console.log("Hello");
    \
    `;

    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: 'gemini',
                model: selectedCloudModel,
                messages: [
                    { role: 'user', content: `${systemPrompt}\n\nRequest: ${prompt}` }
                ]
            })
        });

        const data = await response.json();
        setStreamedResponse(data.response);
        
    } catch (error) {
        console.error("Generation failed", error);
        setStreamedResponse("// Error: Generation failed.");
    } finally {
        setIsGenerating(false);
    }
  };

  const runCode = async () => {
    if (!webContainer || isRunning) return;
    setIsRunning(true);
    setTerminalOutput(["Starting container..."]);
    setIframeUrl(null);

    try {
        // Install dependencies if package.json exists
        if (files.some(f => f.name === 'package.json')) {
            setTerminalOutput(prev => [...prev, "> npm install"]);
            const installProcess = await webContainer.spawn('npm', ['install']);
            
            installProcess.output.pipeTo(new WritableStream({
                write(data) { setTerminalOutput(prev => [...prev, data]); }
            }));
            
            if ((await installProcess.exit) !== 0) {
                throw new Error("Installation failed");
            }
        }

        // Run start script or node file
        setTerminalOutput(prev => [...prev, "> npm start"]);
        const startProcess = await webContainer.spawn('npm', ['start']);
        
        startProcess.output.pipeTo(new WritableStream({
            write(data) { setTerminalOutput(prev => [...prev, data]); }
        }));

        // Note: 'server-ready' event will trigger iframe update
    } catch (error) {
        setTerminalOutput(prev => [...prev, `Error: ${error}`]);
        setIsRunning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={cn(
      "flex h-full w-full bg-[#050508] text-slate-300 font-sans relative overflow-hidden transition-all duration-500",
      deviceInfo.isMobile ? "flex-col pt-24" : "flex-row"
    )}>
       
       {/* Sidebar: Prompt & Chat */}
       <AnimatePresence>
         {showPrompt && (
           <motion.div 
             initial={deviceInfo.isMobile ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
             animate={deviceInfo.isMobile ? { height: 'auto', opacity: 1 } : { width: 400, opacity: 1 }}
             exit={deviceInfo.isMobile ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }}
             className={cn(
               "flex flex-col border-white/10 bg-black/20 backdrop-blur-xl z-20 overflow-hidden",
               deviceInfo.isMobile ? "w-full border-b max-h-[50vh]" : "w-[400px] border-r"
             )}
           >
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-jb-accent/20 flex items-center justify-center border border-jb-accent/30 text-jb-accent">
                       <Terminal size={20} />
                    </div>
                    <div>
                       <h2 className="text-sm font-black text-white uppercase tracking-wider">Solvent Coder</h2>
                    </div>
                 </div>
                 {deviceInfo.isMobile && (
                   <button onClick={() => setShowPrompt(false)} className="p-2 text-slate-500"><ChevronRight className="rotate-90" /></button>
                 )}
              </div>

              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                 {streamedResponse && (
                    <div className="prose prose-invert prose-sm max-w-none prose-pre:hidden text-[13px] leading-relaxed opacity-80">
                       {streamedResponse.split('```')[0]} 
                    </div>
                 )}
                 
                 {/* Terminal Output Log */}
                 {terminalOutput.length > 0 && (
                     <div className="mt-4 p-3 bg-black/50 rounded-lg border border-white/5 font-mono text-[10px] text-slate-400 max-h-40 overflow-auto">
                         {terminalOutput.map((line, i) => <div key={i}>{line}</div>)}
                     </div>
                 )}
              </div>

              <div className="p-6 border-t border-white/10 bg-[#08080a]">
                 <div className="relative">
                    <textarea 
                       value={prompt}
                       onChange={(e) => setPrompt(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleGenerate())}
                       placeholder="Describe functionality..."
                       className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-jb-accent outline-none h-24 resize-none placeholder:text-slate-600 font-medium"
                    />
                    <button 
                       onClick={handleGenerate}
                       disabled={isGenerating || !prompt.trim()}
                       className="absolute bottom-3 right-3 p-2 bg-jb-accent text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 shadow-lg"
                    >
                       {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} className="fill-current" />}
                    </button>
                 </div>
              </div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Main Area: Split View support */}
       <div className="flex-1 flex flex-col bg-[#030304] relative overflow-hidden">
          
          {/* File Tabs & Actions */}
          <div className="h-12 flex items-center bg-[#0a0a0c] border-b border-white/5 shrink-0 justify-between pr-4">
             <div className="flex items-center overflow-x-auto scrollbar-hide">
                {deviceInfo.isMobile && (
                    <button 
                        onClick={() => setShowPrompt(!showPrompt)}
                        className="h-full px-4 flex items-center gap-2 border-r border-white/5 bg-jb-accent/10 text-jb-accent"
                    >
                        <Terminal size={14} />
                    </button>
                )}
                {files.map((file, i) => (
                    <button 
                        key={i}
                        onClick={() => setActiveFileIndex(i)}
                        className={cn(
                            "h-full px-6 flex items-center gap-2 text-xs font-bold border-r border-white/5 transition-all min-w-[120px] whitespace-nowrap",
                            i === activeFileIndex 
                                ? "bg-[#1e1e24] text-white border-t-2 border-t-jb-accent" 
                                : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                        )}
                    >
                        <FileCode size={14} className={i === activeFileIndex ? "text-jb-accent" : "opacity-50"} />
                        {file.name}
                    </button>
                ))}
             </div>
             
             {/* Preview Toggle & Run */}
             <div className="flex items-center gap-2">
                 <button 
                     onClick={runCode}
                     disabled={!webContainer || isRunning || isBooting}
                     className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 text-green-500 hover:bg-green-500/20 rounded-md text-xs font-bold transition-all disabled:opacity-50"
                 >
                     {isBooting ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
                     {isBooting ? "Booting..." : isRunning ? "Running..." : "Run"}
                 </button>

                 <button 
                    onClick={() => setShowPreview(!showPreview)}
                    className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                        showPreview ? "bg-jb-accent/20 text-jb-accent" : "bg-white/5 text-slate-400 hover:text-white"
                    )}
                 >
                    <Globe size={12} />
                    Preview
                 </button>
             </div>
          </div>

          {/* AI Tools Toolbar (Compact) */}
          <div className="h-10 bg-[#0a0a0c] border-b border-white/5 flex items-center px-4 gap-1">
             <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mr-2 hidden md:inline">AI Tools</span>
             
             <div className="flex items-center gap-1">
                 <button onClick={() => handleAIAction('refactor')} disabled={isGenerating} className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-purple-400 transition-all" title="Refactor Code">
                    <Wand2 size={14} />
                 </button>
                 <button onClick={() => handleAIAction('optimize')} disabled={isGenerating} className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-yellow-400 transition-all" title="Optimize Performance">
                    <Zap size={14} />
                 </button>
                 <button onClick={() => handleAIAction('bugs')} disabled={isGenerating} className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-red-400 transition-all" title="Find Bugs">
                    <Bug size={14} />
                 </button>
                 <button onClick={() => handleAIAction('tests')} disabled={isGenerating} className="p-1.5 hover:bg-white/10 rounded-md text-slate-400 hover:text-green-400 transition-all" title="Generate Tests">
                    <TestTube size={14} />
                 </button>
             </div>
             
             <div className="flex-1" />
             
             {/* Mock Collab UI */}
             <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/5 rounded-full border border-blue-500/10">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-[10px] font-bold text-blue-500">Live Sync Active</span>
             </div>
          </div>

          {/* Editor & Preview Split */}
          <div className="flex-1 flex flex-row overflow-hidden relative">
             
             {/* Editor */}
             <div className={cn(
                 "flex-1 relative group transition-all duration-300",
                 showPreview && !deviceInfo.isMobile ? "w-1/2 border-r border-white/5" : "w-full"
             )}>
                {files.length > 0 ? (
                   <Editor
                     height="100%"
                     defaultLanguage={files[activeFileIndex]?.language || 'javascript'}
                     language={files[activeFileIndex]?.language || 'javascript'}
                     value={files[activeFileIndex]?.content}
                     theme="vs-dark"
                     options={{
                       minimap: { enabled: false },
                       fontSize: 14,
                       fontFamily: 'JetBrains Mono, monospace',
                       padding: { top: 20 },
                       scrollBeyondLastLine: false,
                       automaticLayout: true,
                       smoothScrolling: true,
                       cursorBlinking: "smooth",
                       cursorSmoothCaretAnimation: "on",
                     }}
                     onChange={(value) => {
                       const newFiles = [...files];
                       newFiles[activeFileIndex].content = value || "";
                       setFiles(newFiles);
                     }}
                     loading={<Loader2 className="animate-spin text-jb-accent" />}
                   />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10">
                       <Cpu size={64} className="mb-4" />
                       <p className="font-black uppercase tracking-[0.3em] text-sm">Ready for Input</p>
                    </div>
                )}
             </div>

             {/* Preview Iframe */}
             <AnimatePresence>
                 {showPreview && (
                     <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={cn(
                            "bg-white relative",
                            deviceInfo.isMobile ? "absolute inset-0 z-10" : "w-1/2"
                        )}
                     >
                        {iframeUrl ? (
                            <div className="relative w-full h-full">
                                {/* 6. Add loading indicator while iframe content loads */}
                                {iframeLoading && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white z-20">
                                        <Loader2 size={32} className="animate-spin text-jb-accent" />
                                    </div>
                                )}
                                {/* 3. Add error handling for iframe load failure (via onLoad) */}
                                {/* 5. Ensure iframe sandbox attributes are secure */}
                                {/* 7. Style iframe for responsive display */}
                                <iframe 
                                    src={iframeUrl} 
                                    className="w-full h-full border-none"
                                    title="App Preview"
                                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                                    onLoad={() => setIframeLoading(false)}
                                />
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-900 bg-slate-100 gap-3">
                                {isRunning ? (
                                    <>
                                        <Loader2 size={32} className="animate-spin text-jb-accent" />
                                        <p className="text-sm font-semibold">Starting application...</p>
                                    </>
                                ) : (
                                    <>
                                        <Layout size={48} className="text-slate-300" />
                                        <p className="text-sm font-semibold text-slate-500">Preview not active</p>
                                        <button onClick={runCode} className="text-xs text-blue-600 hover:underline">Click 'Run' to start</button>
                                    </>
                                )}
                            </div>
                        )}

                        {deviceInfo.isMobile && (
                            <button 
                                onClick={() => setShowPreview(false)}
                                className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full backdrop-blur-md"
                            >
                                <ChevronRight size={20} />
                            </button>
                        )}
                     </motion.div>
                 )}
             </AnimatePresence>
          </div>

          {/* Status Bar */}
          <div className="h-8 bg-jb-accent/5 border-t border-white/5 flex items-center justify-between px-4 text-[9px] font-mono font-bold text-slate-500 shrink-0">
             <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                   <div className={cn("w-1.5 h-1.5 rounded-full", isGenerating ? "bg-jb-accent animate-pulse" : "bg-emerald-500")} />
                   {isGenerating ? "GEN" : "IDLE"}
                </span>
                <span className="hidden md:inline">{files[activeFileIndex]?.language?.toUpperCase() || 'TEXT'}</span>
                {webContainer && <span className="text-green-500">CONTAINER READY</span>}
             </div>
             <div className="flex items-center gap-4">
                <span className="hidden md:inline">UTF-8</span>
                <span>{files[activeFileIndex]?.content.length || 0} CHS</span>
             </div>
          </div>

       </div>
    </div>
  );
};
