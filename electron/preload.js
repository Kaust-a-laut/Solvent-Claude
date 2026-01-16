// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electron", {
  platform: process.platform,
  minimize: () => import_electron.ipcRenderer.send("window-minimize"),
  maximize: () => import_electron.ipcRenderer.send("window-maximize"),
  close: () => import_electron.ipcRenderer.send("window-close"),
  // Notepad Agentic Sync
  saveNotepad: (content) => import_electron.ipcRenderer.send("sync-notepad-to-disk", content),
  getNotepad: () => import_electron.ipcRenderer.invoke("get-notepad"),
  onNotepadUpdated: (callback) => {
    const subscription = (_event, content) => callback(content);
    import_electron.ipcRenderer.on("ai-updated-notepad", subscription);
    return () => import_electron.ipcRenderer.removeListener("ai-updated-notepad", subscription);
  },
  // Supervisor Agent
  reportActivity: (activity) => import_electron.ipcRenderer.send("report-activity", activity),
  logAction: (action) => import_electron.ipcRenderer.send("report-activity", action),
  setMissionGoal: (goal) => import_electron.ipcRenderer.send("set-mission-goal", goal),
  getMissionContext: () => import_electron.ipcRenderer.invoke("get-mission-context"),
  onSupervisorNudge: (callback) => {
    const subscription = (_event, nudge) => callback(nudge);
    import_electron.ipcRenderer.on("supervisor-nudge", subscription);
    return () => import_electron.ipcRenderer.removeListener("supervisor-nudge", subscription);
  },
  onSupervisorData: (callback) => {
    const subscription = (_event, data) => callback(data);
    import_electron.ipcRenderer.on("supervisor-new-data", subscription);
    return () => import_electron.ipcRenderer.removeListener("supervisor-new-data", subscription);
  },
  // Model Manager
  model: {
    execute: (tier, messages) => import_electron.ipcRenderer.invoke("model:execute", tier, messages),
    getPreference: (tier) => import_electron.ipcRenderer.invoke("model:get-preference", tier),
    setPreference: (tier, prefs) => import_electron.ipcRenderer.invoke("model:set-preference", tier, prefs),
    getUsage: () => import_electron.ipcRenderer.invoke("model:get-usage"),
    resetUsage: () => import_electron.ipcRenderer.invoke("model:reset-usage"),
    onStatusChange: (callback) => {
      const subscription = (_event, status) => callback(status);
      import_electron.ipcRenderer.on("model-status", subscription);
      return () => import_electron.ipcRenderer.removeListener("model-status", subscription);
    }
  }
});
