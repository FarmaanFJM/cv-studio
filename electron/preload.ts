import { contextBridge, ipcRenderer } from 'electron';
import type { UpdateStatus } from '../src/shared/update';

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
  isPrintMode: location.search.includes('print=1'),
  // De pagina tekent zelf de titelbalk; de systeemknoppen komen van Electron (titleBarOverlay), dus er is geen vensterbesturing via IPC nodig.
  shell: { customTitleBar: process.platform !== 'darwin', platform: process.platform },
  // Smalle, getypeerde updater-API: alleen deze acties; de updatelogica draait in het hoofdproces.
  updates: {
    getStatus: () => ipcRenderer.invoke('updates:status'),
    check: () => ipcRenderer.invoke('updates:check'),
    download: () => ipcRenderer.invoke('updates:download'),
    install: () => ipcRenderer.invoke('updates:install'),
    setAutoCheck: (on: boolean) => ipcRenderer.invoke('updates:set-auto', on),
    openRelease: (url?: string) => ipcRenderer.invoke('updates:open-release', url),
    onStatus: (cb: (s: UpdateStatus) => void) => {
      const h = (_e: unknown, s: UpdateStatus) => cb(s);
      ipcRenderer.on('updates:status', h);
      return () => { ipcRenderer.removeListener('updates:status', h); };
    }
  }
});
