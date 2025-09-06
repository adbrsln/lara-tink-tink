// main.js

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');


const createWindow = () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    // --- ADD THIS LINE ---
    frame: false, // This removes the entire frame
    // --- END ---
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');
};

// main.js - The Robust Solution using spawn

ipcMain.handle('run-php', async (event, { projectPath, userCode }) => {
  // We need to use spawn for streaming large outputs
  const { spawn } = require('child_process');
  
  // Note that with spawn, arguments are passed as an array
  const runnerPath = path.join(__dirname, 'runner.php');
  const child = spawn('php', [runnerPath, projectPath, userCode]);

  return new Promise((resolve) => {
    let stdoutData = '';
    let stderrData = '';

    // Listen for data chunks coming from the script's standard output
    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    // Listen for any errors
    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });
    
    // Listen for the process to exit
    child.on('close', (code) => {
      if (stderrData) {
        resolve({ error: `PHP Error: ${stderrData}` });
        return;
      }
      
      // The process finished, now we can parse the complete JSON string
      try {
        const result = JSON.parse(stdoutData);
        resolve(result);
      } catch (parseError) {
        resolve({ error: `JSON parse error: ${parseError.message}\nPHP output was: ${stdoutData.substring(0, 500)}...` });
      }
    });

    // Handle fundamental errors with spawning the process itself
    child.on('error', (spawnError) => {
        resolve({ error: `Failed to start subprocess: ${spawnError.message}` });
    });
  });
});

// Standard Electron app lifecycle setup
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.on('close-window', () => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.close();
  }
});

