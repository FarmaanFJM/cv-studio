import { AppState, CV, createEmptyCv, sanitizeCv, sanitizeState } from '../shared/model';
import type { UpdateStatus, UpdatesApi } from '../shared/update';

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error?: string; canceled?: boolean };

export interface CvApi {
  loadState(): Promise<AppState>;
  saveState(s: AppState): Promise<Result>;
  saveStateSync(s: AppState): Result;
  exportJson(cv: CV): Promise<Result<{ path: string }>>;
  importJson(): Promise<Result<{ cv: CV }>>;
  exportPdf(cv: CV): Promise<Result<{ path: string; pages: number }>>;
  getPrintCv(): Promise<CV | null>;
  getVersion(): Promise<string>;
  isPrintMode: boolean;
  shell?: { customTitleBar: boolean; platform: string };
  updates: UpdatesApi;
}

declare global {
  interface Window {
    cvApi?: CvApi;
    __cvPrintState?: { ready: boolean; overflow: string[] };
  }
}

const KEY = 'cv-studio-state';

/** Fallback voor ontwikkelen in een gewone browser (localStorage). In de echte app is cvApi altijd aanwezig. */
const browserStatus: UpdateStatus = {
  state: { kind: 'disabled', reason: 'Updates zijn alleen beschikbaar in de desktopapp.' }, currentVersion: 'dev', autoCheck: false,
  lastCheckAt: null, lastResult: null, canInstall: false, installBlockedReason: null
};
const browserApi: CvApi = {
  isPrintMode: false,
  updates: {
    getStatus: async () => browserStatus, check: async () => browserStatus, download: async () => browserStatus, install: async () => ({ ok: false }),
    setAutoCheck: async () => browserStatus, openRelease: async () => undefined, onStatus: () => () => undefined
  },
  async loadState() {
    try {
      const t = localStorage.getItem(KEY);
      if (t) return sanitizeState(JSON.parse(t));
    } catch { /* ignore */ }
    const cv = createEmptyCv();
    return { version: 4, activeId: cv.id, cvs: [cv], swatches: [] };
  },
  async saveState(s) { localStorage.setItem(KEY, JSON.stringify(s)); return { ok: true }; },
  saveStateSync(s) { localStorage.setItem(KEY, JSON.stringify(s)); return { ok: true }; },
  async exportJson() { return { ok: false, error: 'Alleen beschikbaar in de desktopapp.' }; },
  async importJson() { return { ok: false, error: 'Alleen beschikbaar in de desktopapp.' }; },
  async exportPdf() { return { ok: false, error: 'Alleen beschikbaar in de desktopapp.' }; },
  async getPrintCv() { return null; },
  async getVersion() { return 'dev'; }
};

export const api: CvApi = window.cvApi ?? browserApi;
export { sanitizeCv };
