import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createEmptyCv, migrateDisplay, relocateSection, sanitizeCv, sanitizeState, zoneOf } from '../src/shared/model';

// Fictieve opslagbestanden, gegenereerd met de modelcode van de releases 3.0.0 en 3.0.1 (zie tests/fixtures).
const load = (v: string) => JSON.parse(fs.readFileSync(new URL(`./fixtures/state-${v}.json`, import.meta.url), 'utf8'));
const find = (cv: ReturnType<typeof sanitizeCv>, id: string) => cv.sections.find((s) => s.id === id)!;

describe.each(['3.0.0', '3.0.1'])('upgrade vanaf %s', (v) => {
  const raw = load(v);
  const before = raw.cvs[0];
  const state = sanitizeState(raw);
  const cv = state.cvs[0];

  it('bevat de oude weergavewaarden (testdata is representatief)', () => {
    expect(before.sections.filter((s: { display?: string }) => s.display === 'inline' || s.display === 'list')).toHaveLength(2);
  });
  it('zet inline en list om naar chips (iconen stonden aan); text en chips blijven gelijk', () => {
    expect(find(cv, 'sec-inline')).toMatchObject({ type: 'skills', display: 'chips' });
    expect(find(cv, 'sec-list')).toMatchObject({ type: 'skills', display: 'chips' });
    expect(find(cv, 'sec-text')).toMatchObject({ type: 'skills', display: 'text' });
    expect(find(cv, 'sec-chips')).toMatchObject({ type: 'skills', display: 'chips' });
  });
  it('zet inline/list om naar tekst als de iconen uit stonden (globaal of voor het onderdeel)', () => {
    const off = sanitizeState({ ...raw, cvs: [{ ...before, style: { ...before.style, techIcons: false } }] }).cvs[0];
    expect(find(off, 'sec-inline')).toMatchObject({ display: 'text' });
    expect(find(off, 'sec-list')).toMatchObject({ display: 'text' });
    const sec = JSON.parse(JSON.stringify(before));
    Object.assign(sec.sections.find((s: { id: string }) => s.id === 'sec-inline'), { techOverride: true, techShow: false });
    expect(find(sanitizeCv(sec), 'sec-inline')).toMatchObject({ display: 'text', techOverride: true, techShow: false });
  });
  it('verliest geen vaardigheden, categorieën, eigen iconen of iconeninstellingen', () => {
    for (const old of before.sections.filter((s: { type: string }) => s.type === 'skills')) {
      const now = find(cv, old.id);
      expect(now).toMatchObject({
        type: 'skills', title: old.title, mode: old.mode, iconOverrides: old.iconOverrides, zone: old.zone, visible: old.visible,
        techOverride: old.techOverride, techShow: old.techShow, techColor: old.techColor
      });
      expect((now as { groups: unknown }).groups).toEqual(old.groups);
    }
  });
  it('projecten: tech stack en iconeninstellingen blijven, inline wordt chips', () => {
    const p = cv.sections.find((s) => s.type === 'projects')!;
    expect(p).toMatchObject({ techDisplay: 'chips', techOverride: false });
    expect(p.type === 'projects' && p.items[0].tech).toBe('TypeScript, React');
  });
  it('behoudt titel van Profiel, tekst, template, plaatsing en volgorde', () => {
    const prof = cv.sections.find((s) => s.type === 'profile')!;
    expect(prof.title).toBe('Profiel'); // een bestaande titel wordt nooit overschreven
    expect(prof.type === 'profile' && prof.text).toBe('Fictieve introductie voor een test.');
    expect(cv.template).toBe('header');
    expect(cv.sections.map((s) => [s.id, s.zone, s.visible])).toEqual(before.sections.map((s: { id: string; zone: string; visible: boolean }) => [s.id, s.zone, s.visible]));
    expect(state.swatches).toEqual(['#112233']);
    expect(cv.personal.fullName).toBe('Voorbeeld Persoon');
  });
  it('is idempotent: opnieuw inlezen verandert niets', () => {
    expect(sanitizeState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });
});

describe('Over mij', () => {
  it('nieuwe cv\'s noemen het profielonderdeel "Over mij" (intern nog steeds type profile)', () => {
    const s = createEmptyCv().sections.find((x) => x.type === 'profile')!;
    expect(s.title).toBe('Over mij');
  });
  it('een lege titel valt terug op de nieuwe standaard, een eigen titel blijft', () => {
    const mk = (title: string) => sanitizeCv({ sections: [{ id: 'a', type: 'profile', title, text: 'x' }] }).sections.find((s) => s.id === 'a')!.title;
    expect(mk('')).toBe('Over mij');
    expect(mk('Mijn eigen titel')).toBe('Mijn eigen titel');
    expect(mk('Profiel')).toBe('Profiel');
  });
});

describe('migrateDisplay', () => {
  it('kent alleen text en chips', () => {
    expect(migrateDisplay('chips', false)).toBe('chips');
    expect(migrateDisplay('text', true)).toBe('text');
    expect(migrateDisplay('inline', true)).toBe('chips');
    expect(migrateDisplay('list', true)).toBe('chips');
    expect(migrateDisplay('inline', false)).toBe('text');
    expect(migrateDisplay('onbekend', true)).toBe('text');
    expect(migrateDisplay(undefined, true)).toBe('text');
  });
});

describe('plaatsing en sjablonen', () => {
  const cv = createEmptyCv();
  const id = (t: string) => cv.sections.find((s) => s.type === t)!.id;
  it('verplaatsen in Minimaal behoudt de opgeslagen zone', () => {
    const next = relocateSection(cv.sections, id('skills'), 'primary', id('profile'), 'minimal');
    const sk = next.find((s) => s.type === 'skills')!;
    expect(sk.zone).toBe('supplementary');
    expect(next.findIndex((s) => s.id === sk.id)).toBeLessThan(next.findIndex((s) => s.type === 'profile'));
    // wisselen naar zijbalk: onderdeel staat er weer waar het stond
    expect(zoneOf({ template: 'sidebar' }, sk)).toBe('supplementary');
  });
  it('achteraan zetten in Minimaal komt achter het laatste zichtbare onderdeel, ongeacht zone', () => {
    const next = relocateSection(cv.sections, id('profile'), 'primary', undefined, 'minimal');
    expect(next[next.length - 1].type).toBe('profile');
    expect(next.find((s) => s.type === 'profile')!.zone).toBe('primary');
  });
  it('verplaatsen tussen twee onderdelen in dezelfde zone', () => {
    const next = relocateSection(cv.sections, id('experience'), 'primary', id('projects'));
    const main = next.filter((s) => s.visible && s.zone === 'primary').map((s) => s.type);
    expect(main.indexOf('experience')).toBe(main.indexOf('projects') - 1);
  });
  it('naar een lege zone en terug', () => {
    let secs = cv.sections;
    for (const t of ['personal', 'skills', 'languages']) secs = relocateSection(secs, id(t), 'primary');
    expect(secs.filter((s) => s.visible && s.zone === 'supplementary')).toHaveLength(0);
    secs = relocateSection(secs, id('experience'), 'supplementary');
    expect(secs.filter((s) => s.visible && s.zone === 'supplementary').map((s) => s.type)).toEqual(['experience']);
  });
  it('verbergen en weer tonen via slepen houdt alle gegevens', () => {
    const hidden = relocateSection(cv.sections, id('skills'), 'hidden');
    expect(hidden.find((s) => s.type === 'skills')).toMatchObject({ visible: false, zone: 'supplementary' });
    const back = relocateSection(hidden, id('skills'), 'primary');
    expect(back.find((s) => s.type === 'skills')).toMatchObject({ visible: true, zone: 'primary' });
    expect(back).toHaveLength(cv.sections.length);
  });
});
