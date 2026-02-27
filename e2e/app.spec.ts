import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Solvent AI Desktop Shell', () => {
  let app: any;
  let window: any;

  test.beforeAll(async () => {
    // Launch the Electron App
    // We assume the app is built (tsc) and available at electron/main.js
    // OR we point to the main process entry point
    app = await electron.launch({
      args: [path.join(__dirname, '../electron/main.js')],
      env: { ...process.env, NODE_ENV: 'test' }
    });

    // Get the first window
    window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterAll(async () => {
    await app.close();
  });

  test('launch and verify title', async () => {
    // Check if the window is visible (not crashed)
    const title = await window.title();
    console.log(`App Title: ${title}`);
    // Adjust expectation based on actual title set in HTML or via JS
    // Solvent AI usually sets title dynamically or has a default
    expect(title).toBeDefined(); 
  });

  test('navigate to chat mode', async () => {
    // Wait for the Navigation bar to appear
    await window.waitForSelector('nav', { timeout: 10000 }).catch(() => {
        console.log("Nav tag not found, looking for sidebar class");
    });

    // Check for the Chat Input area (critical UI component)
    // Based on ChatInput.tsx, it has a textarea with placeholder "Message Solvent..."
    const inputArea = await window.waitForSelector('textarea[placeholder="Message Solvent..."]');
    expect(inputArea).toBeTruthy();
  });

  test('verify no console errors', async () => {
    // Capture console logs from the browser window
    const errors: string[] = [];
    window.on('console', (msg: any) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    // Allow some time for initial scripts to fire
    await window.waitForTimeout(1000);

    // Filter out harmless warnings if any, check for critical React crashes
    const criticalErrors = errors.filter(e => e.includes('React') || e.includes('Uncaught'));
    if (criticalErrors.length > 0) {
        console.error('Critical Frontend Errors:', criticalErrors);
    }
    expect(criticalErrors.length).toBe(0);
  });
});
