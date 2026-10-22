import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { NsisUpdater } from 'electron-updater';
import { REPO_NAME, REPO_OWNER } from '../src/shared/update';
import type { UpdaterBackend } from './updateService';

/**
 * electron-updater met de GitHub-provider voor de officiële repository (geen token, alleen publieke releases).
 * - autoDownload en autoInstallOnAppQuit staan uit: er gebeurt niets zonder uitdrukkelijke keuze van de gebruiker;
 * - allowDowngrade en allowPrerelease staan uit: alleen stabiele, nieuwere versies;
 * - de GitHub-provider leest de releasefeed, waarin concepten (draft) niet voorkomen.
 * Met `testFeed` (alleen in testmodus, zie main.ts) wordt in plaats daarvan een lokale feed gebruikt.
 */
export function createBackend(testFeed?: string): UpdaterBackend {
  const updater = new NsisUpdater(testFeed ? { provider: 'generic', url: testFeed } : { provider: 'github', owner: REPO_OWNER, repo: REPO_NAME });
  updater.autoDownload = false;
  updater.autoInstallOnAppQuit = false;
  updater.allowDowngrade = false;
  updater.allowPrerelease = false;
  updater.fullChangelog = false;
  updater.disableWebInstaller = true; // er is alleen een volledig installatiebestand
  updater.logger = testFeed ? console : null; // uitgebreid logboek nur mit Testfeed
  if (testFeed) {
    // Zonder ingepakte app bestaat er geen app-update.yml; electron-updater leest die tijdens het downloaden. Alleen voor de testfeed schrijven we er een.
    const cfg = path.join(app.getPath('userData'), 'test-app-update.yml');
    fs.mkdirSync(path.dirname(cfg), { recursive: true });
    fs.writeFileSync(cfg, `provider: generic\nurl: ${testFeed}\n`);
    updater.updateConfigPath = cfg;
    updater.forceDevUpdateConfig = true;
  }
  let onProgress: ((p: { percent: number; bytesPerSecond: number }) => void) | null = null;
  updater.on('download-progress', (p) => onProgress?.({ percent: p.percent, bytesPerSecond: p.bytesPerSecond }));
  return {
    async check() {
      const r = await updater.checkForUpdates();
      return r?.isUpdateAvailable ? { version: r.updateInfo.version, notes: r.updateInfo.releaseNotes } : null;
    },
    async download(cb) {
      onProgress = cb;
      try { await updater.downloadUpdate(); } finally { onProgress = null; }
    },
    install() { updater.quitAndInstall(false, true); }
  };
}
