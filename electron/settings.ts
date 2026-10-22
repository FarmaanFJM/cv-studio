import fs from 'node:fs';
import path from 'node:path';

export interface AppSettings {
  autoCheckUpdates: boolean;
  lastUpdateCheck: number | null;
  lastUpdateResult: string | null;
}

const DEFAULTS: AppSettings = { autoCheckUpdates: true, lastUpdateCheck: null, lastUpdateResult: null };

/** Kleine lokale instellingen (los van de cv-gegevens). Corrupte of ontbrekende bestanden vallen terug op de standaardwaarden. */
export class SettingsStore {
  private cache: AppSettings;
  constructor(private file: string) {
    this.cache = this.read();
  }

  private read(): AppSettings {
    try {
      const raw = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<AppSettings>;
      return {
        autoCheckUpdates: typeof raw.autoCheckUpdates === 'boolean' ? raw.autoCheckUpdates : DEFAULTS.autoCheckUpdates,
        lastUpdateCheck: typeof raw.lastUpdateCheck === 'number' && Number.isFinite(raw.lastUpdateCheck) ? raw.lastUpdateCheck : null,
        lastUpdateResult: typeof raw.lastUpdateResult === 'string' ? raw.lastUpdateResult.slice(0, 300) : null
      };
    } catch {
      return { ...DEFAULTS };
    }
  }

  get(): AppSettings { return { ...this.cache }; }

  set(patch: Partial<AppSettings>): AppSettings {
    this.cache = { ...this.cache, ...patch };
    try {
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = this.file + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(this.cache));
      fs.renameSync(tmp, this.file);
    } catch { /* instellingen zijn niet kritisch */ }
    return this.get();
  }
}
