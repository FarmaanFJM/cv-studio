import { describe, expect, it } from 'vitest';
import { TECH_ICONS, getTech, matchTech, resolveIconLook, resolveSkillIcon, suggestTech } from '../src/renderer/techIcons';
import { BRAND_MULTI } from '../src/renderer/brandIcons.generated';
import { createEmptyCv, emptySection, sanitizeCv } from '../src/shared/model';

describe('technologie-iconen', () => {
  it('herkent alle gevraagde technologieën', () => {
    const wanted: Record<string, string> = {
      TypeScript: 'typescript', JavaScript: 'javascript', HTML: 'html', CSS: 'css', React: 'react', Vue: 'vue', 'Node.js': 'nodejs',
      Java: 'java', Spring: 'spring', Git: 'git', GitHub: 'github', GitLab: 'gitlab', SQL: 'database', MongoDB: 'mongodb',
      Docker: 'docker', Linux: 'linux', Azure: 'azure', Firebase: 'firebase', Godot: 'godot', Unreal: 'unreal',
      'REST API': 'api', backend: 'server', database: 'database'
    };
    for (const [name, id] of Object.entries(wanted)) expect(matchTech(name), name).toBe(id);
  });
  it('is tolerant voor schrijfwijze en aliassen', () => {
    expect(matchTech('  typescript ')).toBe('typescript');
    expect(matchTech('node js')).toBe('nodejs');
    expect(matchTech('NodeJS')).toBe('nodejs');
    expect(matchTech('Unreal Engine')).toBe('unreal');
    expect(matchTech('Spring Boot')).toBe('spring');
    expect(matchTech('C#')).toBe('csharp');
  });
  it('geeft null (alleen tekst) voor onbekende namen', () => {
    expect(matchTech('Communicatie')).toBeNull();
    expect(matchTech('')).toBeNull();
  });
  it('suggereert tijdens het typen', () => {
    expect(suggestTech('typesc')[0].id).toBe('typescript');
    expect(suggestTech('git').map((t) => t.id)).toEqual(expect.arrayContaining(['git', 'github', 'gitlab']));
    expect(suggestTech('x')).toEqual([]);
  });
  it('registry is consistent: unieke ids, elk icoon tekenbaar, geldige viewBox-paden', () => {
    const ids = TECH_ICONS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TECH_ICONS) {
      expect(Boolean(t.path) !== Boolean(t.draw), t.id).toBe(true);
      if (t.path) expect(/^[Mm]/.test(t.path), t.id).toBe(true);
      expect(getTech(t.id)).toBe(t);
    }
    expect(TECH_ICONS.length).toBeGreaterThan(90);
  });
  it('override wint van automatisch; uit zonder iconen', () => {
    expect(resolveSkillIcon('Git', 'off', {})).toBeNull();
    expect(resolveSkillIcon('Git', 'auto', {})).toBe('git');
    expect(resolveSkillIcon('Git', 'auto', { git: 'none' })).toBeNull();
    expect(resolveSkillIcon('Git', 'off', { git: 'terminal' })).toBe('terminal');
    expect(resolveSkillIcon('Git', 'auto', { git: 'bestaatniet' })).toBe('git');
  });
});

describe('opslag van icoon-instellingen', () => {
  it('bestaande cv\'s blijven zonder iconen (opt-in)', () => {
    const cv = sanitizeCv({ sections: [{ id: 's', type: 'skills', groups: [{ id: 'g', name: 'x', skills: ['React'] }] }, { id: 'p', type: 'projects', items: [] }] });
    const sk = cv.sections.find((s) => s.id === 's')!;
    const pr = cv.sections.find((s) => s.id === 'p')!;
    expect(sk.type === 'skills' && sk.icons).toBe('off');
    expect(pr.type === 'projects' && pr.techDisplay).toBe('text');
    expect(cv.style.techColorMode).toBe('auto');
  });
  it('bewaart en zuivert overrides', () => {
    const sec = { ...emptySection('skills'), icons: 'auto', iconOverrides: { react: 'vue', x: 'DROP TABLE', y: 5, __proto__: 'a' } };
    const cv = sanitizeCv({ ...createEmptyCv(), sections: [sec] });
    const sk = cv.sections.find((s) => s.type === 'skills')!;
    expect(sk.type === 'skills' && sk.iconOverrides).toEqual({ react: 'vue' });
  });
});

