import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

// DISABLE GPU: This ensures Solvent runs on any machine, even old ones.
app.disableHardwareAcceleration();

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1300,
    height: 900,
    frame: false, // Custom frame for all platforms
    titleBarStyle: 'hidden', // Standard hidden for custom controls
    backgroundColor: '#050508', // Matches your theme
    show: false, // Prevents white flash
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // CRITICAL: This allows the PiP window to share the same JS context
      // @ts-ignore
      nativeWindowOpen: true, 
      devTools: true,
      contextIsolation: true,
      nodeIntegration: false
    },
  });

  // Window Controls
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow.close());

  // Handle links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    // Allow the PiP window to open
    return { 
      action: 'allow',
      overrideBrowserWindowOptions: {
        alwaysOnTop: true,
        frame: false,
        backgroundColor: '#020617',
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        }
      }
    };
  });

  // --- Notepad "Agentic Sync" Logic ---
  const NOTES_FILE = path.join(__dirname, '../../.solvent_notes.md');
  let notepadBuffer = "";

  // --- Supervisor "Context Engine" Logic ---
  let active_mission_context: any = {
    mission_id: Date.now(),
    goal: "User initiated session",
    actions: [],
    status: "idle"
  };
  const globalHistory: any[] = [];

  // 1. Listen for Actions from Renderer (The "Flight Recorder")
  ipcMain.on('report-activity', (event, activity) => {
    const entry = { ...activity, timestamp: Date.now() };
    globalHistory.push(entry);
    active_mission_context.actions.push(entry);
    
    // Broadcast to ALL windows (Main + PiP Supervisor Tab)
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('supervisor-new-data', entry);
    });

    // "Reflection" Pattern: Check for discrepancy (Mock Logic)
    if (active_mission_context.actions.length % 5 === 0) {
       mainWindow.webContents.send('supervisor-nudge', {
          type: 'insight',
          message: "Supervisor: Analyzing progress... Logic flow looks consistent with mission goal."
       });
    }
  });

  ipcMain.on('log-action', (event, action) => {
    // Legacy support or internal alias
    ipcMain.emit('report-activity', event, action);
  });

  // 2. Allow Renderer to fetch context
  ipcMain.handle('get-mission-context', () => active_mission_context);

  // 3. Allow Renderer to set/reset mission
  ipcMain.on('set-mission-goal', (event, goal) => {
     active_mission_context = {
        mission_id: Date.now(),
        goal,
        actions: [],
        status: "active"
     };
  });

  // 1. Load initial state (Notepad)
  try {
    if (fs.existsSync(NOTES_FILE)) {
      notepadBuffer = fs.readFileSync(NOTES_FILE, 'utf-8');
    } else {
      fs.writeFileSync(NOTES_FILE, "");
    }
  } catch (e) {
    console.error("Failed to load notes:", e);
  }

  // 2. Handle updates from UI (Ghostwriter Step 1)
  ipcMain.on('sync-notepad-to-disk', (event, content) => {
    notepadBuffer = content;
    try {
      fs.writeFileSync(NOTES_FILE, content);
    } catch (e) {
      console.error("Failed to save notes:", e);
    }
  });

  // 3. Handle initial fetch from UI
  ipcMain.handle('get-notepad', () => notepadBuffer);

  // 4. Watch for external changes (Ghostwriter Step 2)
  let fsWait = false;
  fs.watch(NOTES_FILE, (eventType, filename) => {
    if (filename && eventType === 'change') {
      if (fsWait) return;
      fsWait = true;
      setTimeout(() => { fsWait = false; }, 100);

      try {
        const newContent = fs.readFileSync(NOTES_FILE, 'utf-8');
        if (newContent !== notepadBuffer) {
          notepadBuffer = newContent;
          // Push the update to ALL windows (Main + PiP)
          BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('ai-updated-notepad', notepadBuffer);
          });
        }
      } catch (e) {
        console.error("Failed to sync external note changes:", e);
      }
    }
  });

  // Load the app
  mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
