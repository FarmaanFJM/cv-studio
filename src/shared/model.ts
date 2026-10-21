// Datamodel + sanitizing. Pure TypeScript zodat zowel main, renderer als tests het gebruiken.

export type TemplateId = 'sidebar' | 'minimal';
export type FontId = 'inter' | 'source-sans' | 'lato' | 'merriweather';
export type Spacing = 'compact' | 'normal' | 'ruim';
export type PhotoShape = 'round' | 'square';

export const MIN_FONT_PT = 8;
export const MAX_FONT_PT = 11.5;

export interface Photo {
  src: string; // data URL (verkleind), blijft lokaal
  aspect: number; // breedte / hoogte van de bron
  zoom: number; // 1 = bedekt het vak precies
  offsetX: number; // verschuiving in vakbreedtes t.o.v. gecentreerd
  offsetY: number;
  shape: PhotoShape;
  visible: boolean;
}

export interface Personal {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  start: string;
  end: string;
  description: string;
}
export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  start: string;
  end: string;
  description: string;
}
export interface ProjectItem {
  id: string;
  name: string;
  tech: string;
  period: string;
  description: string;
  github: string;
}
export interface SkillGroup {
  id: string;
  name: string;
  skills: string[];
}
export interface LanguageItem {
  id: string;
  name: string;
  level: string;
}
export interface CustomItem {
  id: string;
  text: string;
}

export type SectionType =
  | 'personal'
  | 'profile'
  | 'experience'
  | 'education'
  | 'projects'
  | 'skills'
  | 'languages'
  | 'custom';

interface SectionBase {
  id: string;
  title: string;
  visible: boolean;
}
export type Section =
  | (SectionBase & { type: 'personal' })
  | (SectionBase & { type: 'profile'; text: string })
  | (SectionBase & { type: 'experience'; items: ExperienceItem[] })
  | (SectionBase & { type: 'education'; items: EducationItem[] })
  | (SectionBase & { type: 'projects'; items: ProjectItem[] })
  | (SectionBase & { type: 'skills'; groups: SkillGroup[] })
  | (SectionBase & { type: 'languages'; items: LanguageItem[] })
  | (SectionBase & { type: 'custom'; mode: 'text' | 'list'; text: string; items: CustomItem[] });

export interface StyleSettings {
  accent: string;
  font: FontId;
  fontSize: number; // pt, basis voor lopende tekst
  spacing: Spacing;
}

export interface CV {
  id: string;
  name: string; // naam van de versie, bijv. "Algemeen" of "ING"
  createdAt: number;
  updatedAt: number;
  template: TemplateId;
  style: StyleSettings;
  personal: Personal;
  photo: Photo | null;
  sections: Section[];
}

export interface AppState {
  version: 1;
  activeId: string;
  cvs: CV[];
}

export const FONTS: { id: FontId; label: string; css: string }[] = [
  { id: 'inter', label: 'Inter', css: "'Inter', 'Segoe UI', Arial, sans-serif" },
  { id: 'source-sans', label: 'Source Sans', css: "'Source Sans 3', 'Segoe UI', Arial, sans-serif" },
  { id: 'lato', label: 'Lato', css: "'Lato', 'Segoe UI', Arial, sans-serif" },
  { id: 'merriweather', label: 'Merriweather (serif)', css: "'Merriweather', Georgia, serif" }
];

export const ACCENTS = ['#1f4e79', '#0f766e', '#6d28d9', '#b91c1c', '#c2410c', '#334155', '#047857', '#be185d'];

let counter = 0;
export function uid(): string {
  counter = (counter + 1) % 1e6;
  return Date.now().toString(36) + counter.toString(36) + Math.random().toString(36).slice(2, 6);
}

export const SECTION_TITLES: Record<SectionType, string> = {
  personal: 'Contact',
  profile: 'Profiel',
  experience: 'Werkervaring',
  education: 'Opleiding',
  projects: 'Projecten',
  skills: 'Vaardigheden',
  languages: 'Talen',
  custom: 'Eigen onderdeel'
};

export const emptyPersonal = (): Personal => ({
  fullName: '', title: '', email: '', phone: '', location: '', linkedin: '', github: '', website: ''
});

