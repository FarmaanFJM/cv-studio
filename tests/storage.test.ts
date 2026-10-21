import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CvStore } from '../electron/storage';
import { duplicateCv, createEmptyCv, sanitizeCv, sanitizeState, MIN_FONT_PT } from '../src/shared/model';
import { demoCv } from './fixtures';

let dir: string;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cvstore-')); });
afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

describe('CvStore (lokale JSON-opslag)', () => {
  it('maakt een leeg cv bij eerste start', () => {
    const s = new CvStore(dir).load();
    expect(s.cvs).toHaveLength(1);
    expect(s.activeId).toBe(s.cvs[0].id);
  });

  it('bewaart en herstelt alle gegevens, volgorde en opmaak', () => {
    const store = new CvStore(dir);
    const cv = demoCv();
    cv.template = 'minimal';
    cv.style = { accent: '#0f766e', font: 'lato', fontSize: 10, spacing: 'compact' };
    cv.sections.reverse();
    store.save({ version: 1, activeId: cv.id, cvs: [cv] });
    const back = new CvStore(dir).load();
    expect(back.activeId).toBe(cv.id);
    expect(back.cvs[0]).toEqual(sanitizeCv(cv));
    expect(back.cvs[0].sections.map((s) => s.id)).toEqual(cv.sections.map((s) => s.id));
  });

  it('bewaart de profielfoto lokaal', () => {
    const cv = demoCv();
    cv.photo = { src: 'data:image/jpeg;base64,/9j/AAAA', aspect: 1.5, zoom: 2, offsetX: 0.2, offsetY: -0.1, shape: 'square', visible: true };
    const store = new CvStore(dir);
    store.save({ version: 1, activeId: cv.id, cvs: [cv] });
    expect(new CvStore(dir).load().cvs[0].photo).toEqual(cv.photo);
  });

  it('schrijft atomisch (geen .tmp-bestand blijft staan)', () => {
    const store = new CvStore(dir);
    store.save(store.load());
    expect(fs.readdirSync(dir)).toEqual(['cvs.json']);
  });

  it('herstelt van een corrupt bestand en bewaart een kopie', () => {
    fs.writeFileSync(path.join(dir, 'cvs.json'), '{{ kapot');
    const s = new CvStore(dir).load();
    expect(s.cvs).toHaveLength(1);
    expect(fs.readdirSync(dir).some((f) => f.startsWith('cvs.corrupt-'))).toBe(true);
  });
});

describe('sanitizing van onbetrouwbare invoer', () => {
  it('weigert niet-objecten', () => {
    expect(() => sanitizeCv(null)).toThrow();
    expect(() => sanitizeCv('tekst')).toThrow();
    expect(() => sanitizeCv([])).toThrow();
  });

  it('zet rare waarden om naar veilige standaarden', () => {
    const cv = sanitizeCv({
      name: 5, template: 'x', style: { fontSize: 1, accent: 'rood', font: 'comic' },
      sections: [{ type: 'projects', items: 'nee' }, 5, null, { type: 'onbekend' }],
      photo: { src: 'javascript:alert(1)' }
    });
    expect(cv.template).toBe('sidebar');
    expect(cv.style.fontSize).toBe(MIN_FONT_PT); // nooit onleesbaar klein
    expect(cv.style.accent).toMatch(/^#[0-9a-f]{6}$/i);
    expect(cv.photo).toBeNull();
    expect(cv.sections.filter((s) => s.type === 'projects')).toHaveLength(1);
    expect(cv.sections.some((s) => s.type === 'personal')).toBe(true);
  });

  it('herstelt een bestand zonder geldige cvs', () => {
    expect(sanitizeState({ cvs: 'x' }).cvs).toHaveLength(1);
    expect(sanitizeState(undefined).cvs).toHaveLength(1);
  });
});

describe('meerdere versies', () => {
  it('duplicate maakt een onafhankelijke kopie', () => {
    const a = demoCv();
    const b = duplicateCv(a, 'ING');
    expect(b.id).not.toBe(a.id);
    expect(b.name).toBe('ING');
    b.personal.title = 'Anders';
    const proj = b.sections.find((s) => s.type === 'projects');
    if (proj?.type === 'projects') proj.items.pop();
    expect(a.personal.title).toBe('Stagiair Software Engineer');
    const origProj = a.sections.find((s) => s.type === 'projects');
    expect(origProj?.type === 'projects' && origProj.items.length).toBe(2);
  });

  it('standaardvolgorde zet projecten en opleiding vóór werkervaring', () => {
    const order = createEmptyCv().sections.map((s) => s.type);
    expect(order.indexOf('projects')).toBeLessThan(order.indexOf('experience'));
    expect(order.indexOf('education')).toBeLessThan(order.indexOf('experience'));
  });
});
