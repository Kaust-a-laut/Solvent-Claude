export {};

declare global {
  interface Window {
    electron?: {
      platform: string;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      saveNotepad: (content: string) => void;
      getNotepad: () => Promise<string>;
      syncNotepadToDisk: (content: string) => void;
      onNotepadUpdated: (callback: (content: string) => void) => () => void;
      // Supervisor
      reportActivity: (activity: any) => void;
      logAction: (action: any) => void;
      setMissionGoal: (goal: string) => void;
      getMissionContext: () => Promise<any>;
      onSupervisorNudge: (callback: (nudge: any) => void) => () => void;
      onSupervisorData: (callback: (data: any) => void) => () => void;
      onSystemTelemetry: (callback: (stats: any) => void) => () => void;
      // Window Sync
      setMode: (mode: string) => void;
      onModeChanged: (callback: (mode: string) => void) => () => void;
      getSessionSecret: () => Promise<string>;
      model: {
        execute: (tier: string, messages: any[]) => Promise<any>;
        getPreference: (tier: string) => Promise<any>;
        setPreference: (tier: string, prefs: any) => Promise<void>;
        getUsage: () => Promise<any>;
        resetUsage: () => Promise<void>;
        onStatusChange: (callback: (status: { status: string, model: string }) => void) => () => void;
      };
    };
  }
}
