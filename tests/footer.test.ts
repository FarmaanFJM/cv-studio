import fs from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { describe, expect, it } from 'vitest';
import {
  FOOTER_MAX, SectionFooter, editFooterText, footerSegments, linkIndexAt, parseUrlInput, removeLinkAt, safeUrl, sanitizeFooter, upsertLink
} from '../src/shared/footer';
import { CV, duplicateCv, relocateSection, sanitizeCv, sanitizeState, zoneOf } from '../src/shared/model';
import { CvPage } from '../src/renderer/templates/CvPage';
import { demoCv } from './fixtures';

const GH: SectionFooter = { text: 'Meer projecten bekijken op GitHub', links: [{ start: 27, end: 33, url: 'https://github.com/voorbeeld' }] };
const html = (cv: CV) => renderToStaticMarkup(React.createElement(CvPage, { cv }));
const sec = (cv: CV, type: string) => cv.sections.find((s) => s.type === type)!;

describe('safeUrl / parseUrlInput', () => {
  it('accepteert http en https', () => {
    expect(safeUrl('https://github.com/voorbeeld')).toBe('https://github.com/voorbeeld');
    expect(safeUrl('http://example.com')).toBe('http://example.com/');
  });
  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<b>x</b>', 'file:///etc/passwd', 'vbscript:x', 'ftp://example.com', 'mailto:a@b.nl',
    '//example.com', 'https://', 'https://user:pw@example.com', 'https://exa mple.com', 'https://a.nl/\u0000', ' javascript:alert(1)', '', 'github.com'])('weigert %j', (u) => {
    expect(safeUrl(u)).toBeNull();
  });
  it('weigert te lange adressen en niet-teksten', () => {
    expect(safeUrl('https://example.com/' + 'a'.repeat(2100))).toBeNull();
    expect(safeUrl(42)).toBeNull();
    expect(safeUrl(null)).toBeNull();
  });
  it('vult in de editor https:// aan, maar weigert andere schema\'s', () => {
    expect(parseUrlInput('github.com/voorbeeld')).toBe('https://github.com/voorbeeld');
    expect(parseUrlInput('javascript:alert(1)')).toBeNull();
    expect(parseUrlInput('data:text/html,x')).toBeNull();
    expect(parseUrlInput('localhost:3000')).toBeNull();
    expect(parseUrlInput('geen adres')).toBeNull();
  });
});

describe('sanitizeFooter', () => {
  it('geeft undefined voor leeg of niet-tekst', () => {
    for (const v of [undefined, null, '', '  \n ', 5, {}, { text: '  ' }, []]) expect(sanitizeFooter(v)).toBeUndefined();
  });
  it('behoudt tekst en geldige links; regeleinden blijven', () => {
    expect(sanitizeFooter(GH)).toEqual(GH);
    expect(sanitizeFooter({ text: 'a\r\nb', links: [] })).toEqual({ text: 'a\nb', links: [] });
  });
  it('verwijdert onveilige, ongeldige en overlappende links en begrenst de lengte', () => {
    const f = sanitizeFooter({ text: 'abcdefghij', links: [
      { start: 0, end: 3, url: 'javascript:alert(1)' }, { start: 4, end: 2, url: 'https://a.nl' }, { start: -1, end: 3, url: 'https://a.nl' },
      { start: 2, end: 99, url: 'https://a.nl' }, { start: 1.5, end: 3, url: 'https://a.nl' }, 'x', null,
      { start: 3, end: 6, url: 'https://ok.nl' }, { start: 5, end: 8, url: 'https://overlap.nl' }, { start: 8, end: 10, url: 'HTTPS://B.NL/x' }
    ] })!;
    expect(f.links).toEqual([{ start: 3, end: 6, url: 'https://ok.nl/' }, { start: 8, end: 10, url: 'https://b.nl/x' }]);
    expect(sanitizeFooter('x'.repeat(5000))!.text).toHaveLength(FOOTER_MAX);
  });
  it('accepteert een gewone tekst als oudere/handmatige invoer', () => {
    expect(sanitizeFooter('Referenties op aanvraag.')).toEqual({ text: 'Referenties op aanvraag.', links: [] });
  });
  it('behandelt HTML als tekst', () => {
    const cv = demoCv();
    sec(cv, 'projects').footer = { text: '<img src=x onerror=alert(1)><script>x</script>', links: [] };
    const out = html(cv);
    expect(out).not.toContain('<script>x');
    expect(out).not.toContain('<img src=x');
    expect(out).toContain('&lt;img src=x');
  });
});

