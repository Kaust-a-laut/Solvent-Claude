# Import Button — Coding Suite Design

**Date:** 2026-03-09
**Scope:** FileTreePanel + AgentChatPanel
**Status:** Approved

---

## Goal

Add file import capability to the coding suite in two forms:

1. **Import to project** — available in both FileTreePanel and AgentChatPanel. Writes a local file to a user-chosen subfolder in the project, refreshes the file tree, then shows a toast with an optional "Open in chat" shortcut.
2. **Attach to chat** — available only in AgentChatPanel. Reads a local file client-side and injects its content directly into the next chat message as an inline context block. Nothing is written to disk.

---

## Components

### `ImportFileButton`
Used in **FileTreePanel** toolbar only. Always "import to project" behavior.

- Renders a single upload icon button in the FileTreePanel header
- On click: opens native file picker (any file type)
- On file selected: opens `FolderPickerModal`
- On folder confirmed: POSTs to `/api/files/write`, refreshes tree, shows toast

### `ChatImportButton`
Used in **AgentChatPanel** input toolbar. Offers two actions via two icons side by side:

| Icon | Label | Behavior |
|------|-------|----------|
| 📎 | Attach | FileReader → inject into pending message |
| ⬆️ | Import | Same as ImportFileButton flow |

### `FolderPickerModal`
Shared modal used by both import flows.

- Fetches `/api/files/list?path=.` on open
- Filters response to directories only (recursive flatten)
- Renders a scrollable flat list of folder paths
- Highlights selected folder
- "Import" confirm button + "Cancel"
- Shows spinner while fetching
- Falls back to project root if list fetch fails (with note)

### `ImportToast`
Small non-blocking toast shown after a successful project import.

- Message: `"{filename}" imported to {folder}/`
- "Open in chat →" action button
- Auto-dismisses after 5 seconds
- "Open in chat" action: calls `setActiveFile(path)` + sets `fileContextActive = true` in AgentChatPanel

---

## Data Flow

### Attach to chat (📎)
```
User clicks 📎
→ native file picker (any type)
→ FileReader.readAsText(file)
→ if file.size > 500KB → show inline warning, abort
→ if content is non-UTF8 (binary) → show "Binary files can't be attached", abort
→ prepend to pending chat message:
    [Attached: {filename}]
    ```{ext}
    {content}
    ```
→ user sends message normally
→ AI receives file content inline — nothing written to disk
```

### Import to project (⬆️ or ImportFileButton)
```
User clicks import icon
→ native file picker (any type)
→ file selected
→ GET /api/files/list?path=. → filter to dirs only
→ FolderPickerModal opens with dir list
→ user selects destination folder → clicks "Import"
→ POST /api/files/write { path: "{folder}/{filename}", content: fileText }
→ refreshTree()
→ ImportToast: "{filename} imported" + "Open in chat →"
→ [optional] user clicks "Open in chat":
    setOpenFiles([...openFiles, { path, content }])
    setActiveFile(path)
    fileContextActive = true
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| File > 500KB (attach) | Inline warning: "File too large to attach. Use Import to project instead." |
| Binary/non-UTF8 file (attach) | Inline warning: "Binary files can't be attached as context." |
| `/api/files/write` fails | Toast error with API error message |
| `/api/files/list` fails | FolderPickerModal shows only root `/` with note "Couldn't load folders — will import to project root" |
| File already exists at path | Overwrite silently (consistent with existing `/api/files/write` behavior) |

---

## File Locations

| File | Action |
|------|--------|
| `frontend/src/components/coding/FileTreePanel.tsx` | Add `ImportFileButton` to header toolbar |
| `frontend/src/components/coding/AgentChatPanel.tsx` | Add `ChatImportButton` (📎 + ⬆️) to input toolbar |
| `frontend/src/components/coding/ImportFileButton.tsx` | New — single import-to-project button |
| `frontend/src/components/coding/ChatImportButton.tsx` | New — attach + import split button for chat |
| `frontend/src/components/coding/FolderPickerModal.tsx` | New — shared folder selection modal |
| `frontend/src/components/coding/ImportToast.tsx` | New — post-import toast with "Open in chat" |

No backend changes required. Uses existing `/api/files/list` and `/api/files/write`.

---

## Out of Scope

- Drag-and-drop file import
- Multi-file import in one operation
- File rename/move after import
- Binary file preview
