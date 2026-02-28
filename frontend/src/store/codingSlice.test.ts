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
