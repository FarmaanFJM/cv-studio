// Maakt schermafbeeldingen van de echte, draaiende app met een fictief cv (geen echte persoon of gegevens).
// Vereist een gebouwde app (npm run build) en xvfb op Linux:   xvfb-run -a node scripts/ui-shots.mjs [uitvoermap]
import { _electron as electron } from 'playwright-core';
import { build } from 'esbuild';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.resolve(process.argv[2] ?? path.join(root, 'docs/images/3.1'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cvstudio-shots-'));
fs.mkdirSync(out, { recursive: true });

await build({ entryPoints: [path.join(root, 'scripts/docs-demo.ts')], bundle: true, format: 'esm', outfile: path.join(tmp, 'demo.mjs'), logLevel: 'silent' });
const { docsDemoCv } = await import(path.join(tmp, 'demo.mjs'));
const cv = docsDemoCv();
cv.name = 'Cv stage 2026';
const dutch = { profile: 'Over mij', projects: 'Projecten', education: 'Opleiding', experience: 'Werkervaring', skills: 'Vaardigheden', languages: 'Talen' };
for (const s of cv.sections) {
  if (dutch[s.type]) s.title = dutch[s.type];
  if (s.type === 'skills') {
    s.groups = [
      { id: 'g1', name: 'Programmeertalen', level: 0, skills: ['TypeScript', 'Python', 'C#'] },
      { id: 'g2', name: 'Communicatie', level: 0, skills: ['Luisteren', 'Presenteren'] }
    ];
  }
}
const userData = path.join(tmp, 'userdata');
fs.mkdirSync(path.join(userData, 'data'), { recursive: true });
fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify({ autoCheckUpdates: false }));
fs.writeFileSync(path.join(userData, 'data/cvs.json'), JSON.stringify({ version: 4, activeId: cv.id, cvs: [cv], swatches: [] }));

// lokale updatefeed (alleen voor de schermafbeelding van de melding; niets wordt gepubliceerd)
const feed = http.createServer((req, res) => {
  if (/latest.*\.yml$/.test(req.url.split('?')[0])) {
    res.setHeader('content-type', 'text/yaml');
    res.end(`version: 3.1.1\nfiles:\n  - url: CV-Studio-Setup-3.1.1.exe\n    sha512: ${'A'.repeat(86)}==\n    size: 1000\npath: CV-Studio-Setup-3.1.1.exe\nsha512: ${'A'.repeat(86)}==\nreleaseDate: '2026-10-21T10:00:00.000Z'\nreleaseNotes: "- Nieuwe titelbalk\\n- Vaardigheden kiezen uit een lijst"\n`);
  } else { res.statusCode = 404; res.end(); }
});
await new Promise((r) => feed.listen(0, '127.0.0.1', r));
const feedUrl = `http://127.0.0.1:${feed.address().port}`;

const app = await electron.launch({
  args: [root, '--no-sandbox'],
  env: { ...process.env, CV_STUDIO_USER_DATA: userData, CV_STUDIO_TEST: '1', CV_STUDIO_TEST_DIR: tmp, CV_STUDIO_UPDATE_FEED: feedUrl }
});
const page = await app.firstWindow();
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1500, 940));
await page.waitForSelector('[data-testid="page"]');
const shot = (name, opts = {}) => page.screenshot({ path: path.join(out, `${name}.png`), ...opts });
const open = async (type) => { const c = page.locator(`[data-testid="sec-${type}"]`); if (!(await c.locator('.card-body').count())) await c.getByTestId(`sec-${type}-expand`).click(); return c; };

