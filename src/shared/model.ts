// Datamodel (v2) + sanitizing. Pure TypeScript zodat main, renderer en tests het delen.
import { isHex } from './color';
import { effectiveTech } from './tech';

export type TemplateId = 'sidebar' | 'header' | 'minimal';
/**
 * Plaatsing is positie-onafhankelijk: 'primary' = hoofdinhoud, 'supplementary' = aanvullende inhoud.
 * Elk sjabloon bepaalt zelf waar (linkerkolom, rechterkolom, kop, …) een zone getoond wordt.
 */
export type Zone = 'primary' | 'supplementary';
export type PlaceTarget = Zone | 'hidden';
export type PhotoShape = 'round' | 'square';
export type SkillMode = 'flat' | 'grouped' | 'levels';
/**
 * Presentatie van vaardigheden: 'text' = gewone tekst (nooit iconen), 'chips' = compacte chips (met iconen als die aanstaan).
 * Dit staat los van de indeling (SkillMode: lijst, groepen, niveaus). De oude waarden 'inline' en 'list' bestaan alleen nog in
 * opgeslagen bestanden en worden bij het inlezen omgezet (zie migrateDisplay).
 */
export type SkillDisplay = 'text' | 'chips';
/** Presentatie van de tech stack in projecten (zelfde twee keuzes). */
export type TechDisplay = 'text' | 'chips';
/** Kleur van technologie-iconen: automatisch (op basis van plaatsing/achtergrond), originele merkkleuren of monochroom. */
export type TechColorMode = 'auto' | 'brand' | 'mono';
/**
 * Tech-icoon-instellingen van een onderdeel. Zonder eigen instelling (techOverride = false) volgt het onderdeel de
 * globale stijl; de eigen waarden blijven bewaard zodat terugschakelen niets kwijtraakt.
 */
export interface TechSettings { techOverride: boolean; techShow: boolean; techColor: TechColorMode }
export type LangDisplay = 'text' | 'dots';
export type HeadingStyle = 'caps' | 'title' | 'plain';
export type ItemLayout = 'inline' | 'dates-left';

export const MIN_FONT_PT = 8;
export const MAX_FONT_PT = 12;

export interface Photo {
  src: string; // data URL (verkleind), blijft lokaal
  aspect: number;
  zoom: number;
  offsetX: number;
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
  birthDate: string; // vrije tekst; er wordt nooit een leeftijd berekend
  linkedin: string;
  github: string;
  website: string;
}

export interface ExperienceItem { id: string; role: string; company: string; location: string; start: string; end: string; description: string }
export interface EducationItem { id: string; degree: string; school: string; start: string; end: string; description: string }
export interface ProjectItem { id: string; name: string; tech: string; period: string; description: string; github: string }
export interface SkillGroup { id: string; name: string; skills: string[]; level: number } // level 0–5 (stippen, alleen in niveau-modus)
export interface LanguageItem { id: string; name: string; level: string; rating: number } // rating 0–5
export interface CustomItem { id: string; text: string; value: string }

export type SectionType = 'personal' | 'profile' | 'experience' | 'education' | 'projects' | 'skills' | 'languages' | 'custom';

interface SectionBase { id: string; title: string; visible: boolean; zone: Zone }
export type Section =
  | (SectionBase & { type: 'personal' })
  | (SectionBase & { type: 'profile'; text: string })
  | (SectionBase & { type: 'experience'; items: ExperienceItem[] })
  | (SectionBase & { type: 'education'; items: EducationItem[] })
  | (SectionBase & TechSettings & { type: 'projects'; techDisplay: TechDisplay; items: ProjectItem[] })
  | (SectionBase & TechSettings & { type: 'skills'; mode: SkillMode; display: SkillDisplay; iconOverrides: Record<string, string>; groups: SkillGroup[] })
  | (SectionBase & { type: 'languages'; display: LangDisplay; items: LanguageItem[] })
  | (SectionBase & TechSettings & { type: 'custom'; mode: 'text' | 'list' | 'keyvalue'; text: string; items: CustomItem[] });

