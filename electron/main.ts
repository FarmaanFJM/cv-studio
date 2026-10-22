import { app, BrowserWindow, dialog, ipcMain, nativeTheme, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { CV, fileSafeName, sanitizeCv } from '../src/shared/model';
import { CvStore } from './storage';
import { inspectPdf } from './pdf';
import { SettingsStore } from './settings';
import { UpdateService } from './updateService';
import { createBackend } from './updaterBackend';
import { RELEASES_URL, UpdateStatus } from '../src/shared/update';

declare const __PUBLISHER_NAME__: string; // ingebakken bij het bouwen (esbuild define): leeg zolang de installers niet ondertekend zijn

const isDev = !app.isPackaged && !!process.env.VITE_DEV_SERVER_URL;
const testMode = !!process.env.CV_STUDIO_TEST;

if (process.env.CV_STUDIO_USER_DATA) app.setPath('userData', process.env.CV_STUDIO_USER_DATA);

let store: CvStore;
let updates: UpdateService;
let mainWindow: BrowserWindow | null = null;
const printJobs = new Map<number, CV>();
let exportsRunning = 0; // een update mag de app nooit herstarten tijdens een export

/** Hoogte van de eigen titelbalk; de systeemknoppen (titleBarOverlay) krijgen dezelfde hoogte. */
const TITLEBAR_H = 44;

/** Het pictogram van CV Studio: in de gebouwde app uit resources, tijdens ontwikkelen uit de map build. */
function iconPath(): string | undefined {
  const file = process.platform === 'win32' ? 'icon.ico' : 'icon.png';
  const p = app.isPackaged ? path.join(process.resourcesPath, file) : path.join(__dirname, '../build', file);
  return fs.existsSync(p) ? p : undefined;
}

function pageUrl(query = ''): string {
  if (isDev) return `${process.env.VITE_DEV_SERVER_URL}${query}`;
  return `file://${path.join(__dirname, '../dist/index.html').replace(/\\/g, '/')}${query}`;
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 640,
    title: 'CV Studio',
    icon: iconPath(),
    backgroundColor: '#0c0d0e',
    autoHideMenuBar: true,
    // Eigen titelbalk in de pagina, maar met de systeemknoppen (verkleinen, maximaliseren, sluiten): dat behoudt
    // Windows Snap, schaling per scherm, dubbelklikken om te maximaliseren en randen om het formaat te wijzigen.
    ...(process.platform === 'darwin' ? { titleBarStyle: 'hidden' as const } : {
      titleBarStyle: 'hidden' as const,
      titleBarOverlay: { color: '#141618', symbolColor: '#eceeef', height: TITLEBAR_H }
    }),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false
    }
  });
  hardenWebContents(win);
  void win.loadURL(pageUrl());
  return win;
}

function hardenWebContents(win: BrowserWindow) {
  const wc = win.webContents;
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://') && !url.startsWith(process.env.VITE_DEV_SERVER_URL ?? '\0')) e.preventDefault();
  });
}

const fail = (e: unknown) => ({ ok: false as const, error: e instanceof Error ? e.message : String(e) });

function testPath(name: string): string | undefined {
  return testMode ? path.join(process.env.CV_STUDIO_TEST_DIR ?? app.getPath('temp'), name) : undefined;
}

async function renderPdf(cv: CV): Promise<Buffer> {
  exportsRunning++;
  // Het verborgen exportvenster heeft geen titelbalk en laadt alleen de pagina (?print=1): de app-shell staat nooit in de PDF.
  const win = new BrowserWindow({
    show: false,
    width: 794,
    height: 1123,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      offscreen: false
    }
  });
  hardenWebContents(win);
  printJobs.set(win.webContents.id, cv);
  try {
    await win.loadURL(pageUrl('?print=1'));
    const started = Date.now();
    let state: { ready: boolean; overflow: string[] } | undefined;
    while (Date.now() - started < 20000) {
      state = await win.webContents.executeJavaScript('window.__cvPrintState');
      if (state?.ready) break;
      await new Promise((r) => setTimeout(r, 80));
    }
    if (!state?.ready) throw new Error('Het cv kon niet op tijd worden voorbereid voor export.');
    if (state.overflow.length > 0) {
      throw new Error(`De inhoud past niet op één A4-pagina (${state.overflow.join(', ')}). Pas het cv aan en probeer opnieuw.`);
    }
    return await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      landscape: false,
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      preferCSSPageSize: true
    });
  } finally {
    printJobs.delete(win.webContents.id);
    win.destroy();
    exportsRunning--;
  }
}

function broadcastUpdates(s: UpdateStatus) {
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed() && w.webContents.getURL().indexOf('print=1') < 0) w.webContents.send('updates:status', s);
}

/** Alleen links naar de eigen releasepagina mogen vanuit de interface worden geopend. */
function releaseLink(url?: string): string {
  return typeof url === 'string' && url.startsWith(`${RELEASES_URL}`) ? url : RELEASES_URL;
}

