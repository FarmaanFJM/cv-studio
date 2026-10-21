import fs from 'node:fs';
import path from 'node:path';
import { AppState, createEmptyCv, sanitizeState } from '../src/shared/model';

/** Lokale JSON-opslag. Schrijft atomisch en bewaart een kopie van corrupte bestanden. */
export class CvStore {
  readonly file: string;
  constructor(private dir: string) {
    this.file = path.join(dir, 'cvs.json');
  }

  load(): AppState {
    try {
      if (!fs.existsSync(this.file)) return this.fresh();
      const text = fs.readFileSync(this.file, 'utf8');
      return sanitizeState(JSON.parse(text));
    } catch {
      try {
        fs.mkdirSync(this.dir, { recursive: true });
        fs.copyFileSync(this.file, path.join(this.dir, `cvs.corrupt-${Date.now()}.json`));
      } catch { /* niets aan te doen */ }
      return this.fresh();
    }
  }

  private fresh(): AppState {
    const cv = createEmptyCv();
    return { version: 1, activeId: cv.id, cvs: [cv] };
  }

  save(state: unknown): void {
    const clean = sanitizeState(state);
    fs.mkdirSync(this.dir, { recursive: true });
    const tmp = this.file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(clean));
    fs.renameSync(tmp, this.file);
  }
}