export interface StyleSettings {
  accent: string;
  sidebarBg: string; // kleur van het gekleurde vlak (zijbalk of kopbalk, afhankelijk van het sjabloon)
  headingColor: string; // '' = accentkleur
  textColor: string; // '' = standaard
  dividerColor: string; // '' = standaard
  font: string;
  fontSize: number; // pt
  lineHeight: number;
  sectionGap: number; // mm
  itemGap: number; // mm
  margin: number; // mm
  sidebarWidth: number; // mm
  photoSize: number; // mm
  headingStyle: HeadingStyle;
  itemLayout: ItemLayout;
  icons: boolean;
  nameInSidebar: boolean;
  techIcons: boolean; // globaal: toon technologie-iconen (los van contacticonen)
  techColorMode: TechColorMode;
}

export interface CV {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  template: TemplateId;
  style: StyleSettings;
  personal: Personal;
  photo: Photo | null;
  sections: Section[];
}

export interface AppState {
  version: 4;
  activeId: string;
  cvs: CV[];
  swatches: string[]; // eigen opgeslagen kleuren
}

export interface FontDef { id: string; label: string; css: string; kind: 'sans' | 'serif' }
export const FONTS: FontDef[] = [
  { id: 'inter', label: 'Inter', css: "'Inter', 'Segoe UI', Arial, sans-serif", kind: 'sans' },
  { id: 'source-sans', label: 'Source Sans 3', css: "'Source Sans 3', 'Segoe UI', Arial, sans-serif", kind: 'sans' },
  { id: 'lato', label: 'Lato', css: "'Lato', 'Segoe UI', Arial, sans-serif", kind: 'sans' },
  { id: 'open-sans', label: 'Open Sans', css: "'Open Sans', 'Segoe UI', Arial, sans-serif", kind: 'sans' },
  { id: 'roboto', label: 'Roboto', css: "'Roboto', 'Segoe UI', Arial, sans-serif", kind: 'sans' },
  { id: 'montserrat', label: 'Montserrat', css: "'Montserrat', 'Segoe UI', Arial, sans-serif", kind: 'sans' },
  { id: 'nunito-sans', label: 'Nunito Sans', css: "'Nunito Sans', 'Segoe UI', Arial, sans-serif", kind: 'sans' },
  { id: 'poppins', label: 'Poppins', css: "'Poppins', 'Segoe UI', Arial, sans-serif", kind: 'sans' },
  { id: 'work-sans', label: 'Work Sans', css: "'Work Sans', 'Segoe UI', Arial, sans-serif", kind: 'sans' },
  { id: 'dm-sans', label: 'DM Sans', css: "'DM Sans', 'Segoe UI', Arial, sans-serif", kind: 'sans' },
  { id: 'ibm-plex-sans', label: 'IBM Plex Sans', css: "'IBM Plex Sans', 'Segoe UI', Arial, sans-serif", kind: 'sans' },
  { id: 'merriweather', label: 'Merriweather', css: "'Merriweather', Georgia, serif", kind: 'serif' },
  { id: 'pt-serif', label: 'PT Serif', css: "'PT Serif', Georgia, serif", kind: 'serif' },
  { id: 'lora', label: 'Lora', css: "'Lora', Georgia, serif", kind: 'serif' },
  { id: 'playfair', label: 'Playfair Display', css: "'Playfair Display', Georgia, serif", kind: 'serif' }
];

export const ACCENTS = ['#1f4e79', '#0f766e', '#00761f', '#6d28d9', '#b91c1c', '#c2410c', '#b8651f', '#e8a400', '#334155', '#be185d'];

