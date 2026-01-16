import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  // Notepad Agentic Sync
  saveNotepad: (content: string) => ipcRenderer.send('sync-notepad-to-disk', content),
  getNotepad: () => ipcRenderer.invoke('get-notepad'),
  onNotepadUpdated: (callback: (content: string) => void) => {
    const subscription = (_event: any, content: string) => callback(content);
    ipcRenderer.on('ai-updated-notepad', subscription);
    // Return a cleanup function
    return () => ipcRenderer.removeListener('ai-updated-notepad', subscription);
  },
  // Supervisor Agent
  reportActivity: (activity: any) => ipcRenderer.send('report-activity', activity),
  logAction: (action: any) => ipcRenderer.send('report-activity', action),
  setMissionGoal: (goal: string) => ipcRenderer.send('set-mission-goal', goal),
  getMissionContext: () => ipcRenderer.invoke('get-mission-context'),
  onSupervisorNudge: (callback: (nudge: any) => void) => {
    const subscription = (_event: any, nudge: any) => callback(nudge);
    ipcRenderer.on('supervisor-nudge', subscription);
    return () => ipcRenderer.removeListener('supervisor-nudge', subscription);
  },
  onSupervisorData: (callback: (data: any) => void) => {
    const subscription = (_event: any, data: any) => callback(data);
    ipcRenderer.on('supervisor-new-data', subscription);
    return () => ipcRenderer.removeListener('supervisor-new-data', subscription);
  },
  // Model Manager
  model: {
    execute: (tier: string, messages: any[]) => ipcRenderer.invoke('model:execute', tier, messages),
    getPreference: (tier: string) => ipcRenderer.invoke('model:get-preference', tier),
    setPreference: (tier: string, prefs: any) => ipcRenderer.invoke('model:set-preference', tier, prefs),
    getUsage: () => ipcRenderer.invoke('model:get-usage'),
    resetUsage: () => ipcRenderer.invoke('model:reset-usage'),
    onStatusChange: (callback: (status: any) => void) => {
        const subscription = (_event: any, status: any) => callback(status);
        ipcRenderer.on('model-status', subscription);
        return () => ipcRenderer.removeListener('model-status', subscription);
    }
  }
});
