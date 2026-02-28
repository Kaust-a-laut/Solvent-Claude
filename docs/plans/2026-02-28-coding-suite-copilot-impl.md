# Coding Suite: Copilot Native Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the Coding Suite from floating-overlay sidebars into a permanent 3-panel Copilot-style IDE with agent chat, Apply/Reject diff, slash commands, @file mentions, and ⌘K inline AI.

**Architecture:** New sub-components live in `frontend/src/components/coding/`. A new `codingSlice.ts` holds panel/diff/agent-chat state. `CodingArea.tsx` is rewritten as a thin layout orchestrator that wires them together. Existing `openFiles`, `activeFile` in `settingsSlice.ts` are reused — no duplication.

**Tech Stack:** React 18, TypeScript, Monaco `@monaco-editor/react`, Zustand, Framer Motion, Tailwind / `jb-*` tokens, Vitest + @testing-library/react

---

## Task 1: Vitest config + codingSlice

**Files:**
- Modify: `frontend/vite.config.ts`
- Create: `frontend/src/store/codingSlice.ts`
- Create: `frontend/src/store/codingSlice.test.ts`
- Modify: `frontend/src/store/types.ts`
- Modify: `frontend/src/store/useAppStore.ts`

### Step 1: Add vitest config to `vite.config.ts`

Open `frontend/vite.config.ts`. The `test` block goes inside `defineConfig`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3001', changeOrigin: true, secure: false },
      '/files': { target: 'http://localhost:3001', changeOrigin: true, secure: false },
      '/generated_images': { target: 'http://localhost:3001', changeOrigin: true, secure: false },
      '/dev-secret': { target: 'http://localhost:3001', changeOrigin: true, secure: false },
    },
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
})
```

### Step 2: Write the failing test for codingSlice

Create `frontend/src/store/codingSlice.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';

describe('codingSlice', () => {
  beforeEach(() => {
    useAppStore.setState({
      pendingDiff: null,
      panelWidths: { fileTree: 240, chat: 360 },
      fileTreeVisible: true,
      chatPanelVisible: true,
      terminalVisible: false,
      agentMessages: [],
    });
  });

  it('sets and clears pendingDiff', () => {
    const diff = { original: 'a', modified: 'b', filePath: 'src/app.ts', description: 'Fix null' };
    useAppStore.getState().setPendingDiff(diff);
    expect(useAppStore.getState().pendingDiff).toEqual(diff);
    useAppStore.getState().clearPendingDiff();
    expect(useAppStore.getState().pendingDiff).toBeNull();
  });

  it('appends agent messages', () => {
    const msg = { id: '1', role: 'user' as const, content: 'hello', fileContext: 'src/app.ts' };
    useAppStore.getState().addAgentMessage(msg);
    expect(useAppStore.getState().agentMessages).toHaveLength(1);
    expect(useAppStore.getState().agentMessages[0].content).toBe('hello');
  });

  it('clears agent messages', () => {
    useAppStore.getState().addAgentMessage({ id: '1', role: 'user' as const, content: 'x' });
    useAppStore.getState().clearAgentMessages();
    expect(useAppStore.getState().agentMessages).toHaveLength(0);
  });

  it('updates panel widths', () => {
    useAppStore.getState().setPanelWidths({ fileTree: 200, chat: 400 });
    expect(useAppStore.getState().panelWidths.fileTree).toBe(200);
  });

  it('toggles panel visibility', () => {
    useAppStore.getState().setFileTreeVisible(false);
    expect(useAppStore.getState().fileTreeVisible).toBe(false);
    useAppStore.getState().setChatPanelVisible(false);
    expect(useAppStore.getState().chatPanelVisible).toBe(false);
  });
});
```

### Step 3: Run test — verify it fails

```bash
cd /home/caleb/BACKUP/solvent-ai-v1-production/.claude/worktrees/lucid-yalow/frontend
npm test -- --reporter=verbose 2>&1 | head -40
```

Expected: FAIL — "codingSlice is not exported" or similar

### Step 4: Create `frontend/src/store/codingSlice.ts`

```typescript
import { StateCreator } from 'zustand';
import { AppState } from './types';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  fileContext?: string;       // e.g. "src/app.ts"
  codeBlocks?: CodeSuggestion[];
}

export interface CodeSuggestion {
  id: string;
  language: string;
  code: string;
  applied: boolean;
  rejected: boolean;
}

export interface PendingDiff {
  original: string;
  modified: string;
  filePath: string;
  description: string;
}

export interface CodingSlice {
  pendingDiff: PendingDiff | null;
  agentMessages: AgentMessage[];
  panelWidths: { fileTree: number; chat: number };
  fileTreeVisible: boolean;
  chatPanelVisible: boolean;
  terminalVisible: boolean;

  setPendingDiff: (diff: PendingDiff) => void;
  clearPendingDiff: () => void;
  addAgentMessage: (msg: AgentMessage) => void;
  updateAgentMessage: (id: string, updates: Partial<AgentMessage>) => void;
  clearAgentMessages: () => void;
  setPanelWidths: (widths: { fileTree: number; chat: number }) => void;
  setFileTreeVisible: (v: boolean) => void;
  setChatPanelVisible: (v: boolean) => void;
  setTerminalVisible: (v: boolean) => void;
}