// 1) hoofdweergave met ingeklapte onderdelen
await page.waitForTimeout(600);
await shot('01-editor-collapsed');
// 2) titelbalk met werkbalk, cv-keuze en menu
await shot('02-titlebar', { clip: { x: 0, y: 0, width: 1500, height: 60 } });
await page.getByTestId('version-select').click();
await page.waitForTimeout(150);
await shot('02b-cv-selector-open', { clip: { x: 0, y: 0, width: 760, height: 220 } });
await page.keyboard.press('Escape');
await page.getByTestId('cv-menu').click();
await page.waitForTimeout(150);
await shot('02c-toolbar-menu', { clip: { x: 900, y: 0, width: 600, height: 420 } });
await page.keyboard.press('Escape');
// 3) vaardigheden uitgeklapt
const skills = await open('skills');
await skills.getByTestId('skill-display').getByText('Chips').click().catch(() => {});
await skills.scrollIntoViewIfNeeded();
await page.waitForTimeout(200);
await shot('03-skills-expanded');
// 3b) iconen: één keuze per onderdeel
await skills.getByTestId('tech-mode-brand').click();
await page.waitForTimeout(150);
await shot('03b-tech-settings');
await skills.getByTestId('tech-mode-default').click();
// 4) autocomplete
const input = skills.getByTestId('skill-0-list');
await input.click();
await input.fill('Py');
await page.waitForSelector('[data-testid="skill-0-list-popup"]');
await shot('04-skill-autocomplete');
await page.keyboard.press('Escape');
await input.fill('');
// 5) catalogus via de chevron
await skills.getByTestId('skill-0-list-chevron').click();
await page.waitForSelector('[data-testid="skill-0-list-popup"]');
await shot('05-skill-catalog');
await page.keyboard.press('Escape');
// 6) categoriepresets
await skills.getByTestId('skill-1-name-chevron').click();
await page.waitForSelector('[data-testid="skill-1-name-popup"]');
await shot('06-category-presets');
await page.keyboard.press('Escape');
await skills.getByTestId('sec-skills-expand').click().catch(() => {});

// 7) slepen tussen gebieden (tijdens het slepen): Werkervaring naar Aanvullende inhoud, tussen twee onderdelen
const skillsCard = page.locator('[data-testid="sec-skills"]');
if (await skillsCard.locator('.card-body').count()) await page.getByTestId('sec-skills-expand').click();
await page.evaluate(() => document.querySelector('.editor-scroll').scrollTo(0, 0));
const handle = page.locator('[data-testid="sec-experience"] [data-handle]');
const target = page.locator('[data-testid="sec-skills"]');
const hb = await handle.boundingBox();
const tb = await target.boundingBox();
await page.mouse.move(hb.x + 8, hb.y + 8);
await page.mouse.down();
await page.mouse.move(hb.x + 20, hb.y + 40, { steps: 4 });
await page.mouse.move(tb.x + 120, tb.y + 8, { steps: 12 });
await page.waitForTimeout(300);
await shot('07-dragging');
await page.mouse.up();

// 8) menu Verplaatsen naar
await page.getByTestId('sec-education-menu').click();
await page.waitForTimeout(150);
await shot('08-move-menu');
await page.keyboard.press('Escape');

// 9) update-instellingen en melding
await page.getByTestId('cv-menu').click();
await page.getByTestId('about-open').click();
await page.getByTestId('upd-check').click();
await page.waitForFunction(() => /beschikbaar/.test(document.querySelector('[data-testid="upd-result"]')?.textContent ?? ''));
await shot('09-about-updates');
await page.getByTestId('about-close').click();
await page.waitForSelector('[data-testid="update-banner"]');
await page.getByTestId('update-notes-toggle').click();
await shot('10-update-banner');

// 10b) tabbladen Layout en Stijl
await page.getByTestId('update-later').click();
await page.getByTestId('tab-layout').click();
await page.waitForTimeout(150);
await shot('12-layout-tab');
await page.getByTestId('tab-style').click();
await page.waitForTimeout(150);
await shot('13-style-tab');
await page.getByTestId('tab-sections').click();

// 11) smalle editor
await page.mouse.move(0, 0);
const split = await page.getByTestId('splitter').boundingBox();
await page.mouse.move(split.x + 2, split.y + 300);
await page.mouse.down(); await page.mouse.move(430, split.y + 300, { steps: 6 }); await page.mouse.up();
await page.waitForTimeout(250);
const sk = await open('skills');
await sk.scrollIntoViewIfNeeded();
await shot('11-narrow-editor');

await app.close();
feed.close();
console.log('schermafbeeldingen in', out);
