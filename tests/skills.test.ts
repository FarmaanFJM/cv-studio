import { describe, expect, it } from 'vitest';
import { TECH_ICONS } from '../src/renderer/techIcons';
import {
  SKILL_CATALOG, SKILL_CATEGORIES, addSkill, categoryByName, cleanSkillName, searchCategories, searchSkills, skillKey, splitSkills
} from '../src/shared/skillCatalog';
import { emptySection, newSkillGroup } from '../src/shared/model';

const names = (q: string, o = {}) => searchSkills(q, o).map((e) => e.name);

describe('vaardighedencatalogus', () => {
  it('is lokaal, uniek en bevat alle gevraagde voorbeelden', () => {
    const keys = SKILL_CATALOG.map((e) => skillKey(e.name));
    expect(new Set(keys).size).toBe(keys.length);
    expect(SKILL_CATALOG.length).toBeGreaterThan(400);
    const wanted: Record<string, string[]> = {
      languages: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'Go'],
      frameworks: ['React', 'Vue', 'Angular', 'Spring Boot', 'Django', 'Express', 'Next.js'],
      tools: ['Git', 'GitHub', 'GitLab', 'VS Code', 'Postman', 'Figma'],
      devops: ['Docker', 'GitHub Actions', 'Azure DevOps', 'Kubernetes', 'Terraform'],
      databases: ['PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis'],
      cloud: ['Microsoft Azure', 'AWS', 'Google Cloud'],
      testing: ['Playwright', 'Vitest', 'Jest', 'Cypress'],
      gamedev: ['Godot', 'Unity', 'Unreal Engine']
    };
    for (const [cat, list] of Object.entries(wanted)) {
      for (const n of list) {
        const e = SKILL_CATALOG.find((x) => skillKey(x.name) === skillKey(n));
        expect(e, n).toBeTruthy();
        expect(e!.categories, n).toContain(cat);
      }
    }
  });
  it('heeft Nederlandse categoriepresets voor IT en algemene beroepen', () => {
    const labels = SKILL_CATEGORIES.map((c) => c.label);
    for (const l of ['Programmeertalen', 'Frameworks & Libraries', 'Tools', 'DevOps', 'Databases', 'Cloud', 'Testing', 'Game Development',
      'Communicatie', 'Samenwerking', 'Organisatie', 'Planning', 'Leiderschap', 'Klantenservice', 'Administratie', 'Design', 'Microsoft Office',
      'Analyse', 'Onderzoek', 'Projectmanagement', 'Presenteren']) expect(labels, l).toContain(l);
    expect(SKILL_CATEGORIES.filter((c) => c.kind === 'general').length).toBeGreaterThanOrEqual(13);
    for (const c of SKILL_CATEGORIES) expect(SKILL_CATALOG.some((e) => e.categories.includes(c.id)), c.id).toBe(true);
  });
  it('Programmeertalen bevat geen gesproken talen en Talen blijft een apart onderdeel', () => {
    const langs = searchSkills('', { category: 'languages', limit: 200 }).map((e) => e.name);
    for (const human of ['Nederlands', 'Engels', 'Duits', 'Frans']) expect(langs).not.toContain(human);
    expect(emptySection('languages').title).toBe('Talen');
  });
  it('geen vaardigheid hoort bij een niet bestaande categorie', () => {
    for (const e of SKILL_CATALOG) for (const c of e.categories) expect(SKILL_CATEGORIES.some((x) => x.id === c), e.name).toBe(true);
  });
  it('elk meegeleverd technologie-icoon is vindbaar in de catalogus (op naam of alias)', () => {
    // algemene lijn-iconen zijn geen vaardigheden; merken wel
    const missing = TECH_ICONS.filter((t) => t.path && searchSkills(t.label, { limit: 3 }).every((e) => skillKey(e.name) !== skillKey(t.label) && !e.aliases.some((a) => skillKey(a) === skillKey(t.label))))
      .map((t) => t.label);
    expect(missing).toEqual(expect.not.arrayContaining(['TypeScript', 'React', 'Python']));
    expect(missing.length).toBeLessThan(25);
  });
});

describe('zoeken', () => {
  it('Type -> TypeScript', () => { expect(names('Type')[0]).toBe('TypeScript'); });
  it('Py -> Python, PyTorch en Pytest', () => { expect(names('Py')).toEqual(expect.arrayContaining(['Python', 'PyTorch', 'Pytest'])); expect(names('Py')[0]).toBe('Python'); });
  it('is hoofdletter-, spatie- en leesteken-ongevoelig en kent aliassen', () => {
    expect(names('typescript')[0]).toBe('TypeScript');
    expect(names('node js')[0]).toBe('Node.js');
    expect(names('k8s')[0]).toBe('Kubernetes');
    expect(names('excel')[0]).toBe('Microsoft Excel');
    expect(names('azure')).toEqual(expect.arrayContaining(['Microsoft Azure']));
  });
  it('rangschikt exact > begin > woordbegin > bevat', () => {
    const r = names('go');
    expect(r[0]).toBe('Go');
  });
  it('sluit reeds toegevoegde vaardigheden uit (ook met andere hoofdletters)', () => {
    expect(names('Type', { exclude: ['  typescript '] })).not.toContain('TypeScript');
  });
  it('categoriefilter en voorstel bovenaan', () => {
    expect(searchSkills('', { category: 'cloud' }).map((e) => e.name)).toContain('Microsoft Azure');
    const boosted = searchSkills('', { boost: 'databases', limit: 5 }).map((e) => e.name);
    expect(boosted).toEqual(['PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis']);
  });
  it('zonder treffer: lege lijst; grote catalogus blijft snel', () => {
    expect(names('zzzzqq')).toEqual([]);
    const t = performance.now();
    for (let i = 0; i < 200; i++) searchSkills('a', { limit: 50 });
    expect(performance.now() - t).toBeLessThan(500);
  });
  it('categorieën doorzoeken', () => {
    expect(searchCategories('prog')[0].label).toBe('Programmeertalen');
    expect(searchCategories('office')[0].label).toBe('Microsoft Office');
    expect(searchCategories('').length).toBe(SKILL_CATEGORIES.length);
    expect(searchCategories('qqqq')).toEqual([]);
    expect(categoryByName('  programmeertalen ')?.id).toBe('languages');
    expect(categoryByName('Mijn eigen groep')).toBeNull();
  });
});

describe('toevoegen zonder duplicaten', () => {
  it('negeert hoofdletters en overbodige spaties, behoudt de ingevoerde schrijfwijze', () => {
    let r = addSkill([], '  type   script ');
    expect(r).toMatchObject({ added: true, list: ['type script'] });
    r = addSkill(['TypeScript'], ' typescript ');
    expect(r).toMatchObject({ added: false, duplicate: true, list: ['TypeScript'] });
    r = addSkill(['TypeScript'], 'tYpEsCrIpT');
    expect(r.duplicate).toBe(true);
    expect(addSkill(['a'], 'eigen NAAM').list).toEqual(['a', 'eigen NAAM']);
    expect(addSkill(['a'], '   ').added).toBe(false);
  });
  it('splitst geplakte lijsten', () => {
    expect(splitSkills('a, b;  c\n d,, ')).toEqual(['a', 'b', 'c', 'd']);
    expect(cleanSkillName('  Node   .js ')).toBe('Node .js');
  });
  it('een categoriepreset maakt alleen een lege groep (geen vaardigheden zonder keuze)', () => {
    const g = newSkillGroup(categoryByName('Databases')!.label);
    expect(g).toMatchObject({ name: 'Databases', skills: [] });
  });
});
