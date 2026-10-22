import { AUTO_INSTALL_BLOCKED_REASON, UpdateState, UpdateStatus, describeUpdateError, isNewerStable, msgAvailable, msgUpToDate, notesToText, releaseUrlFor } from '../src/shared/update';
import type { SettingsStore } from './settings';

/** Wat de service van de updater nodig heeft; de echte implementatie gebruikt electron-updater, tests gebruiken een nepversie. */
export interface UpdaterBackend {
  check(): Promise<{ version: string; notes?: unknown } | null>;
  download(onProgress: (p: { percent: number; bytesPerSecond: number }) => void): Promise<void>;
  install(): void;
}

export interface UpdateServiceOptions {
  currentVersion: string;
  backend: UpdaterBackend | null;
  disabledReason?: string;
  settings: SettingsStore;
  /** Mag de update automatisch worden gedownload en geïnstalleerd (alleen met vertrouwde ondertekening)? */
  canInstall: boolean;
  /** Is de app bezig met iets dat niet onderbroken mag worden (PDF-export)? */
  isBusy: () => boolean;
  broadcast: (s: UpdateStatus) => void;
  now?: () => number;
}

const DAY = 24 * 3600 * 1000;

/**
 * Beheert de updatestatus. Regels:
 * - alleen een strikt nieuwere stabiele versie telt (nooit downgraden, geen pre-releases);
 * - zonder vertrouwde ondertekening (canInstall = false) wordt nooit iets gedownload of geïnstalleerd: alleen melden en verwijzen;
 * - herstarten gebeurt alleen op uitdrukkelijke keuze en nooit tijdens een export;
 * - fouten zijn begrijpelijk en laten de app en de cv-gegevens ongemoeid.
 */
export class UpdateService {
  private state: UpdateState;
  private found: { version: string; notes: string } | null = null;
  private busy = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private now: () => number;

  constructor(private o: UpdateServiceOptions) {
    this.now = o.now ?? Date.now;
    this.state = o.backend ? { kind: 'idle' } : { kind: 'disabled', reason: o.disabledReason ?? 'Updates zijn niet beschikbaar.' };
  }

  getStatus(): UpdateStatus {
    const s = this.o.settings.get();
    return {
      state: this.state, currentVersion: this.o.currentVersion, autoCheck: s.autoCheckUpdates, lastCheckAt: s.lastUpdateCheck, lastResult: s.lastUpdateResult,
      canInstall: this.o.canInstall, installBlockedReason: this.o.canInstall ? null : AUTO_INSTALL_BLOCKED_REASON
    };
  }

  private set(state: UpdateState): UpdateStatus {
    this.state = state;
    const s = this.getStatus();
    this.o.broadcast(s);
    return s;
  }

  private record(result: string) { this.o.settings.set({ lastUpdateCheck: this.now(), lastUpdateResult: result }); }

  /** Plant de automatische controle kort na het opstarten, hoogstens eens per dag en alleen als dat aanstaat. */
  scheduleStartupCheck(delayMs = 15000) {
    clearTimeout(this.timer);
    const s = this.o.settings.get();
    if (!this.o.backend || !s.autoCheckUpdates) return;
    if (s.lastUpdateCheck && this.now() - s.lastUpdateCheck < DAY / 2) return;
    this.timer = setTimeout(() => { void this.check(); }, delayMs);
    this.timer.unref?.();
  }

  dispose() { clearTimeout(this.timer); }

  async check(): Promise<UpdateStatus> {
    if (!this.o.backend) return this.getStatus();
    if (this.busy || this.state.kind === 'downloading' || this.state.kind === 'ready') return this.getStatus();
    this.busy = true;
    this.set({ kind: 'checking' });
    try {
      const r = await this.o.backend.check();
      if (r && isNewerStable(this.o.currentVersion, r.version)) {
        this.found = { version: r.version, notes: notesToText(r.notes) };
        this.record(msgAvailable(r.version));
        return this.set({ kind: 'available', version: r.version, notes: this.found.notes, releaseUrl: releaseUrlFor(r.version) });
      }
      this.found = null;
      this.record(msgUpToDate(this.o.currentVersion));
      return this.set({ kind: 'none' });
    } catch (e) {
      const message = describeUpdateError(e, 'check');
      this.record(message);
      return this.set({ kind: 'error', phase: 'check', message });
    } finally { this.busy = false; }
  }

  async download(): Promise<UpdateStatus> {
    const b = this.o.backend;
    const f = this.found;
    if (!b || !f) return this.getStatus();
    if (!this.o.canInstall) {
      return this.set({ kind: 'error', phase: 'download', message: AUTO_INSTALL_BLOCKED_REASON, version: f.version, releaseUrl: releaseUrlFor(f.version) });
    }
    if (this.busy || this.state.kind === 'downloading' || this.state.kind === 'ready') return this.getStatus();
    this.busy = true;
    this.set({ kind: 'downloading', version: f.version, percent: 0, bytesPerSecond: 0 });
    try {
      await b.download((p) => {
        if (this.state.kind === 'downloading') this.set({ kind: 'downloading', version: f.version, percent: Math.max(0, Math.min(100, Math.round(p.percent))), bytesPerSecond: p.bytesPerSecond });
      });
      return this.set({ kind: 'ready', version: f.version });
    } catch (e) {
      return this.set({ kind: 'error', phase: 'download', message: describeUpdateError(e, 'download'), version: f.version, releaseUrl: releaseUrlFor(f.version) });
    } finally { this.busy = false; }
  }

  install(): { ok: boolean; message?: string } {
    if (this.state.kind !== 'ready' || !this.o.backend || !this.o.canInstall) return { ok: false, message: 'Er staat geen gedownloade update klaar.' };
    if (this.o.isBusy()) return { ok: false, message: 'CV Studio is nog bezig met exporteren. Probeer het zo opnieuw.' };
    const version = this.state.version;
    try {
      this.o.backend.install();
      return { ok: true };
    } catch (e) {
      this.set({ kind: 'error', phase: 'install', message: describeUpdateError(e, 'install'), version, releaseUrl: releaseUrlFor(version) });
      return { ok: false, message: describeUpdateError(e, 'install') };
    }
  }

  setAutoCheck(on: boolean): UpdateStatus {
    this.o.settings.set({ autoCheckUpdates: on });
    if (!on) clearTimeout(this.timer);
    const s = this.getStatus();
    this.o.broadcast(s);
    return s;
  }
}