describe('footer bewerken', () => {
  it('schuift links mee bij tekst ervoor, ook als de tekst langer wordt', () => {
    const f = editFooterText(GH, 'Zie ook: Meer projecten bekijken op GitHub')!;
    expect(f.text.slice(f.links[0].start, f.links[0].end)).toBe('GitHub');
    const g = editFooterText(f, f.text + ' en meer')!;
    expect(g.text.slice(g.links[0].start, g.links[0].end)).toBe('GitHub');
  });
  it('laat de link meegroeien bij typen binnen de link en verliest hem als de tekst weg is', () => {
    const grown = editFooterText(GH, 'Meer projecten bekijken op GitHuub')!;
    expect(grown.text.slice(grown.links[0].start, grown.links[0].end)).toBe('GitHuub');
    expect(editFooterText(GH, 'Meer projecten bekijken op ')!.links).toEqual([]);
    expect(editFooterText(GH, '')).toBeUndefined();
  });
  it('typen direct achter de link maakt die niet langer', () => {
    const f = editFooterText(GH, GH.text + '!')!;
    expect(f.text.slice(f.links[0].start, f.links[0].end)).toBe('GitHub');
  });
  it('maakt een link van geselecteerde tekst, bewerkt hem en verwijdert hem', () => {
    const plain: SectionFooter = { text: 'Meer projecten bekijken op GitHub', links: [] };
    const a = upsertLink(plain, 27, 33, 'GitHub', 'https://github.com/voorbeeld')!;
    expect(a).toEqual(GH);
    const idx = linkIndexAt(a, 29, 29);
    expect(idx).toBe(0);
    const b = upsertLink(a, 27, 33, 'mijn profiel', 'https://github.com/ander')!;
    expect(b.text).toBe('Meer projecten bekijken op mijn profiel');
    expect(footerSegments(b).filter((s) => s.url)).toEqual([{ text: 'mijn profiel', url: 'https://github.com/ander' }]);
    expect(removeLinkAt(b, 0).links).toEqual([]);
  });
  it('voegt zonder selectie de linktekst in op de cursor', () => {
    const f = upsertLink({ text: 'Zie: ', links: [] }, 5, 5, 'mijnsite.nl', 'https://mijnsite.nl')!;
    expect(f.text).toBe('Zie: mijnsite.nl');
    expect(f.links).toEqual([{ start: 5, end: 16, url: 'https://mijnsite.nl/' }]);
  });
  it('de hele zin kan klikbaar zijn', () => {
    const f = upsertLink({ text: 'Portfolio', links: [] }, 0, 9, 'Portfolio', 'https://a.nl')!;
    expect(footerSegments(f)).toEqual([{ text: 'Portfolio', url: 'https://a.nl/' }]);
  });
});

