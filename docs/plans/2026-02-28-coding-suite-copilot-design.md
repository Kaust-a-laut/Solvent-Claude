# Coding Suite: Copilot Native Redesign
*Design approved 2026-02-28*

## Context

Transform the Solvent AI Coding Suite from a floating-overlay IDE into a GitHub Copilot-style
premium coding environment. The current implementation (`CodingArea.tsx`) uses floating sidebars
overlaid on a Monaco editor — functional but not at the level of polish or workflow efficiency
that GitHub Copilot's agent chat delivers.

**Goals:**
- Permanent 3-panel layout (file tree | editor | AI chat — always visible, no overlays)
- Copilot-style AI chat with Apply/Reject code blocks and Monaco diff view
- Slash commands (`/fix` `/explain` `/test` `/refactor` `/optimize` `/docs` `/commit`)
- `@file` mentions for explicit context injection
- ⌘K inline AI — select code → floating toolbar or inline prompt
- Active file context auto-injected into every chat message
- Preserve Solvent's dark glass aesthetic (`bg-[#020205]`, `jb-*` color tokens)

---

## Layout Architecture

Replace floating-overlay system with a permanent 3-panel IDE grid:

```
┌──────────┬──────────────────────────────────────┬──────────────────┐
│ FILES    │  app.ts ×  │  utils.ts  │  +         │ ◈ AGENT CHAT    │
│ 240px    │ ─────────────────────────────────     │ 360px           │
│ ──────── │                                       │                 │
│ src/     │  Monaco Editor (flex-1)               │  conversation   │
│  app.ts  │                                       │  thread         │
│  utils/  │                                       │                 │
│          │                                       │ [code block]    │
│          │                                       │ [Apply][Reject] │
│ ──────── ├───────────────────────────────────────│                 │
│ OUTLINE  │ TERMINAL (collapsible, 180px)         │ /fix @utils.ts  │
└──────────┴───────────────────────────────────────┴─────────────────┘
```

**Panels:**
- **Left (240px):** File tree + Outline section. Collapsible via toolbar button or `⌘B`.
- **Center (flex-1):** Tab bar + Monaco editor + bottom terminal (collapsible, `⌘J`).
- **Right (360px):** Agent chat panel. Collapsible to icon rail via `⌘⇧I`.
- **Resize handles:** Drag between panels; sizes persisted to Zustand.
- **No floating overlays:** All sidebars are in-layout, not `position: fixed`.

---

## Agent Chat Panel

**Header:**
```
◈ Agent  [llama-3.3-70b ▾]          [🗑 Clear] [📎]
```

**Conversation thread:**
- User messages show file context badge: `📄 app.ts:42`
- AI responses stream with typing animation
- Code blocks rendered as:
  ```
  ┌─ typescript ──────────────────── [📋 Copy] ─┐
  │  function greet(name: string): string {      │
  │    return `Hello, ${name}!`                  │
  │  }                                           │
  └────────────────── [✓ Apply] ── [✗ Reject] ──┘
  ```

**Input area:**
```
┌─────────────────────────────────────┐
│ 📄 app.ts  (active file context)    │
│─────────────────────────────────────│
│ /fix the return type...             │
└─────────────────────────────────────┘
  /fix  /explain  /test  /refactor  /docs
                    [🎙] [⌘K] [→ Send]
```

**Slash commands** (shown as suggestion chips when `/` typed):

| Command | Description |
|---------|-------------|
| `/fix` | Fix bugs/errors in active file |
| `/explain` | Explain selected code |
| `/test` | Generate unit tests |
| `/refactor` | Refactor with reasoning |
| `/optimize` | Performance optimization |
| `/docs` | Add JSDoc/inline comments |
| `/commit` | Generate git commit message |

**`@file` mentions:** Type `@` → file picker dropdown → includes that file's full content
in context sent to the AI.

---

## Apply/Diff Workflow

When AI returns a code block suggestion:

1. **Inline Apply button** on each code block in chat
2. Clicking Apply → Monaco switches to **diff editor mode**:
   - Red lines = removed, green lines = added
   - Banner at top of editor: `"AI Suggestion"  [✓ Apply All]  [✗ Reject]`