export const createCodingSlice: StateCreator<AppState, [], [], CodingSlice> = (set) => ({
  pendingDiff: null,
  agentMessages: [],
  panelWidths: { fileTree: 240, chat: 360 },
  fileTreeVisible: true,
  chatPanelVisible: true,
  terminalVisible: false,

  setPendingDiff: (diff) => set({ pendingDiff: diff }),
  clearPendingDiff: () => set({ pendingDiff: null }),
  addAgentMessage: (msg) => set((state) => ({ agentMessages: [...state.agentMessages, msg] })),
  updateAgentMessage: (id, updates) =>
    set((state) => ({
      agentMessages: state.agentMessages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  clearAgentMessages: () => set({ agentMessages: [] }),
  setPanelWidths: (panelWidths) => set({ panelWidths }),
  setFileTreeVisible: (fileTreeVisible) => set({ fileTreeVisible }),
  setChatPanelVisible: (chatPanelVisible) => set({ chatPanelVisible }),
  setTerminalVisible: (terminalVisible) => set({ terminalVisible }),
});
```

### Step 5: Wire codingSlice into types and store

Add to `frontend/src/store/types.ts`:
```typescript
import { CodingSlice } from './codingSlice';
// ...existing imports...
export type AppState = ChatSlice & SettingsSlice & GraphSlice & ActionSlice & WaterfallSlice & CodingSlice;
```

Add to `frontend/src/store/useAppStore.ts`:
```typescript
import { createCodingSlice } from './codingSlice';
// ...
export const useAppStore = create<AppState>()((...a) => ({
  ...createChatSlice(...a),
  ...createSettingsSlice(...a),
  ...createGraphSlice(...a),
  ...createActionSlice(...a),
  ...createWaterfallSlice(...a),
  ...createCodingSlice(...a),
}));
```

### Step 6: Run tests — verify they pass

```bash
npm test -- --reporter=verbose 2>&1 | head -60
```

Expected: `codingSlice > sets and clears pendingDiff` ✅ and 4 more passing

### Step 7: Typecheck

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors

### Step 8: Commit

```bash
git add frontend/vite.config.ts frontend/src/store/codingSlice.ts \
        frontend/src/store/codingSlice.test.ts frontend/src/store/types.ts \
        frontend/src/store/useAppStore.ts
git commit -m "feat(coding): add codingSlice with pendingDiff, agentMessages, panel state"
```

---

## Task 2: FileTreePanel

**Files:**
- Create: `frontend/src/components/coding/FileTreePanel.tsx`
- Create: `frontend/src/components/coding/fileIcons.ts`

### Step 1: Write the failing test for file icon helper

Create `frontend/src/components/coding/fileIcons.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { getFileIcon } from './fileIcons';

describe('getFileIcon', () => {
  it('returns blue for .ts and .tsx', () => {
    expect(getFileIcon('app.ts').color).toBe('text-blue-400');
    expect(getFileIcon('App.tsx').color).toBe('text-blue-400');
  });
  it('returns yellow for .json', () => {
    expect(getFileIcon('package.json').color).toBe('text-yellow-400');
  });
  it('returns pink for .css and .scss', () => {
    expect(getFileIcon('style.css').color).toBe('text-pink-400');
  });
  it('returns green for .md', () => {
    expect(getFileIcon('README.md').color).toBe('text-emerald-400');
  });
  it('returns default for unknown extensions', () => {
    expect(getFileIcon('Makefile').color).toBe('text-slate-400');
  });
});
```

Run: `npm test -- --reporter=verbose 2>&1 | grep "fileIcons"`
Expected: FAIL — cannot find module `./fileIcons`

### Step 2: Create `fileIcons.ts`

```typescript
export interface FileIconInfo {
  emoji: string;
  color: string;
}

const EXT_MAP: Record<string, FileIconInfo> = {
  ts:   { emoji: '📘', color: 'text-blue-400' },
  tsx:  { emoji: '📘', color: 'text-blue-400' },
  js:   { emoji: '📒', color: 'text-yellow-300' },
  jsx:  { emoji: '📒', color: 'text-yellow-300' },
  json: { emoji: '📄', color: 'text-yellow-400' },
  css:  { emoji: '🎨', color: 'text-pink-400' },
  scss: { emoji: '🎨', color: 'text-pink-400' },
  html: { emoji: '🌐', color: 'text-orange-400' },
  md:   { emoji: '📝', color: 'text-emerald-400' },
  py:   { emoji: '🐍', color: 'text-blue-500' },
  sh:   { emoji: '⚡', color: 'text-slate-300' },
  env:  { emoji: '🔒', color: 'text-rose-400' },
};

export function getFileIcon(filename: string): FileIconInfo {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return EXT_MAP[ext] ?? { emoji: '📄', color: 'text-slate-400' };
}
```

### Step 3: Run tests — verify fileIcons passes

```bash
npm test -- --reporter=verbose 2>&1 | grep -A 10 "fileIcons"
```

Expected: 5 passing

### Step 4: Create `FileTreePanel.tsx`

```tsx
import React, { useEffect, useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, RefreshCw, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { fetchWithRetry } from '../../lib/api-client';
import { BASE_URL } from '../../lib/config';
import { getFileIcon } from './fileIcons';
import { useAppStore } from '../../store/useAppStore';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileNode[];
}

interface Props {
  onFileSelect: (path: string) => void;
}

export const FileTreePanel: React.FC<Props> = ({ onFileSelect }) => {
  const { openFiles, activeFile } = useAppStore();
  const [nodes, setNodes] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWithRetry(`${BASE_URL}/api/files/list?path=.`);
      setNodes(Array.isArray(data) ? data : []);
    } catch {
      setNodes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const toggle = (path: string) =>
    setExpanded((prev) => ({ ...prev, [path]: !prev[path] }));

  const isModified = (path: string) =>
    openFiles.some((f) => f.path === path);

  const renderNode = (node: FileNode, depth = 0) => {
    const icon = getFileIcon(node.name);
    const isActive = activeFile === node.path;
    const modified = node.type === 'file' && isModified(node.path);

    return (
      <div key={node.path}>
        <div
          onClick={() => node.type === 'directory' ? toggle(node.path) : onFileSelect(node.path)}
          className={cn(
            'flex items-center gap-1.5 py-[3px] pr-2 cursor-pointer transition-colors text-[12px]',
            'hover:bg-white/5 rounded',
            isActive && 'bg-jb-accent/10 text-jb-accent',
            !isActive && node.type === 'file' && 'text-slate-300',
            !isActive && node.type === 'directory' && 'text-slate-200 font-medium',
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {node.type === 'directory' && (
            <span className="text-slate-500 shrink-0">
              {expanded[node.path] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </span>
          )}
          <span className={cn('shrink-0', node.type === 'file' ? icon.color : 'text-indigo-400')}>
            {node.type === 'directory' ? '📁' : icon.emoji}
          </span>
          <span className="truncate flex-1">{node.name}</span>
          {modified && (
            <span className="w-1.5 h-1.5 rounded-full bg-jb-accent shrink-0" title="Modified" />
          )}
        </div>
        {node.type === 'directory' && expanded[node.path] && node.children?.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-transparent">
      {/* Header */}
      <div className="px-3 py-2 flex items-center justify-between border-b border-white/[0.04] shrink-0">
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Explorer</span>
        <div className="flex items-center gap-1">
          <button
            onClick={fetchFiles}
            className={cn('p-1 hover:bg-white/10 rounded text-white/30 hover:text-white/60', loading && 'animate-spin')}
          >
            <RefreshCw size={11} />
          </button>
          <button className="p-1 hover:bg-white/10 rounded text-white/30 hover:text-white/60">
            <Search size={11} />
          </button>
        </div>
      </div>
      {/* Files section label */}
      <div className="px-3 py-1.5 shrink-0">
        <span className="text-[8px] font-black uppercase tracking-[0.15em] text-white/20">Files</span>
      </div>
      {/* Tree */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-1">
        {nodes.map((n) => renderNode(n))}
      </div>
    </div>
  );
};
```

### Step 5: Typecheck

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors

### Step 6: Commit

```bash
git add frontend/src/components/coding/fileIcons.ts \
        frontend/src/components/coding/fileIcons.test.ts \
        frontend/src/components/coding/FileTreePanel.tsx
git commit -m "feat(coding): add FileTreePanel with file type icons and modified indicators"
```

---

## Task 3: EditorTabBar

**Files:**
- Create: `frontend/src/components/coding/EditorTabBar.tsx`

### Step 1: Write the failing test

Create `frontend/src/components/coding/EditorTabBar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditorTabBar } from './EditorTabBar';

const files = [
  { path: 'src/app.ts', content: '' },
  { path: 'src/utils.ts', content: '' },
];

describe('EditorTabBar', () => {
  it('renders tab names', () => {
    render(
      <EditorTabBar
        openFiles={files}
        activeFile="src/app.ts"
        onTabClick={vi.fn()}
        onTabClose={vi.fn()}
      />
    );
    expect(screen.getByText('app.ts')).toBeTruthy();
    expect(screen.getByText('utils.ts')).toBeTruthy();
  });

  it('calls onTabClick when tab clicked', () => {
    const onTabClick = vi.fn();
    render(
      <EditorTabBar
        openFiles={files}
        activeFile="src/app.ts"
        onTabClick={onTabClick}
        onTabClose={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('utils.ts'));
    expect(onTabClick).toHaveBeenCalledWith('src/utils.ts');
  });
});
```

Run: `npm test -- --reporter=verbose 2>&1 | grep "EditorTabBar"`
Expected: FAIL — cannot find module `./EditorTabBar`

### Step 2: Create `EditorTabBar.tsx`

```tsx
import React from 'react';
import { X, FileCode } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getFileIcon } from './fileIcons';

interface Props {
  openFiles: { path: string; content: string }[];
  activeFile: string | null;
  onTabClick: (path: string) => void;
  onTabClose: (path: string) => void;
}

export const EditorTabBar: React.FC<Props> = ({ openFiles, activeFile, onTabClick, onTabClose }) => {
  return (
    <div className="h-10 bg-black/20 border-b border-white/[0.04] flex items-center px-2 gap-1 overflow-x-auto no-scrollbar shrink-0">
      {openFiles.map((file) => {
        const name = file.path.split('/').pop() ?? file.path;
        const icon = getFileIcon(name);
        const isActive = activeFile === file.path;

        return (
          <div
            key={file.path}
            onClick={() => onTabClick(file.path)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium cursor-pointer transition-all border shrink-0',
              isActive
                ? 'bg-jb-accent/10 text-jb-accent border-jb-accent/25 shadow-[0_0_10px_rgba(60,113,247,0.08)]'
                : 'text-white/30 border-transparent hover:text-white/50 hover:bg-white/5',
            )}
          >
            <span className={cn('shrink-0', isActive ? 'text-jb-accent' : icon.color)}>{icon.emoji}</span>
            <span>{name}</span>
            <X
              size={11}
              className="ml-0.5 hover:text-rose-400 opacity-50 hover:opacity-100 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onTabClose(file.path); }}
            />
          </div>
        );
      })}
    </div>
  );
};
```

### Step 3: Run tests — verify they pass

```bash
npm test -- --reporter=verbose 2>&1 | grep -A 10 "EditorTabBar"
```

Expected: 2 passing

### Step 4: Typecheck and commit

```bash
npx tsc --noEmit 2>&1 | head -10
git add frontend/src/components/coding/EditorTabBar.tsx \
        frontend/src/components/coding/EditorTabBar.test.tsx
git commit -m "feat(coding): add EditorTabBar component"
```

---

## Task 4: CodingTerminal

**Files:**
- Create: `frontend/src/components/coding/CodingTerminal.tsx`

No unit tests needed (purely presentational). Manual verification: terminal output renders, scrolls, clear button works.

### Step 1: Create `CodingTerminal.tsx`

```tsx
import React, { useEffect, useRef } from 'react';
import { X, Terminal as TerminalIcon, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  lines: string[];
  onClear: () => void;
}

export const CodingTerminal: React.FC<Props> = ({ lines, onClear }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const lineColor = (line: string) => {
    if (line.startsWith('[SYSTEM]') || line.startsWith('[AGENT]')) return 'text-jb-accent';
    if (line.startsWith('[ERROR]') || line.startsWith('[WC-ERROR]')) return 'text-rose-400';
    if (line.startsWith('[WATERFALL]') || line.startsWith('[AUDITOR]')) return 'text-jb-purple';
    if (line.startsWith('[STDERR]')) return 'text-amber-400';
    if (line.startsWith('>')) return 'text-white/60';
    return 'text-white/35';
  };

  return (
    <div className="h-[180px] flex flex-col border-t border-white/[0.04] bg-black/30 shrink-0">
      <div className="px-4 py-1.5 flex items-center justify-between border-b border-white/[0.03] shrink-0">
        <div className="flex items-center gap-2">
          <TerminalIcon size={12} className="text-white/30" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Console</span>
        </div>
        <button onClick={onClear} className="p-0.5 hover:bg-white/10 rounded text-white/20 hover:text-white/50">
          <Trash2 size={11} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-relaxed scrollbar-thin">
        {lines.map((line, i) => (
          <div key={i} className={cn('mb-0.5', lineColor(line))}>{line}</div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};
```

### Step 2: Typecheck and commit

```bash
npx tsc --noEmit 2>&1 | head -10
git add frontend/src/components/coding/CodingTerminal.tsx
git commit -m "feat(coding): add CodingTerminal component"
```

---

## Task 5: DiffBanner

**Files:**
- Create: `frontend/src/components/coding/DiffBanner.tsx`
- Create: `frontend/src/components/coding/DiffBanner.test.tsx`

### Step 1: Write the failing test

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiffBanner } from './DiffBanner';

describe('DiffBanner', () => {
  it('renders description', () => {
    render(<DiffBanner description="Fix null check" onApplyAll={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText(/Fix null check/)).toBeTruthy();
  });

  it('calls onApplyAll when Apply All clicked', () => {
    const onApplyAll = vi.fn();
    render(<DiffBanner description="test" onApplyAll={onApplyAll} onReject={vi.fn()} />);
    fireEvent.click(screen.getByText('Apply All'));
    expect(onApplyAll).toHaveBeenCalledOnce();
  });

  it('calls onReject when Reject clicked', () => {
    const onReject = vi.fn();
    render(<DiffBanner description="test" onApplyAll={vi.fn()} onReject={onReject} />);
    fireEvent.click(screen.getByText('Reject'));
    expect(onReject).toHaveBeenCalledOnce();
  });
});
```

Run: `npm test -- --reporter=verbose 2>&1 | grep "DiffBanner"`
Expected: FAIL

### Step 2: Create `DiffBanner.tsx`

```tsx
import React from 'react';
import { Check, X, Sparkles } from 'lucide-react';

interface Props {
  description: string;
  onApplyAll: () => void;
  onReject: () => void;
}

export const DiffBanner: React.FC<Props> = ({ description, onApplyAll, onReject }) => (
  <div className="h-10 flex items-center justify-between px-4 bg-jb-accent/10 border-b border-jb-accent/20 shrink-0">
    <div className="flex items-center gap-2">
      <Sparkles size={13} className="text-jb-accent" />
      <span className="text-[11px] font-semibold text-white/70">AI Suggestion:</span>
      <span className="text-[11px] text-white/50 truncate max-w-[300px]">{description}</span>
    </div>
    <div className="flex items-center gap-2">
      <button
        onClick={onApplyAll}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/25 transition-colors"
      >
        <Check size={12} /> Apply All
      </button>
      <button
        onClick={onReject}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold hover:bg-rose-500/20 transition-colors"
      >
        <X size={12} /> Reject
      </button>
    </div>
  </div>
);
```

### Step 3: Run tests — verify DiffBanner passes

```bash
npm test -- --reporter=verbose 2>&1 | grep -A 6 "DiffBanner"
```

Expected: 3 passing

### Step 4: Typecheck and commit

```bash
npx tsc --noEmit 2>&1 | head -10
git add frontend/src/components/coding/DiffBanner.tsx \
        frontend/src/components/coding/DiffBanner.test.tsx
git commit -m "feat(coding): add DiffBanner apply/reject component"
```

---

## Task 6: AgentChatPanel — Part 1 (layout + code blocks)

**Files:**
- Create: `frontend/src/components/coding/AgentCodeBlock.tsx`
- Create: `frontend/src/components/coding/AgentCodeBlock.test.tsx`

The `AgentChatPanel` sends AI requests. `AgentCodeBlock` is the Apply/Reject code block widget. Build this first because it's pure UI.

### Step 1: Write the failing test for AgentCodeBlock

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AgentCodeBlock } from './AgentCodeBlock';

const suggestion = {
  id: 'sg1',
  language: 'typescript',
  code: 'const x = 1;',
  applied: false,
  rejected: false,
};

describe('AgentCodeBlock', () => {
  it('renders the code', () => {
    render(<AgentCodeBlock suggestion={suggestion} onApply={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText(/const x = 1/)).toBeTruthy();
  });

  it('shows Apply and Reject buttons when not yet acted on', () => {
    render(<AgentCodeBlock suggestion={suggestion} onApply={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('Apply')).toBeTruthy();
    expect(screen.getByText('Reject')).toBeTruthy();
  });

  it('calls onApply with suggestion id', () => {
    const onApply = vi.fn();
    render(<AgentCodeBlock suggestion={suggestion} onApply={onApply} onReject={vi.fn()} />);
    fireEvent.click(screen.getByText('Apply'));
    expect(onApply).toHaveBeenCalledWith('sg1');
  });

  it('shows Applied badge when applied=true', () => {
    render(<AgentCodeBlock suggestion={{ ...suggestion, applied: true }} onApply={vi.fn()} onReject={vi.fn()} />);
    expect(screen.getByText('Applied')).toBeTruthy();
  });
});
```

Run: `npm test -- --reporter=verbose 2>&1 | grep "AgentCodeBlock"`
Expected: FAIL

### Step 2: Create `AgentCodeBlock.tsx`

```tsx
import React, { useState } from 'react';
import { Check, X, Copy, CheckCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { CodeSuggestion } from '../../store/codingSlice';

interface Props {
  suggestion: CodeSuggestion;
  onApply: (id: string) => void;
  onReject: (id: string) => void;
}

export const AgentCodeBlock: React.FC<Props> = ({ suggestion, onApply, onReject }) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(suggestion.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-white/[0.07] bg-black/40 my-2">
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] border-b border-white/[0.05]">
        <span className="text-[10px] font-mono text-white/30">{suggestion.language}</span>
        <button onClick={copy} className="p-1 hover:bg-white/10 rounded text-white/30 hover:text-white/60 transition-colors">
          {copied ? <CheckCheck size={11} className="text-emerald-400" /> : <Copy size={11} />}
        </button>
      </div>
      {/* Code */}
      <pre className="p-3 text-[11px] font-mono text-slate-300 overflow-x-auto scrollbar-thin leading-relaxed whitespace-pre-wrap break-words">
        <code>{suggestion.code}</code>
      </pre>
      {/* Apply / Reject footer */}
      {!suggestion.applied && !suggestion.rejected && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-white/[0.05] bg-black/20">
          <button
            onClick={() => onApply(suggestion.id)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/25 transition-colors"
          >
            <Check size={11} /> Apply
          </button>
          <button
            onClick={() => onReject(suggestion.id)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/15 text-rose-400 text-[10px] font-bold hover:bg-rose-500/20 transition-colors"
          >
            <X size={11} /> Reject
          </button>
        </div>
      )}
      {suggestion.applied && (
        <div className="px-3 py-1.5 border-t border-emerald-500/10 bg-emerald-500/5">
          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
            <CheckCheck size={11} /> Applied
          </span>
        </div>
      )}
      {suggestion.rejected && (
        <div className="px-3 py-1.5 border-t border-rose-500/10 bg-rose-500/5">
          <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
            <X size={11} /> Rejected
          </span>
        </div>
      )}
    </div>
  );
};
```

### Step 3: Run tests — verify they pass

```bash
npm test -- --reporter=verbose 2>&1 | grep -A 8 "AgentCodeBlock"
```

Expected: 4 passing

### Step 4: Typecheck and commit

```bash
npx tsc --noEmit 2>&1 | head -10
git add frontend/src/components/coding/AgentCodeBlock.tsx \
        frontend/src/components/coding/AgentCodeBlock.test.tsx
git commit -m "feat(coding): add AgentCodeBlock with Apply/Reject UI"
```

---

## Task 7: AgentChatPanel

**Files:**
- Create: `frontend/src/components/coding/slashCommands.ts`
- Create: `frontend/src/components/coding/slashCommands.test.ts`
- Create: `frontend/src/components/coding/AgentChatPanel.tsx`

### Step 1: Write failing tests for slash command helpers

Create `frontend/src/components/coding/slashCommands.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { parseSlashCommand, buildSystemPrompt, SLASH_COMMANDS } from './slashCommands';

describe('parseSlashCommand', () => {
  it('returns null for plain text', () => {
    expect(parseSlashCommand('hello world')).toBeNull();
  });
  it('returns command for /fix', () => {
    expect(parseSlashCommand('/fix the return type')).toEqual({
      command: 'fix',
      rest: 'the return type',
    });
  });
  it('returns command for /explain with no rest', () => {
    expect(parseSlashCommand('/explain')).toEqual({ command: 'explain', rest: '' });
  });
});

describe('buildSystemPrompt', () => {
  it('includes active file path and content', () => {
    const prompt = buildSystemPrompt('src/app.ts', 'const x = 1;', null);
    expect(prompt).toContain('src/app.ts');
    expect(prompt).toContain('const x = 1;');
  });
  it('includes selection when provided', () => {
    const prompt = buildSystemPrompt('src/app.ts', 'const x = 1;', 'const x = 1;');
    expect(prompt).toContain('Selected code');
  });
});

describe('SLASH_COMMANDS', () => {
  it('has at least 7 commands', () => {
    expect(SLASH_COMMANDS.length).toBeGreaterThanOrEqual(7);
  });
});
```

Run: `npm test -- --reporter=verbose 2>&1 | grep "slashCommands"`
Expected: FAIL

### Step 2: Create `slashCommands.ts`

```typescript
export interface SlashCommand {
  id: string;
  label: string;
  description: string;
  systemInstruction: string;
}

export const SLASH_COMMANDS: SlashCommand[] = [
  { id: 'fix',      label: '/fix',      description: 'Fix bugs & errors',       systemInstruction: 'Fix all bugs and errors in the provided code. Return only the corrected code.' },
  { id: 'explain',  label: '/explain',  description: 'Explain selected code',    systemInstruction: 'Explain what the provided code does in clear, concise terms.' },
  { id: 'test',     label: '/test',     description: 'Generate unit tests',      systemInstruction: 'Generate comprehensive unit tests for the provided code using the project\'s test framework.' },
  { id: 'refactor', label: '/refactor', description: 'Refactor with reasoning',  systemInstruction: 'Refactor the provided code for clarity, maintainability, and modern patterns. Explain each change.' },
  { id: 'optimize', label: '/optimize', description: 'Performance optimization', systemInstruction: 'Optimize the provided code for performance. Explain the improvements.' },
  { id: 'docs',     label: '/docs',     description: 'Add JSDoc comments',       systemInstruction: 'Add clear, accurate JSDoc/inline comments to the provided code.' },
  { id: 'commit',   label: '/commit',   description: 'Generate commit message',  systemInstruction: 'Generate a conventional git commit message for the provided changes.' },
];

export interface ParsedCommand {
  command: string;
  rest: string;
}

export function parseSlashCommand(input: string): ParsedCommand | null {
  const match = input.match(/^\/([a-z]+)\s*(.*)/s);
  if (!match) return null;
  return { command: match[1], rest: match[2].trim() };
}

export function buildSystemPrompt(
  filePath: string | null,
  fileContent: string | null,
  selection: string | null
): string {
  const parts: string[] = [
    'You are a senior software engineer acting as a coding assistant.',
    'Respond with clear explanations and, when writing code, use code blocks.',
  ];
  if (filePath && fileContent) {
    parts.push(`\nActive file: ${filePath}\n\`\`\`\n${fileContent}\n\`\`\``);
  }
  if (selection) {
    parts.push(`\nSelected code:\n\`\`\`\n${selection}\n\`\`\``);
  }
  return parts.join('\n');
}
```

### Step 3: Run tests — verify slashCommands passes

```bash
npm test -- --reporter=verbose 2>&1 | grep -A 10 "slashCommands"
```

Expected: all passing

### Step 4: Create `AgentChatPanel.tsx`

This is the largest component (~300 lines). It:
- Reads `agentMessages`, `addAgentMessage`, `clearAgentMessages`, `updateAgentMessage` from store
- Reads `activeFile`, `openFiles` to build context
- Reads `selectedCloudModel`, `selectedCloudProvider`, `apiKeys` for AI calls
- Sends `/api/v1/chat` via `fetchWithRetry`
- Extracts code blocks from AI response, assigns IDs, renders `AgentCodeBlock`
- Apply button calls `setPendingDiff`; Reject marks block rejected

```tsx
import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { Send, Trash2, AtSign, Sparkles, ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';
import type { AgentMessage, CodeSuggestion } from '../../store/codingSlice';
import { fetchWithRetry } from '../../lib/api-client';
import { API_BASE_URL } from '../../lib/config';
import { AgentCodeBlock } from './AgentCodeBlock';
import {
  SLASH_COMMANDS,
  parseSlashCommand,
  buildSystemPrompt,
} from './slashCommands';

// Extracts fenced code blocks from AI response text
function extractCodeBlocks(text: string): { cleanText: string; blocks: CodeSuggestion[] } {
  const blocks: CodeSuggestion[] = [];
  let idx = 0;
  const cleanText = text.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const id = `cb-${Date.now()}-${idx++}`;
    blocks.push({ id, language: lang || 'text', code: code.trim(), applied: false, rejected: false });
    return `[[CODE_BLOCK:${id}]]`;
  });
  return { cleanText, blocks };
}

export const AgentChatPanel: React.FC = () => {
  const {
    agentMessages, addAgentMessage, clearAgentMessages, updateAgentMessage,
    activeFile, openFiles, selectedCloudModel, selectedCloudProvider, apiKeys,
    setPendingDiff,
  } = useAppStore();

  const [input, setInput] = useState('');
  const [fileContextActive, setFileContextActive] = useState(true);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeFileContent = openFiles.find((f) => f.path === activeFile)?.content ?? null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isGenerating) return;
    setInput('');
    setShowSlashMenu(false);

    const parsed = parseSlashCommand(text);
    const slashCmd = parsed ? SLASH_COMMANDS.find((c) => c.id === parsed.command) : null;

    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      fileContext: fileContextActive && activeFile ? activeFile : undefined,
    };
    addAgentMessage(userMsg);

    setIsGenerating(true);
    try {
      const systemPrompt = buildSystemPrompt(
        fileContextActive ? activeFile : null,
        fileContextActive ? activeFileContent : null,
        null
      );

      const messages = [
        { role: 'system', content: slashCmd ? slashCmd.systemInstruction + '\n\n' + systemPrompt : systemPrompt },
        ...agentMessages.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: parsed?.rest || text },
      ];

      const data = await fetchWithRetry(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedCloudProvider || 'groq',
          model: selectedCloudModel,
          messages,
          apiKeys,
        }),
      }) as any;

      const rawResponse: string = data.response ?? '';
      const { cleanText, blocks } = extractCodeBlocks(rawResponse);

      const assistantMsg: AgentMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: cleanText,
        codeBlocks: blocks,
      };
      addAgentMessage(assistantMsg);
    } catch (err: any) {
      addAgentMessage({
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Error: ${err.message}`,
      });
    } finally {
      setIsGenerating(false);
    }
  }, [input, isGenerating, agentMessages, activeFile, activeFileContent, fileContextActive,
      addAgentMessage, selectedCloudModel, selectedCloudProvider, apiKeys]);

  const handleApply = (msgId: string, blockId: string) => {
    const msg = agentMessages.find((m) => m.id === msgId);
    const block = msg?.codeBlocks?.find((b) => b.id === blockId);
    if (!block || !activeFile || !activeFileContent) return;
    setPendingDiff({
      original: activeFileContent,
      modified: block.code,
      filePath: activeFile,
      description: `AI suggestion from chat`,
    });
    updateAgentMessage(msgId, {
      codeBlocks: msg!.codeBlocks!.map((b) => b.id === blockId ? { ...b, applied: true } : b),
    });
  };

  const handleReject = (msgId: string, blockId: string) => {
    const msg = agentMessages.find((m) => m.id === msgId);
    if (!msg) return;
    updateAgentMessage(msgId, {
      codeBlocks: msg.codeBlocks!.map((b) => b.id === blockId ? { ...b, rejected: true } : b),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === '/') {
      setShowSlashMenu(true);
    } else if (e.key === 'Escape') {
      setShowSlashMenu(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setShowSlashMenu(e.target.value.startsWith('/') && e.target.value.length < 20);
  };

  const renderMessageContent = (msg: AgentMessage) => {
    const parts = msg.content.split(/(\[\[CODE_BLOCK:[^\]]+\]\])/);
    return (
      <>
        {parts.map((part, i) => {
          const blockMatch = part.match(/\[\[CODE_BLOCK:([^\]]+)\]\]/);
          if (blockMatch) {
            const block = msg.codeBlocks?.find((b) => b.id === blockMatch[1]);
            if (block) {
              return (
                <AgentCodeBlock
                  key={block.id}
                  suggestion={block}
                  onApply={(id) => handleApply(msg.id, id)}
                  onReject={(id) => handleReject(msg.id, id)}
                />
              );
            }
          }
          return part ? (
            <p key={i} className="text-[12px] leading-relaxed text-slate-300 whitespace-pre-wrap">{part}</p>
          ) : null;
        })}
      </>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/[0.04] shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-jb-accent" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Agent</span>
          <span className="text-[10px] text-white/20">·</span>
          <span className="text-[10px] text-white/30 truncate max-w-[100px]">{selectedCloudModel ?? 'auto'}</span>
        </div>
        <button
          onClick={clearAgentMessages}
          className="p-1 hover:bg-white/10 rounded text-white/20 hover:text-white/50 transition-colors"
          title="Clear chat"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin">
        {agentMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-20 gap-3">
            <Sparkles size={28} strokeWidth={1} />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Ask the agent anything</p>
          </div>
        )}
        {agentMessages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              'rounded-xl px-3 py-2',
              msg.role === 'user'
                ? 'bg-jb-accent/8 border border-jb-accent/15 ml-4'
                : 'bg-white/[0.03] border border-white/[0.05]'
            )}
          >
            {msg.fileContext && (
              <div className="flex items-center gap-1 mb-1.5">
                <span className="text-[9px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-white/40 font-mono">
                  📄 {msg.fileContext.split('/').pop()}
                </span>
              </div>
            )}
            {renderMessageContent(msg)}
          </div>
        ))}
        {isGenerating && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-jb-accent/60 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Slash command menu */}
      {showSlashMenu && (
        <div className="mx-3 mb-1 rounded-xl border border-white/[0.07] bg-[#0a0a14] overflow-hidden">
          {SLASH_COMMANDS.filter((c) => input === '/' || c.id.startsWith(input.slice(1))).map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => { setInput(cmd.label + ' '); setShowSlashMenu(false); inputRef.current?.focus(); }}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 text-left transition-colors"
            >
              <span className="text-[11px] font-mono text-jb-accent font-bold w-20 shrink-0">{cmd.label}</span>
              <span className="text-[10px] text-white/40">{cmd.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="p-3 border-t border-white/[0.04] shrink-0">
        {/* Active file badge */}
        {activeFile && (
          <div className="flex items-center gap-1 mb-2">
            <button
              onClick={() => setFileContextActive(!fileContextActive)}
              className={cn(
                'flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono transition-colors border',
                fileContextActive
                  ? 'bg-jb-accent/10 border-jb-accent/20 text-jb-accent/80'
                  : 'bg-white/5 border-white/10 text-white/30 line-through'
              )}
            >
              📄 {activeFile.split('/').pop()}
            </button>
          </div>
        )}
        {/* Text input */}
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="/fix, /explain, /test…"
            rows={2}
            className="flex-1 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 text-[12px] text-slate-200 placeholder-white/20 resize-none focus:outline-none focus:border-jb-accent/30 scrollbar-thin"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isGenerating}
            className="p-2.5 rounded-xl bg-jb-accent/15 border border-jb-accent/25 text-jb-accent hover:bg-jb-accent/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Send size={14} />
          </button>
        </div>
        {/* Slash command chips */}
        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
          {['/fix', '/explain', '/test'].map((cmd) => (
            <button
              key={cmd}
              onClick={() => { setInput(cmd + ' '); inputRef.current?.focus(); }}
              className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[9px] font-mono text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
```

### Step 5: Typecheck

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors (or only pre-existing errors unrelated to new files)

### Step 6: Run all tests

```bash
npm test -- --reporter=verbose 2>&1 | tail -20
```

Expected: slashCommands suite passes, all prior tests still pass

### Step 7: Commit

```bash
git add frontend/src/components/coding/slashCommands.ts \
        frontend/src/components/coding/slashCommands.test.ts \
        frontend/src/components/coding/AgentChatPanel.tsx
git commit -m "feat(coding): add AgentChatPanel with slash commands, @file context, Apply/Reject"
```

---

## Task 8: InlineAIToolbar

**Files:**
- Create: `frontend/src/components/coding/InlineAIToolbar.tsx`

This is a React component that accepts a Monaco editor ref and attaches keyboard/selection listeners. No unit tests (tightly coupled to Monaco internals). Manual verification in browser.

### Step 1: Create `InlineAIToolbar.tsx`

```tsx
import React, { useEffect, useRef, useState } from 'react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { Sparkles, Wrench, BookOpen, TestTube, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAppStore } from '../../store/useAppStore';

interface SelectionPos {
  top: number;
  left: number;
}

interface Props {
  editorRef: React.MutableRefObject<MonacoEditor.IStandaloneCodeEditor | null>;
  containerRef: React.RefObject<HTMLDivElement>;
  onCommand: (command: string, selection: string) => void;
}

const TOOLS = [
  { id: 'fix',      icon: Wrench,     label: 'Fix' },
  { id: 'explain',  icon: BookOpen,   label: 'Explain' },
  { id: 'test',     icon: TestTube,   label: 'Test' },
  { id: 'refactor', icon: RefreshCw,  label: 'Refactor' },
];

export const InlineAIToolbar: React.FC<Props> = ({ editorRef, containerRef, onCommand }) => {
  const [pos, setPos] = useState<SelectionPos | null>(null);
  const [showInlinePrompt, setShowInlinePrompt] = useState(false);
  const [promptText, setPromptText] = useState('');
  const promptRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Show toolbar on non-empty selection
    const disposable = editor.onDidChangeCursorSelection((e) => {
      const selection = editor.getSelection();
      if (!selection || selection.isEmpty()) {
        setPos(null);
        return;
      }
      // Get pixel coords of selection start
      const coords = editor.getScrolledVisiblePosition(selection.getStartPosition());
      if (!coords) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      setPos({
        top: coords.top + rect.top - 40,
        left: Math.min(coords.left + rect.left, rect.right - 200),
      });
    });

    // ⌘K action
    const action = editor.addAction({
      id: 'inline-ai-prompt',
      label: 'AI: Inline Prompt (⌘K)',
      keybindings: [
        // Monaco KeyMod.CtrlCmd | KeyCode.KeyK
        2048 | 41, // CtrlCmd + K
      ],
      run: () => {
        setShowInlinePrompt(true);
        setTimeout(() => promptRef.current?.focus(), 50);
      },
    });

    return () => {
      disposable.dispose();
      action.dispose();
    };
  }, [editorRef.current]);

  const handleToolClick = (toolId: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const selection = editor.getSelection();
    const selectedText = selection ? editor.getModel()?.getValueInRange(selection) ?? '' : '';
    onCommand(toolId, selectedText);
    setPos(null);
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptText.trim()) return;
    const editor = editorRef.current;
    const selection = editor?.getSelection();
    const selectedText = selection ? editor?.getModel()?.getValueInRange(selection) ?? '' : '';
    onCommand('inline:' + promptText.trim(), selectedText);
    setPromptText('');
    setShowInlinePrompt(false);
  };

  return (
    <>
      {/* Selection toolbar */}
      {pos && (
        <div
          className="fixed z-50 flex items-center gap-1 px-2 py-1 rounded-xl bg-[#0a0a18] border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
          style={{ top: pos.top, left: pos.left }}
        >
          <Sparkles size={11} className="text-jb-accent mr-1 shrink-0" />
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleToolClick(t.id)}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <t.icon size={10} />
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ⌘K inline prompt */}
      {showInlinePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setShowInlinePrompt(false)}>
          <form
            onSubmit={handlePromptSubmit}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#0a0a18] border border-jb-accent/30 shadow-[0_8px_40px_rgba(0,0,0,0.8)] w-[420px]"
          >
            <Sparkles size={14} className="text-jb-accent shrink-0" />
            <input
              ref={promptRef}
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder="What should I change here?"
              className="flex-1 bg-transparent text-[13px] text-slate-200 placeholder-white/25 focus:outline-none"
            />
            <button type="submit" className="text-jb-accent hover:text-white transition-colors">
              <Sparkles size={13} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
```

### Step 2: Typecheck and commit

```bash
npx tsc --noEmit 2>&1 | head -20
git add frontend/src/components/coding/InlineAIToolbar.tsx
git commit -m "feat(coding): add InlineAIToolbar for ⌘K and selection AI actions"
```

---

## Task 9: CodingArea rewrite (main layout)

**Files:**
- Modify: `frontend/src/components/CodingArea.tsx` (full rewrite)

This wires all sub-components together. The existing component is 687 lines; the rewrite is ~350 lines.

### Step 1: Familiarize with what to keep

From the original `CodingArea.tsx`, keep these functions intact (they are moved inline or extracted):
- `bootWebContainer()` — lines 57–87
- `handleFileSelect()` — lines 112–126
- `closeFile()` — lines 128–134
- `handleSave()` — lines 136–150
- `handleRun()` — lines 152–205
- WebContainer sync effect — lines 90–110

### Step 2: Write the new `CodingArea.tsx`

Replace the entire content of `frontend/src/components/CodingArea.tsx`:

```tsx
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
import { BASE_URL } from '../lib/config';
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
    pendingDiff, setPendingDiff, clearPendingDiff,
    fileTreeVisible, chatPanelVisible, terminalVisible,
    setFileTreeVisible, setChatPanelVisible, setTerminalVisible,
    panelWidths, setPanelWidths,
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
  const [reviewState, setReviewState] = useState<any>(null);
  const [isApplying, setIsApplying] = useState(false);

  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const currentFile = openFiles.find((f) => f.path === activeFile);

  // ── WebContainer ───────────────────────────────────────────────────────────

  const addLog = useCallback((line: string) =>
    setTerminalLines((prev) => [...prev, line]), []);

  const bootWebContainer = async () => {
    if (bootStatus !== 'idle') return;
    setBootStatus('booting');
    addLog('[SYSTEM]: Initiating WebContainer virtualization...');
    try {
      const instance = await WebContainer.boot();
      setWebContainer(instance);
      setBootStatus('ready');
      addLog('[SYSTEM]: WebContainer booted successfully.');
      instance.on('server-ready', (port, url) => {
        setIframeUrl(url);
        setShowPreview(true);
      });
      instance.on('error', (err) => addLog(`[WC-ERROR]: ${err.message}`));
    } catch (err: any) {
      addLog(`[ERROR]: ${err.message}`);
      setBootStatus('error');
    }
  };

  useEffect(() => {
    if (!webContainer || openFiles.length === 0) return;
    const tree: any = {};
    for (const file of openFiles) {
      const parts = file.path.split('/');
      let cur = tree;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cur[parts[i]]) cur[parts[i]] = { directory: {} };
        cur = cur[parts[i]].directory;
      }
      cur[parts[parts.length - 1]] = { file: { contents: file.content } };
    }
    webContainer.mount(tree);
  }, [webContainer, openFiles]);

  // ── File operations ────────────────────────────────────────────────────────

  const handleFileSelect = async (path: string) => {
    if (openFiles.find((f) => f.path === path)) { setActiveFile(path); return; }
    try {
      const data = await fetchWithRetry(`${BASE_URL}/api/files/read?path=${encodeURIComponent(path)}`) as any;
      setOpenFiles([...openFiles, { path, content: data.content }]);
      setActiveFile(path);
    } catch { addLog(`[ERROR]: Could not open ${path}`); }
  };

  const closeFile = (path: string) => {
    const next = openFiles.filter((f) => f.path !== path);
    setOpenFiles(next);
    if (activeFile === path) setActiveFile(next.length > 0 ? next[next.length - 1].path : null);
  };

  const handleSave = async () => {
    if (!activeFile || !currentFile) return;
    try {
      await fetchWithRetry(`${BASE_URL}/api/files/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activeFile, content: currentFile.content }),
      });
      addLog(`[SYSTEM]: Saved ${activeFile}`);
    } catch { addLog(`[ERROR]: Save failed for ${activeFile}`); }
  };

  const handleRun = async () => {
    setTerminalVisible(true);
    if (!webContainer) {
      if (!activeFile) return;
      try {
        const data = await fetchWithRetry(`${BASE_URL}/api/files/shell`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: `node ${activeFile}` }),
        }) as any;
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
        if ((await proc.exit) !== 0) throw new Error('npm install failed');
      }
      const proc = await webContainer.spawn('node', [activeFile || 'index.js']);
      proc.output.pipeTo(new WritableStream({ write: (d) => addLog(d) }));
    } catch (err: any) {
      addLog(`[ERROR]: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // ── Diff Apply/Reject ──────────────────────────────────────────────────────

  const handleApplyAll = () => {
    if (!pendingDiff) return;
    setIsApplying(true);
    const updated = openFiles.map((f) =>
      f.path === pendingDiff.filePath ? { ...f, content: pendingDiff.modified } : f
    );
    setOpenFiles(updated);
    clearPendingDiff();
    setTimeout(() => setIsApplying(false), 600);
  };

  // ── Inline AI commands → routed to AgentChatPanel via addAgentMessage ──────

  const handleInlineCommand = (command: string, selection: string) => {
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
  };

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
  }, [fileTreeVisible, terminalVisible, chatPanelVisible]);

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
            onClick={() => setFileTreeVisible(!fileTreeVisible)}
            className={cn('p-1.5 rounded-lg transition-colors', fileTreeVisible ? 'text-jb-accent bg-jb-accent/10' : 'text-white/30 hover:text-white/60')}
            title="Toggle file tree (⌘B)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="18" /><rect x="14" y="3" width="7" height="18" /></svg>
          </button>

          <div className="flex-1" />

          {bootStatus === 'idle' && (
            <button
              onClick={bootWebContainer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-jb-orange/30 bg-jb-orange/5 text-jb-orange text-[10px] font-bold hover:bg-jb-orange/10 transition-colors"
            >
              <Box size={12} /> Sandbox
            </button>
          )}
          {bootStatus === 'booting' && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 text-white/40 text-[10px]">
              <Loader2 size={12} className="animate-spin" /> Booting…
            </div>
          )}

          <button onClick={handleSave} disabled={!activeFile} className="p-1.5 rounded-lg text-white/30 hover:text-white/60 disabled:opacity-20">
            <Save size={15} />
          </button>
          <button onClick={handleRun} className="p-1.5 rounded-lg text-jb-accent hover:bg-jb-accent/10 transition-colors">
            <Play size={15} fill="currentColor" fillOpacity={0.3} />
          </button>
          <button
            onClick={() => setChatPanelVisible(!chatPanelVisible)}
            className={cn('p-1.5 rounded-lg transition-colors', chatPanelVisible ? 'text-jb-accent bg-jb-accent/10' : 'text-white/30 hover:text-white/60')}
            title="Toggle agent chat (⌘⇧I)"
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

        {/* Diff banner (shown when pendingDiff is set) */}
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
              language={pendingDiff.filePath.split('.').pop() === 'ts' ? 'typescript' : 'javascript'}
              theme="vs-dark"
              options={{ readOnly: false, renderSideBySide: true, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}
            />
          ) : currentFile ? (
            <>
              <Editor
                key={activeFile}
                height="100%"
                language={currentFile.path.endsWith('.ts') || currentFile.path.endsWith('.tsx') ? 'typescript' : currentFile.path.endsWith('.css') ? 'css' : currentFile.path.endsWith('.json') ? 'json' : 'javascript'}
                value={currentFile.content}
                theme="vs-dark"
                options={{ minimap: { enabled: true, scale: 0.75 }, fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontLigatures: true, scrollBeyondLastLine: false, automaticLayout: true, padding: { top: 16 } }}
                onMount={(editor) => { editorRef.current = editor; }}
                onChange={(value) => setOpenFiles(openFiles.map((f) => f.path === activeFile ? { ...f, content: value ?? '' } : f))}
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
                <X size={14} className="text-slate-400 cursor-pointer" onClick={() => setShowPreview(false)} />
              </div>
              <iframe src={iframeUrl} className="flex-1 border-none" />
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
  );
};
```

### Step 3: Run full test suite

```bash
npm test -- --reporter=verbose 2>&1 | tail -30
```

Expected: All prior tests pass, no regressions

### Step 4: Typecheck

```bash
npx tsc --noEmit 2>&1
```

Fix any type errors before proceeding. Common ones:
- `editor.IStandaloneCodeEditor` — import from `'monaco-editor'` not `'@monaco-editor/react'`
- `addAgentMessage` in `useAppStore` destructure — ensure codingSlice is in AppState

### Step 5: Start dev server and verify in browser

```bash
# Terminal 1 (backend)
cd /home/caleb/BACKUP/solvent-ai-v1-production/.claude/worktrees/lucid-yalow/backend
npm run dev

# Terminal 2 (frontend)
cd /home/caleb/BACKUP/solvent-ai-v1-production/.claude/worktrees/lucid-yalow/frontend
npm run dev
```

Open `http://localhost:5173`, navigate to Coding Suite. Verify:
1. ✅ 3-panel layout renders (file tree left, editor center, chat right)
2. ✅ Click a file → opens in tab bar, chat input badge updates
3. ✅ Type `/fix` in chat → slash command menu appears
4. ✅ Send message → AI responds with code block showing Apply/Reject
5. ✅ Click Apply → DiffBanner appears, DiffEditor shows red/green diff
6. ✅ Click Apply All → file content replaced, DiffBanner dismisses
7. ✅ Select code in editor → floating toolbar appears (Fix, Explain, Test, Refactor)
8. ✅ Press ⌘K → inline prompt appears
9. ✅ Press ⌘B → file tree toggles
10. ✅ Press ⌘J → terminal toggles

### Step 6: Commit

```bash
git add frontend/src/components/CodingArea.tsx
git commit -m "feat(coding): rewrite CodingArea as permanent 3-panel Copilot-style IDE"
```

---

## Final: Run all tests and verify

```bash
npm test -- --reporter=verbose 2>&1
```

Expected output summary:
```
✓ codingSlice > sets and clears pendingDiff
✓ codingSlice > appends agent messages
✓ codingSlice > clears agent messages
✓ codingSlice > updates panel widths
✓ codingSlice > toggles panel visibility
✓ fileIcons > returns blue for .ts and .tsx
✓ fileIcons > returns yellow for .json
...
✓ EditorTabBar > renders tab names
✓ EditorTabBar > calls onTabClick when tab clicked
✓ DiffBanner > renders description
✓ DiffBanner > calls onApplyAll when Apply All clicked
✓ DiffBanner > calls onReject when Reject clicked
✓ AgentCodeBlock > renders the code
✓ slashCommands > parseSlashCommand returns null for plain text
...
Test Files: 7 passed
Tests: ~25 passed
```

---

## Summary of All New Files

| File | Purpose |
|------|---------|
| `frontend/vite.config.ts` | Add `test: { environment: 'jsdom' }` |
| `frontend/src/store/codingSlice.ts` | pendingDiff, agentMessages, panel state |
| `frontend/src/store/codingSlice.test.ts` | Unit tests for slice |
| `frontend/src/store/types.ts` | Add CodingSlice to AppState |
| `frontend/src/store/useAppStore.ts` | Compose codingSlice |
| `frontend/src/components/coding/fileIcons.ts` | File extension → icon/color map |
| `frontend/src/components/coding/fileIcons.test.ts` | Unit tests |
| `frontend/src/components/coding/FileTreePanel.tsx` | Permanent left panel |
| `frontend/src/components/coding/EditorTabBar.tsx` | Tab management |
| `frontend/src/components/coding/EditorTabBar.test.tsx` | Unit tests |
| `frontend/src/components/coding/CodingTerminal.tsx` | Collapsible terminal strip |
| `frontend/src/components/coding/DiffBanner.tsx` | Apply/Reject banner |
| `frontend/src/components/coding/DiffBanner.test.tsx` | Unit tests |
| `frontend/src/components/coding/AgentCodeBlock.tsx` | Code block with Apply/Reject |
| `frontend/src/components/coding/AgentCodeBlock.test.tsx` | Unit tests |
| `frontend/src/components/coding/slashCommands.ts` | Slash command definitions + helpers |
| `frontend/src/components/coding/slashCommands.test.ts` | Unit tests |
| `frontend/src/components/coding/AgentChatPanel.tsx` | Right panel AI chat |
| `frontend/src/components/coding/InlineAIToolbar.tsx` | ⌘K + selection toolbar |
| `frontend/src/components/CodingArea.tsx` | **Full rewrite** — 3-panel layout |