describe('kleurbeleid van tech-iconen', () => {
  const ts = getTech('typescript')!;
  const js = getTech('javascript')!;
  const db = getTech('database')!;
  const gh = getTech('github')!;
  const white = '#ffffff';
  const blue = '#00549a';

  it('auto: hoofdinhoud in originele kleuren, aanvullende inhoud monochroom', () => {
    expect(resolveIconLook(ts, { mode: 'auto', zone: 'primary', bg: white })).toEqual({ kind: 'multi' });
    expect(resolveIconLook(ts, { mode: 'auto', zone: 'supplementary', bg: blue })).toEqual({ kind: 'mono' });
    expect(resolveIconLook(ts, { mode: 'auto', zone: 'supplementary', bg: white })).toEqual({ kind: 'mono' });
  });
  it('originele kleuren: valt terug op monochroom op een donkere/gekleurde achtergrond', () => {
    expect(resolveIconLook(ts, { mode: 'brand', zone: 'supplementary', bg: white })).toEqual({ kind: 'multi' });
    expect(resolveIconLook(ts, { mode: 'brand', zone: 'supplementary', bg: blue })).toEqual({ kind: 'mono' });
    expect(resolveIconLook(js, { mode: 'brand', zone: 'primary', bg: '#b8561f' }).kind).not.toBe('multi'); // geen meerkleurig logo op oranje
    expect(resolveIconLook(js, { mode: 'brand', zone: 'primary', bg: blue })).toEqual({ kind: 'single', color: '#F7DF1E' }); // geel op blauw: genoeg contrast
  });
  it('monochroom is altijd monochroom', () => {
    expect(resolveIconLook(ts, { mode: 'mono', zone: 'primary', bg: white })).toEqual({ kind: 'mono' });
  });
  it('algemene iconen krijgen nooit een verzonnen kleur', () => {
    expect(resolveIconLook(db, { mode: 'brand', zone: 'primary', bg: white })).toEqual({ kind: 'mono' });
  });
  it('merk zonder kleurenlogo gebruikt de merkkleur alleen bij genoeg contrast', () => {
    const noMulti = { ...gh, multi: undefined, hex: 'F7DF1E' };
    expect(resolveIconLook(noMulti, { mode: 'brand', zone: 'primary', bg: white })).toEqual({ kind: 'mono' }); // geel op wit
    expect(resolveIconLook({ ...noMulti, hex: '3178C6' }, { mode: 'brand', zone: 'primary', bg: white })).toEqual({ kind: 'single', color: '#3178C6' });
  });
  it('gegenereerde logo\'s zijn veilig en meerkleurig waar verwacht', () => {
    for (const [id, v] of Object.entries(BRAND_MULTI)) {
      expect(/<script|<foreignObject|<image|<style|\son\w+=|href="(?!#)/i.test(v.body), id).toBe(false);
      expect(/^[\d.\s-]+$/.test(v.vb), id).toBe(true);
    }
    const colors = (id: string) => new Set(BRAND_MULTI[id].body.match(/#[0-9a-fA-F]{6}\b/g)?.map((c) => c.toLowerCase()));
    expect(colors('python').size).toBeGreaterThanOrEqual(2); // blauw + geel
    expect(BRAND_MULTI.react.body).toMatch(/#61dafb/i);
    expect(BRAND_MULTI.docker.body).toMatch(/#(2396ed|019bc6|00aada)/i);
  });
  it('v2.0-schakelaar techColors wordt gemigreerd', () => {
    expect(sanitizeCv({ style: { techColors: true } }).style.techColorMode).toBe('brand');
    expect(sanitizeCv({ style: { techColors: false } }).style.techColorMode).toBe('auto');
    expect(sanitizeCv({ style: { techColorMode: 'mono' } }).style.techColorMode).toBe('mono');
    expect(sanitizeCv({ style: { techColorMode: 'x' } }).style.techColorMode).toBe('auto');
  });
});
