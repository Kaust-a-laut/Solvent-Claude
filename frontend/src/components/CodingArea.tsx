import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Play, Cpu, Loader2, Box, Globe, X } from 'lucide-react';
import { WebContainer } from '@webcontainer/api';
import Editor from '@monaco-editor/react';
import { DiffEditor } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useAppStore } from '../store/useAppStore';
import { fetchWithRetry } from '../lib/api-client';
import { API_BASE_URL } from '../lib/config';
import { FileTreePanel } from './coding/FileTreePanel';
import { EditorTabBar } from './coding/EditorTabBar';
import { CodingTerminal } from './coding/CodingTerminal';
import { AgentChatPanel } from './coding/AgentChatPanel';
import { DiffBanner } from './coding/DiffBanner';
import { InlineAIToolbar } from './coding/InlineAIToolbar';
import { ReviewScorecard } from './ReviewScorecard';

export const CodingArea = () => {
  const {
    openFiles, setOpenFiles, activeFile, setActiveFile,
    selectedCloudModel, selectedCloudProvider, apiKeys,
    pendingDiff, clearPendingDiff,
    fileTreeVisible, chatPanelVisible, terminalVisible,
    setFileTreeVisible, setChatPanelVisible, setTerminalVisible,
    panelWidths,
    addAgentMessage,
  } = useAppStore();

  const [terminalLines, setTerminalLines] = useState<string[]>([
    '[SYSTEM]: Agentic IDE Core Initialized.',
  ]);
  const [bootStatus, setBootStatus] = useState<'idle' | 'booting' | 'ready' | 'error'>('idle');
  const [webContainer, setWebContainer] = useState<WebContainer | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<unknown>(null);
  const [isApplying, setIsApplying] = useState(false);

  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const currentFile = openFiles.find((f) => f.path === activeFile);

  // ── WebContainer ───────────────────────────────────────────────────────────

  const addLog = useCallback((line: string) =>
    setTerminalLines((prev) => [...prev, line]), []);

  const bootWebContainer = useCallback(async () => {
    if (bootStatus !== 'idle') return;
    setBootStatus('booting');
    addLog('[SYSTEM]: Initiating WebContainer virtualization...');
    try {
      const instance = await WebContainer.boot();
      setWebContainer(instance);
      setBootStatus('ready');
      addLog('[SYSTEM]: WebContainer booted successfully.');
      instance.on('server-ready', (_port, url) => {
        setIframeUrl(url);
        setShowPreview(true);
      });
      instance.on('error', (err: { message: string }) => addLog(`[WC-ERROR]: ${err.message}`));
    } catch (err: unknown) {
      addLog(`[ERROR]: ${err instanceof Error ? err.message : 'Boot failed'}`);
      setBootStatus('error');
    }
  }, [bootStatus, addLog]);

  useEffect(() => {
    if (!webContainer || openFiles.length === 0) return;
    const tree: Record<string, unknown> = {};
    for (const file of openFiles) {
      const parts = file.path.split('/');
      let cur = tree;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!(cur[parts[i]] as Record<string, unknown>)) {
          cur[parts[i]] = { directory: {} };
        }
        cur = (cur[parts[i]] as { directory: Record<string, unknown> }).directory;
      }
      cur[parts[parts.length - 1]] = { file: { contents: file.content } };
    }
    webContainer.mount(tree as Parameters<typeof webContainer.mount>[0]);
  }, [webContainer, openFiles]);

  // ── File operations ────────────────────────────────────────────────────────

  const handleFileSelect = useCallback(async (path: string) => {
    if (openFiles.find((f) => f.path === path)) { setActiveFile(path); return; }
    try {
      const data = await fetchWithRetry(`${API_BASE_URL}/files/read?path=${encodeURIComponent(path)}`) as Record<string, string>;
      setOpenFiles([...openFiles, { path, content: data.content }]);
      setActiveFile(path);
    } catch { addLog(`[ERROR]: Could not open ${path}`); }
  }, [openFiles, setOpenFiles, setActiveFile, addLog]);

  const closeFile = useCallback((path: string) => {
    const next = openFiles.filter((f) => f.path !== path);
    setOpenFiles(next);
    if (activeFile === path) setActiveFile(next.length > 0 ? next[next.length - 1].path : null);
  }, [openFiles, activeFile, setOpenFiles, setActiveFile]);

  const handleSave = useCallback(async () => {
    if (!activeFile || !currentFile) return;
    try {
      await fetchWithRetry(`${API_BASE_URL}/files/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFile, content: currentFile.content }),
      });
      addLog(`[SYSTEM]: Saved ${activeFile}`);
    } catch { addLog(`[ERROR]: Save failed for ${activeFile}`); }
  }, [activeFile, currentFile, addLog]);

  const handleRun = useCallback(async () => {
    setTerminalVisible(true);
    if (!webContainer) {
      if (!activeFile) return;
      try {
        const data = await fetchWithRetry(`${API_BASE_URL}/files/shell`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: `node ${activeFile}` }),
        }) as Record<string, string>;
        if (data.stdout) addLog(data.stdout);
        if (data.stderr) addLog(`[STDERR]: ${data.stderr}`);
      } catch { addLog('[ERROR]: Execution failed.'); }
      return;
    }
    setIsRunning(true);
    addLog('[SYSTEM]: Starting execution...');
    try {
      const pkgFile = openFiles.find((f) => f.path.endsWith('package.json'));
      if (pkgFile) {
        const proc = await webContainer.spawn('npm', ['install']);
        proc.output.pipeTo(new WritableStream({ write: (d) => addLog(d) }));
        if (await proc.exit !== 0) throw new Error('npm install failed');
      }
      const proc = await webContainer.spawn('node', [activeFile || 'index.js']);
      proc.output.pipeTo(new WritableStream({ write: (d) => addLog(d) }));
    } catch (err: unknown) {
      addLog(`[ERROR]: ${err instanceof Error ? err.message : 'Run failed'}`);
    } finally {
      setIsRunning(false);
    }
  }, [webContainer, activeFile, openFiles, addLog, setTerminalVisible]);

  // ── Diff Apply/Reject ──────────────────────────────────────────────────────

  const handleApplyAll = useCallback(() => {
    if (!pendingDiff) return;
    setIsApplying(true);
    const updated = openFiles.map((f) =>
      f.path === pendingDiff.filePath ? { ...f, content: pendingDiff.modified } : f
    );
    setOpenFiles(updated);
    clearPendingDiff();
    setTimeout(() => setIsApplying(false), 600);
  }, [pendingDiff, openFiles, setOpenFiles, clearPendingDiff]);

  // ── Inline AI commands ─────────────────────────────────────────────────────

  const handleInlineCommand = useCallback((command: string, selection: string) => {
    const text = command.startsWith('inline:')
      ? command.replace('inline:', '')
      : `/${command} ${selection ? `\n\`\`\`\n${selection}\n\`\`\`` : ''}`;
    addAgentMessage({
      id: `inline-${Date.now()}`,
      role: 'user',
      content: text,
      fileContext: activeFile ?? undefined,
    });
    setChatPanelVisible(true);
  }, [addAgentMessage, activeFile, setChatPanelVisible]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'b') { e.preventDefault(); setFileTreeVisible(!fileTreeVisible); }
      if (mod && e.key === 'j') { e.preventDefault(); setTerminalVisible(!terminalVisible); }
      if (mod && e.shiftKey && e.key === 'I') { e.preventDefault(); setChatPanelVisible(!chatPanelVisible); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fileTreeVisible, terminalVisible, chatPanelVisible, setFileTreeVisible, setTerminalVisible, setChatPanelVisible]);

  // ── Language detection ─────────────────────────────────────────────────────

  const getLanguage = (path: string): string => {
    if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
    if (path.endsWith('.css') || path.endsWith('.scss')) return 'css';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.md')) return 'markdown';
    return 'javascript';
  };

  // ── ReviewScorecard helper ─────────────────────────────────────────────────

  type ReviewStatus = 'analyzing' | 'approved' | 'rejected';
  interface ReviewBreakdown { syntax: number; security: number; logic: number; efficiency: number; }

  const getReviewScorecard = (): React.ReactNode => {
    if (!reviewState) return null;
    const rs = reviewState as Record<string, unknown>;
    const bd = rs.breakdown as ReviewBreakdown;
    const status = rs.status as ReviewStatus;
    return (
      <ReviewScorecard
        score={rs.score as number}
        breakdown={bd}
        issues={rs.issues as string[]}
        status={status}
        attempt={rs.attempt as number}
      />
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex overflow-hidden bg-[#020205] text-slate-300">
      {/* ── Left: File Tree ─────────────────────────────────────────── */}
      {fileTreeVisible && (
        <div
          className="shrink-0 border-r border-white/[0.04] overflow-hidden"
          style={{ width: panelWidths.fileTree }}
        >
          <FileTreePanel onFileSelect={handleFileSelect} />
        </div>
      )}

      {/* ── Center: Editor + Terminal ───────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="h-11 flex items-center px-4 gap-3 border-b border-white/[0.04] shrink-0">
          <button
            type="button"
            onClick={() => setFileTreeVisible(!fileTreeVisible)}
            className={cn('p-1.5 rounded-lg transition-colors', fileTreeVisible ? 'text-jb-accent bg-jb-accent/10' : 'text-white/30 hover:text-white/60')}
            title="Toggle file tree (⌘B)"
            aria-label="Toggle file tree"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="18" /><rect x="14" y="3" width="7" height="18" /></svg>
          </button>

          <div className="flex-1" />

          {bootStatus === 'idle' && (
            <button
              type="button"
              onClick={bootWebContainer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-500/30 bg-orange-500/5 text-orange-400 text-[10px] font-bold hover:bg-orange-500/10 transition-colors"
            >
              <Box size={12} /> Sandbox
            </button>
          )}
          {bootStatus === 'booting' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-white/40 text-[10px]">
              <Loader2 size={12} className="animate-spin" /> Booting…
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={!activeFile}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/60 disabled:opacity-20"
            aria-label="Save file"
          >
            <Save size={15} />
          </button>
          <button
            type="button"
            onClick={handleRun}
            disabled={isRunning}
            className="p-1.5 rounded-lg text-jb-accent hover:bg-jb-accent/10 transition-colors disabled:opacity-40"
            aria-label="Run"
          >
            <Play size={15} fill="currentColor" fillOpacity={0.3} />
          </button>
          <button
            type="button"
            onClick={() => setChatPanelVisible(!chatPanelVisible)}
            className={cn('p-1.5 rounded-lg transition-colors', chatPanelVisible ? 'text-jb-accent bg-jb-accent/10' : 'text-white/30 hover:text-white/60')}
            title="Toggle agent chat (⌘⇧I)"
            aria-label="Toggle agent chat"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
          </button>
        </div>

        {/* Tab bar */}
        <EditorTabBar
          openFiles={openFiles}
          activeFile={activeFile}
          onTabClick={setActiveFile}
          onTabClose={closeFile}
        />

        {/* Diff banner */}
        {pendingDiff && (
          <DiffBanner
            description={pendingDiff.description}
            onApplyAll={handleApplyAll}
            onReject={clearPendingDiff}
          />
        )}

        {/* Editor / DiffEditor */}
        <div className="flex-1 min-h-0 relative" ref={editorContainerRef}>
          {pendingDiff ? (
            <DiffEditor
              height="100%"
              original={pendingDiff.original}
              modified={pendingDiff.modified}
              language={getLanguage(pendingDiff.filePath)}
              theme="vs-dark"
              options={{
                readOnly: false,
                renderSideBySide: true,
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
          ) : currentFile ? (
            <>
              <Editor
                key={activeFile}
                height="100%"
                language={getLanguage(currentFile.path)}
                value={currentFile.content}
                theme="vs-dark"
                options={{
                  minimap: { enabled: true, scale: 0.75 },
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontLigatures: true,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 16 },
                }}
                onMount={(editor) => { editorRef.current = editor; }}
                onChange={(value) =>
                  setOpenFiles(openFiles.map((f) =>
                    f.path === activeFile ? { ...f, content: value ?? '' } : f
                  ))
                }
              />
              <InlineAIToolbar
                editorRef={editorRef}
                containerRef={editorContainerRef}
                onCommand={handleInlineCommand}
              />
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-10 gap-4">
              <Cpu size={48} strokeWidth={1} />
              <span className="text-[10px] font-black uppercase tracking-[0.5em]">Open a file to begin</span>
            </div>
          )}
        </div>

        {/* Terminal (collapsible) */}
        {terminalVisible && (
          <CodingTerminal
            lines={terminalLines}
            onClear={() => setTerminalLines([])}
          />
        )}

        {/* Terminal toggle pill */}
        {!terminalVisible && (
          <button
            type="button"
            onClick={() => setTerminalVisible(true)}
            className="mx-4 mb-2 mt-1 flex items-center gap-2 px-3 py-1 rounded-lg border border-white/[0.04] text-white/20 hover:text-white/50 text-[10px] font-mono hover:bg-white/5 transition-colors shrink-0"
          >
            <span>▸ CONSOLE</span>
            {terminalLines.some((l) => l.startsWith('[ERROR]')) && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            )}
          </button>
        )}

        {/* Preview panel */}
        <AnimatePresence>
          {showPreview && iframeUrl && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: '40%', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-white/[0.04] flex flex-col bg-white overflow-hidden shrink-0"
            >
              <div className="h-8 bg-slate-100 flex items-center px-3 gap-2 shrink-0">
                <Globe size={12} className="text-slate-400" />
                <span className="text-[10px] font-mono text-slate-500 flex-1 truncate">{iframeUrl}</span>
                <button type="button" onClick={() => setShowPreview(false)} aria-label="Close preview">
                  <X size={14} className="text-slate-400 cursor-pointer" />
                </button>
              </div>
              <iframe src={iframeUrl} className="flex-1 border-none" title="Preview" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Right: Agent Chat ───────────────────────────────────────── */}
      {chatPanelVisible && (
        <div
          className="shrink-0 border-l border-white/[0.04] overflow-hidden"
          style={{ width: panelWidths.chat }}
        >
          <AgentChatPanel />
        </div>
      )}

      {/* Review scorecard overlay */}
      <AnimatePresence>
        {Boolean(reviewState) && getReviewScorecard()}
      </AnimatePresence>
    </div>
  );
};