describe('footer in het datamodel', () => {
  const kinds = ['projects', 'skills', 'education', 'custom', 'experience', 'profile', 'languages', 'personal'] as const;

  it('bestaande secties zonder footer blijven ongewijzigd (geen nieuw veld)', () => {
    const cv = demoCv();
    const back = sanitizeCv(JSON.parse(JSON.stringify(cv)));
    for (const s of back.sections) expect('footer' in s).toBe(false);
    expect(html(cv)).not.toContain('sec-footer');
  });
  it.each(kinds)('overleeft opslaan (JSON) voor %s', (kind) => {
    const cv = demoCv();
    const s = kind === 'custom' ? cv.sections.find((x) => x.type === 'custom') ?? (cv.sections.push({ id: 'c1', type: 'custom', title: 'Eigen', visible: true, zone: 'primary', mode: 'text', techOverride: false, techShow: true, techColor: 'auto', text: 'x', items: [] }), cv.sections.at(-1)!) : sec(cv, kind);
    s.footer = GH;
    const back = sanitizeCv(JSON.parse(JSON.stringify(cv)));
    expect(back.sections.find((x) => x.id === s.id)!.footer).toEqual(GH);
  });
  it('blijft bij kopiëren van het cv en via sanitizeState (autosave/herladen) bewaard', () => {
    const cv = demoCv();
    sec(cv, 'projects').footer = GH;
    const dup = duplicateCv(cv, 'Kopie');
    expect(sec(dup, 'projects').footer).toEqual(GH);
    const state = sanitizeState(JSON.parse(JSON.stringify({ version: 4, activeId: cv.id, cvs: [cv, dup], swatches: [] })));
    expect(sec(state.cvs[1], 'projects').footer).toEqual(GH);
  });
  it('verplaatst, verbergt en wisselt van sjabloon samen met het onderdeel', () => {
    const cv = demoCv();
    const p = sec(cv, 'projects');
    p.footer = GH;
    const moved = relocateSection(cv.sections, p.id, 'supplementary');
    expect(moved.find((s) => s.id === p.id)!.footer).toEqual(GH);
    const hidden = relocateSection(cv.sections, p.id, 'hidden');
    expect(zoneOf(cv, hidden.find((s) => s.id === p.id)!)).toBe('hidden');
    expect(html({ ...cv, sections: hidden })).not.toContain('sec-footer');
    for (const template of ['sidebar', 'header', 'minimal'] as const) {
      const out = html({ ...cv, template });
      expect(out).toContain('Meer projecten bekijken op ');
      expect(out).toContain('<a href="https://github.com/voorbeeld"');
    }
  });
  it('toont de footer onder het laatste item, ook als het onderdeel verder leeg is', () => {
    const cv = demoCv();
    const p = sec(cv, 'projects') as Extract<typeof cv.sections[number], { type: 'projects' }>;
    p.footer = GH;
    const out = html(cv);
    expect(out.indexOf('Testproject B')).toBeLessThan(out.indexOf('sec-footer'));
    p.items = [];
    const empty = html(cv);
    expect(empty).toContain('sec-projects');
    expect(empty).toContain('sec-footer');
    p.footer = undefined;
    expect(html(cv)).not.toContain('sec-projects');
  });
  it('rendert platte tekst zonder link, en meerdere regels', () => {
    const cv = demoCv();
    sec(cv, 'education').footer = { text: 'Referenties beschikbaar\nop aanvraag.', links: [] };
    const out = html(cv);
    expect(out).toContain('Referenties beschikbaar\nop aanvraag.');
    expect(/<div class="sec-footer"[^>]*>[^<]*<\/div>/.test(out)).toBe(true);
  });
  it('toont het personal-footer in alle drie de sjablonen', () => {
    for (const template of ['sidebar', 'header', 'minimal'] as const) {
      const cv = demoCv(); cv.template = template;
      sec(cv, 'personal').footer = { text: 'Beschikbaar per 1 augustus', links: [] };
      expect(html(cv)).toContain('Beschikbaar per 1 augustus');
    }
  });
  it('is achterwaarts compatibel met opslagbestanden van 3.0.x', () => {
    for (const v of ['3.0.0', '3.0.1']) {
      const raw = JSON.parse(fs.readFileSync(new URL(`./fixtures/state-${v}.json`, import.meta.url), 'utf8'));
      const state = sanitizeState(raw);
      expect(state.version).toBe(4);
      for (const c of state.cvs) for (const s of c.sections) expect(s.footer).toBeUndefined();
    }
  });
  it('saneert onbetrouwbare footers in een geïmporteerd cv', () => {
    const cv = JSON.parse(JSON.stringify(demoCv()));
    cv.sections[2].footer = { text: 'Zie hier', links: [{ start: 0, end: 3, url: 'javascript:alert(1)' }, { start: 4, end: 8, url: 'https://ok.nl' }] };
    cv.sections[3].footer = 12345;
    const back = sanitizeCv(cv);
    expect(back.sections[2].footer).toEqual({ text: 'Zie hier', links: [{ start: 4, end: 8, url: 'https://ok.nl/' }] });
    expect(back.sections[3].footer).toBeUndefined();
  });
});