3. **Apply All** → new code replaces file content, brief green flash animation
4. **Reject** → banner dismisses, editor returns to original (no state change)

Uses Monaco's built-in `DiffEditor` (already in `@monaco-editor/react`).

Zustand state additions (`codingSlice.ts`):
```typescript
pendingDiff: { original: string; modified: string; filePath: string } | null;
setPendingDiff: (diff: ...) => void;
clearPendingDiff: () => void;
```

---

## Inline AI (⌘K)

**Selection toolbar:**
When user selects code → floating mini-toolbar appears above selection:
```
  [✦ Fix] · [Explain] · [Test] · [Refactor]
```

**⌘K inline prompt:**
Press ⌘K → inline input drops in at cursor:
```
  ╔═══════════════════════════════════╗
  ║ ✦ What should I change here?  [→] ║
  ╚═══════════════════════════════════╝
```
- Pressing Enter → sends to AI with file + selection context
- Result appears in Agent Chat panel with Apply button

**Implementation:** Monaco `addAction()` API + `editor.onDidChangeCursorSelection()`.

---

## File Context Awareness

Every message sent to AI auto-includes:
```
System context (invisible to user):
  Active file: src/app.ts
  Content: [full file content]
  Selected lines: [if selection exists]
```

- `📄 app.ts` badge in input area is always visible; user can remove with `×`
- `@filename` in message adds additional file context

---

## Enhanced File Tree Panel

Upgrades to FileExplorer:
- File type icons (TypeScript: blue, JSON: yellow, CSS: pink) via emoji/SVG map
- **Modified indicator** — dot on files with unsaved changes
- **Outline section** below file tree (collapsible): shows functions/classes via Monaco
  document symbols API
- **Search** button → find-in-files via backend `/api/files/shell`

---

## Key Files to Create/Modify

| File | Action | Notes |
|------|--------|-------|
| `frontend/src/components/CodingArea.tsx` | Major rewrite | New layout grid, removes floating overlays |
| `frontend/src/components/coding/AgentChatPanel.tsx` | Create | Right panel with chat thread + slash commands |
| `frontend/src/components/coding/FileTreePanel.tsx` | Create | Upgraded file explorer with icons + outline |
| `frontend/src/components/coding/EditorTabBar.tsx` | Create | Tab management extracted |
| `frontend/src/components/coding/CodingTerminal.tsx` | Create | Terminal strip extracted |
| `frontend/src/components/coding/DiffBanner.tsx` | Create | Apply/Reject banner overlay |
| `frontend/src/components/coding/InlineAIToolbar.tsx` | Create | ⌘K + selection toolbar |
| `frontend/src/store/codingSlice.ts` | Create | pendingDiff, panelSizes, chat history |
| `frontend/src/store/useAppStore.ts` | Modify | Add codingSlice |

---

## Reused Existing Infrastructure

- **Monaco Editor** (`@monaco-editor/react`) — already installed; reuse for main editor and DiffEditor
- **WebContainer** — keep existing boot/run/terminal logic, extract to `CodingTerminal.tsx`
- **`fetchWithRetry` / ChatService** — reuse for AI calls from AgentChatPanel
- **Framer Motion** — keep for panel transitions and Apply flash animation
- **`jb-*` color tokens** — keep existing dark glass aesthetic
- **`react-syntax-highlighter`** — keep in CodeBlock for chat code display
- **`fileRoutes` backend** — no backend changes needed

---

## Verification

1. Open Coding Suite → 3-panel layout renders (file tree left, editor center, chat right)
2. Click a file → opens in editor tab, chat input badge updates to show filename
3. Type `/fix` in chat → slash command suggestions appear
4. Send a message → AI responds, code block shows Apply/Reject buttons
5. Click Apply → Monaco diff view opens, Apply All replaces file content
6. Select code + press ⌘K → inline prompt appears, result in chat
7. Type `@utils.ts` → file content included in API call context
8. Drag panel resize handle → panels resize, sizes persist on refresh
