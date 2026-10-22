// Visuele controle van de editor met vaste, fictieve gegevens (zelfde data voor "voor" en "na").
//   xvfb-run -a node scripts/ui-review.mjs <app-map> <uitvoermap>
// Maakt: uitgeklapt Vaardigheden, groep met geleidelijn, invoer met chevron (dicht en open), iconeninstellingen,
// tabbladen Layout en Stijl, en de editor smal en breed.
import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [root, out] = process.argv.slice(2, 4).map((p) => path.resolve(p));
fs.mkdirSync(out, { recursive: true });

const cv = {
  id: 'rev', name: 'Cv stage 2026', createdAt: 1, updatedAt: 1, template: 'sidebar',
  style: { accent: '#1f4e79', sidebarBg: '#1f4e79', font: 'inter', fontSize: 9.5, lineHeight: 1.4, sectionGap: 5.6, itemGap: 2.4, margin: 13, sidebarWidth: 70, photoSize: 40, headingStyle: 'caps', itemLayout: 'inline', icons: true, nameInSidebar: false, techIcons: true, techColorMode: 'auto' },
  personal: { fullName: 'Alex Morgan', title: 'Stagiair Software Engineer', email: 'alex.morgan@example.com', phone: '', location: 'Utrecht', birthDate: '', linkedin: '', github: 'github.com/alexmorgan-demo', website: '' },
  photo: null,
  sections: [
    { id: 'pr', type: 'profile', title: 'Over mij', visible: true, zone: 'primary', text: 'Derdejaars student met interesse in webontwikkeling.' },
    { id: 'p', type: 'projects', title: 'Projecten', visible: true, zone: 'primary', techDisplay: 'chips', techOverride: false, techShow: true, techColor: 'auto', items: [{ id: 'i1', name: 'Habit Tracker', tech: 'TypeScript, React', period: '2025', description: '- Offline web-app', github: '' }] },
    { id: 'o', type: 'education', title: 'Opleiding', visible: true, zone: 'primary', items: [] },
    { id: 'w', type: 'experience', title: 'Werkervaring', visible: true, zone: 'primary', items: [] },
    { id: 'pe', type: 'personal', title: 'Contact', visible: true, zone: 'supplementary' },
    { id: 's', type: 'skills', title: 'Vaardigheden', visible: true, zone: 'supplementary', mode: 'grouped', display: 'chips', techOverride: true, techShow: true, techColor: 'auto', iconOverrides: {},
      groups: [
        { id: 'g1', name: 'Programmeertalen', level: 0, skills: ['TypeScript', 'Python', 'C#'] },
        { id: 'g2', name: 'Communicatie', level: 0, skills: ['Luisteren', 'Presenteren'] },
        { id: 'g3', name: 'Databases', level: 0, skills: [] }
      ] },
    { id: 'l', type: 'languages', title: 'Talen', visible: true, zone: 'supplementary', display: 'text', items: [{ id: 'x', name: 'Nederlands', level: 'Moedertaal', rating: 5 }] }
  ]
};

const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'cvstudio-review-'));
fs.mkdirSync(path.join(ud, 'data'));
fs.writeFileSync(path.join(ud, 'data/cvs.json'), JSON.stringify({ version: 4, activeId: 'rev', cvs: [cv], swatches: [] }));
fs.writeFileSync(path.join(ud, 'settings.json'), JSON.stringify({ autoCheckUpdates: false }));
const app = await electron.launch({ args: [root, '--no-sandbox'], env: { ...process.env, CV_STUDIO_USER_DATA: ud, CV_STUDIO_TEST: '1' } });
const page = await app.firstWindow();
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1500, 1000));
const shot = (name, clip) => page.screenshot({ path: path.join(out, `${name}.png`), ...(clip ? { clip } : {}) });
const setWidth = async (w) => {
  await page.evaluate((x) => localStorage.setItem('cv-editor-width', String(x)), w);
  await page.reload();
  await page.waitForSelector('[data-testid="page"]');
};
const expandSkills = async () => {
  const card = page.locator('[data-testid="sec-skills"]');
  if (!(await card.locator('.card-body').count())) await card.getByTestId('sec-skills-expand').click();
  // oude versie: iconeninstellingen staan achter een uitklapper
  const acc = card.getByTestId('sec-tech-accordion');
  if (await acc.count()) { if ((await acc.getAttribute('aria-expanded')) !== 'true') await acc.click(); }
  await page.waitForTimeout(250);
  return card;
};
const box = async (loc, pad = 12) => { const b = await loc.boundingBox(); return { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: b.width + 2 * pad, height: b.height + 2 * pad }; };

await setWidth(640);
let card = await expandSkills();
await card.scrollIntoViewIfNeeded();
await page.evaluate(() => { const s = document.querySelector('.editor-scroll'); const c = document.querySelector('[data-testid="sec-skills"]'); s.scrollTop = c.offsetTop - 70; });
await page.waitForTimeout(150);
await shot('01-skills-expanded', { x: 0, y: 44, width: 660, height: 956 });

// groep met geleidelijn
const g = card.locator('[data-testid="skill-0"]');
await shot('02-category-group', await box(g, 16));

// invoer met chevron: dicht, en open
const input = card.getByTestId('skill-0-list');
await shot('03-split-input-closed', await box(input.locator('xpath=ancestor::div[contains(@class,"combo")][1]'), 14));
await card.getByTestId('skill-0-list-chevron').click();
await page.waitForTimeout(200);
await shot('04-split-input-open', { x: 0, y: 200, width: 700, height: 800 });
await page.keyboard.press('Escape');

// iconeninstellingen (gedeelte van het onderdeel)
const first = card.locator('.card-body').first();
await shot('05-icon-settings', await box(first, 4));

await page.getByTestId('tab-layout').click();
await page.waitForTimeout(200);
await shot('06-layout-tab', { x: 0, y: 44, width: 660, height: 956 });
await page.getByTestId('tab-style').click();
await page.waitForTimeout(200);
await shot('07-style-tab', { x: 0, y: 44, width: 660, height: 956 });
await page.getByTestId('tab-sections').click();

await setWidth(420);
card = await expandSkills();
await page.evaluate(() => { const s = document.querySelector('.editor-scroll'); const c = document.querySelector('[data-testid="sec-skills"]'); s.scrollTop = c.offsetTop - 70; });
await page.waitForTimeout(150);
await shot('08-narrow', { x: 0, y: 44, width: 440, height: 956 });
const over = await page.locator('.editor-scroll').evaluate((e) => ({ scroll: e.scrollWidth, client: e.clientWidth }));

await setWidth(900);
card = await expandSkills();
await page.evaluate(() => { const s = document.querySelector('.editor-scroll'); const c = document.querySelector('[data-testid="sec-skills"]'); s.scrollTop = c.offsetTop - 70; });
await page.waitForTimeout(150);
await shot('09-wide', { x: 0, y: 44, width: 920, height: 956 });
const overWide = await page.locator('.editor-scroll').evaluate((e) => ({ scroll: e.scrollWidth, client: e.clientWidth }));
console.log(JSON.stringify({ narrow: over, wide: overWide }));
await app.close();
fs.rmSync(ud, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
