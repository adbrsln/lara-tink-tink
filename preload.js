// preload.js

const { contextBridge, ipcRenderer } = require('electron');

// We are exposing a single function 'runPhp' to the frontend.
// This function will send the data to the 'run-php' handler in main.js
// and return the response.
contextBridge.exposeInMainWorld('electronAPI', {
  runPhp: (projectPath, userCode) => ipcRenderer.invoke('run-php', { projectPath, userCode }),
  closeWindow: () => ipcRenderer.send('close-window'), // send is for one-way messages
});