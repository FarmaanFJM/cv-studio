// Afsluitende tekst van een onderdeel: platte tekst met optionele inline links (bereiken in de tekst + webadres).
// Bewust geen HTML en geen Markdown: de tekst wordt altijd als tekst getoond, links zijn alleen veilige http(s)-adressen.

export interface FooterLink { start: number; end: number; url: string } // [start, end) in `text`
export interface SectionFooter { text: string; links: FooterLink[] }

export const FOOTER_MAX = 600;
export const FOOTER_MAX_LINKS = 12;
export const URL_MAX = 2000;

/** Geeft het genormaliseerde adres terug als het een veilige http(s)-link is, anders null. Vereist het voorvoegsel. */
export function safeUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s || s.length > URL_MAX || /[\s\u0000-\u001f\u007f]/.test(s) || !/^https?:\/\//i.test(s)) return null;
  try {
    const u = new URL(s);
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || !u.hostname || u.username || u.password) return null;
    return u.href;
  } catch { return null; }
}

/** Voor invoer in de editor: "github.com/naam" wordt "https://github.com/naam"; andere schema's (javascript:, file:, …) worden geweigerd. */
export function parseUrlInput(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return safeUrl(s);
  return /^[^\s/]+\.[^\s/]{2,}/.test(s) ? safeUrl(`https://${s}`) : null;
}

export const footerText = (f: SectionFooter | undefined): string => (f && f.text.trim() ? f.text : '');
export const hasFooter = (f: SectionFooter | undefined): f is SectionFooter => footerText(f) !== '';

/** Zet onbetrouwbare invoer om in een geldige afsluitende tekst; undefined = geen. */
export function sanitizeFooter(raw: unknown): SectionFooter | undefined {
  const rawText = typeof raw === 'string' ? raw : typeof raw === 'object' && raw !== null && typeof (raw as { text?: unknown }).text === 'string' ? (raw as { text: string }).text : '';
  const text = rawText.replace(/\r\n?/g, '\n').slice(0, FOOTER_MAX);
  if (!text.trim()) return undefined;
  const links: FooterLink[] = [];
  const list = typeof raw === 'object' && raw !== null && Array.isArray((raw as { links?: unknown }).links) ? (raw as { links: unknown[] }).links : [];
  let last = 0;
  for (const l of list.slice(0, 100)) {
    if (typeof l !== 'object' || l === null) continue;
    const { start, end, url } = l as Record<string, unknown>;
    const u = safeUrl(url);
    if (!u || !Number.isInteger(start) || !Number.isInteger(end)) continue;
    const a = start as number, b = end as number;
    if (a < 0 || b > text.length || a >= b || !text.slice(a, b).trim()) continue;
    links.push({ start: a, end: b, url: u });
  }
  links.sort((x, y) => x.start - y.start);
  const out: FooterLink[] = [];
  for (const l of links) { if (l.start >= last && out.length < FOOTER_MAX_LINKS) { out.push(l); last = l.end; } }
  return { text, links: out };
}

export interface FooterSegment { text: string; url?: string }
export function footerSegments(f: SectionFooter): FooterSegment[] {
  const out: FooterSegment[] = [];
  let at = 0;
  for (const l of f.links) {
    if (l.start > at) out.push({ text: f.text.slice(at, l.start) });
    out.push({ text: f.text.slice(l.start, l.end), url: l.url });
    at = l.end;
  }
  if (at < f.text.length) out.push({ text: f.text.slice(at) });
  return out;
}

/** Nieuwe tekst na een bewerking; links schuiven mee, groeien bij typen binnen een link en vervallen als hun tekst verdwijnt. */
export function editFooterText(f: SectionFooter | undefined, next: string): SectionFooter | undefined {
  const text = next.replace(/\r\n?/g, '\n').slice(0, FOOTER_MAX);
  if (!text) return undefined;
  const old = f ?? { text: '', links: [] };
  const a = old.text, b = text;
  let p = 0;
  while (p < a.length && p < b.length && a[p] === b[p]) p++;
  let s = 0;
  while (s < a.length - p && s < b.length - p && a[a.length - 1 - s] === b[b.length - 1 - s]) s++;
  const oldEnd = a.length - s, ins = b.length - s - p, delta = b.length - a.length, removed = oldEnd - p;
  const links: FooterLink[] = [];
  for (const l of old.links) {
    let { start, end } = l;
    if (end <= p) { /* ongewijzigd */ }
    else if (start >= oldEnd) { start += delta; end += delta; }
    else if (removed === 0) { end += delta; } // invoegen binnen de link
    else if (start >= p && end <= oldEnd) continue; // volledig vervangen of verwijderd
    else if (start < p && end <= oldEnd) end = p; // staart weggehaald
    else if (start >= p) { start = p + ins; end += delta; } // kop weggehaald
    else end += delta; // gedeelte in het midden vervangen
    if (end > start && text.slice(start, end).trim()) links.push({ start, end, url: l.url });
  }
  return { text, links };
}

/** Link op de gevraagde plek: vervangt [start,end) door `label` en maakt die tekst klikbaar. Overlappende links vervallen. */
export function upsertLink(f: SectionFooter | undefined, start: number, end: number, label: string, url: string): SectionFooter | undefined {
  const base = f ?? { text: '', links: [] };
  const safe = safeUrl(url);
  if (!safe) return f;
  const lab = label.replace(/\n/g, ' ');
  const text = (base.text.slice(0, start) + lab + base.text.slice(end)).slice(0, FOOTER_MAX);
  const moved = lab === base.text.slice(start, end) ? base : editFooterText(base, text) ?? { text, links: [] };
  const stop = start + lab.length;
  if (!lab.trim() || stop > text.length) return moved.text ? moved : undefined;
  const links = moved.links.filter((l) => l.end <= start || l.start >= stop);
  links.push({ start, end: stop, url: safe });
  links.sort((x, y) => x.start - y.start);
  return { text, links: links.slice(0, FOOTER_MAX_LINKS) };
}

export function removeLinkAt(f: SectionFooter, index: number): SectionFooter {
  return { text: f.text, links: f.links.filter((_, i) => i !== index) };
}

/** Index van de link waar de selectie in valt (bij alleen een cursor: de cursor staat in of direct achter de link). */
export function linkIndexAt(f: SectionFooter | undefined, a: number, b: number): number {
  if (!f) return -1;
  return f.links.findIndex((l) => (a === b ? a > l.start && a <= l.end : a >= l.start && b <= l.end));
}
