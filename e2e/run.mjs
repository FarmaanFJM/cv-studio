// End-to-end tests van de echte Electron-app (draai: npm run test:e2e). Gebruikt Playwright's Electron-ondersteuning.
import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'e2e/out');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cvstudio-ud-'));

// --- testfoto (PNG 600x400, kleurverloop) zonder extra dependencies ---
function makePng(w, h, file) {
  const crc = (buf) => { let c, crc = ~0; for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return ~crc >>> 0; };
  const chunk = (type, data) => { const t = Buffer.from(type); const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([l, t, data, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = (x * 255) / w; raw[o + 1] = (y * 255) / h; raw[o + 2] = 160; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
const photoFile = path.join(out, 'foto.png');
makePng(600, 400, photoFile);

async function launch(extraEnv = {}) {
  // CV_STUDIO_EXE: test de gebouwde Windows-app (release/win-unpacked/CV Studio.exe) i.p.v. de broncode
  const exe = process.env.CV_STUDIO_EXE;
  const app = await electron.launch({
    ...(exe ? { executablePath: exe } : {}),
    args: exe ? ['--no-sandbox'] : [root, '--no-sandbox'],
    env: { ...process.env, CV_STUDIO_USER_DATA: userData, CV_STUDIO_TEST: '1', CV_STUDIO_TEST_DIR: out, ...extraEnv }
  });
  const page = await app.firstWindow();
  const requests = [];
  page.on('request', (r) => { if (!/^(file|data|blob|devtools):/.test(r.url())) requests.push(r.url()); });
  page.on('dialog', (d) => d.accept());
  await page.setViewportSize({ width: 1400, height: 900 });
  await page.waitForSelector('[data-testid="page"]');
  app.requests = requests;
  return { app, page };
}
async function saved(page) {
  await page.waitForFunction(() => document.querySelector('[data-testid="save-status"]')?.textContent === 'Alles opgeslagen');
}
const secs = (page) => page.$$eval('.cv-page [data-sec]', (els) => els.map((e) => e.dataset.title));
const open = async (page, type) => {
  const card = page.locator(`[data-testid="sec-${type}"]`);
  if (!(await card.locator('.card-body').count())) await card.locator('.card-head').click();
  return card;
};

const results = [];
async function scenario(name, fn) {
  try { await fn(); results.push([true, name]); console.log('  ✓', name); }
  catch (e) { results.push([false, name, e]); console.log('  ✗', name, '\n    ', e.message.split('\n').slice(0, 6).join('\n     ')); }
}
const assert = (c, m) => { if (!c) throw new Error(m); };

console.log('CV Studio e2e');
let { app, page } = await launch();

await scenario('1. Nieuw cv invullen, sluiten en opnieuw openen', async () => {
  const personal = await open(page, 'personal');
  await personal.getByTestId('p-fullName').fill('Test Gebruiker');
  await personal.getByTestId('p-title').fill('Stagiair Software Engineer');
  await personal.getByTestId('p-email').fill('test@example.com');
  await personal.getByTestId('p-github').fill('github.com/testgebruiker');
  const profile = await open(page, 'profile');
  await profile.getByTestId('profile-text').fill('Derdejaars student met interesse in webontwikkeling.');
  await saved(page);
  await app.close();
  ({ app, page } = await launch());
  const text = await page.locator('.cv-page').innerText();
  assert(text.includes('Test Gebruiker') && text.includes('Stagiair Software Engineer') && text.includes('test@example.com') && text.includes('Derdejaars student'), 'gegevens niet hersteld: ' + text.slice(0, 200));
});

await scenario('2. Foto uploaden, bijsnijden en bewaren (ook na herstart)', async () => {
  const personal = await open(page, 'personal');
  await personal.getByTestId('photo-input').setInputFiles(photoFile);
  await page.waitForSelector('.cv-page .photo img');
  await personal.getByTestId('photo-zoom').fill('2');
  await personal.getByTestId('shape-square').click();
  const box = await personal.getByTestId('crop-view').boundingBox();
  await page.mouse.move(box.x + 85, box.y + 85);
  await page.mouse.down(); await page.mouse.move(box.x + 40, box.y + 85, { steps: 5 }); await page.mouse.up();
  await saved(page);
  const before = await page.locator('.cv-page .photo').first().evaluate((e) => ({ r: getComputedStyle(e).borderRadius, l: e.querySelector('img').style.left, w: e.querySelector('img').style.width }));
  assert(before.r === '0px', 'foto niet vierkant: ' + before.r);
  await page.screenshot({ path: path.join(out, 'foto-editor.png') });
  await app.close();
  ({ app, page } = await launch());
  const after = await page.locator('.cv-page .photo').first().evaluate((e) => ({ l: e.querySelector('img').style.left, w: e.querySelector('img').style.width, src: e.querySelector('img').src.slice(0, 22) }));
  assert(after.l === before.l && after.w === before.w, `crop niet bewaard ${JSON.stringify(before)} vs ${JSON.stringify(after)}`);
  assert(after.src.startsWith('data:image/jpeg'), 'foto niet lokaal opgeslagen');
  assert(before.l !== '-50%' && after.w === '300%' || after.w !== '100%', 'zoom niet toegepast');
});

await scenario('3. Project toevoegen en verwijderen', async () => {
  const proj = await open(page, 'projects');
  await proj.getByTestId('proj-add').click();
  await proj.getByTestId('proj-0-name').fill('Weer-app');
  await proj.getByTestId('proj-0-desc').fill('- Gebouwd met React\n- Gebruikt een publieke API');
  assert((await page.locator('.cv-page').innerText()).includes('Weer-app'), 'project niet in preview');
  assert((await page.locator('.cv-page .sec-projects li').count()) === 2, 'opsommingstekens ontbreken');
  await proj.getByTestId('proj-0-remove').click();
  assert(!(await page.locator('.cv-page').innerText()).includes('Weer-app'), 'project niet verwijderd');
  assert((await page.locator('.cv-page .sec-projects').count()) === 0, 'lege projectenkop blijft staan');
});

await scenario('4. Onderdelen verbergen en weer tonen', async () => {
  const proj = await open(page, 'projects');
  await proj.getByTestId('proj-add').click();
  await proj.getByTestId('proj-0-name').fill('Zichtbaar project');
  assert((await secs(page)).includes('Projecten'), 'project-sectie ontbreekt');
  await page.getByTestId('sec-projects-toggle').click();
  assert(!(await secs(page)).includes('Projecten'), 'sectie niet verborgen');
  await page.getByTestId('sec-projects-toggle').click();
  assert((await secs(page)).includes('Projecten'), 'sectie niet teruggekomen');
  assert((await page.locator('.cv-page').innerText()).includes('Zichtbaar project'), 'inhoud na tonen verdwenen');
});

await scenario('5. Opleiding toevoegen (voorbereiding volgorde-test)', async () => {
  const edu = await open(page, 'education');
  await edu.getByTestId('edu-add').click();
  await edu.getByTestId('edu-0-degree').fill('HBO Informatica');
});

await scenario('5b. Volgorde wijzigen met pijlen', async () => {
  const order1 = await secs(page);
  assert(order1.indexOf('Projecten') < order1.indexOf('Opleiding'), 'standaard: projecten vóór opleiding verwacht: ' + order1);
  await page.getByTestId('sec-education-up').click();
  const order2 = await secs(page);
  assert(order2.indexOf('Opleiding') < order2.indexOf('Projecten'), 'volgorde niet gewijzigd: ' + order2);
});

await scenario('6. Wisselen tussen templates zonder gegevensverlies', async () => {
  await page.getByTestId('tab-layout').click();
  const snapshot = async () => (await page.locator('.cv-page').innerText()).replace(/\s+/g, ' ');
  await page.getByTestId('tpl-sidebar').click();
  const a = await snapshot();
  assert(await page.locator('.t-sidebar').count() === 1, 'zijbalk niet actief');
  await page.screenshot({ path: path.join(out, 'template-sidebar.png') });
  await page.getByTestId('tpl-minimal').click();
  assert(await page.locator('.t-minimal').count() === 1, 'minimal niet actief');
  await page.screenshot({ path: path.join(out, 'template-minimal.png') });
  const b = await snapshot();
  for (const needle of ['Test Gebruiker', 'Zichtbaar project', 'HBO Informatica', 'Derdejaars student']) {
    assert(a.includes(needle) && b.includes(needle), `${needle} ontbreekt na wisselen`);
  }
  await page.getByTestId('tpl-sidebar').click();
  await page.getByTestId('tab-sections').click();
});

await scenario('7. Cv dupliceren en apart bewerken', async () => {
  await page.getByTestId('cv-duplicate').click();
  await page.getByTestId('prompt-input').fill('ING');
  await page.getByTestId('prompt-ok').click();
  const names = await page.$$eval('[data-testid="version-select"] option', (o) => o.map((x) => x.textContent));
  assert(names.length === 2 && names.includes('ING'), 'kopie ontbreekt: ' + names);
  const personal = await open(page, 'personal');
  await personal.getByTestId('p-title').fill('Stagiair bij ING');
  assert((await page.locator('.cv-page').innerText()).includes('Stagiair bij ING'), 'wijziging niet in kopie');
  await saved(page);
  await page.getByTestId('version-select').selectOption({ label: 'Mijn cv' });
  const t = await page.locator('.cv-page').innerText();
  assert(t.includes('Stagiair Software Engineer') && !t.includes('Stagiair bij ING'), 'origineel is overschreven');
});

await scenario('8. PDF exporteren: precies één A4-pagina met selecteerbare tekst', async () => {
  await page.screenshot({ path: path.join(out, 'app-hoofdvenster.png') });
  await page.getByTestId('export-pdf').click();
  await page.waitForSelector('[data-testid="toast"]');
  const toast = await page.getByTestId('toast').innerText();
  assert(toast.includes('1 pagina'), 'toast: ' + toast);
  const file = path.join(out, 'Test Gebruiker.pdf');
  assert(fs.existsSync(file), 'pdf ontbreekt');
  const bytes = fs.readFileSync(file);
  const doc = await PDFDocument.load(bytes);
  assert(doc.getPageCount() === 1, 'aantal pagina\'s ' + doc.getPageCount());
  const { width, height } = doc.getPage(0).getSize();
  assert(Math.abs(width - 595.28) < 1.5 && Math.abs(height - 841.89) < 1.5, `geen A4: ${width}x${height}`);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  const tc = await (await pdf.getPage(1)).getTextContent();
  const text = tc.items.map((i) => i.str).join(' ');
  for (const n of ['Test Gebruiker', 'Zichtbaar project', 'HBO Informatica', 'test@example.com']) assert(text.includes(n), `tekst niet selecteerbaar: ${n}`);
  fs.copyFileSync(file, path.join(out, 'export-sidebar.pdf'));
});

await scenario('8b. PDF in Minimal-template ook één pagina', async () => {
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('tpl-minimal').click();
  await page.getByTestId('export-pdf').click();
  await page.waitForFunction(() => /1 pagina/.test(document.querySelector('[data-testid="toast"]')?.textContent || ''));
  const doc = await PDFDocument.load(fs.readFileSync(path.join(out, 'Test Gebruiker.pdf')));
  assert(doc.getPageCount() === 1, 'minimal niet 1 pagina');
  fs.copyFileSync(path.join(out, 'Test Gebruiker.pdf'), path.join(out, 'export-minimal.pdf'));
  await page.getByTestId('tab-sections').click();
});

await scenario('9. Te veel tekst: duidelijke melding, export geblokkeerd, niets verborgen', async () => {
  await page.getByTestId('version-select').selectOption({ label: 'ING' });
  const exp = await open(page, 'experience');
  for (let i = 0; i < 4; i++) {
    await exp.getByTestId('exp-add').click();
    await exp.getByTestId(`exp-${i}-role`).fill(`Functie ${i}`);
    await exp.getByTestId(`exp-${i}-desc`).fill(Array.from({ length: 12 }, (_, k) => `- Taak nummer ${k} met een redelijk lange omschrijving die netjes afbreekt over meerdere regels in de kolom`).join('\n'));
  }
  await page.waitForSelector('[data-testid="overflow-banner"]');
  const banner = await page.getByTestId('overflow-banner').innerText();
  assert(/mm te lang/.test(banner) && /Werkervaring/.test(banner), 'banner: ' + banner);
  assert(await page.getByTestId('export-pdf').isDisabled(), 'export niet geblokkeerd');
  assert((await page.getByTestId('fit-badge').innerText()).includes('Past niet'), 'badge');
  assert(await page.locator('.cv-page .is-over').count() > 0, 'overschrijdend onderdeel niet gemarkeerd');
  assert((await page.locator('[data-testid="sec-experience"] .usage.bad').count()) === 1, 'geen ruimtebadge');
  // alle tekst staat nog in de DOM (niets afgekapt/verborgen)
  assert((await page.locator('.cv-page .sec-experience li').count()) === 48, 'inhoud ontbreekt');
  // ook direct via API weigert de main-process de export
  const r = await page.evaluate((cv) => window.cvApi.exportPdf(cv), await currentCv(page));
  assert(r.ok === false && /past niet op één A4/.test(r.error), 'main weigert niet: ' + JSON.stringify(r));
  await page.screenshot({ path: path.join(out, 'overflow.png') });
  // inkorten maakt export weer mogelijk
  await page.getByTestId('sec-experience-toggle').click();
  await page.waitForFunction(() => !document.querySelector('[data-testid="overflow-banner"]'));
  assert(!(await page.getByTestId('export-pdf').isDisabled()), 'export blijft geblokkeerd');
});

async function currentCv(page) {
  const file = path.join(userData, 'data/cvs.json');
  await saved(page);
  const st = JSON.parse(fs.readFileSync(file, 'utf8'));
  return st.cvs.find((c) => c.id === st.activeId);
}

await scenario('10. JSON export/import en robuustheid bij ongeldige bestanden', async () => {
  await page.getByTestId('json-export').click();
  await page.waitForSelector('[data-testid="toast"]');
  assert(fs.existsSync(path.join(out, 'ING.json')), 'json-export ontbreekt');
  await app.close();
  fs.writeFileSync(path.join(out, 'kapot.json'), '{ dit is geen json');
  ({ app, page } = await launch({ CV_STUDIO_TEST_IMPORT: path.join(out, 'kapot.json') }));
  await page.getByTestId('json-import').click();
  await page.waitForSelector('[data-testid="toast"].error');
  await app.close();
  fs.writeFileSync(path.join(out, 'raar.json'), JSON.stringify({ cv: { name: 'Raar', template: 'x', style: { fontSize: 999, accent: 'rood' }, sections: [{ type: 'projects', items: 'nee' }, 5, null], photo: { src: 'javascript:alert(1)' } } }));
  ({ app, page } = await launch({ CV_STUDIO_TEST_IMPORT: path.join(out, 'raar.json') }));
  await page.getByTestId('json-import').click();
  await page.waitForFunction(() => [...document.querySelectorAll('[data-testid="version-select"] option')].some((o) => /Raar/.test(o.textContent)));
  assert(await page.locator('.cv-page').count() === 1, 'app crasht op vreemde import');
  await app.close();
  ({ app, page } = await launch({ CV_STUDIO_TEST_IMPORT: path.join(out, 'ING.json') }));
  await page.getByTestId('json-import').click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="version-select"] option').length >= 4);
  const t = await page.locator('.cv-page').innerText();
  assert(t.includes('Test Gebruiker'), 'import mist data');
});

await scenario('11. Corrupt opslagbestand laat de app niet crashen', async () => {
  await app.close();
  fs.writeFileSync(path.join(userData, 'data/cvs.json'), '\u0000\u0000{{{');
  ({ app, page } = await launch());
  assert(await page.locator('.cv-page').count() === 1, 'app start niet');
  assert(fs.readdirSync(path.join(userData, 'data')).some((f) => f.startsWith('cvs.corrupt-')), 'geen backup van corrupt bestand');
});

await scenario('12. Werkt offline: geen netwerkverkeer', async () => {
  assert(app.requests.length === 0, 'netwerkverzoeken: ' + app.requests.join(', '));
  const sec = await page.evaluate(() => ({ node: typeof require, proc: typeof process, api: Object.keys(window.cvApi).sort().join(',') }));
  assert(sec.node === 'undefined' && sec.proc === 'undefined', 'node-integratie in renderer actief');
});

await scenario('13. Gevuld (fictief) voorbeeld exporteert in alle templates naar één pagina', async () => {
  await build({ entryPoints: [path.join(root, 'tests/fixtures.ts')], bundle: true, format: 'esm', outfile: path.join(out, 'fixtures.mjs'), logLevel: 'silent' });
  const { demoCv } = await import(path.join(out, 'fixtures.mjs'));
  const cv = demoCv();
  const png = fs.readFileSync(photoFile).toString('base64');
  cv.photo = { src: 'data:image/png;base64,' + png, aspect: 1.5, zoom: 1.2, offsetX: 0, offsetY: 0, shape: 'round', visible: true };
  fs.writeFileSync(path.join(out, 'demo.json'), JSON.stringify(cv));
  await app.close();
  ({ app, page } = await launch({ CV_STUDIO_TEST_IMPORT: path.join(out, 'demo.json') }));
  await page.getByTestId('json-import').click();
  await page.waitForFunction(() => /geïmporteerd/.test(document.querySelector('[data-testid="version-select"]').selectedOptions[0].textContent));
  for (const [tpl, label] of [['sidebar', 'sidebar'], ['header', 'header'], ['minimal', 'minimal']]) {
    await page.getByTestId('tab-layout').click();
    await page.getByTestId(`tpl-${tpl}`).click();
    await page.getByTestId('tab-sections').click();
    assert(!(await page.getByTestId('export-pdf').isDisabled()), 'export geblokkeerd bij demo');
    await page.screenshot({ path: path.join(out, `demo-${label}.png`) });
    await page.getByTestId('export-pdf').click();
    await page.waitForFunction(() => /1 pagina/.test(document.querySelector('[data-testid="toast"]')?.textContent || ''));
    fs.copyFileSync(path.join(out, 'Voorbeeld Persoon.pdf'), path.join(out, `demo-${label}.pdf`));
    const doc = await PDFDocument.load(fs.readFileSync(path.join(out, `demo-${label}.pdf`)));
    assert(doc.getPageCount() === 1, `${label}: ${doc.getPageCount()} pagina's`);
    await page.evaluate(() => { document.querySelector('[data-testid="toast"]')?.click(); });
  }
});


await scenario('14. Zones: onderdeel naar hoofd/aanvullend/verborgen, ook met slepen', async () => {
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('tpl-sidebar').click();
  await page.getByTestId('tab-sections').click();
  const inSide = (t) => page.locator(`.col-side [data-title="${t}"]`).count();
  const inMain = (t) => page.locator(`.col-main [data-title="${t}"]`).count();
  assert(await inMain('Profiel') === 1 && await inSide('Profiel') === 0, 'profiel start in hoofd');
  assert(await page.getByTestId('zone-primary').locator('.zone-title').innerText().then((t) => /Hoofdinhoud/i.test(t)), 'label Hoofdinhoud');
  assert(await page.getByTestId('zone-supplementary').locator('.zone-title').innerText().then((t) => /Aanvullende inhoud/i.test(t)), 'label Aanvullende inhoud');
  assert(!/Zijbalk|Linker|Hoofdgedeelte/.test(await page.getByTestId('section-list').innerText()), 'oude positiegebonden labels zichtbaar');
  await page.getByTestId('sec-profile-zone-supplementary').click();
  assert(await inSide('Profiel') === 1 && await inMain('Profiel') === 0, 'profiel niet naar aanvullende inhoud');
  await page.waitForSelector('.cv-page [data-title="Profiel"].flash', { timeout: 2000 });
  await page.screenshot({ path: path.join(out, 'flash-bestemming.png') });
  await page.waitForFunction(() => !document.querySelector('.cv-page .flash'), null, { timeout: 4000 });
  assert(await page.locator('[data-testid="zone-supplementary"] [data-testid="sec-profile"]').count() === 1, 'editor toont zone niet');
  await page.getByTestId('sec-profile-zone-primary').click();
  assert(await inMain('Profiel') === 1, 'profiel niet terug');
  await page.getByTestId('sec-languages-toggle').click();
  assert(await page.locator('[data-testid="zone-hidden"] [data-testid="sec-languages"]').count() === 1, 'niet in verborgen');
  await page.getByTestId('sec-languages-toggle').click();
  // slepen van zijbalk naar hoofd
  await page.getByTestId('sec-skills').locator('.handle').dragTo(page.getByTestId('zone-primary'));
  assert(await inMain('Vaardigheden') === 1 || await page.locator('[data-testid="zone-primary"] [data-testid="sec-skills"]').count() === 1, 'slepen naar hoofd werkt niet');
  await page.getByTestId('sec-skills-zone-supplementary').click();
});

await scenario('15. Vaardigheden: lijst, groepen en niveaus (chips, stippen)', async () => {
  const sk = await open(page, 'skills');
  await sk.getByTestId('skill-mode-levels').click();
  assert(await sk.getByTestId('skill-0').count() === 1, 'groepen ontbreken');
  await sk.getByTestId('skill-0').locator('.item-head').click();
  await sk.getByTestId('skill-0-level').fill('4');
  await sk.getByTestId('skill-display-chips').click();
  assert(await page.locator('.cv-page .chip').count() >= 2, 'chips ontbreken');
  await page.screenshot({ path: path.join(out, 'debug-skills.png') });
  assert(await page.locator('.cv-page .skill-name .dots').count() >= 1, 'stippen ontbreken: ' + await page.locator('.cv-page .sec-skills').innerHTML());
  await sk.getByTestId('skill-mode-flat').click();
  assert((await page.locator('.cv-page .sec-skills').innerText()).includes('Python'), 'platte lijst mist skill');
  await sk.getByTestId('skill-mode-grouped').click();
  await sk.getByTestId('skill-display-text').click();
});

await scenario('16. Extra zijbalk-onderdelen (Interesses, Links) toevoegen', async () => {
  await page.getByTestId('add-section').click();
  await page.getByTestId('add-interests').click();
  const card = page.locator('[data-testid="zone-supplementary"] [data-testid="sec-custom"]').last();
  await card.getByTestId('custom-add').click();
  await card.getByTestId('custom-0-text').fill('Wandelen');
  assert(await page.locator('.col-side [data-title="Interesses"]').count() === 1, 'interesses niet in zijbalk');
  await page.getByTestId('add-section').click();
  await page.getByTestId('add-links').click();
  const links = page.locator('[data-testid="zone-supplementary"] [data-testid="sec-custom"]').last();
  await links.getByTestId('custom-add').click();
  await links.getByTestId('custom-0-text').fill('Portfolio');
  assert(await page.locator('.col-side [data-title="Links"]').count() === 1, 'links niet in zijbalk');
});

await scenario('17. Stijl: lettertype zoeken, numerieke invoer, kleuren met hex', async () => {
  await page.getByTestId('tab-style').click();
  await page.getByTestId('font-select').click();
  await page.getByTestId('font-search').fill('mont');
  assert(await page.locator('.font-list button').count() === 1, 'zoeken filtert niet');
  await page.getByTestId('font-montserrat').click();
  const fam = await page.locator('.cv-page').evaluate((e) => getComputedStyle(e).fontFamily);
  assert(/Montserrat/.test(fam), 'font niet toegepast: ' + fam);
  assert(await page.evaluate(() => document.fonts.check("12px 'Montserrat'")), 'Montserrat niet gebundeld');
  const fs = page.getByTestId('fontsize');
  await fs.fill('11');
  const px = () => page.locator('.cv-page').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  assert(Math.abs(await px() - 11 * 96 / 72) < 0.01, 'lettergrootte typen');
  await page.getByTestId('fontsize-plus').click();
  assert(Math.abs(await px() - 11.5 * 96 / 72) < 0.01, 'plusknop');
  await fs.fill('5');
  await fs.blur();
  assert((await fs.inputValue()) === '11.5', 'te kleine lettergrootte werd geaccepteerd: ' + await fs.inputValue());
  const minus = page.getByTestId('fontsize-minus');
  while (!(await minus.isDisabled())) await minus.click();
  assert(Math.abs(await px() - 8 * 96 / 72) < 0.01, 'minimum 8pt niet gehandhaafd');
  await page.getByTestId('fontsize').fill('9.5');
  // kleuren
  await page.getByTestId('color-sidebar').click();
  await page.getByTestId('color-sidebar-hex').fill('#336699');
  assert((await page.locator('.cv-page .side').evaluate((e) => getComputedStyle(e).backgroundColor)) === 'rgb(51, 102, 153)', 'zijbalkkleur niet toegepast');
  await page.getByTestId('color-sidebar-save').click();
  assert(await page.getByTestId('saved-swatches').count() === 1, 'kleur niet opgeslagen');
  await page.getByTestId('color-sidebar').click();
  await page.getByTestId('color-text').click();
  await page.getByTestId('color-text-hex').fill('#eeeeee');
  assert(await page.getByText('Te laag contrast').count() === 1, 'laag contrast niet gemeld');
  assert((await page.locator('.cv-page').evaluate((e) => getComputedStyle(e).color)) !== 'rgb(238, 238, 238)', 'onveilige tekstkleur toegepast');
  await page.getByTestId('color-text-hex').fill('#222222');
  assert((await page.locator('.cv-page').evaluate((e) => getComputedStyle(e).color)) === 'rgb(34, 34, 34)', 'veilige tekstkleur niet toegepast');
  await page.getByTestId('color-text').click();
  await page.getByTestId('color-sv').click({ position: { x: 20, y: 20 } }).catch(() => {});
  await page.screenshot({ path: path.join(out, 'stijl-tab.png') });
});

await scenario('18. Kopbalk-sjabloon met iconen; iconen uit; één pagina', async () => {
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('tpl-header').click();
  assert(await page.locator('.t-header .band').count() === 1, 'kopbalk ontbreekt');
  assert(await page.locator('.t-header .band .ic').count() >= 3, 'iconen ontbreken');
  assert(await page.locator('.t-header .band svg.ic path').evaluateAll((p) => p.some((x) => (x.getAttribute('d') || '').startsWith('M20.447'))), 'LinkedIn-icoon ontbreekt');
  await page.locator('label.toggle', { hasText: 'Contacticonen' }).click();
  assert(await page.locator('.t-header .band .ic').count() === 0, 'iconen blijven staan');
  await page.locator('label.toggle', { hasText: 'Contacticonen' }).click();
  await page.getByTestId('item-layout-dates-left').click();
  assert(await page.locator('.il-dates-left').count() === 1, 'datums-links niet actief');
  await page.getByTestId('item-layout-inline').click();
  await page.screenshot({ path: path.join(out, 'layout-tab.png') });
});

await scenario('19. Splitter: editorbreedte aanpasbaar', async () => {
  const w0 = (await page.locator('.editor').boundingBox()).width;
  const sp = await page.getByTestId('splitter').boundingBox();
  await page.mouse.move(sp.x + 3, sp.y + 200);
  await page.mouse.down(); await page.mouse.move(sp.x + 103, sp.y + 200, { steps: 5 }); await page.mouse.up();
  const w1 = (await page.locator('.editor').boundingBox()).width;
  assert(w1 > w0 + 60, `breedte ${w0} -> ${w1}`);
});

await scenario('20. Migratie van v1-opslag (oude cv\'s blijven werken)', async () => {
  await app.close();
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'cvstudio-v1-'));
  fs.mkdirSync(path.join(ud, 'data'));
  const v1 = { version: 1, activeId: 'a1', cvs: [{ id: 'a1', name: 'Oud cv', template: 'sidebar', style: { accent: '#0f766e', font: 'lato', fontSize: 10, spacing: 'compact' },
    personal: { fullName: 'Oude Gebruiker', title: 'Titel', email: 'oud@example.com', phone: '', location: '', linkedin: '', github: '', website: '' }, photo: null,
    sections: [{ id: 's1', type: 'personal', title: 'Contact', visible: true }, { id: 's2', type: 'skills', title: 'Vaardigheden', visible: true, groups: [{ id: 'g', name: 'Tools', skills: ['Git'] }] },
      { id: 's3', type: 'profile', title: 'Profiel', visible: true, text: 'Oud profiel' }, { id: 's4', type: 'experience', title: 'Werkervaring', visible: false, items: [] }] }] };
  fs.writeFileSync(path.join(ud, 'data/cvs.json'), JSON.stringify(v1));
  ({ app, page } = await launch({ CV_STUDIO_USER_DATA: ud }));
  const t = await page.locator('.cv-page').innerText();
  assert(t.includes('Oude Gebruiker') && t.includes('Oud profiel') && t.includes('Git') && t.includes('oud@example.com'), 'oude gegevens ontbreken: ' + t);
  assert(await page.locator('.col-side [data-title="Vaardigheden"]').count() === 1, 'skills niet in zijbalk');
  assert(await page.locator('.col-main [data-title="Profiel"]').count() === 1, 'profiel niet in hoofd');
  const bg = await page.locator('.cv-page .side').evaluate((e) => getComputedStyle(e).backgroundColor);
  assert(bg === 'rgb(15, 118, 110)', 'oude accentkleur niet naar zijbalk: ' + bg);
  fs.rmSync(ud, { recursive: true, force: true });
});


await scenario('21. Zijbalk-variant: naam in zijbalk, datums links, titel+lijn, chips, thema', async () => {
  await app.close();
  ({ app, page } = await launch({ CV_STUDIO_TEST_IMPORT: path.join(out, 'demo.json') }));
  await page.getByTestId('json-import').click();
  await page.waitForFunction(() => /geïmporteerd/.test(document.querySelector('[data-testid="version-select"]').selectedOptions[0].textContent));
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('tpl-sidebar').click();
  await page.locator('label.toggle', { hasText: 'Naam bij foto' }).click();
  await page.getByTestId('item-layout-dates-left').click();
  await page.getByTestId('tab-style').click();
  await page.getByTestId('theme-oranje').click();
  await page.getByTestId('heading-style-title').click();
  assert(await page.locator('.col-side .head').count() === 1 && await page.locator('.col-main .head').count() === 0, 'naam niet in zijbalk');
  await page.screenshot({ path: path.join(out, 'variant-sidebar.png') });
  await page.getByTestId('export-pdf').click();
  await page.waitForFunction(() => /1 pagina/.test(document.querySelector('[data-testid="toast"]')?.textContent || ''));
  const doc = await PDFDocument.load(fs.readFileSync(path.join(out, 'Voorbeeld Persoon.pdf')));
  assert(doc.getPageCount() === 1, 'variant niet 1 pagina');
});

await scenario('22. Kopbalk-template: contactblok vast in de kop', async () => {
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('tpl-header').click();
  await page.getByTestId('tab-sections').click();
  assert(await page.locator('[data-testid="zone-head"] [data-testid="sec-personal"]').count() === 1, 'contact niet vastgepind');
  assert(await page.getByTestId('sec-personal-zone-supplementary').count() === 0, 'zone-knoppen bij vastgepind contact');
});


await scenario('23. Tech-iconen: automatisch, per skill, suggesties, chips, projecten, links, merkkleuren, PDF', async () => {
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('tpl-header').click();
  await page.getByTestId('tab-sections').click();
  const tech = (id) => page.locator(`.cv-page svg[data-tech="${id}"]`).count();
  const sk = await open(page, 'skills');
  await sk.getByTestId('skill-mode-grouped').click();
  await sk.getByTestId('skill-display-text').click();
  await sk.getByTestId('skill-icons-auto').click();
  for (const id of ['typescript', 'database', 'java', 'react', 'nodejs', 'api', 'git', 'github', 'docker', 'godot']) {
    assert(await tech(id) >= 1, `icoon ${id} ontbreekt in preview`);
  }
  assert(await tech('python') === 1, 'python ontbreekt');
  await page.screenshot({ path: path.join(out, 'tech-iconen-tekst.png') });
  // uit = alleen tekst
  await sk.getByTestId('skill-icons-off').click();
  assert(await page.locator('.cv-page .sec-skills svg.tic').count() === 0, 'iconen blijven staan bij "zonder iconen"');
  assert((await page.locator('.cv-page .sec-skills').innerText()).includes('TypeScript, Python'), 'tekstweergave veranderd');
  await sk.getByTestId('skill-icons-auto').click();
  // per skill: Python -> geen icoon, Git -> terminal
  await sk.getByTestId('skill-0').locator('.item-head').click().catch(() => {});
  await page.getByTestId('skill-pill-python').first().click();
  await page.getByTestId('icon-pick-none').click();
  assert(await tech('python') === 0, 'python-icoon niet verwijderd');
  await sk.getByTestId('skill-2').locator('.item-head').click();
  await page.getByTestId('skill-pill-git').first().click();
  await page.getByTestId('icon-search').fill('termi');
  await page.getByTestId('icon-pick-terminal').click();
  assert(await page.locator('.cv-page .sec-skills svg[data-tech="terminal"]').count() === 1, 'terminal-icoon niet gekozen');
  await page.getByTestId('skill-pill-git').first().click();
  await page.getByTestId('icon-pick-auto').click();
  assert(await page.locator('.cv-page .sec-skills svg[data-tech="git"]').count() >= 1, 'automatisch niet hersteld');
  // suggesties
  const list = sk.getByTestId('skill-0-list');
  await list.fill('TypeSc');
  await page.getByTestId('suggest-typescript').click();
  assert((await list.inputValue()).startsWith('TypeScript'), 'suggestie niet toegepast: ' + await list.inputValue());
  await list.fill('TypeScript, Python, SQL, Java');
  const pillTexts = await sk.getByTestId('skill-0').locator('.pill').allInnerTexts();
  assert(pillTexts.join('|') === 'TypeScript|Python|SQL|Java', 'pills: ' + pillTexts.join('|'));
  // icon-first chips
  await sk.getByTestId('skill-display-chips').click();
  assert(await page.locator('.cv-page .sec-skills .chip.has-icon svg').count() >= 6, 'chips met icoon ontbreken');
  await page.screenshot({ path: path.join(out, 'tech-iconen-chips.png') });
  // projecten: tech-stack chips
  const pr = await open(page, 'projects');
  await pr.getByTestId('tech-display-chips').click();
  assert(await page.locator('.cv-page .sec-projects .tech-chips .chip.has-icon').count() >= 3, 'tech-chips in project ontbreken');
  await pr.locator('label.toggle', { hasText: 'Iconen' }).click();
  assert(await page.locator('.cv-page .sec-projects .tech-chips svg').count() === 0, 'project-iconen blijven bij uitzetten');
  await pr.locator('label.toggle', { hasText: 'Iconen' }).click();
  // links met GitHub/LinkedIn-iconen
  await page.getByTestId('add-section').click();
  await page.getByTestId('add-links').click();
  const links = page.locator('[data-testid="sec-custom"]').last();
  await links.getByTestId('custom-add').click();
  await links.getByTestId('custom-0-text').fill('GitHub');
  await links.locator('input[placeholder="Waarde"]').first().fill('github.com/voorbeeld');
  assert(await page.locator('.cv-page .sec-custom svg[data-tech="github"]').count() === 1, 'github-icoon bij link ontbreekt');
  // merkkleuren (header-template: lichte achtergrond -> merkkleur toegepast)
  await page.getByTestId('tab-style').click();
  assert(await page.locator('.cv-page .sec-skills svg[data-tech="typescript"]').first().evaluate((e) => getComputedStyle(e).color) !== 'rgb(51, 120, 198)', 'merkkleur staat standaard aan');
  await page.locator('label.toggle', { hasText: 'Merkkleuren' }).click();
  const c = await page.locator('.cv-page .sec-skills svg[data-tech="typescript"]').first().evaluate((e) => getComputedStyle(e).color);
  assert(c === 'rgb(49, 120, 198)', 'merkkleur niet toegepast: ' + c);
  await page.getByTestId('tab-sections').click();
  assert(!(await page.getByTestId('export-pdf').isDisabled()), 'export geblokkeerd door tech-iconen');
  await page.getByTestId('export-pdf').click();
  await page.waitForFunction(() => /1 pagina/.test(document.querySelector('[data-testid="toast"]')?.textContent || ''));
  const bytes = fs.readFileSync(path.join(out, 'Voorbeeld Persoon.pdf'));
  const doc = await PDFDocument.load(bytes);
  assert(doc.getPageCount() === 1, 'tech-cv niet 1 pagina');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  const text = (await (await pdf.getPage(1)).getTextContent()).items.map((i) => i.str).join(' ');
  for (const n of ['TypeScript', 'Docker', 'Godot', 'github.com/voorbeeld']) assert(text.includes(n), `tekst ontbreekt in PDF: ${n}`);
  const ops = await (await pdf.getPage(1)).getOperatorList();
  const imgs = ops.fnArray.filter((f) => f === pdfjs.OPS.paintImageXObject || f === pdfjs.OPS.paintInlineImageXObject).length;
  assert(imgs <= 1, `iconen als bitmap in PDF (${imgs} afbeeldingen; alleen de profielfoto mag een bitmap zijn)`);
  fs.copyFileSync(path.join(out, 'Voorbeeld Persoon.pdf'), path.join(out, 'tech-export.pdf'));
});

await app.close();
fs.rmSync(userData, { recursive: true, force: true });
const failed = results.filter((r) => !r[0]);
console.log(`\n${results.length - failed.length}/${results.length} scenario's geslaagd`);
process.exit(failed.length ? 1 : 0);
