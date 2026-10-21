import { describe, expect, it } from 'vitest';
import { TECH_ICONS, getTech, matchTech, resolveSkillIcon, suggestTech } from '../src/renderer/techIcons';
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
    expect(cv.style.techColors).toBe(false);
  });
  it('bewaart en zuivert overrides', () => {
    const sec = { ...emptySection('skills'), icons: 'auto', iconOverrides: { react: 'vue', x: 'DROP TABLE', y: 5, __proto__: 'a' } };
    const cv = sanitizeCv({ ...createEmptyCv(), sections: [sec] });
    const sk = cv.sections.find((s) => s.type === 'skills')!;
    expect(sk.type === 'skills' && sk.iconOverrides).toEqual({ react: 'vue' });
  });
});