/** Kant-en-klare kleurthema's (accent + zijbalk). */
export const THEMES: { name: string; accent: string; sidebarBg: string }[] = [
  { name: 'Blauw', accent: '#00549a', sidebarBg: '#00549a' },
  { name: 'Groen', accent: '#00761f', sidebarBg: '#00761f' },
  { name: 'Oranje', accent: '#b8561f', sidebarBg: '#b8561f' },
  { name: 'Geel', accent: '#c98a00', sidebarBg: '#f5b700' },
  { name: 'Antraciet', accent: '#2b3138', sidebarBg: '#2b3138' },
  { name: 'Paars', accent: '#5b2fa8', sidebarBg: '#5b2fa8' }
];

export const SPACING_PRESETS = {
  compact: { sectionGap: 3.6, itemGap: 1.5, margin: 10 },
  normal: { sectionGap: 5.6, itemGap: 2.4, margin: 13 },
  ruim: { sectionGap: 7.6, itemGap: 3.4, margin: 15 }
} as const;

let counter = 0;
export function uid(): string {
  counter = (counter + 1) % 1e6;
  return Date.now().toString(36) + counter.toString(36) + Math.random().toString(36).slice(2, 6);
}

export const SECTION_TITLES: Record<SectionType, string> = {
  personal: 'Contact',
  profile: 'Over mij',
  experience: 'Werkervaring',
  education: 'Opleiding',
  projects: 'Projecten',
  skills: 'Vaardigheden',
  languages: 'Talen',
  custom: 'Eigen onderdeel'
};

export const SKILL_LEVEL_NAMES = ['Beste', 'Goed', 'Bekend met', 'Interesse in'];

export const defaultZone = (t: SectionType): Zone => (t === 'personal' || t === 'skills' || t === 'languages' ? 'supplementary' : 'primary');

export const emptyPersonal = (): Personal => ({
  fullName: '', title: '', email: '', phone: '', location: '', birthDate: '', linkedin: '', github: '', website: ''
});

export const defaultStyle = (): StyleSettings => ({
  accent: '#1f4e79', sidebarBg: '#1f4e79', headingColor: '', textColor: '', dividerColor: '',
  font: 'inter', fontSize: 9.5, lineHeight: 1.4, sectionGap: 5.6, itemGap: 2.4, margin: 13, sidebarWidth: 70, photoSize: 40,
  headingStyle: 'caps', itemLayout: 'inline', icons: true, nameInSidebar: false, techIcons: true, techColorMode: 'auto'
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
    default: return { id, name: '', level: '', rating: 0 };
  }
}

export function newSkillGroup(name = '', level = 0): SkillGroup { return { id: uid(), name, skills: [], level }; }

export interface SectionPreset { key: string; label: string; zone: Zone; make: () => Section }
const TECH_DEFAULT: TechSettings = { techOverride: false, techShow: true, techColor: 'auto' };
const custom = (title: string, zone: Zone, mode: 'text' | 'list' | 'keyvalue'): Section =>
  ({ id: uid(), type: 'custom', title, visible: true, zone, mode, ...TECH_DEFAULT, text: '', items: [] });

export function newCustomSection(): Section { return custom('Nieuw onderdeel', 'primary', 'text'); }

/** Snelle voorbeelden voor extra onderdelen (vooral voor aanvullende inhoud). */
export const SECTION_PRESETS: SectionPreset[] = [
  { key: 'interests', label: 'Interesses', zone: 'supplementary', make: () => custom('Interesses', 'supplementary', 'list') },
  { key: 'certs', label: 'Certificaten', zone: 'supplementary', make: () => custom('Certificaten', 'supplementary', 'list') },
  { key: 'links', label: 'Links', zone: 'supplementary', make: () => custom('Links', 'supplementary', 'keyvalue') },
  { key: 'tech', label: 'Technologieën & tools', zone: 'supplementary', make: () => ({ id: uid(), type: 'skills', title: 'Technologieën', visible: true, zone: 'supplementary', mode: 'flat', display: 'chips', ...TECH_DEFAULT, iconOverrides: {}, groups: [newSkillGroup()] }) },
  { key: 'extra', label: 'Extra informatie', zone: 'supplementary', make: () => custom('Extra informatie', 'supplementary', 'text') },
  { key: 'stats', label: 'Gegevens / maten', zone: 'supplementary', make: () => custom('Gegevens', 'supplementary', 'keyvalue') },
  { key: 'custom-main', label: 'Eigen onderdeel (hoofdinhoud)', zone: 'primary', make: () => custom('Nieuw onderdeel', 'primary', 'text') }
];

