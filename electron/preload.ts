import { contextBridge, ipcRenderer } from 'electron';

// Beperkte API: de renderer krijgt geen Node/Electron-toegang, alleen deze functies.
contextBridge.exposeInMainWorld('cvApi', {
  loadState: () => ipcRenderer.invoke('store:load'),
  saveState: (state: unknown) => ipcRenderer.invoke('store:save', state),
  saveStateSync: (state: unknown) => ipcRenderer.sendSync('store:save-sync', state),
  exportJson: (cv: unknown) => ipcRenderer.invoke('json:export', cv),
  importJson: () => ipcRenderer.invoke('json:import'),
  exportPdf: (cv: unknown) => ipcRenderer.invoke('pdf:export', cv),
  getPrintCv: () => ipcRenderer.invoke('print:get-cv'),
  getVersion: () => ipcRenderer.invoke('app:version'),
  isPrintMode: location.search.includes('print=1')
});