export function newItem(type: 'experience'): ExperienceItem;
export function newItem(type: 'education'): EducationItem;
export function newItem(type: 'projects'): ProjectItem;
export function newItem(type: 'languages'): LanguageItem;
export function newItem(type: string): unknown {
  const id = uid();
  switch (type) {
    case 'experience': return { id, role: '', company: '', location: '', start: '', end: '', description: '' };
    case 'education': return { id, degree: '', school: '', start: '', end: '', description: '' };
    case 'projects': return { id, name: '', tech: '', period: '', description: '', github: '' };
    default: return { id, name: '', level: '' };
  }
}

export function newCustomSection(): Section {
  return { id: uid(), type: 'custom', title: 'Nieuw onderdeel', visible: true, mode: 'text', text: '', items: [] };
}

/**
 * Standaardvolgorde is gericht op een IT-stagecv: projecten en opleiding vóór (niet-technische) werkervaring.
 * De gebruiker kan de volgorde vrij aanpassen.
 */
export function createEmptyCv(name = 'Mijn cv'): CV {
  const now = Date.now();
  return {
    id: uid(),
    name,
    createdAt: now,
    updatedAt: now,
    template: 'sidebar',
    style: { accent: ACCENTS[0], font: 'inter', fontSize: 9.5, spacing: 'normal' },
    personal: emptyPersonal(),
    photo: null,
    sections: [
      { id: uid(), type: 'personal', title: SECTION_TITLES.personal, visible: true },
      { id: uid(), type: 'profile', title: SECTION_TITLES.profile, visible: true, text: '' },
      { id: uid(), type: 'projects', title: SECTION_TITLES.projects, visible: true, items: [] },
      { id: uid(), type: 'education', title: SECTION_TITLES.education, visible: true, items: [] },
      { id: uid(), type: 'experience', title: SECTION_TITLES.experience, visible: true, items: [] },
      { id: uid(), type: 'skills', title: SECTION_TITLES.skills, visible: true, groups: [] },
      { id: uid(), type: 'languages', title: SECTION_TITLES.languages, visible: true, items: [] }
    ]
  };
}

// ---------- sanitizing (bestanden van schijf / import zijn onbetrouwbaar) ----------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 20000): string => (typeof v === 'string' ? v.slice(0, max) : '');
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const num = (v: unknown, d: number, min: number, max: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v.slice(0, 200) : []);
const id = (v: unknown): string => (typeof v === 'string' && v ? v.slice(0, 64) : uid());
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);

const IMG_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_IMG_CHARS = 12_000_000;

function sanitizePhoto(v: unknown): Photo | null {
  if (!isObj(v)) return null;
  const src = typeof v.src === 'string' ? v.src : '';
  if (src.length > MAX_IMG_CHARS || !IMG_RE.test(src)) return null;
  return {
    src,
    aspect: num(v.aspect, 1, 0.1, 10),
    zoom: num(v.zoom, 1, 1, 5),
    offsetX: num(v.offsetX, 0, -3, 3),
    offsetY: num(v.offsetY, 0, -3, 3),
    shape: oneOf(v.shape, ['round', 'square'] as const, 'round'),
    visible: bool(v.visible, true)
  };
}

const color = (v: unknown, d: string) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : d);

function sanitizeSection(raw: unknown): Section | null {
  if (!isObj(raw)) return null;
  const type = raw.type;
  const base = { id: id(raw.id), title: str(raw.title, 120), visible: bool(raw.visible, true) };
  const t = (d: SectionType) => base.title || SECTION_TITLES[d];
  switch (type) {
    case 'personal': return { ...base, type, title: t('personal') };
    case 'profile': return { ...base, type, title: t('profile'), text: str(raw.text) };
    case 'experience':
      return { ...base, type, title: t('experience'), items: arr(raw.items).filter(isObj).map((i) => ({
        id: id(i.id), role: str(i.role, 300), company: str(i.company, 300), location: str(i.location, 300),
        start: str(i.start, 60), end: str(i.end, 60), description: str(i.description) })) };
    case 'education':
      return { ...base, type, title: t('education'), items: arr(raw.items).filter(isObj).map((i) => ({
        id: id(i.id), degree: str(i.degree, 300), school: str(i.school, 300),
        start: str(i.start, 60), end: str(i.end, 60), description: str(i.description) })) };
    case 'projects':
      return { ...base, type, title: t('projects'), items: arr(raw.items).filter(isObj).map((i) => ({
        id: id(i.id), name: str(i.name, 300), tech: str(i.tech, 500), period: str(i.period, 60),
        description: str(i.description), github: str(i.github, 500) })) };
    case 'skills':
      return { ...base, type, title: t('skills'), groups: arr(raw.groups).filter(isObj).map((g) => ({
        id: id(g.id), name: str(g.name, 200),
        skills: arr(g.skills).filter((s): s is string => typeof s === 'string').map((s) => s.slice(0, 200)) })) };
    case 'languages':
      return { ...base, type, title: t('languages'), items: arr(raw.items).filter(isObj).map((i) => ({
        id: id(i.id), name: str(i.name, 200), level: str(i.level, 200) })) };
    case 'custom':
      return { ...base, type, title: t('custom'), mode: raw.mode === 'list' ? 'list' : 'text', text: str(raw.text),
        items: arr(raw.items).filter(isObj).map((i) => ({ id: id(i.id), text: str(i.text, 2000) })) };
    default: return null;
  }
}