export function emptySection(type: SectionType): Section {
  const base = { id: uid(), title: SECTION_TITLES[type], visible: true, zone: defaultZone(type) };
  switch (type) {
    case 'personal': return { ...base, type };
    case 'profile': return { ...base, type, text: '' };
    case 'experience': return { ...base, type, items: [] };
    case 'education': return { ...base, type, items: [] };
    case 'projects': return { ...base, type, techDisplay: 'text', ...TECH_DEFAULT, items: [] };
    case 'skills': return { ...base, type, mode: 'grouped', display: 'text', ...TECH_DEFAULT, iconOverrides: {}, groups: [] };
    case 'languages': return { ...base, type, display: 'text', items: [] };
    default: return newCustomSection();
  }
}

/** Standaardvolgorde: gericht op een IT-stagecv (projecten en opleiding vóór werkervaring). */
export function createEmptyCv(name = 'Mijn cv'): CV {
  const now = Date.now();
  return {
    id: uid(), name, createdAt: now, updatedAt: now,
    template: 'sidebar',
    style: defaultStyle(),
    personal: emptyPersonal(),
    photo: null,
    sections: (['personal', 'profile', 'projects', 'education', 'experience', 'skills', 'languages'] as const).map(emptySection)
  };
}

// ---------- zones ----------

/** In het minimale (eenkoloms) sjabloon bestaan zones niet: alles zichtbaars staat in één kolom. */
export function zoneOf(cv: Pick<CV, 'template'>, s: Section): PlaceTarget {
  if (!s.visible) return 'hidden';
  return cv.template === 'minimal' ? 'primary' : s.zone;
}

/**
 * Verplaats een onderdeel naar een zone (of verborgen), optioneel vóór een ander onderdeel.
 * In het minimale sjabloon bestaan zones niet: de opgeslagen zone van het onderdeel blijft dan ongewijzigd, zodat wisselen van
 * sjabloon geen plaatsing kost; 'primary' betekent daar "de enige kolom".
 */
export function relocateSection(sections: Section[], id: string, target: PlaceTarget, beforeId?: string, template: TemplateId = 'sidebar'): Section[] {
  const idx = sections.findIndex((s) => s.id === id);
  if (idx < 0) return sections;
  const single = template === 'minimal';
  const moved: Section = { ...sections[idx] } as Section;
  if (target === 'hidden' && !beforeId) {
    // verbergen verandert de volgorde niet, zodat "tonen" het onderdeel op dezelfde plek terugzet
    return sections.map((s, i) => (i === idx ? { ...moved, visible: false } as Section : s));
  }
  if (target === 'hidden') moved.visible = false;
  else { moved.visible = true; if (!single) moved.zone = target; }
  const rest = sections.filter((s) => s.id !== id);
  let at = beforeId ? rest.findIndex((s) => s.id === beforeId) : -1;
  if (at < 0) {
    // achteraan in de doelgroep
    const inTarget = rest.map((s, i) => ({ s, i })).filter(({ s }) => (target === 'hidden' ? !s.visible : s.visible && (single || s.zone === target)));
    at = inTarget.length ? inTarget[inTarget.length - 1].i + 1 : rest.length;
  }
  rest.splice(at, 0, moved);
  return rest;
}

export const placeSection = (sections: Section[], id: string, target: PlaceTarget, beforeId?: string): Section[] =>
  relocateSection(sections, id, target, beforeId, 'sidebar');

