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
    expect(resolveSkillIcon('Git', true, {})).toBe('git');
    expect(resolveSkillIcon('Git', true, { git: 'none' })).toBeNull();
    expect(resolveSkillIcon('Git', true, { git: 'terminal' })).toBe('terminal');
    expect(resolveSkillIcon('Git', true, { git: 'bestaatniet' })).toBe('git');
    // een keuze per vaardigheid zet iconen nooit terug aan als ze uitstaan
    expect(resolveSkillIcon('Git', false, {})).toBeNull();
    expect(resolveSkillIcon('Git', false, { git: 'terminal' })).toBeNull();
  });
});

describe('opslag van icoon-instellingen', () => {
  it('bestaande cv\'s blijven zonder iconen (opt-in)', () => {
    const cv = sanitizeCv({ sections: [{ id: 's', type: 'skills', groups: [{ id: 'g', name: 'x', skills: ['React'] }] }, { id: 'p', type: 'projects', items: [] }] });
    const sk = cv.sections.find((s) => s.id === 's')!;
    const pr = cv.sections.find((s) => s.id === 'p')!;
    // iconen waren uit: het onderdeel krijgt een eigen instelling 'Toon iconen' uit, zodat het cv er hetzelfde uitziet
    expect(sk.type === 'skills' && [sk.techOverride, sk.techShow, sk.display]).toEqual([true, false, 'text']);
    expect(pr.type === 'projects' && pr.techDisplay).toBe('text');
    expect(cv.style.techColorMode).toBe('auto');
    expect(cv.style.techIcons).toBe(true);
  });
  it('bewaart en zuivert overrides', () => {
    const sec = { ...emptySection('skills'), iconOverrides: { react: 'vue', x: 'DROP TABLE', y: 5, __proto__: 'a' } };
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

import { effectiveTech } from '../src/shared/tech';

describe('voorrangsregels tech-iconen', () => {
  const style = (techIcons: boolean, techColorMode: 'auto' | 'brand' | 'mono') => ({ techIcons, techColorMode });
  it('1. globaal uit gaat voor alles', () => {
    expect(effectiveTech(style(false, 'brand'), { techOverride: true, techShow: true, techColor: 'mono' }).show).toBe(false);
    expect(effectiveTech(style(false, 'brand'), { techOverride: false, techShow: true, techColor: 'auto' }).show).toBe(false);
  });
  it('2. eigen instelling van het onderdeel (uit) wint van globaal aan', () => {
    expect(effectiveTech(style(true, 'auto'), { techOverride: true, techShow: false, techColor: 'auto' }).show).toBe(false);
    expect(effectiveTech(style(true, 'auto'), { techOverride: true, techShow: true, techColor: 'auto' }).show).toBe(true);
  });
  it('eigen waarden zonder actieve override worden genegeerd (maar blijven bewaard)', () => {
    const e = effectiveTech(style(true, 'brand'), { techOverride: false, techShow: false, techColor: 'mono' });
    expect(e).toEqual({ show: true, color: 'brand', inherited: true });
  });
  it('4. kleurmodus: eigen keuze wint, anders globaal', () => {
    expect(effectiveTech(style(true, 'brand'), { techOverride: true, techShow: true, techColor: 'mono' }).color).toBe('mono');
    expect(effectiveTech(style(true, 'brand'), { techOverride: false, techShow: true, techColor: 'mono' }).color).toBe('brand');
  });
});

describe('migratie van v2-opslag (tech-iconen)', () => {
  const skills = (extra: object) => sanitizeCv({ sections: [{ id: 's', type: 'skills', groups: [], ...extra }] }).sections.find((x) => x.id === 's')!;
  const projects = (extra: object) => sanitizeCv({ sections: [{ id: 'p', type: 'projects', items: [], ...extra }] }).sections.find((x) => x.id === 'p')!;
  const custom = (extra: object) => sanitizeCv({ sections: [{ id: 'c', type: 'custom', ...extra }] }).sections.find((x) => x.id === 'c')!;

  it('skills: icons auto + tekst -> "Icoon + label", volgt stijl', () => {
    const s = skills({ icons: 'auto', display: 'text', techColor: 'inherit' });
    expect(s.type === 'skills' && [s.display, s.techOverride]).toEqual(['inline', false]);
  });
  it('skills: icons auto + eigen kleur -> eigen instelling met die kleur', () => {
    const s = skills({ icons: 'auto', display: 'chips', techColor: 'brand' });
    expect(s.type === 'skills' && [s.display, s.techOverride, s.techShow, s.techColor]).toEqual(['chips', true, true, 'brand']);
  });
  it('skills: icons uit + chips blijft chips zonder iconen', () => {
    const s = skills({ icons: 'off', display: 'chips' });
    expect(s.type === 'skills' && [s.display, s.techOverride, s.techShow]).toEqual(['chips', true, false]);
  });
  it('projecten: chips met iconen -> inline, volgt stijl; zonder iconen -> eigen uit', () => {
    const a = projects({ techDisplay: 'chips', techIcons: true, techColor: 'inherit' });
    const b = projects({ techDisplay: 'chips', techIcons: false });
    const c = projects({ techDisplay: 'text' });
    expect(a.type === 'projects' && [a.techDisplay, a.techOverride]).toEqual(['inline', false]);
    expect(b.type === 'projects' && [b.techDisplay, b.techOverride, b.techShow]).toEqual(['inline', true, false]);
    expect(c.type === 'projects' && [c.techDisplay, c.techOverride]).toEqual(['text', false]);
  });
  it('custom: icons aan volgt stijl, uit wordt eigen uit', () => {
    const on = custom({ mode: 'keyvalue', icons: true });
    const off = custom({ mode: 'list', icons: false });
    expect(on.type === 'custom' && [on.techOverride, on.techShow]).toEqual([false, true]);
    expect(off.type === 'custom' && [off.techOverride, off.techShow]).toEqual([true, false]);
  });
  it('nieuw formaat blijft ongewijzigd (idempotent)', () => {
    const once = skills({ icons: 'auto', display: 'text', techColor: 'brand' });
    const twice = sanitizeCv({ sections: [once] }).sections.find((x) => x.id === 's')!;
    expect(twice).toEqual(once);
  });
  it('globaal: techIcons standaard aan; vorige kleurmodus blijft behouden', () => {
    const st = sanitizeCv({ style: { techColorMode: 'mono' } }).style;
    expect(st.techIcons).toBe(true);
    expect(st.techColorMode).toBe('mono');
    expect(sanitizeCv({ style: { techIcons: false, techColorMode: 'brand' } }).style).toMatchObject({ techIcons: false, techColorMode: 'brand' });
  });
});