/** Zet willekeurige JSON om in een geldige CV. Gooit alleen als het totaal geen cv-object is. */
export function sanitizeCv(raw: unknown): CV {
  if (!isObj(raw)) throw new Error('Het bestand bevat geen geldig cv.');
  const base = createEmptyCv();
  const style = isObj(raw.style) ? raw.style : {};
  const personal = isObj(raw.personal) ? raw.personal : {};
  let sections = arr(raw.sections).map(sanitizeSection).filter((s): s is Section => s !== null);
  // ontbrekende standaardonderdelen aanvullen, dubbele ids voorkomen
  const seen = new Set<string>();
  sections = sections.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
  if (!isObj(raw) || !Array.isArray(raw.sections)) sections = base.sections;
  for (const type of ['personal', 'profile', 'experience', 'education', 'projects', 'skills', 'languages'] as const) {
    if (!sections.some((s) => s.type === type)) {
      sections.push(base.sections.find((s) => s.type === type)!);
    }
  }
  const now = Date.now();
  return {
    id: id(raw.id),
    name: str(raw.name, 120) || 'Mijn cv',
    createdAt: num(raw.createdAt, now, 0, 8.64e15),
    updatedAt: num(raw.updatedAt, now, 0, 8.64e15),
    template: oneOf(raw.template, ['sidebar', 'minimal'] as const, 'sidebar'),
    style: {
      accent: color(style.accent, base.style.accent),
      font: oneOf(style.font, FONTS.map((f) => f.id), 'inter'),
      fontSize: num(style.fontSize, base.style.fontSize, MIN_FONT_PT, MAX_FONT_PT),
      spacing: oneOf(style.spacing, ['compact', 'normal', 'ruim'] as const, 'normal')
    },
    personal: {
      fullName: str(personal.fullName, 200), title: str(personal.title, 200), email: str(personal.email, 200),
      phone: str(personal.phone, 100), location: str(personal.location, 200), linkedin: str(personal.linkedin, 300),
      github: str(personal.github, 300), website: str(personal.website, 300)
    },
    photo: sanitizePhoto(raw.photo),
    sections
  };
}

export function sanitizeState(raw: unknown): AppState {
  const cvs: CV[] = [];
  if (isObj(raw) && Array.isArray(raw.cvs)) {
    for (const c of raw.cvs.slice(0, 200)) {
      try { cvs.push(sanitizeCv(c)); } catch { /* corrupte entry overslaan */ }
    }
  }
  if (cvs.length === 0) cvs.push(createEmptyCv());
  const ids = new Set<string>();
  for (const c of cvs) { while (ids.has(c.id)) c.id = uid(); ids.add(c.id); }
  const activeId = isObj(raw) && typeof raw.activeId === 'string' && ids.has(raw.activeId) ? raw.activeId : cvs[0].id;
  return { version: 1, activeId, cvs };
}

/** Kopie met nieuwe id's, zodat het origineel nooit wordt overschreven. */
export function duplicateCv(cv: CV, name: string): CV {
  const copy = JSON.parse(JSON.stringify(cv)) as CV;
  const now = Date.now();
  copy.id = uid(); copy.name = name; copy.createdAt = now; copy.updatedAt = now;
  return sanitizeCv(copy);
}

export function fileSafeName(s: string): string {
  return (s || 'cv').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 100) || 'cv';
}
