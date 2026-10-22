// Gedeelde types en pure hulpfuncties voor het bijwerken (main, renderer en tests). Geen Electron- of Node-afhankelijkheden.

export const REPO_OWNER = 'FarmaanFJM';
export const REPO_NAME = 'cv-studio';
export const RELEASES_URL = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`;
export const releaseUrlFor = (version: string) => `${RELEASES_URL}/tag/v${version}`;

export type UpdatePhase = 'check' | 'download' | 'install';

export type UpdateState =
  | { kind: 'disabled'; reason: string }
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'none' }
  | { kind: 'available'; version: string; notes: string; releaseUrl: string }
  | { kind: 'downloading'; version: string; percent: number; bytesPerSecond: number }
  | { kind: 'ready'; version: string }
  | { kind: 'error'; phase: UpdatePhase; message: string; version?: string; releaseUrl?: string };

/** Alles wat de interface nodig heeft in één momentopname. */
export interface UpdateStatus {
  state: UpdateState;
  currentVersion: string;
  autoCheck: boolean;
  lastCheckAt: number | null;
  /** Korte Nederlandse samenvatting van de laatste controle. */
  lastResult: string | null;
  /** Mag de app de update zelf downloaden en installeren? Zonder vertrouwde ondertekening niet. */
  canInstall: boolean;
  installBlockedReason: string | null;
}

export interface UpdatesApi {
  getStatus(): Promise<UpdateStatus>;
  check(): Promise<UpdateStatus>;
  download(): Promise<UpdateStatus>;
  install(): Promise<{ ok: boolean; message?: string }>;
  setAutoCheck(on: boolean): Promise<UpdateStatus>;
  openRelease(url?: string): Promise<void>;
  onStatus(cb: (s: UpdateStatus) => void): () => void;
}

export const AUTO_INSTALL_BLOCKED_REASON =
  'Automatisch installeren is nog niet beschikbaar: de installatiebestanden zijn nog niet digitaal ondertekend, dus de herkomst van een download kan niet worden gecontroleerd. Download de update daarom handmatig van de officiële releasepagina.';

// ---------- versies ----------

interface Parsed { nums: [number, number, number]; pre: string[] }

export function parseVersion(v: string): Parsed | null {
  const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(v.trim());
  if (!m) return null;
  return { nums: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ? m[4].split('.') : [] };
}

/** Semver-vergelijking: <0 als a ouder is dan b. Ongeldige versies tellen als "niet vergelijkbaar" (NaN). */
export function compareVersions(a: string, b: string): number {
  const x = parseVersion(a);
  const y = parseVersion(b);
  if (!x || !y) return NaN;
  for (let i = 0; i < 3; i++) if (x.nums[i] !== y.nums[i]) return x.nums[i] < y.nums[i] ? -1 : 1;
  if (!x.pre.length || !y.pre.length) return x.pre.length === y.pre.length ? 0 : x.pre.length ? -1 : 1; // een pre-release is ouder dan de release
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const p = x.pre[i], q = y.pre[i];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    const pn = /^\d+$/.test(p), qn = /^\d+$/.test(q);
    if (pn && qn) { if (Number(p) !== Number(q)) return Number(p) < Number(q) ? -1 : 1; }
    else if (pn !== qn) return pn ? -1 : 1;
    else if (p !== q) return p < q ? -1 : 1;
  }
  return 0;
}

/** Stabiele kanaal: alleen een strikt nieuwere, niet-pre-release versie telt als update. Nooit automatisch downgraden. */
export function isNewerStable(current: string, candidate: string): boolean {
  const c = parseVersion(candidate);
  if (!c || c.pre.length) return false;
  return compareVersions(current, candidate) < 0;
}

// ---------- tekst ----------

/** Releasenotities komen als tekst, HTML (GitHub-feed) of een lijst; de interface toont altijd platte tekst. */
export function notesToText(notes: unknown): string {
  const raw = Array.isArray(notes)
    ? notes.map((n) => (n && typeof n === 'object' && 'note' in n ? String((n as { note: unknown }).note ?? '') : String(n ?? ''))).join('\n\n')
    : typeof notes === 'string' ? notes : '';
  return raw
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\/\s*\1\s*>/gi, '')
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|h[1-6]|li|ul|ol)\s*>/gi, '\n')
    .replace(/<\s*li[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 4000);
}

/** Zet technische fouten van het netwerk of van GitHub om in een begrijpelijke Nederlandse melding. */
export function describeUpdateError(e: unknown, phase: UpdatePhase = 'check'): string {
  const err = e as { message?: string; code?: string; statusCode?: number } | null;
  const msg = String(err?.message ?? e ?? '');
  const code = String(err?.code ?? '');
  const status = err?.statusCode ?? Number(/\b(?:HTTP|status(?: code)?)\D{0,6}(\d{3})\b/i.exec(msg)?.[1]);
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ENETUNREACH|ECONNRESET|ETIMEDOUT|ERR_INTERNET_DISCONNECTED|ERR_NETWORK|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|net::|getaddrinfo|socket hang up|aborted|premature|network/i.test(`${code} ${msg}`)) {
    return phase === 'download'
      ? 'De download is onderbroken: geen verbinding. Controleer je internetverbinding en probeer het opnieuw.'
      : 'Geen internetverbinding. Controleren op updates kan later opnieuw; CV Studio werkt gewoon offline verder.';
  }
  if (status === 403 || status === 429 || /rate limit/i.test(msg)) return 'GitHub staat nu even geen verzoeken meer toe. Probeer het over een uur opnieuw.';
  if (status === 404 || /cannot find|no published versions|latest\.yml|not found/i.test(msg)) return 'Er is nog geen gepubliceerde release gevonden.';
  if (/sha512|checksum|hash|signature|handtekening|verif/i.test(msg)) return 'De gedownloade update is geweigerd omdat de controle op echtheid mislukte. Er is niets geïnstalleerd.';
  if (phase === 'download') return 'Downloaden is mislukt. Probeer het opnieuw of download de update handmatig.';
  if (phase === 'install') return 'Installeren is mislukt. Je cv-gegevens zijn niet aangetast. Download de update handmatig van de releasepagina.';
  return 'Controleren op updates is mislukt. Probeer het later opnieuw.';
}

export const msgUpToDate = (version: string) => `CV Studio ${version} is de nieuwste versie.`;
export const msgAvailable = (version: string) => `CV Studio ${version} is beschikbaar.`;
