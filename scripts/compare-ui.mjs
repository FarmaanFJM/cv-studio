// Vergelijkt de editor van twee builds (bijv. 3.0.1 en de huidige) met dezelfde fictieve gegevens:
// telt de omkaderde "containers" in het uitgeklapte onderdeel Vaardigheden en maakt een schermafbeelding van de editorkolom.
//   xvfb-run -a node scripts/compare-ui.mjs <map-oude-build> <map-nieuwe-build> <uitvoermap>
import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [oldRoot, newRoot, out] = process.argv.slice(2).map((p) => path.resolve(p));
fs.mkdirSync(out, { recursive: true });

const cv = {
  id: 'cmp', name: 'Vergelijking', createdAt: 1, updatedAt: 1, template: 'sidebar',
  style: { accent: '#1f4e79', sidebarBg: '#1f4e79', font: 'inter', fontSize: 9.5, lineHeight: 1.4, sectionGap: 5.6, itemGap: 2.4, margin: 13, sidebarWidth: 70, photoSize: 40, headingStyle: 'caps', itemLayout: 'inline', icons: true, nameInSidebar: false, techIcons: true, techColorMode: 'auto' },
  personal: { fullName: 'Voorbeeld Persoon', title: 'Stagiair', email: 'voorbeeld@example.com', phone: '', location: '', birthDate: '', linkedin: '', github: '', website: '' },
  photo: null,
  sections: [
    { id: 'o', type: 'education', title: 'Opleiding', visible: true, zone: 'primary', items: [] },
    { id: 'p', type: 'projects', title: 'Projecten', visible: true, zone: 'primary', techDisplay: 'text', techOverride: false, techShow: true, techColor: 'auto', items: [] },
    { id: 'w', type: 'experience', title: 'Werkervaring', visible: true, zone: 'primary', items: [] },
    { id: 'pe', type: 'personal', title: 'Contact', visible: true, zone: 'supplementary' },
    { id: 's', type: 'skills', title: 'Vaardigheden', visible: true, zone: 'supplementary', mode: 'grouped', display: 'chips', techOverride: true, techShow: true, techColor: 'auto', iconOverrides: {}, groups: [{ id: 'g', name: 'Talen', level: 0, skills: ['TypeScript'] }] },
    { id: 'l', type: 'languages', title: 'Talen', visible: true, zone: 'supplementary', display: 'text', items: [] },
    { id: 'pr', type: 'profile', title: 'Profiel', visible: true, zone: 'supplementary', text: '' }
  ]
};

async function run(root, label) {
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'cvstudio-cmp-'));
  fs.mkdirSync(path.join(ud, 'data'));
  fs.writeFileSync(path.join(ud, 'data/cvs.json'), JSON.stringify({ version: 4, activeId: 'cmp', cvs: [cv], swatches: [] }));
  const app = await electron.launch({ args: [root, '--no-sandbox'], env: { ...process.env, CV_STUDIO_USER_DATA: ud, CV_STUDIO_TEST: '1' } });
  const page = await app.firstWindow();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1500, 1100));
  await page.waitForSelector('[data-testid="page"]');
  await page.evaluate(() => localStorage.setItem('cv-editor-width', '722'));
  await page.reload();
  await page.waitForSelector('[data-testid="page"]');
  const card = page.locator('[data-testid="sec-skills"]');
  await card.getByTestId('sec-skills-expand').click();
  const acc = card.getByTestId('sec-tech-accordion');
  if (await acc.count()) { if ((await acc.getAttribute('aria-expanded')) !== 'true') await acc.click(); }
  const grp = card.locator('[data-testid="skill-0"] .item-toggle');
  if (await grp.count()) await grp.click(); // oude versie: groepskaart uitklappen zoals in de schermafbeelding
  await page.waitForTimeout(300);
  const stats = await card.evaluate((root) => {
    const boxes = [root, ...root.querySelectorAll('div, section, fieldset')].filter((e) => {
      const c = getComputedStyle(e);
      return ['Top', 'Right', 'Bottom', 'Left'].some((s) => parseFloat(c[`border${s}Width`]) > 0 && c[`border${s}Style`] !== 'none' && c[`border${s}Color`] !== 'rgba(0, 0, 0, 0)');
    });
    const depth = (e) => { let d = 0; for (let n = e; n && n !== root.parentElement; n = n.parentElement) if (boxes.includes(n)) d++; return d; };
    const tinted = [...root.querySelectorAll('div, section')].filter((e) => e !== root && getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)' && !e.matches('.card-head, .pill-wrap, .btn, .seg, .toggle, .track, .badge, .usage, .tt')).length;
    const inputs = root.querySelectorAll('input.input, textarea.input, .combo-input').length;
    const lime = [...root.querySelectorAll('*')].filter((e) => { const c = getComputedStyle(e); return /rgb\(183, 247, 54\)/.test(c.backgroundColor) || /rgb\(183, 247, 54\)/.test(c.borderTopColor) && parseFloat(c.borderTopWidth) > 0; }).length;
    return { borderedContainers: boxes.length, maxNesting: Math.max(0, ...boxes.map(depth)), inputsWithBorder: inputs, tintedPanels: tinted, limeElements: lime, height: Math.round(root.getBoundingClientRect().height) };
  });
  const limeBtns = await page.locator('.editor-scroll').evaluate((e) => [...e.querySelectorAll('*')].filter((x) => getComputedStyle(x).backgroundColor === 'rgb(183, 247, 54)').length);
  const handle = card.getByTestId('sec-skills-expand');
  await handle.scrollIntoViewIfNeeded();
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(out, `${label}.png`), clip: { x: 0, y: 44 * (label === 'nieuw' ? 1 : 0), width: 722, height: 1000 - 44 * (label === 'nieuw' ? 1 : 0) } });
  await app.close();
  fs.rmSync(ud, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
  return { ...stats, limeBackgroundsInEditor: limeBtns };
}

const before = await run(oldRoot, 'oud');
const after = await run(newRoot, 'nieuw');
console.log(JSON.stringify({ '3.0.1': before, '3.1.0': after }, null, 2));
fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify({ '3.0.1': before, '3.1.0': after }, null, 2));
