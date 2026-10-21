import { describe, expect, it } from 'vitest';
import { contrast, hexToHsv, hsvToHex, normalizeHex, readableOn } from '../src/shared/color';
import { createEmptyCv, moveInZone, placeSection, sanitizeCv, sanitizeState, zoneOf } from '../src/shared/model';

describe('kleurhulpen', () => {
  it('normaliseert hex en berekent contrast', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('xyz')).toBeNull();
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
    expect(contrast('#eeeeee', '#ffffff')).toBeLessThan(2);
  });
  it('kiest leesbare tekstkleur op zijbalk', () => {
    expect(readableOn('#00549a')).toBe('#ffffff');
    expect(readableOn('#f5b700')).toBe('#111827');
  });
  it('hsv <-> hex rondreis', () => {
    for (const c of ['#336699', '#b7f736', '#ff0000']) expect(hsvToHex(...hexToHsv(c))).toBe(c);
  });
});

describe('zones', () => {
  const cv = createEmptyCv();
  const id = (t: string) => cv.sections.find((s) => s.type === t)!.id;

  it('standaard: contact, vaardigheden en talen links; de rest in het hoofdgedeelte', () => {
    const z = Object.fromEntries(cv.sections.map((s) => [s.type, zoneOf(cv, s)]));
    expect(z).toMatchObject({ personal: 'side', skills: 'side', languages: 'side', profile: 'main', experience: 'main' });
  });
  it('minimal heeft geen zones', () => {
    expect(cv.sections.every((s) => zoneOf({ template: 'minimal' }, s) === 'main')).toBe(true);
  });
  it('onderdeel naar zijbalk verplaatsen en achteraan zetten', () => {
    const next = placeSection(cv.sections, id('profile'), 'side');
    const p = next.find((s) => s.type === 'profile')!;
    expect(p.zone).toBe('side');
    const sideTypes = next.filter((s) => s.visible && s.zone === 'side').map((s) => s.type);
    expect(sideTypes[sideTypes.length - 1]).toBe('profile');
  });
  it('verbergen behoudt de plek; tonen zet het terug', () => {
    const hidden = placeSection(cv.sections, id('projects'), 'hidden');
    expect(hidden.map((s) => s.id)).toEqual(cv.sections.map((s) => s.id));
    expect(hidden.find((s) => s.type === 'projects')!.visible).toBe(false);
  });
  it('verplaatsen binnen een zone slaat andere zones over', () => {
    const next = moveInZone(cv.sections, id('experience'), -1, 'sidebar');
    const main = next.filter((s) => s.zone === 'main').map((s) => s.type);
    expect(main.indexOf('experience')).toBeLessThan(main.indexOf('education'));
  });
});

describe('migratie van v1 en validatie van stijl', () => {
  it('v1-opslag: spacing-preset, accent -> zijbalk, zones op type', () => {
    const state = sanitizeState({ version: 1, activeId: 'x', cvs: [{ id: 'x', name: 'Oud',
      style: { accent: '#0f766e', font: 'lato', fontSize: 10, spacing: 'compact' },
      sections: [{ id: 'a', type: 'skills', title: 'Skills', visible: true, groups: [{ id: 'g', name: 'Tools', skills: ['Git'] }] }] }] });
    const cv = state.cvs[0];
    expect(state.version).toBe(2);
    expect(cv.style.sidebarBg).toBe('#0f766e');
    expect(cv.style).toMatchObject({ sectionGap: 3.6, margin: 10, font: 'lato' });
    const sk = cv.sections.find((s) => s.type === 'skills')!;
    expect(sk.zone).toBe('side');
    expect(sk.type === 'skills' && sk.mode).toBe('grouped');
    expect(state.swatches).toEqual([]);
  });
  it('begrenst lettergrootte en negeert ongeldige kleuren', () => {
    const cv = sanitizeCv({ style: { fontSize: 3, sidebarWidth: 5, textColor: 'javascript:', headingColor: '#ABCDEF' }, template: 'header' });
    expect(cv.style.fontSize).toBe(8);
    expect(cv.style.sidebarWidth).toBe(50);
    expect(cv.style.textColor).toBe('');
    expect(cv.style.headingColor).toBe('#abcdef');
    expect(cv.template).toBe('header');
  });
});