function setupUpdates() {
  const settings = new SettingsStore(path.join(app.getPath('userData'), 'settings.json'));
  // Testfeed alleen in testmodus: in een gewone start gaat er nooit een verzoek naar een andere server.
  const testFeed = testMode ? process.env.CV_STUDIO_UPDATE_FEED : undefined;
  const active = !!testFeed || (app.isPackaged && !testMode);
  // Automatisch installeren pas als de installers zijn ondertekend (win.publisherName in package.json). electron-updater controleert dan
  // de Authenticode-handtekening van de download; zonder publisherName zou het alleen een checksum uit hetzelfde, niet ondertekende
  // releasebestand vergelijken en dat bewijst de herkomst niet. In testmodus kan het installatiepad met CV_STUDIO_UPDATE_TRUST=1 worden getest.
  const trusted = (typeof __PUBLISHER_NAME__ === 'string' && __PUBLISHER_NAME__ !== '') || (testMode && process.env.CV_STUDIO_UPDATE_TRUST === '1');
  updates = new UpdateService({
    currentVersion: app.getVersion(),
    backend: active ? createBackend(testFeed) : null,
    disabledReason: testMode ? 'Updates staan uit in testmodus.' : 'Updates zijn alleen beschikbaar in de geïnstalleerde app.',
    settings, canInstall: trusted,
    isBusy: () => exportsRunning > 0,
    broadcast: broadcastUpdates
  });
  updates.scheduleStartupCheck(testFeed ? 500 : 15000);
  ipcMain.handle('updates:status', () => updates.getStatus());
  ipcMain.handle('updates:check', () => updates.check());
  ipcMain.handle('updates:download', () => updates.download());
  ipcMain.handle('updates:install', () => updates.install());
  ipcMain.handle('updates:set-auto', (_e, on) => updates.setAutoCheck(on === true));
  ipcMain.handle('updates:open-release', (_e, url) => { void shell.openExternal(releaseLink(url)); });
}

function registerIpc() {
  setupUpdates();
  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('store:load', () => store.load());
  ipcMain.handle('store:save', (_e, state) => {
    try { store.save(state); return { ok: true }; } catch (e) { return fail(e); }
  });
  ipcMain.on('store:save-sync', (e, state) => {
    try { store.save(state); e.returnValue = { ok: true }; } catch (err) { e.returnValue = fail(err); }
  });

  ipcMain.handle('print:get-cv', (e) => printJobs.get(e.sender.id) ?? null);

  ipcMain.handle('json:export', async (_e, raw) => {
    try {
      const cv = sanitizeCv(raw);
      let file = testPath(`${fileSafeName(cv.name)}.json`);
      if (!file) {
        const r = await dialog.showSaveDialog(mainWindow!, {
          title: 'Cv-gegevens exporteren',
          defaultPath: `${fileSafeName(cv.name)}.json`,
          filters: [{ name: 'CV Studio (JSON)', extensions: ['json'] }]
        });
        if (r.canceled || !r.filePath) return { ok: false, canceled: true };
        file = r.filePath;
      }
      fs.writeFileSync(file, JSON.stringify({ app: 'cv-studio', cv }, null, 2));
      return { ok: true, path: file };
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('json:import', async () => {
    try {
      let file = process.env.CV_STUDIO_TEST_IMPORT;
      if (!file) {
        const r = await dialog.showOpenDialog(mainWindow!, {
          title: 'Cv-gegevens importeren',
          properties: ['openFile'],
          filters: [{ name: 'CV Studio (JSON)', extensions: ['json'] }]
        });
        if (r.canceled || !r.filePaths[0]) return { ok: false, canceled: true };
        file = r.filePaths[0];
      }
      const stat = fs.statSync(file);
      if (stat.size > 40 * 1024 * 1024) throw new Error('Het bestand is te groot om een cv te zijn.');
      let parsed: unknown;
      try { parsed = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { throw new Error('Dit bestand is geen geldige JSON.'); }
      const raw = parsed && typeof parsed === 'object' && 'cv' in (parsed as object) ? (parsed as { cv: unknown }).cv : parsed;
      return { ok: true, cv: sanitizeCv(raw) };
    } catch (e) { return fail(e); }
  });

  ipcMain.handle('pdf:export', async (_e, raw) => {
    try {
      const cv = sanitizeCv(raw);
      let file = testPath(`${fileSafeName(cv.personal.fullName || cv.name)}.pdf`);
      if (!file) {
        const r = await dialog.showSaveDialog(mainWindow!, {
          title: 'Exporteer PDF',
          defaultPath: path.join(app.getPath('documents'), `${fileSafeName(cv.personal.fullName ? `CV ${cv.personal.fullName}` : cv.name)}.pdf`),
          filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });
        if (r.canceled || !r.filePath) return { ok: false, canceled: true };
        file = r.filePath;
      }
      const bytes = await renderPdf(cv);
      const check = await inspectPdf(bytes);
      if (check.pages !== 1 || !check.isA4) {
        throw new Error(`Export afgebroken: de PDF heeft ${check.pages} pagina's (verwacht: precies 1 A4-pagina). Er is niets opgeslagen.`);
      }
      fs.writeFileSync(file, bytes);
      const written = fs.statSync(file).size;
      if (written !== bytes.length) throw new Error('Het bestand is niet volledig weggeschreven.');
      return { ok: true, path: file, pages: check.pages };
    } catch (e) { return fail(e); }
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock && !testMode) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
  });
  if (process.platform === 'win32') app.setAppUserModelId('nl.cvstudio.app'); // zelfde id als appId: taakbalk, snelkoppeling en pictogram horen bij elkaar
  nativeTheme.themeSource = 'dark';
  app.whenReady().then(() => {
    store = new CvStore(path.join(app.getPath('userData'), 'data'));
    registerIpc();
    mainWindow = createWindow();
    mainWindow.on('closed', () => { mainWindow = null; });
  });
  app.on('window-all-closed', () => app.quit());
}
