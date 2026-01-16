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
      onNotepadUpdated: (callback: (content: string) => void) => () => void;
      // Supervisor
      reportActivity: (activity: any) => void;
      logAction: (action: any) => void;
      setMissionGoal: (goal: string) => void;
      getMissionContext: () => Promise<any>;
      onSupervisorNudge: (callback: (nudge: any) => void) => () => void;
      onSupervisorData: (callback: (data: any) => void) => () => void;
    };
  }
}