/** Eén stap omhoog/omlaag binnen dezelfde (effectieve) zone. */
export function moveInZone(sections: Section[], id: string, dir: -1 | 1, template: TemplateId): Section[] {
  const idx = sections.findIndex((s) => s.id === id);
  if (idx < 0) return sections;
  const z = zoneOf({ template }, sections[idx]);
  let j = idx + dir;
  while (j >= 0 && j < sections.length && zoneOf({ template }, sections[j]) !== z) j += dir;
  if (j < 0 || j >= sections.length) return sections;
  const next = sections.slice();
  [next[idx], next[j]] = [next[j], next[idx]];
  return next;
}

// ---------- sanitizing (bestanden van schijf / import zijn onbetrouwbaar; ook migratie van v1) ----------

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max = 20000): string => (typeof v === 'string' ? v.slice(0, max) : '');
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const num = (v: unknown, d: number, min: number, max: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d;
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v.slice(0, 200) : []);
const id = (v: unknown): string => (typeof v === 'string' && v ? v.slice(0, 64) : uid());
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
const color = (v: unknown, d: string) => (isHex(v) ? v.toLowerCase() : d);
const optColor = (v: unknown) => (isHex(v) ? v.toLowerCase() : '');

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

/** Accepteert ook de oude, positiegebonden waarden ('side'/'main') uit eerder opgeslagen cv's. */
function normalizeZone(v: unknown, d: Zone): Zone {
  if (v === 'primary' || v === 'main') return 'primary';
  if (v === 'supplementary' || v === 'side') return 'supplementary';
  return d;
}

const TECH_MODES = ['auto', 'brand', 'mono'] as const;
/**
 * Leest de tech-instellingen van een onderdeel. Oudere cv's (v2) hadden per onderdeel 'icons' (aan/uit) en een
 * 'techColor' die 'inherit' kon zijn; die worden zo omgezet dat het cv er hetzelfde uitziet:
 * - icoontjes eerder uit  -> eigen instelling met 'Toon iconen' uit
 * - eigen kleur gekozen  -> eigen instelling met die kleur
 * - anders               -> volgt de globale stijl
 */
function sanitizeTech(raw: Record<string, unknown>, legacyShow: boolean): TechSettings {
  if (typeof raw.techOverride === 'boolean') {
    return { techOverride: raw.techOverride, techShow: bool(raw.techShow, true), techColor: oneOf(raw.techColor, TECH_MODES, 'auto') };
  }
  const colorChosen = TECH_MODES.includes(raw.techColor as never);
  return { techOverride: colorChosen || !legacyShow, techShow: legacyShow, techColor: oneOf(raw.techColor, TECH_MODES, 'auto') };
}
const ICON_ID = /^[a-z0-9-]{1,40}$/;
/** Per-vaardigheid icoon-keuzes: sleutel = genormaliseerde naam, waarde = icoon-id of 'none'. */
function sanitizeOverrides(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isObj(v)) return out;
  for (const [k, val] of Object.entries(v).slice(0, 300)) {
    if (k.length > 0 && k.length <= 100 && typeof val === 'string' && (val === 'none' || ICON_ID.test(val))) out[k] = val;
  }
  return out;
}

/**
 * Migratie van de oude weergavewaarden. Alleen 'text' en 'chips' bestaan nog.
 * - 'inline' (icoon + label) en 'list' (opsomming) worden 'chips' als er iconen te zien waren, anders 'text';
 *   skills en iconeninstellingen blijven ongewijzigd. Zichtbare verandering: 'list' krijgt geen opsommingstekens meer,
 *   'inline' krijgt de chip-omlijning.
 */
export function migrateDisplay(legacy: unknown, iconsVisible: boolean): 'text' | 'chips' {
  if (legacy === 'chips') return 'chips';
  if (legacy === 'inline' || legacy === 'list') return iconsVisible ? 'chips' : 'text';
  return 'text';
}

function sanitizeSection(raw: unknown, globalIcons = true): Section | null {
  if (!isObj(raw)) return null;
  const type = raw.type;
  const known: SectionType[] = ['personal', 'profile', 'experience', 'education', 'projects', 'skills', 'languages', 'custom'];
  if (!known.includes(type as SectionType)) return null;
  const t = type as SectionType;
  const base = {
    id: id(raw.id),
    title: str(raw.title, 120) || SECTION_TITLES[t],
    visible: bool(raw.visible, true),
    zone: normalizeZone(raw.zone, defaultZone(t))
  };
  switch (t) {
    case 'personal': return { ...base, type: 'personal' };
    case 'profile': return { ...base, type: 'profile', text: str(raw.text) };
    case 'experience':
      return { ...base, type: 'experience', items: arr(raw.items).filter(isObj).map((i) => ({
        id: id(i.id), role: str(i.role, 300), company: str(i.company, 300), location: str(i.location, 300),
        start: str(i.start, 60), end: str(i.end, 60), description: str(i.description) })) };
    case 'education':
      return { ...base, type: 'education', items: arr(raw.items).filter(isObj).map((i) => ({
        id: id(i.id), degree: str(i.degree, 300), school: str(i.school, 300),
        start: str(i.start, 60), end: str(i.end, 60), description: str(i.description) })) };
    case 'projects':
      // v2: 'chips' was de compacte icoon+naam-weergave, die nu 'inline' heet
    {
      const tech = sanitizeTech(raw, !(raw.techDisplay === 'chips' && raw.techIcons === false));
      const legacy = raw.techDisplay === 'chips' && typeof raw.techOverride !== 'boolean' ? 'inline' : raw.techDisplay;
      return { ...base, type: 'projects', ...tech,
        techDisplay: migrateDisplay(legacy, effectiveTech({ techIcons: globalIcons, techColorMode: 'auto' }, tech).show), items: arr(raw.items).filter(isObj).map((i) => ({
        id: id(i.id), name: str(i.name, 300), tech: str(i.tech, 500), period: str(i.period, 60),
        description: str(i.description), github: str(i.github, 500) })) };
    }
    case 'skills': {
      const tech = sanitizeTech(raw, raw.icons === 'auto');
      const legacy = raw.display === 'text' && raw.icons === 'auto' && typeof raw.techOverride !== 'boolean' ? 'inline' : raw.display;
      return { ...base, type: 'skills',
        mode: oneOf(raw.mode, ['flat', 'grouped', 'levels'] as const, 'grouped'),
        ...tech,
        display: migrateDisplay(legacy, effectiveTech({ techIcons: globalIcons, techColorMode: 'auto' }, tech).show),
        iconOverrides: sanitizeOverrides(raw.iconOverrides),
        groups: arr(raw.groups).filter(isObj).map((g) => ({
          id: id(g.id), name: str(g.name, 200), level: Math.round(num(g.level, 0, 0, 5)),
          skills: arr(g.skills).filter((s): s is string => typeof s === 'string').map((s) => s.slice(0, 200)) })) };
    }
    case 'languages':
      return { ...base, type: 'languages', display: oneOf(raw.display, ['text', 'dots'] as const, 'text'),
        items: arr(raw.items).filter(isObj).map((i) => ({
          id: id(i.id), name: str(i.name, 200), level: str(i.level, 200), rating: Math.round(num(i.rating, 0, 0, 5)) })) };
    case 'custom':
      return { ...base, type: 'custom', mode: oneOf(raw.mode, ['text', 'list', 'keyvalue'] as const, 'text'), ...sanitizeTech(raw, raw.icons === true), text: str(raw.text),
        items: arr(raw.items).filter(isObj).map((i) => ({ id: id(i.id), text: str(i.text, 2000), value: str(i.value, 2000) })) };
  }
}

const SPACING_V1 = { compact: SPACING_PRESETS.compact, normal: SPACING_PRESETS.normal, ruim: SPACING_PRESETS.ruim };

function sanitizeStyle(raw: unknown): StyleSettings {
  const s = isObj(raw) ? raw : {};
  const d = defaultStyle();
  const accent = color(s.accent, d.accent);
  // v1-migratie: preset 'spacing' -> getallen; zijbalk kreeg de accentkleur
  const legacy = typeof s.spacing === 'string' && s.spacing in SPACING_V1 ? SPACING_V1[s.spacing as keyof typeof SPACING_V1] : null;
  return {
    accent,
    sidebarBg: color(s.sidebarBg, accent),
    headingColor: optColor(s.headingColor),
    textColor: optColor(s.textColor),
    dividerColor: optColor(s.dividerColor),
    font: FONTS.some((f) => f.id === s.font) ? (s.font as string) : d.font,
    fontSize: num(s.fontSize, d.fontSize, MIN_FONT_PT, MAX_FONT_PT),
    lineHeight: num(s.lineHeight, d.lineHeight, 1.2, 1.8),
    sectionGap: num(s.sectionGap, legacy?.sectionGap ?? d.sectionGap, 2, 14),
    itemGap: num(s.itemGap, legacy?.itemGap ?? d.itemGap, 0.5, 8),
    margin: num(s.margin, legacy?.margin ?? d.margin, 6, 22),
    sidebarWidth: num(s.sidebarWidth, d.sidebarWidth, 50, 100),
    photoSize: num(s.photoSize, d.photoSize, 24, 60),
    headingStyle: oneOf(s.headingStyle, ['caps', 'title', 'plain'] as const, d.headingStyle),
    itemLayout: oneOf(s.itemLayout, ['inline', 'dates-left'] as const, d.itemLayout),
    icons: bool(s.icons, d.icons),
    techIcons: bool(s.techIcons, d.techIcons),
    nameInSidebar: bool(s.nameInSidebar, d.nameInSidebar),
    // v2.0-migratie: de oude schakelaar 'techColors' (merkkleur aan) wordt 'brand'; anders geldt het nieuwe automatische gedrag
    techColorMode: oneOf(s.techColorMode, ['auto', 'brand', 'mono'] as const, s.techColors === true ? 'brand' : d.techColorMode)
  };
}

/** Zet willekeurige JSON om in een geldige CV. Gooit alleen als het totaal geen cv-object is. */
export function sanitizeCv(raw: unknown): CV {
  if (!isObj(raw)) throw new Error('Het bestand bevat geen geldig cv.');
  const base = createEmptyCv();
  const personal = isObj(raw.personal) ? raw.personal : {};
  const globalIcons = isObj(raw.style) ? bool(raw.style.techIcons, true) : true;
  let sections = arr(raw.sections).map((x) => sanitizeSection(x, globalIcons)).filter((s): s is Section => s !== null);
  const seen = new Set<string>();
  sections = sections.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
  if (!Array.isArray(raw.sections)) sections = base.sections;
  for (const type of ['personal', 'profile', 'experience', 'education', 'projects', 'skills', 'languages'] as const) {
    if (!sections.some((s) => s.type === type)) sections.push(base.sections.find((s) => s.type === type)!);
  }
  const now = Date.now();
  return {
    id: id(raw.id),
    name: str(raw.name, 120) || 'Mijn cv',
    createdAt: num(raw.createdAt, now, 0, 8.64e15),
    updatedAt: num(raw.updatedAt, now, 0, 8.64e15),
    template: oneOf(raw.template, ['sidebar', 'header', 'minimal'] as const, 'sidebar'),
    style: sanitizeStyle(raw.style),
    personal: {
      fullName: str(personal.fullName, 200), title: str(personal.title, 200), email: str(personal.email, 200),
      phone: str(personal.phone, 100), location: str(personal.location, 200), birthDate: str(personal.birthDate, 100),
      linkedin: str(personal.linkedin, 300), github: str(personal.github, 300), website: str(personal.website, 300)
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
  const swatches = isObj(raw) && Array.isArray(raw.swatches) ? raw.swatches.filter(isHex).map((c) => c.toLowerCase()).slice(0, 24) : [];
  return { version: 4, activeId, cvs, swatches };
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
