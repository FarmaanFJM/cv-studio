// End-to-end tests van de echte Electron-app (draai: npm run test:e2e). Gebruikt Playwright's Electron-ondersteuning.
import { _electron as electron } from 'playwright-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import { build } from 'esbuild';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

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
// verplaats een onderdeel via het overloopmenu ("Verplaatsen naar"): het toegankelijke alternatief voor slepen
const moveTo = async (page, type, zone) => {
  await page.getByTestId(`sec-${type}-menu`).click();
  await page.getByTestId(`sec-${type}-move-${zone}`).click();
};
// acties van het cv-menu (⋯ in de titelbalk) en de aangepaste cv-keuzelijst
const menuAction = async (pg, id) => { await pg.getByTestId('cv-menu').click(); await pg.getByTestId(id).click(); };
const cvOptions = async (pg) => {
  await pg.getByTestId('version-select').click();
  const names = (await pg.locator('[data-testid^="version-select-opt-"]').allInnerTexts()).map((t) => t.trim());
  await pg.keyboard.press('Escape');
  return names;
};
const pickCv = async (pg, label) => {
  await pg.getByTestId('version-select').click();
  await pg.locator('[data-testid^="version-select-opt-"]', { hasText: label }).first().click();
};
const activeCv = (pg) => pg.getByTestId('version-select-value').innerText();
const open = async (page, type) => {
  const card = page.locator(`[data-testid="sec-${type}"]`);
  if (!(await card.locator('.card-body').count())) await card.getByTestId(`sec-${type}-expand`).click();
  return card;
};


// --- minimale PNG-decoder (8 bit RGB/RGBA, zonder interlacing) voor pixelcontrole van gerenderde PDF's ---
function decodePng(buf) {
  let pos = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), type = buf.toString('ascii', pos + 4, pos + 8), data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; if (data[8] !== 8 || data[12] !== 0) throw new Error('png-formaat'); }
    if (type === 'IDAT') idat.push(data);
    pos += 12 + len;
  }
  const bpp = ct === 6 ? 4 : 3, stride = w * bpp, raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(h * stride);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x], a = x >= bpp ? px[y * stride + x - bpp] : 0, b = y ? px[(y - 1) * stride + x] : 0, c = x >= bpp && y ? px[(y - 1) * stride + x - bpp] : 0;
      let r = v;
      if (f === 1) r = v + a; else if (f === 2) r = v + b; else if (f === 3) r = v + ((a + b) >> 1);
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      px[y * stride + x] = r & 255;
    }
  }
  return { w, h, bpp, px };
}
function countNear(img, rgb, dist, x0, x1) {
  let n = 0;
  for (let y = 0; y < img.h; y++) for (let x = x0; x < Math.min(x1, img.w); x++) {
    const o = (y * img.w + x) * img.bpp;
    if (Math.hypot(img.px[o] - rgb[0], img.px[o + 1] - rgb[1], img.px[o + 2] - rgb[2]) < dist) n++;
  }
  return n;
}
import { execFileSync } from 'node:child_process';
const hasPdftoppm = (() => { try { execFileSync('pdftoppm', ['-v'], { stdio: 'ignore' }); return true; } catch { return false; } })();

const results = [];
async function scenario(name, fn) {
  if (process.env.E2E_ONLY && !new RegExp(process.env.E2E_ONLY).test(name)) return; // bijv. E2E_ONLY='^(36|37)' om alleen die scenario's te draaien
  try { await fn(); results.push([true, name]); console.log('  ✓', name); }
  catch (e) { results.push([false, name, e]); console.log('  ✗', name, '\n    ', e.message.split('\n').slice(0, 6).join('\n     ')); if (process.env.E2E_DEBUG) console.log((e.stack ?? '').split('\n').filter((l) => l.includes('run.mjs')).slice(0, 3).join('\n')); }
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
  const box = await personal.getByTestId('crop-view').boundingBox();
  await page.mouse.move(box.x + 85, box.y + 85);
  await page.mouse.down(); await page.mouse.move(box.x + 40, box.y + 85, { steps: 5 }); await page.mouse.up();
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('photo-shape-square').click();
  await page.getByTestId('tab-sections').click();
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
  await page.getByTestId('sec-education-menu').click();
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
  await menuAction(page, 'cv-duplicate');
  await page.getByTestId('prompt-input').fill('ING');
  await page.getByTestId('prompt-ok').click();
  const names = await cvOptions(page);
  assert(names.length === 2 && names.includes('ING'), 'kopie ontbreekt: ' + names);
  const personal = await open(page, 'personal');
  await personal.getByTestId('p-title').fill('Stagiair bij ING');
  assert((await page.locator('.cv-page').innerText()).includes('Stagiair bij ING'), 'wijziging niet in kopie');
  await saved(page);
  await pickCv(page, 'Mijn cv');
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
  await pickCv(page, 'ING');
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
  await menuAction(page, 'json-export');
  await page.waitForSelector('[data-testid="toast"]');
  assert(fs.existsSync(path.join(out, 'ING.json')), 'json-export ontbreekt');
  await app.close();
  fs.writeFileSync(path.join(out, 'kapot.json'), '{ dit is geen json');
  ({ app, page } = await launch({ CV_STUDIO_TEST_IMPORT: path.join(out, 'kapot.json') }));
  await menuAction(page, 'json-import');
  await page.waitForSelector('[data-testid="toast"].error');
  await app.close();
  fs.writeFileSync(path.join(out, 'raar.json'), JSON.stringify({ cv: { name: 'Raar', template: 'x', style: { fontSize: 999, accent: 'rood' }, sections: [{ type: 'projects', items: 'nee' }, 5, null], photo: { src: 'javascript:alert(1)' } } }));
  ({ app, page } = await launch({ CV_STUDIO_TEST_IMPORT: path.join(out, 'raar.json') }));
  await menuAction(page, 'json-import');
  await page.waitForFunction(() => /Raar/.test(document.querySelector('[data-testid="version-select-value"]')?.textContent ?? ''));
  assert(await page.locator('.cv-page').count() === 1, 'app crasht op vreemde import');
  await app.close();
  ({ app, page } = await launch({ CV_STUDIO_TEST_IMPORT: path.join(out, 'ING.json') }));
  await menuAction(page, 'json-import');
  await page.waitForFunction(() => /geïmporteerd/.test(document.querySelector('[data-testid="version-select-value"]')?.textContent ?? ''));
  assert((await cvOptions(page)).length >= 4, 'import voegt geen versie toe');
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
  await menuAction(page, 'json-import');
  await page.waitForFunction(() => /geïmporteerd/.test(document.querySelector('[data-testid="version-select-value"]')?.textContent ?? ''));
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
  assert(await inMain('Over mij') === 1 && await inSide('Over mij') === 0, 'Over mij start in hoofd');
  assert(await page.getByTestId('zone-primary').locator('.zone-title').innerText().then((t) => /Hoofdinhoud/i.test(t)), 'label Hoofdinhoud');
  assert(await page.getByTestId('zone-supplementary').locator('.zone-title').innerText().then((t) => /Aanvullende inhoud/i.test(t)), 'label Aanvullende inhoud');
  assert(!/Zijbalk|Linker|Hoofdgedeelte/.test(await page.getByTestId('section-list').innerText()), 'oude positiegebonden labels zichtbaar');
  assert(await page.getByTestId('section-list').locator('[data-testid$="-zone-primary"], [data-testid$="-zone-supplementary"]').count() === 0, 'de losse Hoofd/Aanvullend-knoppen zijn nog zichtbaar');
  assert(!/\bHoofd\b.*\bAanvullend\b/s.test(await page.getByTestId('sec-profile').locator('.card-head').innerText()), 'Hoofd/Aanvullend-regelaar zichtbaar in de kaartkop');
  await moveTo(page, 'profile', 'supplementary');
  assert(await inSide('Over mij') === 1 && await inMain('Over mij') === 0, 'Over mij niet naar aanvullende inhoud');
  await page.waitForSelector('.cv-page [data-title="Over mij"].flash', { timeout: 2000 });
  await page.screenshot({ path: path.join(out, 'flash-bestemming.png') });
  await page.waitForFunction(() => !document.querySelector('.cv-page .flash'), null, { timeout: 4000 });
  assert(await page.locator('[data-testid="zone-supplementary"] [data-testid="sec-profile"]').count() === 1, 'editor toont zone niet');
  await moveTo(page, 'profile', 'primary');
  assert(await inMain('Over mij') === 1, 'Over mij niet terug');
  await page.getByTestId('sec-languages-toggle').click();
  assert(await page.locator('[data-testid="zone-hidden"] [data-testid="sec-languages"]').count() === 1, 'niet in verborgen');
  await page.getByTestId('sec-languages-toggle').click();
  // slepen van zijbalk naar hoofd
  await page.getByTestId('sec-skills').locator('.handle').dragTo(page.getByTestId('zone-primary'));
  assert(await inMain('Vaardigheden') === 1 || await page.locator('[data-testid="zone-primary"] [data-testid="sec-skills"]').count() === 1, 'slepen naar hoofd werkt niet');
  await moveTo(page, 'skills', 'supplementary');
});

await scenario('15. Vaardigheden: lijst, groepen en niveaus (chips, stippen)', async () => {
  const sk = await open(page, 'skills');
  await sk.getByTestId('skill-mode-levels').click();
  assert(await sk.getByTestId('skill-0').count() === 1, 'groepen ontbreken');
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
  assert(await page.locator('.font-list [role="option"]').count() === 1, 'zoeken filtert niet');
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
  await page.getByTestId('tab-style').click();
  await page.locator('label.toggle', { hasText: 'Toon contacticonen' }).click();
  assert(await page.locator('.t-header .band .ic').count() === 0, 'iconen blijven staan');
  await page.locator('label.toggle', { hasText: 'Toon contacticonen' }).click();
  await page.getByTestId('tab-layout').click();
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
  await menuAction(page, 'json-import');
  await page.waitForFunction(() => /geïmporteerd/.test(document.querySelector('[data-testid="version-select-value"]')?.textContent ?? ''));
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


await scenario('23. Tech-iconen: weergave, automatisch, per skill, suggesties, projecten, links, merkkleuren, PDF', async () => {
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('tpl-header').click();
  await page.getByTestId('tab-sections').click();
  const tech = (id) => page.locator(`.cv-page svg[data-tech="${id}"]`).count();
  const sk = await open(page, 'skills');
  await sk.getByTestId('skill-mode-grouped').click();
  // 'Tekst' toont nooit iconen, ook niet als ze globaal aan staan
  await sk.getByTestId('skill-display-text').click();
  assert(await page.locator('.cv-page .sec-skills svg.tic').count() === 0, 'tekstweergave toont iconen');
  assert((await page.locator('.cv-page .sec-skills').innerText()).includes('TypeScript, Python'), 'tekstweergave veranderd');
  await sk.getByTestId('skill-display-chips').click();
  for (const id of ['typescript', 'database', 'java', 'react', 'nodejs', 'api', 'git', 'github', 'docker', 'godot']) {
    assert(await tech(id) >= 1, `icoon ${id} ontbreekt in preview`);
  }
  assert(await tech('python') === 1, 'python ontbreekt');
  await page.screenshot({ path: path.join(out, 'tech-iconen-tekst.png') });
  // per skill: Python -> geen icoon, Git -> terminal
  await page.getByTestId('skill-pill-python').first().click();
  await page.getByTestId('icon-pick-none').click();
  assert(await tech('python') === 0, 'python-icoon niet verwijderd');
  await page.getByTestId('skill-pill-git').first().click();
  await page.getByTestId('icon-search').fill('termi');
  await page.getByTestId('icon-pick-terminal').click();
  assert(await page.locator('.cv-page .sec-skills svg[data-tech="terminal"]').count() === 1, 'terminal-icoon niet gekozen');
  await page.getByTestId('skill-pill-git').first().click();
  await page.getByTestId('icon-pick-auto').click();
  assert(await page.locator('.cv-page .sec-skills svg[data-tech="git"]').count() >= 1, 'automatisch niet hersteld');
  // suggesties: TypeScript verwijderen en via de suggestielijst weer toevoegen (komt achteraan)
  const list = sk.getByTestId('skill-0-list');
  await sk.getByTestId('skill-pill-x-typescript').click();
  assert(await sk.getByTestId('skill-pill-typescript').count() === 0, 'tag niet verwijderd');
  await list.fill('TypeSc');
  await page.getByTestId('skill-0-list-opt-typescript').click();
  assert((await list.inputValue()) === '', 'invoer niet geleegd na kiezen');
  const pillTexts = await sk.getByTestId('skill-0').locator('.pill').allInnerTexts();
  assert(pillTexts.join('|') === 'Python|SQL|Java|TypeScript', 'pills: ' + pillTexts.join('|'));
  // icon-first chips
  await sk.getByTestId('skill-display-chips').click();
  assert(await page.locator('.cv-page .sec-skills .chip.has-icon svg').count() >= 6, 'chips met icoon ontbreken');
  await page.screenshot({ path: path.join(out, 'tech-iconen-chips.png') });
  // projecten: tech stack als chips met iconen
  const pr = await open(page, 'projects');
  await pr.getByTestId('tech-display-chips').click();
  assert(await page.locator('.cv-page .sec-projects .tech-chips .chip.has-icon').count() >= 3, 'tech-iconen in project ontbreken');
  await pr.getByTestId('tech-display-text').click();
  assert(await page.locator('.cv-page .sec-projects svg[data-tech]').count() === 0, 'project-tekstweergave toont iconen');
  await pr.getByTestId('tech-display-chips').click();
  // links met GitHub/LinkedIn-iconen
  await page.getByTestId('add-section').click();
  await page.getByTestId('add-links').click();
  const links = page.locator('[data-testid="sec-custom"]').last();
  await links.getByTestId('custom-add').click();
  await links.getByTestId('custom-0-text').fill('GitHub');
  await links.locator('input[placeholder="Waarde"]').first().fill('github.com/voorbeeld');
  assert(await page.locator('.cv-page .sec-custom svg[data-tech="github"]').count() === 1, 'github-icoon bij link ontbreekt');
  // kleurbeleid (header-sjabloon: aanvullende kolom licht, projecten in hoofdinhoud)
  const look = (sec, id) => page.locator(`.cv-page .sec-${sec} svg[data-tech="${id}"]`).first().getAttribute('data-look');
  assert(await look('skills', 'typescript') === 'mono', 'aanvullende inhoud niet monochroom (auto): ' + await look('skills', 'typescript'));
  assert(await look('projects', 'typescript') === 'multi', 'project-tech niet in merkkleur (auto): ' + await look('projects', 'typescript'));
  const nameColor = await page.locator('.cv-page .sec-projects .tech-chips .tn').first().evaluate((e) => getComputedStyle(e).color);
  assert(nameColor === await page.locator('.cv-page').evaluate((e) => getComputedStyle(e).color), 'technaam heeft niet de gewone tekstkleur: ' + nameColor);
  await page.getByTestId('tab-style').click();
  await page.getByTestId('tech-global-color-brand').click();
  assert(await look('skills', 'typescript') === 'multi', 'merkkleuren niet toegepast op lichte achtergrond');
  await page.getByTestId('tech-global-color-mono').click();
  assert(await look('projects', 'typescript') === 'mono' && await look('skills', 'typescript') === 'mono', 'monochroom niet toegepast');
  // zijbalk-sjabloon: aanvullende inhoud op gekleurd vlak blijft monochroom, ook bij 'merkkleuren'
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('tpl-sidebar').click();
  await page.getByTestId('tab-style').click();
  await page.getByTestId('tech-global-color-brand').click();
  assert(await look('skills', 'react') === 'mono', 'merkkleur op gekleurde zijbalk niet teruggevallen op monochroom');
  assert(await look('projects', 'react') === 'multi', 'project-tech niet gekleurd in zijbalk-sjabloon');
  await page.getByTestId('tech-global-color-auto').click();
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('tpl-header').click();
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

await scenario('24. PDF per template: tech-logo\'s in juiste kleuren, één pagina, tekst selecteerbaar', async () => {
  await page.getByTestId('tab-layout').click();
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  for (const tpl of ['sidebar', 'header', 'minimal']) {
    await page.getByTestId(`tpl-${tpl}`).click();
    await page.waitForSelector(`.cv-page.t-${tpl}`);
    await page.getByTestId('toast').click().catch(() => {});
    await page.waitForFunction(() => !document.querySelector('[data-testid="toast"]'));
    await page.getByTestId('export-pdf').click();
    await page.waitForFunction(() => /1 pagina/.test(document.querySelector('[data-testid="toast"]')?.textContent || ''));
    const file = path.join(out, `tech-color-${tpl}.pdf`);
    fs.copyFileSync(path.join(out, 'Voorbeeld Persoon.pdf'), file);
    const bytes = fs.readFileSync(file);
    assert((await PDFDocument.load(bytes)).getPageCount() === 1, `${tpl}: niet 1 pagina`);
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
    const text = (await (await pdf.getPage(1)).getTextContent()).items.map((i) => i.str).join(' ');
    for (const n of ['TypeScript', 'Node.js', 'React']) assert(text.includes(n), `${tpl}: tekst ${n} niet selecteerbaar`);
    await page.getByTestId('toast').click().catch(() => {});
    if (!hasPdftoppm) { console.log('     (pdftoppm niet beschikbaar: pixelcontrole overgeslagen)'); continue; }
    execFileSync('pdftoppm', ['-r', '100', '-png', file, path.join(out, `tech-color-${tpl}`)]);
    const img = decodePng(fs.readFileSync(path.join(out, `tech-color-${tpl}-1.png`)));
    const sideEdge = tpl === 'minimal' ? 0 : Math.round(70 / 25.4 * 100); // 70 mm aanvullende kolom (minimal heeft er geen)
    const cyan = [97, 218, 251], tsBlue = [49, 120, 198];
    const mainCyan = countNear(img, cyan, 38, sideEdge, img.w), mainTs = countNear(img, tsBlue, 30, sideEdge, img.w), leftCyan = countNear(img, cyan, 38, 0, sideEdge);
    assert(mainCyan > 15, `${tpl}: React-cyaan ontbreekt in de gerenderde PDF (${mainCyan})`);
    assert(mainTs > 15, `${tpl}: TypeScript-blauw ontbreekt in de gerenderde PDF (${mainTs})`);
    if (tpl !== 'minimal') assert(leftCyan === 0, `${tpl}: gekleurde logo's in aanvullende inhoud (${leftCyan} cyaan-pixels)`);
  }
  await page.getByTestId('tpl-header').click();
});


// ================= v3.0.0: UX-herontwerp =================
const techLook = (pg, sec, id) => pg.locator(`.cv-page .sec-${sec} svg[data-tech="${id}"]`).first().getAttribute('data-look');
const radio = (loc) => loc.getAttribute('aria-checked');

await scenario('25. Globaal: Toon iconen aan/uit, kleurkeuze blijft bewaard', async () => {
  await page.getByTestId('tab-style').click();
  const n = () => page.locator('.cv-page .sec-skills svg[data-tech], .cv-page .sec-projects svg[data-tech]').count();
  assert(await n() > 0, 'uitgangspunt: iconen zichtbaar');
  await page.getByTestId('tech-global-color-mono').click();
  assert(await radio(page.getByTestId('tech-global-color-mono')) === 'true', 'mono niet gekozen');
  await page.getByTestId('toggle-tech-icons').click();
  assert(await n() === 0, 'iconen blijven zichtbaar na uitzetten');
  assert(await page.getByTestId('tech-global-color-brand').isDisabled(), 'kleurkeuze niet uitgeschakeld bij iconen uit');
  assert(await page.locator('.cv-page .sec-skills').innerText().then((t) => t.includes('TypeScript')), 'technamen verdwijnen bij iconen uit');
  await page.getByTestId('toggle-tech-icons').click();
  assert(await n() > 0, 'iconen niet teruggekomen');
  assert(await radio(page.getByTestId('tech-global-color-mono')) === 'true', 'kleurkeuze niet bewaard na uit/aan');
  assert(await techLook(page, 'projects', 'typescript') === 'mono', 'preview volgt kleurkeuze niet');
  await page.getByTestId('tech-global-color-auto').click();
  // contacticonen zijn onafhankelijk
  await page.getByTestId('toggle-tech-icons').click();
  assert(await page.locator('.cv-page .band .ic').count() >= 3, 'contacticonen verdwenen met tech-iconen');
  await page.getByTestId('toggle-tech-icons').click();
});

await scenario('26. Per onderdeel: één keuze Iconen (Standaard, kleur of Uit), voorrangsregels', async () => {
  await page.getByTestId('tab-sections').click();
  const pr = await open(page, 'projects');
  const mode = (m) => pr.getByTestId(`tech-mode-${m}`);
  // terminologie: kop "Iconen", geen "Eigen"- of "Volgt stijl"-labels, geen uitleg of uitklapper
  const txt = await pr.innerText();
  assert(/Iconen/.test(txt) && !/Technologie-iconen|Eigen|Volgt stijl|Volgt:/.test(txt), 'verouderde termen in sectie-instellingen: ' + txt.slice(0, 200));
  assert(await pr.getByTestId('sec-tech-accordion').count() === 0 && await pr.getByTestId('tech-badge').count() === 0 && await pr.getByTestId('tech-inherit-note').count() === 0, 'uitklapper of badge nog aanwezig');
  assert(await radio(mode('default')) === 'true', 'Standaard niet actief bij een onderdeel zonder eigen instelling');
  await mode('off').click();
  assert(await page.locator('.cv-page .sec-projects svg[data-tech]').count() === 0, 'project-iconen blijven bij Uit');
  assert(await page.locator('.cv-page .sec-skills svg[data-tech]').count() > 0, 'andere onderdelen worden beïnvloed');
  await mode('mono').click();
  assert(await techLook(page, 'projects', 'typescript') === 'mono', 'Monochroom niet toegepast');
  // 1. globaal uit gaat voor een eigen onderdeelinstelling en voor keuzes per vaardigheid
  await page.getByTestId('tab-style').click();
  await page.getByTestId('toggle-tech-icons').click();
  await page.getByTestId('tab-sections').click();
  assert(await page.locator('.cv-page svg[data-tech]').count() === 0, 'iconen ondanks globaal uit');
  await open(page, 'projects');
  assert(await pr.getByTestId('tech-mode-mono').isDisabled() && await pr.getByTestId('tech-mode-off').isDisabled(), 'sectiekeuze niet uitgeschakeld bij globaal uit');
  assert(/Stijl/.test(await pr.getByTestId('tech-mode-mono').locator('xpath=ancestor::*[@title][1]').getAttribute('title')), 'verklaring (tooltip) bij globaal uit ontbreekt');
  const sk = await open(page, 'skills');
  assert(await sk.getByTestId('skill-pills').first().locator('svg.tic').count() === 0, 'keuzes per vaardigheid zetten iconen toch aan');
  await page.getByTestId('tab-style').click();
  await page.getByTestId('toggle-tech-icons').click();
  await page.getByTestId('tab-sections').click();
  await open(page, 'projects');
  // terug naar Standaard: volgt weer Stijl
  await mode('default').click();
  assert(await techLook(page, 'projects', 'typescript') === 'multi', 'Standaard (automatisch) niet hersteld');
  await page.screenshot({ path: path.join(out, 'v3-tech-sectie.png') });
  // eigen instelling opnieuw voor de persistentietest
  await mode('mono').click();
});

await scenario('27. Instellingen blijven bewaard na heropenen en bij wisselen van template', async () => {
  await page.getByTestId('tab-style').click();
  await page.getByTestId('tech-global-color-brand').click();
  await saved(page);
  await app.close();
  ({ app, page } = await launch());
  await page.getByTestId('tab-style').click();
  assert(await radio(page.getByTestId('tech-global-color-brand')) === 'true', 'globale kleurkeuze niet bewaard');
  assert(await radio(page.getByTestId('toggle-tech-icons')) === null && await page.getByTestId('toggle-tech-icons').isChecked(), 'globaal toon iconen niet bewaard');
  await page.getByTestId('tab-sections').click();
  const pr = await open(page, 'projects');
  assert(await radio(pr.getByTestId('tech-mode-mono')) === 'true', 'sectie-instelling niet bewaard');
  assert(await techLook(page, 'projects', 'typescript') === 'mono', 'preview na heropenen niet gelijk');
  for (const tpl of ['minimal', 'sidebar', 'header']) {
    await page.getByTestId('tab-layout').click();
    await page.getByTestId(`tpl-${tpl}`).click();
    await page.getByTestId('tab-style').click();
    assert(await radio(page.getByTestId('tech-global-color-brand')) === 'true', `globale kleur verloren bij ${tpl}`);
    await page.getByTestId('tab-sections').click();
    assert(await radio(pr.getByTestId('tech-mode-mono')) === 'true', `sectie-instelling verloren bij ${tpl}`);
  }
  await page.getByTestId('tab-style').click();
  await page.getByTestId('tech-global-color-auto').click();
  await page.getByTestId('tab-sections').click();
  await pr.getByTestId('tech-mode-default').click();
});

await scenario('28. Toetsenbord: tabs, segmented, getal, slider, accordion, menu, tooltip, verplaatsen', async () => {
  const focusRing = () => page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return { s: cs.outlineStyle, w: parseFloat(cs.outlineWidth) }; });
  await page.getByTestId('tab-sections').focus();
  await page.keyboard.press('ArrowRight');
  assert(await page.getByTestId('tab-layout').getAttribute('aria-selected') === 'true', 'pijltje rechts wisselt niet van tab');
  const ring = await focusRing();
  assert(ring.s !== 'none' && ring.w >= 2, 'geen zichtbare focus op tab: ' + JSON.stringify(ring));
  await page.getByTestId('item-layout-inline').focus();
  await page.keyboard.press('ArrowRight');
  assert(await radio(page.getByTestId('item-layout-dates-left')) === 'true', 'segmented reageert niet op pijltjes');
  await page.keyboard.press('ArrowLeft');
  await page.getByTestId('tab-style').click();
  const fs = page.getByTestId('fontsize');
  const before = Number(await fs.inputValue());
  await fs.focus();
  await page.keyboard.press('ArrowUp');
  assert(Number(await fs.inputValue()) === Math.min(12, before + 0.5), 'pijltje omhoog in getalveld');
  await page.keyboard.press('ArrowDown');
  const slider = page.getByRole('slider', { name: 'Lettergrootte' });
  await slider.focus();
  await page.keyboard.press('ArrowRight');
  assert(Number(await fs.inputValue()) === before + 0.5, 'slider reageert niet op toetsenbord');
  await page.keyboard.press('ArrowLeft');
  await page.getByTestId('more-type').focus();
  await page.keyboard.press('Enter');
  assert(await page.getByTestId('more-type').getAttribute('aria-expanded') === 'true', 'accordion opent niet met Enter');
  await page.getByTestId('more-type').click();
  // tooltip op focus, met toegankelijke naam
  await page.getByTestId('cv-menu').focus();
  await page.waitForSelector('[role="tooltip"]');
  assert((await page.locator('[role="tooltip"]').innerText()) === 'Meer acties', 'tooltip-tekst');
  assert(await page.getByTestId('cv-menu').getAttribute('aria-label') === 'Meer acties', 'icoonknop zonder toegankelijke naam');
  await page.keyboard.press('Escape');
  assert(await page.locator('[role="tooltip"]').count() === 0, 'Escape sluit tooltip niet');
  // menu: pijltjes + Escape, focus terug
  await page.getByTestId('tab-sections').click();
  await page.getByTestId('sec-profile-menu').click();
  assert(await page.evaluate(() => document.activeElement?.getAttribute('role')) === 'menuitem', 'menu focust eerste item niet');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  assert(await page.locator('[role="menu"]').count() === 0, 'Escape sluit menu niet');
  assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'sec-profile-menu', 'focus keert niet terug naar menuknop');
  // volgorde met toetsenbord via de sleepgreep
  const order = () => page.locator('[data-testid="zone-primary"] [data-sec-id]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')));
  const o1 = await order();
  const handle = page.getByTestId(o1[0]).locator('.handle');
  await handle.focus();
  await page.keyboard.press('ArrowDown');
  const o2 = await order();
  assert(o2[0] === o1[1] && o2[1] === o1[0], `toetsenbordvolgorde: ${o1} -> ${o2}`);
  assert(await page.evaluate(() => document.activeElement?.classList.contains('handle')), 'focus verdwijnt na verplaatsen');
  await page.keyboard.press('ArrowUp');
});

await scenario('29. Slider slepen, typen zonder terugspringen, grenzen', async () => {
  await page.getByTestId('tab-style').click();
  const px = () => page.locator('.cv-page').evaluate((e) => parseFloat(getComputedStyle(e).fontSize) * 72 / 96);
  const slider = page.getByRole('slider', { name: 'Lettergrootte' });
  const box = await slider.boundingBox();
  await page.mouse.move(box.x + 9, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2, { steps: 12 });
  const mid = await px();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2, { steps: 12 });
  const half = await px();
  await page.mouse.up();
  assert(mid > 11 && half > 9.5 && half < 10.5 && Math.abs(Number(await page.getByTestId('fontsize').inputValue()) - half) < 0.01, `slepen: ${mid} / ${half}`);
  const input = page.getByTestId('fontsize');
  await input.click();
  await input.press('Control+A');
  await page.keyboard.type('1');
  assert((await input.inputValue()) === '1', 'invoer springt terug tijdens typen');
  assert(await page.getByText('Kies een waarde van 8 tot 12').count() === 1, 'geen lokale validatiemelding');
  assert(await input.getAttribute('aria-invalid') === 'true', 'aria-invalid ontbreekt');
  await page.keyboard.type('0.5');
  assert((await input.inputValue()) === '10.5' && Math.abs(await px() - 10.5) < 0.01, 'typen van 10.5: ' + await input.inputValue());
  await page.keyboard.press('Enter');
  await page.getByTestId('fontsize').fill('9.5');
});

await scenario('30. Kleurkiezer: ongeldige hex geeft lokale feedback; eigen kleur blijft bewaard', async () => {
  await page.getByTestId('color-accent').click();
  const hex = page.getByTestId('color-accent-hex');
  await hex.fill('#12');
  assert(await hex.getAttribute('aria-invalid') === 'true', 'ongeldige hex niet gemarkeerd');
  assert(await page.getByText('Ongeldige kleur').count() === 1, 'foutmelding ontbreekt');
  await hex.fill('#7a3cff');
  assert(await hex.getAttribute('aria-invalid') === null, 'fout blijft staan na correctie');
  assert(await page.locator('.cv-page').evaluate((e) => getComputedStyle(e).getPropertyValue('--accent').trim()) === '#7a3cff', 'preview volgt niet direct');
  await page.getByTestId('color-accent-save').click();
  await page.keyboard.press('Escape');
  assert(await page.getByTestId('color-accent-pop').count() === 0, 'Escape sluit kleurkiezer niet');
  await saved(page);
  await app.close();
  ({ app, page } = await launch());
  await page.getByTestId('tab-style').click();
  await page.getByTestId('color-sidebar').click();
  assert(await page.getByTestId('saved-swatches').locator('button').count() >= 1, 'eigen kleur niet bewaard na heropenen');
  await page.keyboard.press('Escape');
});

await scenario('31. Preview: zoomen zonder vervorming, passend herstellen', async () => {
  const holder = page.locator('.page-holder');
  const w0 = (await holder.boundingBox()).width;
  await page.getByTestId('zoom-in').click();
  await page.getByTestId('zoom-in').click();
  const b1 = await holder.boundingBox();
  assert(b1.width > w0 * 1.2, 'inzoomen werkt niet');
  assert(Math.abs(b1.width / b1.height - 210 / 297) < 0.01, `pagina vervormd: ${b1.width}x${b1.height}`);
  await page.getByTestId('zoom-fit').click();
  const b2 = await holder.boundingBox();
  assert(Math.abs(b2.width - w0) < 1.5, 'passend herstelt niet');
  const pane = await page.locator('.preview-pane').boundingBox();
  assert(b2.height <= pane.height + 1 && pane.height - b2.height < 40, `ongebruikte ruimte om de pagina: pane ${pane.height} pagina ${b2.height}`);
});

await scenario('32. Editor smal en breed: geen horizontale overloop, schermafbeeldingen', async () => {
  const splitter = async (x) => {
    const sp = await page.getByTestId('splitter').boundingBox();
    await page.mouse.move(sp.x + 3, sp.y + 300);
    await page.mouse.down(); await page.mouse.move(x, sp.y + 300, { steps: 8 }); await page.mouse.up();
  };
  for (const [label, x] of [['smal', 300], ['breed', 1000]]) {
    await splitter(x);
    for (const [tab, extra] of [['sections', async () => { await open(page, 'skills'); }], ['layout', async () => {}], ['style', async () => { await page.getByTestId('more-colors').click(); }]]) {
      await page.getByTestId(`tab-${tab}`).click();
      await extra();
      const m = await page.locator('.editor-scroll').evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth }));
      assert(m.sw <= m.cw + 1, `${label}/${tab}: horizontale overloop ${m.sw} > ${m.cw}`);
      await page.screenshot({ path: path.join(out, `v3-editor-${label}-${tab}.png`) });
    }
    const w = (await page.locator('.editor').boundingBox()).width;
    assert(label === 'smal' ? w >= 395 && w < 450 : w > 900, `editorbreedte ${label}: ${w}`);
  }
  await splitter(640);
});

await scenario('33. Toegankelijkheid (axe-core, WCAG 2.2 AA) op alle tabs', async () => {
  await page.evaluate(fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8')); // via CDP: de strikte CSP van de app blijft ongemoeid
  const bad = [];
  for (const tab of ['sections', 'layout', 'style']) {
    await page.getByTestId(`tab-${tab}`).click();
    if (tab === 'sections') { await open(page, 'projects'); await open(page, 'skills'); }
    if (tab === 'style') { await page.getByTestId('more-colors').click().catch(() => {}); await page.getByTestId('color-accent').click(); }
    const res = await page.evaluate(async () => {
      const r = await window.axe.run({ include: [['.editor'], ['.preview-top']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, target: v.nodes.slice(0, 2).map((x) => x.target.join(' ')) }));
    });
    if (tab === 'style') await page.keyboard.press('Escape');
    for (const v of res) if (v.impact === 'serious' || v.impact === 'critical') bad.push(`${tab}: ${v.id} (${v.n}) ${v.target.join(' | ')}`);
    for (const v of res) if (v.impact !== 'serious' && v.impact !== 'critical') console.log(`     (axe ${v.impact}) ${tab}: ${v.id} x${v.n}`);
  }
  assert(bad.length === 0, 'axe-schendingen:\n     ' + bad.join('\n     '));
});

await scenario('34. Versie uit package.json zichtbaar in de editor', async () => {
  const expected = 'v' + JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  assert((await page.getByTestId('app-version').innerText()) === expected, 'versie: ' + await page.getByTestId('app-version').innerText() + ' verwacht ' + expected);
});

await scenario('35. Migratie van v2-opslag (oude tech-instellingen) behoudt het uiterlijk', async () => {
  await app.close();
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'cvstudio-v2-'));
  fs.mkdirSync(path.join(ud, 'data'));
  const sec = (o) => ({ visible: true, zone: 'primary', ...o });
  const v2 = { version: 3, activeId: 'v2', swatches: ['#112233'], cvs: [{ id: 'v2', name: 'Oud v2', template: 'minimal', style: { accent: '#0f766e', sidebarBg: '#0f766e', techColors: true, icons: true },
    personal: { fullName: 'Twee Gebruiker', title: 'Dev', email: 'a@b.nl', phone: '', location: '', linkedin: '', github: '', website: '' }, photo: null,
    sections: [
      sec({ id: 'p', type: 'personal', title: 'Contact', zone: 'supplementary' }),
      sec({ id: 'sk1', type: 'skills', title: 'Zonder', mode: 'flat', display: 'text', icons: 'off', techColor: 'inherit', groups: [{ id: 'g', name: '', skills: ['React'] }] }),
      sec({ id: 'sk2', type: 'skills', title: 'Met', mode: 'flat', display: 'text', icons: 'auto', techColor: 'inherit', groups: [{ id: 'g2', name: '', skills: ['Docker'] }] }),
      sec({ id: 'pr', type: 'projects', title: 'Projecten', techDisplay: 'chips', techIcons: true, techColor: 'mono', items: [{ id: 'i', name: 'Proj', tech: 'TypeScript, Python', period: '', description: '', github: '' }] }),
      sec({ id: 'pr2', type: 'projects', title: 'Projecten zonder', techDisplay: 'chips', techIcons: false, techColor: 'inherit', items: [{ id: 'i2', name: 'Proj2', tech: 'Git', period: '', description: '', github: '' }] }),
      sec({ id: 'cu', type: 'custom', title: 'Links', mode: 'keyvalue', icons: true, techColor: 'inherit', text: '', items: [{ id: 'k', text: 'GitHub', value: 'github.com/x' }] })
    ] }] };
  fs.writeFileSync(path.join(ud, 'data/cvs.json'), JSON.stringify(v2));
  ({ app, page } = await launch({ CV_STUDIO_USER_DATA: ud }));
  const has = (sec, id) => page.locator(`.cv-page .sec-${sec} svg[data-tech="${id}"]`).count();
  assert(await page.locator('.cv-page').innerText().then((t) => t.includes('Twee Gebruiker')), 'v2-gegevens ontbreken');
  const cards = await page.locator('.cv-page [data-sec]').evaluateAll((els) => els.map((e) => [e.getAttribute('data-sec'), e.querySelectorAll('svg[data-tech]').length]));
  const m = Object.fromEntries(cards);
  assert(m.sk1 === 0, 'skills zonder iconen kregen iconen');
  assert(m.sk2 === 1, 'skills met iconen verloren hun icoon');
  assert(m.pr === 2 && m.pr2 === 0, `projecten: ${JSON.stringify(m)}`);
  assert(m.cu >= 1, 'links verloren icoon');
  assert(await page.locator('.cv-page .sec-projects svg[data-look="mono"]').count() === 2, 'oude kleurkeuze (mono) niet behouden');
  await page.getByTestId('tab-style').click();
  assert(await radio(page.getByTestId('tech-global-color-brand')) === 'true', 'oude techColors-schakelaar niet omgezet naar merkkleuren');
  await page.getByTestId('color-sidebar').click();
  assert(await page.getByTestId('saved-swatches').locator('button').count() === 1, 'bewaarde kleuren niet behouden');
  await page.keyboard.press('Escape');
  await page.getByTestId('tab-sections').click();
  const pr = page.locator('[data-sec-id="pr"]');
  await pr.getByTestId('sec-projects-expand').click();
  assert(await radio(pr.getByTestId('tech-mode-mono')) === 'true', 'sectie-override uit v2 niet zichtbaar in de editor');
  fs.rmSync(ud, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
  ({ app, page } = await (async () => { await app.close(); return launch(); })());
});


// ================= v3.1.0: slepen, vaardigheden, titelbalk, updates =================
const newCv = async (name) => {
  await menuAction(page, 'cv-new');
  await page.getByTestId('prompt-input').fill(name);
  await page.getByTestId('prompt-ok').click();
  await page.waitForFunction((n) => document.querySelector('[data-testid="version-select-value"]')?.textContent === n, name);
  await page.getByTestId('tab-sections').click();
};
const collapseAll = async () => {
  for (const b of await page.locator('[data-testid$="-expand"][aria-expanded="true"]').all()) await b.click();
};
const zoneOrder = (zone) => page.getByTestId(`zone-${zone}`).locator('[data-sec-id]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid').replace('sec-', '')));
const previewOrder = (region) => page.locator(`.cv-page [data-region="${region}"] > .sec`).evaluateAll((els) => els.map((e) => e.className.replace(/.*sec-(\w+).*/, '$1')));
const handleOf = (type) => page.getByTestId(`sec-${type}`).locator('.handle');

await scenario('36. Slepen: tussen categorieën, lege categorie, tussen twee onderdelen, zonder uitklappen', async () => {
  await newCv('Sleeptest');
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('tpl-sidebar').click();
  await page.getByTestId('tab-sections').click();
  const lg = await open(page, 'languages');
  await lg.getByTestId('lang-add').click();
  await lg.getByTestId('lang-0-name').fill('Nederlands');
  await collapseAll();
  assert((await zoneOrder('primary')).join() === 'profile,projects,education,experience', 'beginvolgorde hoofd: ' + (await zoneOrder('primary')).join());
  assert((await zoneOrder('supplementary')).join() === 'personal,skills,languages', 'beginvolgorde aanvullend');
  // 1. van Aanvullende inhoud naar Hoofdinhoud, precies tussen Projecten en Opleiding (bovenste helft van Opleiding)
  await handleOf('languages').dragTo(page.getByTestId('sec-education'), { targetPosition: { x: 80, y: 6 } });
  assert((await zoneOrder('primary')).join() === 'profile,projects,languages,education,experience', 'tussen twee onderdelen: ' + (await zoneOrder('primary')).join());
  assert(await page.locator('.cv-page .col-main [data-title="Talen"]').count() === 1, 'preview toont verplaatsing niet direct');
  assert(await page.locator('[data-testid$="-expand"][aria-expanded="true"]').count() === 0, 'slepen klapt onderdelen uit');
  // 2. terug naar Aanvullende inhoud, achteraan (onderste helft van het laatste onderdeel)
  await handleOf('languages').dragTo(page.getByTestId('sec-skills'), { targetPosition: { x: 80, y: 30 } });
  assert((await zoneOrder('supplementary')).join() === 'personal,skills,languages', 'terug achteraan: ' + (await zoneOrder('supplementary')).join());
  // 3. herordenen binnen een categorie: Experience boven Projecten
  await handleOf('experience').dragTo(page.getByTestId('sec-projects'), { targetPosition: { x: 80, y: 6 } });
  assert((await zoneOrder('primary')).join() === 'profile,experience,projects,education', 'binnen categorie: ' + (await zoneOrder('primary')).join());
  // 4. naar Verborgen (lege categorie) en terug
  await handleOf('education').dragTo(page.getByTestId('zone-hidden'));
  assert((await zoneOrder('hidden')).join() === 'education', 'niet in Verborgen');
  assert(await page.locator('.cv-page [data-title="Opleiding"]').count() === 0, 'verborgen onderdeel staat nog in de cv');
  await handleOf('education').dragTo(page.getByTestId('zone-primary'), { targetPosition: { x: 200, y: 8 } }); // op de kop van de categorie: achteraan
  assert((await zoneOrder('primary')).join() === 'profile,experience,projects,education', 'terug uit Verborgen: ' + (await zoneOrder('primary')).join());
  // 5. lege categorie: alles uit Aanvullend weg, dan weer slepen naar de lege zone
  for (const t of ['personal', 'skills', 'languages']) await moveTo(page, t, 'primary');
  assert((await zoneOrder('supplementary')).length === 0 && /Leeg/.test(await page.getByTestId('zone-supplementary').innerText()), 'zone niet leeg');
  await handleOf('skills').dragTo(page.getByTestId('zone-supplementary'));
  assert((await zoneOrder('supplementary')).join() === 'skills', 'neerzetten in lege categorie mislukt');
  for (const t of ['personal', 'languages']) await moveTo(page, t, 'supplementary');
});

await scenario('36b. Slepen: invoegmarkering, categoriemarkering, automatisch scrollen, vaste plek en Minimaal', async () => {
  await collapseAll();
  const hb = await handleOf('experience').boundingBox();
  const target = await page.getByTestId('sec-education').boundingBox();
  await page.mouse.move(hb.x + 8, hb.y + 8);
  await page.mouse.down();
  await page.mouse.move(hb.x + 30, hb.y + 40, { steps: 4 });
  await page.mouse.move(target.x + 120, target.y + 5, { steps: 8 });
  await page.waitForSelector('.card.ins-before', { timeout: 3000 });
  assert(await page.locator('.card.ins-before, .card.ins-after').count() === 1, 'precies één invoegmarkering verwacht');
  assert(await page.locator('[data-testid="sec-education"].ins-before').count() === 1, 'markering staat niet voor Opleiding');
  assert(await page.locator('.zone.drop-target').count() === 1, 'bestemmingscategorie niet gemarkeerd');
  assert(await page.locator('.card.dragging').count() === 1, 'gesleept onderdeel niet gemarkeerd');
  await page.screenshot({ path: path.join(out, 'slepen-markering.png') });
  // onderste helft van het laatste onderdeel in de zone: markering komt na het onderdeel
  const last = await page.getByTestId('sec-education').boundingBox();
  await page.mouse.move(last.x + 120, last.y + last.height - 4, { steps: 4 });
  await page.waitForTimeout(80);
  await page.mouse.up();
  await page.waitForTimeout(100);
  assert(await page.locator('.card.ins-before, .card.ins-after, .zone.drop-target, .card.dragging').count() === 0, 'markeringen blijven staan na neerzetten');
  assert((await zoneOrder('primary')).join() === 'profile,projects,education,experience', 'na neerzetten: ' + (await zoneOrder('primary')).join());

  // automatisch scrollen: lage editor, hoge inhoud; naar de onderrand slepen
  await page.setViewportSize({ width: 1400, height: 520 });
  for (const t of ['personal', 'projects']) { const c = await open(page, t); await c.scrollIntoViewIfNeeded(); }
  const sc = page.locator('.editor-scroll');
  await sc.evaluate((e) => { e.scrollTop = 0; });
  assert(await sc.evaluate((e) => e.scrollHeight - e.clientHeight) > 300, 'editor niet hoog genoeg voor de scrolltest');
  const h2 = await handleOf('profile').boundingBox();
  const area = await sc.boundingBox();
  await page.mouse.move(h2.x + 8, h2.y + 8);
  await page.mouse.down();
  await page.mouse.move(h2.x + 30, h2.y + 40, { steps: 4 });
  await page.mouse.move(area.x + 200, area.y + area.height - 12, { steps: 6 });
  await page.waitForTimeout(900);
  const down = await sc.evaluate((e) => e.scrollTop);
  assert(down > 40, `niet automatisch omlaag gescrold (${down})`);
  await page.mouse.move(area.x + 200, area.y + 10, { steps: 6 });
  await page.waitForTimeout(900);
  assert(await sc.evaluate((e) => e.scrollTop) < down, 'niet automatisch omhoog gescrold');
  await page.mouse.up();
  await page.setViewportSize({ width: 1400, height: 900 });
  await collapseAll();

  // vaste plek (kopbalk): contactblok niet te slepen en zonder 'Verplaatsen naar'
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('tpl-header').click();
  await page.getByTestId('tab-sections').click();
  assert(await handleOf('personal').isDisabled(), 'contactblok sleepbaar in kopbalk-sjabloon');
  await page.getByTestId('sec-personal-menu').click();
  assert(await page.getByTestId('sec-personal-move-primary').count() === 0, 'contactblok heeft Verplaatsen naar in kopbalk-sjabloon');
  await page.keyboard.press('Escape');
  // Minimaal: één kolom; slepen verandert de volgorde maar bewaart de opgeslagen zones
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('tpl-sidebar').click();
  await page.getByTestId('tab-sections').click();
  const before = { p: await zoneOrder('primary'), s: await zoneOrder('supplementary') };
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('tpl-minimal').click();
  await page.getByTestId('tab-sections').click();
  assert(await page.getByTestId('zone-supplementary').count() === 0, 'Minimaal toont zones');
  await handleOf('skills').dragTo(page.getByTestId('sec-profile'), { targetPosition: { x: 80, y: 6 } });
  const minOrder = await zoneOrder('primary'); // in Minimaal staat alles zichtbaars in één lijst, in cv-volgorde
  assert(minOrder.indexOf('skills') < minOrder.indexOf('profile'), 'volgorde in Minimaal: ' + minOrder.join());
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('tpl-sidebar').click();
  await page.getByTestId('tab-sections').click();
  assert((await zoneOrder('supplementary')).includes('skills') && !(await zoneOrder('primary')).includes('skills'), 'zone van Vaardigheden verloren na Minimaal');
  assert(before.s.includes('skills'), 'uitgangspunt');
  // sluit af zoals begonnen
  await handleOf('skills').dragTo(page.getByTestId('sec-languages'), { targetPosition: { x: 80, y: 30 } });
});

await scenario('36c. Toetsenbord: Verplaatsen naar via het menu, focus blijft op de greep', async () => {
  await collapseAll();
  await page.getByTestId('sec-experience-menu').click();
  await page.getByTestId('sec-experience-move-supplementary').click();
  assert((await zoneOrder('supplementary')).includes('experience'), 'menu verplaatst niet');
  assert(await page.evaluate(() => document.activeElement?.hasAttribute('data-handle')), 'focus niet op de greep na verplaatsen');
  // alleen via toetsenbord: menu openen met Enter, pijltjes, Enter
  await handleOf('experience').focus();
  await page.keyboard.press('Tab'); // titelknop
  await page.keyboard.press('Tab'); // schakelaar
  await page.keyboard.press('Tab'); // menu
  await page.keyboard.press('Enter'); // opent het menu en focust het eerste te kiezen item
  const focused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid'));
  assert(focused === 'sec-experience-move-primary', 'eerste menu-item niet gefocust: ' + focused);
  await page.keyboard.press('ArrowDown'); // Verborgen (Aanvullende inhoud is de huidige plek en wordt overgeslagen)
  assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'sec-experience-move-hidden', 'pijltje omlaag slaat de huidige plek niet over');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  assert((await zoneOrder('primary')).includes('experience'), 'Enter in het menu verplaatst niet');
  await page.screenshot({ path: path.join(out, 'verplaatsen-menu.png') });
});

await scenario('37. Vaardigheden: suggesties, Tab/Enter/pijltjes/Escape, eigen namen, duplicaten, chevron, catalogus', async () => {
  await collapseAll();
  const sk = await open(page, 'skills');
  await sk.getByTestId('skill-add').click();
  const input = sk.getByTestId('skill-0-list');
  const popup = page.getByTestId('skill-0-list-popup');
  const pills = async () => (await sk.getByTestId('skill-0').locator('.pill').allInnerTexts());
  assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'skill-0-name', 'nieuwe groep: categorie niet gefocust');
  // ARIA-semantiek
  await input.click();
  await input.fill('Type');
  await popup.waitFor();
  assert(await input.getAttribute('role') === 'combobox' && await input.getAttribute('aria-expanded') === 'true', 'combobox-rol/expanded ontbreekt');
  const listId = await input.getAttribute('aria-controls');
  assert(await page.locator(`[id="${listId}"][role="listbox"]`).count() === 1, 'aria-controls wijst niet naar de listbox');
  assert(await page.locator('[role="option"]').first().innerText().then((t) => t.includes('TypeScript')), 'Type -> TypeScript ontbreekt: ' + await page.locator('[role="option"]').first().innerText());
  const active = await input.getAttribute('aria-activedescendant');
  assert(active && await page.locator(`[id="${active}"][role="option"][aria-selected="true"]`).count() === 1, 'aria-activedescendant wijst niet naar een geselecteerde optie');
  // Tab neemt de eerste suggestie over; invoer leeg; focus blijft
  await page.keyboard.press('Tab');
  assert((await pills()).join('|') === 'TypeScript', 'Tab voegt niet toe: ' + (await pills()).join('|'));
  assert((await input.inputValue()) === '', 'invoer niet geleegd');
  assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'skill-0-list', 'focus niet bij de invoer');
  assert(await popup.count() === 0, 'lijst blijft open na kiezen');
  // 'Py' -> Python, PyTorch, Pytest
  await input.fill('Py');
  await popup.waitFor();
  const optTexts = await page.locator('[role="option"]').allInnerTexts();
  for (const n of ['Python', 'PyTorch', 'Pytest']) assert(optTexts.some((t) => t.includes(n)), `Py -> ${n} ontbreekt: ${optTexts.join(',')}`);
  // pijltjes: omlaag, omlaag, omhoog, Enter
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowUp');
  const second = (await page.locator('[role="option"][aria-selected="true"]').innerText()).trim();
  assert(second === optTexts[1].trim(), `pijltjes: gemarkeerd ${second}, verwacht ${optTexts[1]}`);
  await page.keyboard.press('Enter');
  assert((await pills()).includes(second.replace(/\s+/g, ' ')) || (await pills()).includes(optTexts[1].trim()), 'Enter voegt gemarkeerde suggestie niet toe: ' + (await pills()).join('|'));
  // Escape sluit zonder de tekst te wijzigen
  await input.fill('Rea');
  await popup.waitFor();
  await page.keyboard.press('Escape');
  assert(await popup.count() === 0 && (await input.inputValue()) === 'Rea', 'Escape wijzigt tekst of sluit niet');
  await input.fill('');
  // zonder actieve suggestie gedraagt Tab zich normaal (focus verlaat het veld)
  await input.fill('Mijn Eigen Skill');
  await page.keyboard.press('Enter'); // eigen naam, hoofdletters blijven
  assert((await pills()).includes('Mijn Eigen Skill'), 'eigen vaardigheid niet toegevoegd: ' + (await pills()).join('|'));
  await input.fill('zzzqq');
  await page.keyboard.press('Tab');
  assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) !== 'skill-0-list', 'Tab hield de focus vast zonder suggestie');
  assert((await pills()).includes('zzzqq'), 'eigen tekst niet bewaard bij verlaten van het veld');
  await sk.getByTestId('skill-pill-x-zzzqq').click();
  // duplicaten (hoofdletters en spaties tellen niet)
  const n = (await pills()).length;
  await input.click();
  await input.fill('  typescript ');
  await page.keyboard.press('Enter');
  await input.fill('PYTHON');
  await page.keyboard.press('Enter');
  const lowerTs = (await pills()).filter((t) => t.toLowerCase() === 'typescript').length;
  assert(lowerTs === 1, 'duplicaat TypeScript toegevoegd');
  assert(await sk.getByTestId('skill-note').count() === 1 || (await pills()).filter((t) => t.toLowerCase() === 'python').length === 1, 'geen duplicaatmelding');
  // chevron: bladeren door de catalogus met categorieën
  await sk.getByTestId('skill-0-list-chevron').click();
  await popup.waitFor();
  assert(await input.getAttribute('aria-expanded') === 'true', 'chevron opent niet');
  assert(await page.getByTestId('skill-0-list-cat-databases').count() === 1, 'categoriekeuze ontbreekt');
  await page.getByTestId('skill-0-list-cat-databases').click();
  await page.getByTestId('skill-0-list-opt-postgresql').click();
  assert((await pills()).includes('PostgreSQL'), 'selectie met de muis uit de catalogus mislukt');
  await page.screenshot({ path: path.join(out, 'skill-catalogus.png') });
  // pijl omlaag opent de lijst ook; lege toestand als er niets meer te kiezen is (alle 'Mobiele apps' toegevoegd)
  const mobile = 9;
  for (let i = 0; i < mobile; i++) {
    await sk.getByTestId('skill-0-list-chevron').click();
    await page.getByTestId('skill-0-list-cat-mobile').click();
    await page.locator('[data-testid^="skill-0-list-opt-"]').first().click();
  }
  await sk.getByTestId('skill-0-list-chevron').click();
  await page.getByTestId('skill-0-list-cat-mobile').click();
  assert(await page.getByTestId('skill-0-list-empty').isVisible(), 'lege toestand ontbreekt');
  await page.keyboard.press('Escape');
  await input.click();
  await page.keyboard.press('ArrowDown');
  await popup.waitFor();
  await page.keyboard.press('Escape');
  // alles in de preview, één pagina
  assert((await page.locator('.cv-page .sec-skills').innerText()).includes('Mijn Eigen Skill'), 'preview mist eigen vaardigheid');
});

await scenario('37b. Categorie-presets: kiezen, zoeken, eigen naam; geen vaardigheden zonder keuze', async () => {
  const sk = page.locator('[data-testid="sec-skills"]');
  await sk.getByTestId('skill-add').click();
  assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'skill-1-name', 'categorie niet gefocust');
  const name = sk.getByTestId('skill-1-name');
  await name.fill('Data');
  await page.getByTestId('skill-1-name-popup').waitFor();
  assert((await page.locator('[role="option"]').first().innerText()).includes('Databases'), 'zoeken in presets: ' + await page.locator('[role="option"]').first().innerText());
  await page.keyboard.press('Tab');
  assert(await name.inputValue() === 'Databases', 'Tab neemt preset niet over: ' + await name.inputValue());
  assert(await sk.getByTestId('skill-1').locator('.pill').count() === 0, 'preset voegde vaardigheden toe');
  // chevron: alle presets, gegroepeerd in IT en algemeen
  await sk.getByTestId('skill-1-name-chevron').click();
  const pop = page.getByTestId('skill-1-name-popup');
  await pop.waitFor();
  const text = await pop.innerText();
  for (const t of ['IT EN TECHNIEK', 'ALGEMEEN', 'Programmeertalen', 'Frameworks & Libraries', 'Communicatie', 'Klantenservice', 'Microsoft Office', 'Presenteren']) assert(text.toUpperCase().includes(t.toUpperCase()), `preset ${t} ontbreekt`);
  await page.getByTestId('skill-1-name-opt-communication').click();
  assert(await name.inputValue() === 'Communicatie', 'preset kiezen met de muis mislukt');
  // eigen naam blijft kunnen
  await name.fill('Mijn eigen groep');
  await page.waitForTimeout(100);
  assert(await name.inputValue() === 'Mijn eigen groep', 'eigen categorienaam niet behouden');
  assert((await page.locator('.cv-page .sec-skills').innerText()).includes('Mijn eigen groep') === false, 'lege groep verschijnt in de cv');
  // voorgestelde vaardigheden voor de gekozen categorie staan bovenaan
  await name.fill('Programmeertalen');
  await sk.getByTestId('skill-1-list').click();
  await sk.getByTestId('skill-1-list-chevron').click();
  const firstOpt = await page.locator('[data-testid^="skill-1-list-opt-"]').first().innerText();
  assert(/JavaScript/.test(firstOpt), 'voorstel voor Programmeertalen: ' + firstOpt);
  await page.keyboard.press('Escape');
  // Programmeertalen en het Talen-onderdeel blijven gescheiden
  const langs = page.locator('[data-testid="sec-languages"]');
  assert((await langs.locator('.card-title').innerText()).trim() === 'Talen', 'Talen-onderdeel veranderd');
  assert(!(await page.locator('.cv-page .sec-languages').innerText()).includes('TypeScript'), 'programmeertaal in Talen');
});

await scenario('38. Over mij: titel, invoerlabel, bestaande titel blijft', async () => {
  const p = await open(page, 'profile');
  assert((await page.getByTestId('sec-profile').locator('.card-title').innerText()).trim() === 'Over mij', 'standaardtitel');
  assert(await p.locator('label.field', { hasText: 'Korte introductie' }).count() === 1, 'label Korte introductie ontbreekt');
  assert((await p.getByTestId('profile-text').getAttribute('placeholder')).length < 90, 'placeholder te lang');
  assert(!/—/.test(await page.locator('.editor').innerText()), 'em-streep in de editor');
  await p.getByTestId('profile-text').fill('Korte test.');
  assert((await page.locator('.cv-page .sec-profile h2').innerText()).toUpperCase().includes('OVER MIJ'), 'titel in cv');
  await p.getByTestId('sec-title').fill('Profiel');
  assert((await page.locator('.cv-page .sec-profile h2').innerText()).toUpperCase().includes('PROFIEL'), 'eigen titel niet behouden');
  await p.getByTestId('sec-title').fill('Over mij');
  await collapseAll();
});

await scenario('39. Titelbalk: structuur, sleepgebieden, beveiligde instellingen, niets in de pdf', async () => {
  const tb = page.getByTestId('titlebar');
  const box = await tb.boundingBox();
  assert(box.height >= 43 && box.height <= 48, 'titelbalkhoogte ' + box.height);
  const css = await tb.evaluate((e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, drag: c.getPropertyValue('-webkit-app-region'), bb: c.borderBottomWidth }; });
  assert(css.bg === 'rgb(21, 25, 25)' && css.bb === '1px', 'titelbalk-opmaak ' + JSON.stringify(css));
  assert(css.drag === 'drag', 'titelbalk niet sleepbaar: ' + css.drag);
  assert(await page.getByTestId('titlebar-logo').evaluate((i) => i.complete && i.naturalWidth > 0), 'logo niet geladen');
  assert((await tb.innerText()).includes('CV Studio'), 'naam ontbreekt');
  assert((await activeCv(page)) === 'Sleeptest', 'cv-naam niet in titelbalk');
  assert(await page.evaluate(() => document.title) === 'Sleeptest - CV Studio', 'documenttitel');
  const noDrag = await page.getByTestId('cv-menu').evaluate((e) => getComputedStyle(e).getPropertyValue('-webkit-app-region'));
  assert(noDrag === 'no-drag', 'knop in titelbalk is sleepbaar: ' + noDrag);
  // geen sleepgebied buiten de titelbalk: knoppen, tabs, velden en de splitter kunnen het venster nooit verslepen
  const dragEls = await page.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => getComputedStyle(e).getPropertyValue('-webkit-app-region') === 'drag' && !e.closest('[data-testid="titlebar"]')).length);
  assert(dragEls === 0, 'sleepgebied buiten de titelbalk: ' + dragEls);
  const interactiveInDrag = await page.evaluate(() => [...document.querySelectorAll('[data-testid="titlebar"] button, [data-testid="titlebar"] input, [data-testid="titlebar"] select')].filter((e) => getComputedStyle(e).getPropertyValue('-webkit-app-region') !== 'no-drag').length);
  assert(interactiveInDrag === 0, 'interactief element in sleepgebied');
  // hernoemen werkt door in titelbalk en venstertitel
  await menuAction(page, 'cv-rename');
  await page.getByTestId('prompt-input').fill('Hernoemd cv');
  await page.getByTestId('prompt-ok').click();
  await page.waitForFunction(() => document.title === 'Hernoemd cv - CV Studio');
  assert(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getTitle()) === 'Hernoemd cv - CV Studio', 'venstertitel');
  // beveiligde instellingen en smalle bridge
  const prefs = await app.evaluate(({ BrowserWindow }) => { const p = BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences(); return { c: p.contextIsolation, n: p.nodeIntegration, s: p.sandbox }; });
  assert(prefs.c === true && prefs.n === false && prefs.s === true, 'webPreferences ' + JSON.stringify(prefs));
  const bridge = await page.evaluate(() => ({ req: typeof window.require, proc: typeof window.process, keys: Object.keys(window.cvApi).sort(), upd: Object.keys(window.cvApi.updates).sort() }));
  assert(bridge.req === 'undefined' && bridge.proc === 'undefined', 'Node-toegang in de pagina');
  assert(bridge.upd.join() === 'check,download,getStatus,install,onStatus,openRelease,setAutoCheck', 'updater-API: ' + bridge.upd.join());
  assert(!bridge.keys.some((k) => /ipc|electron|minimize|maximize|close/i.test(k)), 'onverwachte API: ' + bridge.keys.join());
  await page.screenshot({ path: path.join(out, 'titelbalk.png'), clip: { x: 0, y: 0, width: 1400, height: 60 } });
  // PDF zonder app-schil: één A4-pagina, geen titelbalktekst
  await page.getByTestId('tab-sections').click();
  const pers = await open(page, 'personal');
  await pers.getByTestId('p-fullName').fill('Pdf Controle');
  await collapseAll();
  await page.getByTestId('export-pdf').click();
  await page.waitForFunction(() => /1 pagina/.test(document.querySelector('[data-testid="toast"]')?.textContent || ''));
  const pdfBytes = fs.readFileSync(path.join(out, 'Pdf Controle.pdf'));
  const doc = await PDFDocument.load(pdfBytes);
  const { width, height } = doc.getPage(0).getSize();
  assert(doc.getPageCount() === 1 && Math.abs(width - 595.28) < 2 && Math.abs(height - 841.89) < 2, `pdf-afmeting ${width}x${height}`);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(pdfBytes), useSystemFonts: true }).promise;
  const text = (await (await pdf.getPage(1)).getTextContent()).items.map((i) => i.str).join(' ');
  assert(!/CV Studio|Hernoemd cv|v3\./.test(text), 'app-schil in de pdf: ' + text.slice(0, 120));
  await page.getByTestId('toast').click().catch(() => {});
});

// --- venstergedrag met een echte vensterbeheerder (Linux/Xvfb + openbox); op Windows is dit een handmatige controle ---
const have = (bin) => { try { execFileSync('which', [bin], { stdio: 'ignore' }); return true; } catch { return false; } };
await scenario('40. Venster: minimaliseren, maximaliseren, herstellen, slepen, dubbelklikken, formaat', async () => {
  if (process.env.CV_STUDIO_EXE || !have('Xvfb') || !have('openbox') || !have('xdotool')) { console.log('     (overgeslagen: vereist Xvfb, openbox en xdotool op Linux; op Windows handmatig controleren)'); return; }
  const display = ':83';
  const xvfb = spawn('Xvfb', [display, '-screen', '0', '1600x1000x24'], { stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  const wm = spawn('openbox', [], { stdio: 'ignore', env: { ...process.env, DISPLAY: display } });
  await new Promise((r) => setTimeout(r, 900));
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'cvstudio-win-'));
  let a2;
  try {
    a2 = await electron.launch({ args: [root, '--no-sandbox'], env: { ...process.env, DISPLAY: display, CV_STUDIO_USER_DATA: ud, CV_STUDIO_TEST: '1' } });
    const p2 = await a2.firstWindow();
    await p2.waitForSelector('[data-testid="titlebar"]');
    const st = () => a2.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; return { max: w.isMaximized(), min: w.isMinimized(), b: w.getBounds() }; });
    const op = (fn) => a2.evaluate(({ BrowserWindow }, f) => { const w = BrowserWindow.getAllWindows()[0]; return new Function('w', f)(w); }, fn);
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const xd = (...x) => execFileSync('xdotool', x.map(String), { env: { ...process.env, DISPLAY: display } });
    const b0 = (await st()).b;
    await op('w.maximize()'); await wait(500);
    assert((await st()).max, 'maximaliseren mislukt');
    await op('w.unmaximize()'); await wait(500);
    assert(!(await st()).max, 'herstellen mislukt');
    await op('w.minimize()'); await wait(500);
    assert((await st()).min, 'minimaliseren mislukt');
    await op('w.restore()'); await wait(500);
    assert(!(await st()).min, 'terugzetten na minimaliseren mislukt');
    // formaat wijzigen en minimale afmeting
    await op('w.setBounds({ x: 50, y: 50, width: 1300, height: 800 })'); await wait(300);
    assert((await st()).b.width === 1300, 'formaat wijzigen');
    await op('w.setBounds({ x: 50, y: 50, width: 300, height: 200 })'); await wait(300);
    const small = (await st()).b;
    assert(small.width >= 1000 && small.height >= 640, `minimale afmeting niet afgedwongen (${small.width}x${small.height})`);
    await op('w.setBounds({ x: 100, y: 60, width: 1400, height: 900 })'); await wait(300);
    // slepen aan een lege plek van de titelbalk
    let b = (await st()).b;
    xd('mousemove', b.x + 700, b.y + 22); xd('mousedown', 1); xd('mousemove', b.x + 780, b.y + 60); await wait(120); xd('mousemove', b.x + 840, b.y + 90); xd('mouseup', 1); await wait(400);
    const moved = (await st()).b;
    assert(moved.x > b.x + 20 && moved.y > b.y + 20, `titelbalk sleept het venster niet (${b.x},${b.y} -> ${moved.x},${moved.y})`);
    // dubbelklik maximaliseert en herstelt
    b = moved;
    xd('mousemove', b.x + 700, b.y + 22); xd('click', '--repeat', 2, '--delay', 90, 1); await wait(600);
    assert((await st()).max, 'dubbelklik maximaliseert niet');
    b = (await st()).b;
    xd('mousemove', b.x + 700, b.y + 22); xd('click', '--repeat', 2, '--delay', 90, 1); await wait(600);
    assert(!(await st()).max, 'dubbelklik herstelt niet');
    // beginnen te slepen op een knop in de titelbalk verplaatst het venster niet
    b = (await st()).b;
    const btn = await p2.getByTestId('cv-menu').boundingBox();
    xd('mousemove', b.x + btn.x + 8, b.y + btn.y + 8); xd('mousedown', 1); xd('mousemove', b.x + btn.x + 70, b.y + btn.y + 70); await wait(150); xd('mouseup', 1); await wait(300);
    const after = (await st()).b;
    assert(after.x === b.x && after.y === b.y, 'knop in de titelbalk sleept het venster');
    // een wijziging maken en afsluiten: het venster sluit netjes en de gegevens zijn opgeslagen
    await menuAction(p2, 'cv-rename');
    await p2.getByTestId('prompt-input').fill('Sluittest');
    await p2.getByTestId('prompt-ok').click();
    await p2.waitForFunction(() => document.querySelector('[data-testid="save-status"]')?.textContent === 'Alles opgeslagen');
    await a2.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].close());
    await wait(800);
    assert(JSON.parse(fs.readFileSync(path.join(ud, 'data/cvs.json'), 'utf8')).cvs[0].name === 'Sluittest', 'gegevens niet bewaard bij sluiten');
    a2 = null;
  } finally {
    try { await a2?.close(); } catch { /* al gesloten */ }
    wm.kill(); xvfb.kill();
    fs.rmSync(ud, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
  }
});

// --- updates: echte electron-updater tegen een lokale, gecontroleerde feed (er wordt niets gepubliceerd of van GitHub gehaald) ---
function startFeed() {
  const cfg = { version: '9.9.9', body: crypto.randomBytes(3_000_000), corrupt: false, ymlStatus: 200, delay: 0, dropAt: 0, notes: '- Nieuwe titelbalk\n- Vaardigheden kiezen uit een lijst', exeRequests: 0, ymlRequests: 0 };
  const srv = http.createServer((req, res) => {
    const u = req.url.split('?')[0];
    if (/^\/latest.*\.yml$/.test(u)) {
      cfg.ymlRequests++;
      if (cfg.ymlStatus !== 200) { res.statusCode = cfg.ymlStatus; return res.end('x'); }
      const sha = crypto.createHash('sha512').update(cfg.body).digest('base64');
      res.setHeader('content-type', 'text/yaml');
      return res.end(`version: ${cfg.version}\nfiles:\n  - url: CV-Studio-Setup-${cfg.version}.exe\n    sha512: ${sha}\n    size: ${cfg.body.length}\npath: CV-Studio-Setup-${cfg.version}.exe\nsha512: ${sha}\nreleaseDate: '2026-10-21T10:00:00.000Z'\nreleaseNotes: ${JSON.stringify(cfg.notes)}\n`);
    }
    if (/\.exe$/.test(u)) {
      cfg.exeRequests++;
      // 'corrupt': het manifest klopt, maar de bytes zijn beschadigd (één byte omgedraaid)
      const body = cfg.corrupt ? Buffer.concat([Buffer.from([cfg.body[0] ^ 255]), cfg.body.subarray(1)]) : cfg.body;
      res.setHeader('content-length', String(body.length));
      res.setHeader('content-type', 'application/octet-stream');
      let sent = 0;
      const tick = () => {
        if (res.destroyed) return;
        if (cfg.dropAt && sent >= cfg.dropAt) return req.socket.destroy();
        if (sent >= body.length) return res.end();
        const chunk = body.subarray(sent, sent + 131072);
        sent += chunk.length;
        res.write(chunk);
        setTimeout(tick, cfg.delay);
      };
      return tick();
    }
    res.statusCode = 404; res.end();
  });
  return new Promise((resolve) => srv.listen(0, '127.0.0.1', () => resolve({ cfg, url: `http://127.0.0.1:${srv.address().port}`, close: () => srv.close() })));
}
const currentVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const settingsFile = path.join(userData, 'settings.json');
const relaunch = async (env, settings) => {
  await app.close();
  if (settings === null) fs.rmSync(settingsFile, { force: true }); else fs.writeFileSync(settingsFile, JSON.stringify(settings));
  ({ app, page } = await launch(env));
};
const about = async () => { await menuAction(page, 'about-open'); await page.getByTestId('about-dialog').waitFor(); };
const closeAbout = async () => { await page.getByTestId('about-close').click(); };
const checkNow = async () => {
  await page.getByTestId('upd-check').click();
  await page.waitForTimeout(400); // de controle start via IPC; zonder dit zou nog de vorige uitkomst gelezen worden
  await page.waitForFunction(() => document.querySelector('[data-testid="upd-result"]')?.textContent !== 'Controleren…');
};
const result = () => page.getByTestId('upd-result').innerText();

await scenario('41. Updates: nieuwste versie, oudere en pre-release worden genegeerd, versievergelijking', async () => {
  const feed = await startFeed();
  try {
    await relaunch({ CV_STUDIO_UPDATE_FEED: feed.url }, { autoCheckUpdates: false });
    await about();
    assert(await page.getByTestId('upd-current').innerText() === currentVersion, 'huidige versie');
    assert(await page.getByTestId('upd-last').innerText() === 'Nog niet gecontroleerd', 'laatste controle vooraf');
    feed.cfg.version = currentVersion;
    await checkNow();
    assert(/nieuwste versie/.test(await result()) && await page.getByTestId('upd-available').count() === 0, 'zelfde versie: ' + await result());
    assert(await page.getByTestId('update-banner').count() === 0, 'melding bij gelijke versie');
    feed.cfg.version = '0.0.1';
    await checkNow();
    assert(/nieuwste versie/.test(await result()), 'oudere versie wordt aangeboden (downgrade): ' + await result());
    feed.cfg.version = '99.0.0-beta.1';
    await checkNow();
    assert(/nieuwste versie/.test(await result()), 'pre-release wordt aangeboden: ' + await result());
    const [maj] = currentVersion.split('.');
    feed.cfg.version = `${maj}.99.0`;
    await checkNow();
    assert(await page.getByTestId('upd-available').innerText() === `${maj}.99.0`, 'nieuwere stabiele versie niet gemeld: ' + await result());
    assert(/beschikbaar/.test(await result()), 'resultaattekst');
    assert(await page.getByTestId('upd-last').innerText() !== 'Nog niet gecontroleerd', 'laatste controle niet bijgewerkt');
    assert(feed.cfg.ymlRequests >= 4, 'geen controles uitgevoerd');
    await closeAbout();
  } finally { feed.close(); }
});

await scenario('42. Updates: melding, releasenotities, Later; zonder ondertekening alleen verwijzen, geen installatie', async () => {
  const feed = await startFeed();
  try {
    feed.cfg.version = '9.9.9';
    // automatische controle (aan, nog nooit gecontroleerd): melding verschijnt vanzelf kort na het opstarten
    await relaunch({ CV_STUDIO_UPDATE_FEED: feed.url }, null);
    const banner = page.getByTestId('update-banner');
    await banner.waitFor({ timeout: 15000 });
    assert((await banner.innerText()).includes('Update beschikbaar') && (await banner.innerText()).includes('CV Studio 9.9.9 is beschikbaar.'), 'tekst van de melding: ' + await banner.innerText());
    assert(await page.getByTestId('update-go').count() === 0, 'Bijwerken getoond terwijl automatisch installeren geblokkeerd is');
    assert(await page.getByTestId('update-open').count() === 1 && await page.getByTestId('update-later').count() === 1 && await page.getByTestId('update-notes-toggle').count() === 1, 'knoppen: naar downloadpagina, Later en Wat is er nieuw?');
    assert(/niet beschikbaar.*ondertekend/s.test(await page.getByTestId('update-blocked').innerText()), 'uitleg over ondertekening ontbreekt');
    await page.getByTestId('update-notes-toggle').click();
    assert((await page.getByTestId('update-notes').innerText()).includes('Nieuwe titelbalk'), 'releasenotities niet getoond');
    await page.evaluate(fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8'));
    const axeBanner = await page.evaluate(async () => (await window.axe.run({ include: [['[data-testid="update-banner"]']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => v.id));
    assert(axeBanner.length === 0, 'axe op de updatemelding: ' + axeBanner.join());
    await page.screenshot({ path: path.join(out, 'update-melding.png') });
    await page.getByTestId('update-later').click();
    assert(await banner.count() === 0, 'Later sluit de melding niet');
    assert(feed.cfg.exeRequests === 0, 'er is gedownload zonder vertrouwde ondertekening');
    // de controle is bewaard; de app blijft bruikbaar tijdens de melding
    const saved = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    assert(typeof saved.lastUpdateCheck === 'number' && /9\.9\.9/.test(saved.lastUpdateResult), 'controleresultaat niet bewaard: ' + JSON.stringify(saved));
    await about();
    assert(/ondertekend/.test(await page.getByTestId('upd-blocked').innerText()), 'About mist de uitleg');
    assert(/GitHub/.test(await page.getByTestId('upd-privacy').innerText()) && /geen cv-inhoud/.test(await page.getByTestId('upd-privacy').innerText()) && /telemetrie/.test(await page.getByTestId('upd-privacy').innerText()), 'privacyuitleg');
    assert(!/—/.test(await page.getByTestId('about-dialog').innerText()), 'em-streep in About');
    await page.screenshot({ path: path.join(out, 'over-updates.png') });
    // automatisch controleren uitzetten blijft bewaard na herstart en voorkomt de volgende automatische controle
    await page.getByTestId('upd-auto').click();
    await page.waitForFunction(() => document.querySelector('[data-testid="upd-auto"]')?.checked === false, null, { timeout: 5000 }).catch(() => {});
    assert(!(await page.getByTestId('upd-auto').isChecked()), 'schakelaar niet uit');
    await closeAbout();
    await app.close();
    assert(JSON.parse(fs.readFileSync(settingsFile, 'utf8')).autoCheckUpdates === false, 'voorkeur niet bewaard');
    fs.writeFileSync(settingsFile, JSON.stringify({ ...JSON.parse(fs.readFileSync(settingsFile, 'utf8')), lastUpdateCheck: null }));
    const reqs = feed.cfg.ymlRequests;
    ({ app, page } = await launch({ CV_STUDIO_UPDATE_FEED: feed.url }));
    await page.waitForTimeout(2500);
    assert(feed.cfg.ymlRequests === reqs && await page.getByTestId('update-banner').count() === 0, 'automatische controle ondanks uitgezet');
  } finally { feed.close(); }
});

await scenario('43. Updates: bijwerken met voortgang, controle van echtheid, mislukken en opnieuw proberen', async () => {
  const feed = await startFeed();
  try {
    feed.cfg.version = '9.9.9';
    feed.cfg.delay = 120; // 3 MB in ~3 s: voortgang is te zien
    await relaunch({ CV_STUDIO_UPDATE_FEED: feed.url, CV_STUDIO_UPDATE_TRUST: '1' }, { autoCheckUpdates: true, lastUpdateCheck: null, lastUpdateResult: null });
    const banner = page.getByTestId('update-banner');
    await banner.waitFor({ timeout: 15000 });
    assert(await page.getByTestId('update-go').count() === 1 && await page.getByTestId('update-open').count() === 0, 'met vertrouwde ondertekening: Bijwerken verwacht');
    // 1. beschadigde download: checksum klopt niet, wordt geweigerd; opnieuw proberen mislukt opnieuw
    feed.cfg.corrupt = true;
    await page.getByTestId('update-go').click();
    await page.waitForSelector('[data-testid="update-banner"][data-kind="error"]', { timeout: 30000 });
    assert(/geweigerd.*echtheid/s.test(await page.getByTestId('update-error').innerText()), 'geen duidelijke melding bij beschadigde update: ' + await page.getByTestId('update-error').innerText());
    assert(await page.getByTestId('update-banner').getByText('Herstarten en installeren').count() === 0, 'beschadigde update als klaar gemeld');
    assert(await page.getByTestId('update-retry').count() === 1, 'Opnieuw proberen ontbreekt');
    await page.getByTestId('update-retry').click();
    await page.waitForSelector('[data-testid="update-banner"][data-kind="error"]', { timeout: 30000 });
    // 2. onderbroken download
    feed.cfg.corrupt = false;
    feed.cfg.dropAt = 1_000_000;
    await page.getByTestId('update-retry').click();
    await page.waitForSelector('[data-testid="update-banner"][data-kind="error"]', { timeout: 30000 });
    const msg = await page.getByTestId('update-error').innerText();
    assert(/onderbroken|mislukt/.test(msg), 'melding bij onderbroken download: ' + msg);
    assert(await page.locator('.cv-page').isVisible(), 'app niet bruikbaar na mislukte download');
    // 3. opnieuw proberen met werkende server: voortgang, daarna klaar om te installeren
    feed.cfg.dropAt = 0;
    await page.getByTestId('update-retry').click();
    await page.waitForSelector('[data-testid="update-banner"][data-kind="downloading"]', { timeout: 15000 });
    const seen = new Set();
    const t0 = Date.now();
    while (Date.now() - t0 < 30000) {
      const k = await page.getByTestId('update-banner').getAttribute('data-kind');
      if (k === 'ready') break;
      if (k === 'downloading') seen.add(await page.getByTestId('update-progress').getAttribute('aria-valuenow'));
      await page.waitForTimeout(150);
    }
    assert(await page.getByTestId('update-banner').getAttribute('data-kind') === 'ready', 'update niet klaar');
    assert([...seen].some((v) => Number(v) > 0 && Number(v) < 100), 'geen tussentijdse voortgang gezien: ' + [...seen].join(','));
    assert((await page.getByTestId('update-banner').innerText()).includes('Herstarten en installeren') && await page.getByTestId('update-later').count() === 1, 'knoppen Herstarten en installeren / Later');
    await page.screenshot({ path: path.join(out, 'update-klaar.png') });
    await page.getByTestId('update-later').click();
    assert(await page.getByTestId('update-banner').count() === 0, 'Later sluit niet');
    // de app is niet afgesloten en gaf geen herstart zonder keuze
    assert(await page.locator('.cv-page').isVisible(), 'app gesloten zonder keuze');
  } finally { feed.close(); }
});

await scenario('44. Updates: offline, ontbrekende release en snelheidslimiet geven begrijpelijke meldingen', async () => {
  const feed = await startFeed();
  const dead = feed.url;
  feed.close();
  await relaunch({ CV_STUDIO_UPDATE_FEED: dead }, { autoCheckUpdates: false });
  await about();
  await checkNow();
  assert(/Geen internetverbinding/.test(await result()) && /offline/.test(await result()), 'offline-melding: ' + await result());
  assert(await page.getByTestId('upd-check').isEnabled(), 'controleren kan niet opnieuw na een fout');
  await closeAbout();
  assert(await page.locator('.cv-page').isVisible(), 'app niet bruikbaar offline');
  const f2 = await startFeed();
  try {
    await relaunch({ CV_STUDIO_UPDATE_FEED: f2.url }, { autoCheckUpdates: false });
    await about();
    f2.cfg.ymlStatus = 404;
    await checkNow();
    assert(/nog geen gepubliceerde release/.test(await result()), '404-melding: ' + await result());
    f2.cfg.ymlStatus = 403;
    await checkNow();
    assert(/GitHub staat nu even geen verzoeken meer toe/.test(await result()), '403-melding: ' + await result());
    f2.cfg.ymlStatus = 200; f2.cfg.version = currentVersion;
    await checkNow();
    assert(/nieuwste versie/.test(await result()), 'herstel na fout: ' + await result());
    await closeAbout();
  } finally { f2.close(); }
  await relaunch({}, { autoCheckUpdates: true, lastUpdateCheck: null, lastUpdateResult: null });
});

await scenario('46. Redesign: rustige werkbalk, eigen keuzelijst, smaragdpalet, weinig kaders, zichtbare focus', async () => {
  // werkbalk: één hoofdactie en één menu; geen rij met losse pictogramknoppen meer
  const bar = page.getByTestId('titlebar');
  assert(await page.locator('.version-bar, .editor-top').count() === 0, 'de oude rij met pictogramknoppen bestaat nog');
  const visibleButtons = await bar.locator('.tb-actions button').count();
  assert(visibleButtons === 2, `werkbalk toont ${visibleButtons} knoppen rechts; verwacht Exporteer PDF en het menu`);
  assert((await page.getByTestId('export-pdf').innerText()).trim() === 'Exporteer PDF', 'hoofdactie');
  assert(await page.locator('.preview-top [data-testid="export-pdf"]').count() === 0, 'exportknop staat dubbel');
  assert(await page.locator('.editor-scroll').evaluate((e) => e.parentElement.querySelectorAll(':scope > button').length) === 0, 'losse knoppen boven de tabs');
  await page.getByTestId('cv-menu').click();
  const items = (await page.locator('.menu-pop [role="menuitem"]').allInnerTexts()).map((t) => t.trim());
  for (const l of ['Nieuw cv…', 'Dupliceren…', 'Hernoemen…', 'JSON importeren…', 'JSON exporteren…', 'Over CV Studio en updates', 'Cv verwijderen…']) assert(items.some((t) => t.startsWith(l)), `menu mist ${l}: ${items.join(' | ')}`);
  assert(await page.locator('.menu-pop [role="separator"]').count() >= 2, 'menu zonder scheidingen');
  await page.keyboard.press('Escape');
  assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'cv-menu', 'focus keert niet terug naar het menu-knopje');

  // eigen keuzelijst: geen standaard <select>, volledige toetsenbordbediening
  assert(await page.locator('select').count() === 0, 'er is nog een standaard <select>');
  const trig = page.getByTestId('version-select');
  assert(await trig.getAttribute('role') === 'combobox' && await trig.getAttribute('aria-haspopup') === 'listbox', 'selectrol');
  await trig.focus();
  await page.keyboard.press('Enter');
  assert(await trig.getAttribute('aria-expanded') === 'true', 'Enter opent de lijst niet');
  const optCount = await page.locator('[role="option"]').count();
  assert(optCount >= 2, 'lijst mist opties en actie');
  await page.keyboard.press('End');
  assert((await page.locator('[role="option"][id]').last().getAttribute('id')) === await trig.getAttribute('aria-activedescendant'), 'End gaat niet naar het laatste item');
  assert(/Nieuw cv/.test(await page.locator('[role="option"]').last().innerText()), 'actie "Nieuw cv" ontbreekt onderaan');
  await page.keyboard.press('Home');
  const first = await trig.getAttribute('aria-activedescendant');
  await page.keyboard.press('ArrowDown');
  assert(await trig.getAttribute('aria-activedescendant') !== first, 'pijltje omlaag verplaatst niets');
  await page.keyboard.press('Escape');
  assert(await trig.getAttribute('aria-expanded') === 'false' && await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'version-select', 'Escape sluit niet of focus kwijt');
  // kiezen met toetsenbord en typen om te zoeken
  await trig.click();
  await page.locator('[data-testid^="version-select-opt-"]').first().click();
  const before = await activeCv(page);
  await trig.focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.type('S'); await page.keyboard.press('Enter');
  assert((await activeCv(page)).startsWith('S') || (await activeCv(page)) === before, 'zoeken door typen in de lijst');
  // "Nieuw cv" in de lijst opent dezelfde naamvraag
  await trig.click();
  await page.getByTestId('version-select-action-new').click();
  await page.getByTestId('prompt-input').fill('Uit de lijst');
  await page.getByTestId('prompt-ok').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="version-select-value"]')?.textContent === 'Uit de lijst');

  // palet: smaragd als accent, geen lime meer, rustige achtergrond
  const tok = await page.evaluate(() => { const c = getComputedStyle(document.documentElement); return { accent: c.getPropertyValue('--accent').trim(), bg: c.getPropertyValue('--bg').trim(), surface: c.getPropertyValue('--surface').trim(), body: getComputedStyle(document.body).backgroundColor, btn: getComputedStyle(document.querySelector('[data-testid="export-pdf"]')).backgroundColor }; });
  assert(tok.accent === '#00674f' && tok.bg === '#0e1111' && tok.surface === '#151919', 'ontwerptokens: ' + JSON.stringify(tok));
  assert(tok.body === 'rgb(14, 17, 17)' && tok.btn === 'rgb(0, 103, 79)', 'toegepaste kleuren: ' + JSON.stringify(tok));
  await collapseAll();
  const sk = await open(page, 'skills');
  if (!(await sk.getByTestId('skill-0').count())) await sk.getByTestId('skill-add').click();
  const lime = await page.evaluate(() => {
    const isLime = (v) => /rgb\((1[6-9]\d|2\d\d), (2[2-5]\d), (\d{1,2}|[1-6]\d)\)/.test(v) && !/rgb\((0|1\d?), /.test(v);
    return [...document.querySelectorAll('.shell *, .popover *')].filter((e) => { const c = getComputedStyle(e); return isLime(c.backgroundColor) || isLime(c.color) || (parseFloat(c.borderTopWidth) > 0 && isLime(c.borderTopColor)); }).length;
  });
  assert(lime === 0, `${lime} elementen hebben nog een limegroene kleur`);
  // weinig kaders: ingeklapte onderdelen hebben geen omlijning; in een uitgeklapt onderdeel hoogstens een scheidingslijn
  const rows = await page.locator('.card').evaluateAll((els) => els.filter((e) => ['Top', 'Right', 'Bottom', 'Left'].some((x) => parseFloat(getComputedStyle(e)[`border${x}Width`]) > 0)).length);
  assert(rows === 0, `${rows} onderdeelrijen hebben nog een rand`);
  // een 'kader' is een omlijning rond een vlak (twee of meer zijden); een scheidingslijn (één zijde) telt apart
  const nest = await sk.evaluate((root) => {
    const sides = (e) => { const c = getComputedStyle(e); return ['Top', 'Right', 'Bottom', 'Left'].filter((x) => parseFloat(c[`border${x}Width`]) > 0 && c[`border${x}Style`] !== 'none').length; };
    const all = [root, ...root.querySelectorAll('div, section, fieldset')];
    const outlines = all.filter((e) => sides(e) >= 2);
    const dividers = all.filter((e) => sides(e) === 1).length;
    const depth = (e) => { let d = 0; for (let n = e; n && n !== root.parentElement; n = n.parentElement) if (outlines.includes(n)) d++; return d; };
    const cls = (e) => (e.className && e.className.baseVal === undefined ? e.className : '').toString().trim().split(/\s+/)[0] || e.tagName.toLowerCase();
    // invoervelden mogen een rand houden; een omlijnd vlak dat andere elementen omvat (behalve de delen van één invoerveld) is een kader
    const frames = outlines.filter((e) => !e.matches('.combo, .input, .num, .select, .seg, input, textarea') && !e.closest('.combo, .num, .select'));
    return { outlines: frames.length, names: frames.map(cls), dividers, depth: Math.max(0, ...frames.map(depth)) };
  });
  assert(nest.outlines === 0, `omlijnde vlakken in Vaardigheden: ${nest.outlines} (${nest.names.join(', ')})`);
  console.log(`     (Vaardigheden uitgeklapt: ${nest.outlines} omlijnde vlakken, ${nest.dividers} scheidingslijnen)`);
  // zichtbare focus: toetsenbordfocus geeft een duidelijke smaragdrand
  await page.getByTestId('tab-layout').focus();
  await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => { const cs = getComputedStyle(document.activeElement); return { w: parseFloat(cs.outlineWidth), st: cs.outlineStyle, col: cs.outlineColor }; });
  assert(ring.st === 'solid' && ring.w >= 2 && ring.col === 'rgb(61, 190, 156)', 'focusring: ' + JSON.stringify(ring));
  await page.getByTestId('tab-sections').click();
  await page.screenshot({ path: path.join(out, 'redesign.png') });
});

await scenario('45. Toegankelijkheid (axe-core) van lijst, titelbalk, About en updatemelding', async () => {
  await page.evaluate(fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8')); // via CDP: de strikte CSP blijft ongemoeid
  const run = (include) => page.evaluate(async (inc) => {
    const r = await window.axe.run({ include: inc }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
    return r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
  }, include);
  const bad = [];
  bad.push(...(await run([['[data-testid="titlebar"]']])).map((x) => 'titelbalk ' + x));
  const sk = await open(page, 'skills');
  if (!(await sk.getByTestId('skill-0').count())) await sk.getByTestId('skill-add').click();
  await sk.getByTestId('skill-0-list').click();
  await sk.getByTestId('skill-0-list').fill('Ja');
  await page.getByTestId('skill-0-list-popup').waitFor();
  bad.push(...(await run([['.combo-pop'], ['[data-testid="sec-skills"]']])).map((x) => 'skill-lijst ' + x));
  await page.keyboard.press('Escape');
  await sk.getByTestId('skill-0-name-chevron').click();
  await page.getByTestId('skill-0-name-popup').waitFor();
  bad.push(...(await run([['.combo-pop']])).map((x) => 'categorie-lijst ' + x));
  await page.keyboard.press('Escape');
  await sk.getByTestId('sec-skills-expand').click();
  await page.getByTestId('sec-experience-menu').click();
  bad.push(...(await run([['.menu-pop']])).map((x) => 'verplaatsmenu ' + x));
  await page.keyboard.press('Escape');
  await about();
  bad.push(...(await run([['[data-testid="about-dialog"]']])).map((x) => 'about ' + x));
  await closeAbout();
  assert(bad.length === 0, 'axe-schendingen:\n     ' + bad.join('\n     '));
});

await scenario('47. Samengestelde invoer: typen opent niets onverwachts, chevron opent en sluit, toetsenbord en ARIA', async () => {
  await page.getByTestId('tab-sections').click();
  await collapseAll();
  const sk = await open(page, 'skills');
  if (!(await sk.getByTestId('skill-0').count())) await sk.getByTestId('skill-add').click();
  const input = sk.getByTestId('skill-0-list');
  const chev = sk.getByTestId('skill-0-list-chevron');
  const popup = page.getByTestId('skill-0-list-popup');
  // één gedeelde vorm: de rand zit om het geheel, het invoerveld zelf heeft geen rand en de chevron een scheiding
  const shape = await input.evaluate((el) => {
    const wrap = el.parentElement; const w = getComputedStyle(wrap); const i = getComputedStyle(el); const c = getComputedStyle(el.parentElement.querySelector('button'));
    const rb = wrap.getBoundingClientRect(); const cb = el.parentElement.querySelector('button').getBoundingClientRect(); const ib = el.getBoundingClientRect();
    return { wrapBorder: parseFloat(w.borderTopWidth), inputBorder: parseFloat(i.borderTopWidth), sep: parseFloat(c.borderLeftWidth), chevW: cb.width, overlap: ib.right > cb.left + 0.5,
      centered: Math.abs((cb.top + cb.height / 2) - (rb.top + rb.height / 2)) < 1.5, sameH: Math.abs(cb.height - (rb.height - 2)) < 2 };
  });
  assert(shape.wrapBorder === 1 && shape.inputBorder === 0 && shape.sep === 1, 'vorm: ' + JSON.stringify(shape));
  assert(shape.chevW >= 28 && shape.chevW <= 40 && !shape.overlap && shape.centered, 'chevron: ' + JSON.stringify(shape));
  // ARIA
  assert(await input.getAttribute('role') === 'combobox' && await input.getAttribute('aria-expanded') === 'false', 'invoer is geen combobox');
  assert(await chev.evaluate((e) => e.tagName) === 'BUTTON' && !!(await chev.getAttribute('aria-label')) && await chev.getAttribute('aria-expanded') === 'false', 'chevron is geen knop met label');
  // klikken in het veld bewerkt alleen
  await input.click();
  assert(!(await popup.count()), 'klikken in het veld opent de lijst');
  // typen toont suggesties zonder bladerlijst of categorieknoppen
  await input.fill('Ja');
  await popup.waitFor();
  assert(await page.locator('.combo-cats').count() === 0, 'categorieknoppen bij typen');
  assert(await input.getAttribute('aria-expanded') === 'true', 'aria-expanded bij open lijst');
  await page.keyboard.press('Escape');
  assert(!(await popup.count()) && await input.inputValue() === 'Ja', 'Escape sluit de lijst en behoudt de tekst');
  // chevron opent en sluit, en laat de waarde staan
  await chev.click();
  await popup.waitFor();
  assert(await input.inputValue() === 'Ja' && await chev.getAttribute('aria-expanded') === 'true', 'chevron overschrijft de waarde of mist aria-expanded');
  await chev.click();
  await popup.waitFor({ state: 'detached' });
  assert(await input.inputValue() === 'Ja', 'waarde verloren bij sluiten via chevron');
  await input.fill('');
  // toetsenbord: pijl omlaag opent, Escape sluit
  await input.focus();
  await page.keyboard.press('ArrowDown');
  await popup.waitFor();
  await page.keyboard.press('ArrowDown');
  assert(!!(await input.getAttribute('aria-activedescendant')), 'geen actieve optie via aria-activedescendant');
  await page.keyboard.press('Escape');
  assert(!(await popup.count()), 'Escape sluit niet');
  // de chevron staat niet in de tabvolgorde en er is geen tweede opener
  assert(await chev.getAttribute('tabindex') === '-1', 'chevron in tabvolgorde');
  assert(await sk.getByTestId('skill-0').locator('[aria-haspopup="listbox"]').count() <= 2, 'dubbele openers');
});

await scenario('48. Oppervlaktehiërarchie: bedieningselementen zijn lichter dan hun ondergrond; geen horizontale overloop', async () => {
  const lum = (rgb) => { const [r, g, b] = rgb.match(/[\d.]+/g).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  await page.getByTestId('tab-sections').click();
  await collapseAll();
  const sk = await open(page, 'skills');
  await sk.getByTestId('skill-display').getByText('Chips').click().catch(() => {});
  if (!(await sk.getByTestId('skill-0').count())) await sk.getByTestId('skill-add').click();
  const bgOf = (e) => { for (let n = e; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c && !/rgba?\(0, 0, 0, 0\)|transparent/.test(c)) return c; } return 'rgb(14, 17, 17)'; };
  const pairs = await page.evaluate((src) => {
    const bg = new Function('e', 'return (' + src + ')(e)'); const out = [];
    const sel = '.editor .card-body .input, .editor .card-body .combo, .editor .card-body .seg, .editor .card-body .pill-wrap, .editor .card-body .group-head .combo, .editor .toggle-track, .editor .num';
    for (const e of document.querySelectorAll(sel)) { const r = e.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const own = getComputedStyle(e).backgroundColor; if (/rgba?\(0, 0, 0, 0\)/.test(own)) continue; out.push([e.className.toString().split(' ')[0], own, bg(e.parentElement)]); }
    return out;
  }, bgOf.toString());
  assert(pairs.length >= 4, 'te weinig bedieningselementen gevonden: ' + pairs.length);
  const wrong = pairs.filter(([, own, parent]) => lum(own) <= lum(parent) + 0.0005);
  assert(wrong.length === 0, 'bedieningselementen niet lichter dan de ondergrond: ' + JSON.stringify(wrong.slice(0, 4)));
  // lagen: app < oppervlak < verhoogd < zacht
  const t = await page.evaluate(() => { const c = getComputedStyle(document.documentElement); return ['--bg', '--surface', '--elevated', '--soft'].map((k) => c.getPropertyValue(k).trim()); });
  assert(t.join() === '#0e1111,#151919,#1b2020,#202626', 'laagtokens: ' + t.join());
  // geen horizontale overloop in smalle en brede editor, op elk tabblad
  const splitter = page.getByTestId('splitter');
  for (const w of [380, 900]) {
    await page.mouse.move(0, 0);
    const b = await splitter.boundingBox();
    await page.mouse.move(b.x + 2, b.y + 300); await page.mouse.down(); await page.mouse.move(w, b.y + 300, { steps: 6 }); await page.mouse.up();
    for (const tab of ['sections', 'layout', 'style']) {
      await page.getByTestId(`tab-${tab}`).click();
      const o = await page.locator('.editor-scroll').evaluate((e) => ({ s: e.scrollWidth, c: e.clientWidth }));
      assert(o.s <= o.c + 1, `horizontale overloop (${tab}, ${w}px): ${JSON.stringify(o)}`);
    }
  }
  await page.getByTestId('tab-sections').click();
  const b2 = await splitter.boundingBox();
  await page.mouse.move(b2.x + 2, b2.y + 300); await page.mouse.down(); await page.mouse.move(640, b2.y + 300, { steps: 6 }); await page.mouse.up();
});

await scenario('49. Vaardighedenlayout: rechthoekige groepen zonder geleidelijn, rijen met labelkolom, geen categoriebalk in een bekende groep', async () => {
  await page.getByTestId('tab-sections').click();
  await collapseAll();
  const sk = await open(page, 'skills');
  await sk.getByTestId('skill-mode-grouped').click();
  await sk.getByTestId('skill-display-chips').click();
  while (await sk.locator('[data-testid^="skill-"][data-testid$="-remove"]').count()) await sk.locator('[data-testid^="skill-"][data-testid$="-remove"]').first().click();
  await sk.getByTestId('skill-add').click();
  await sk.getByTestId('skill-0-name').fill('Programmeertalen');
  await page.keyboard.press('Escape');
  await sk.getByTestId('skill-add').click();
  await sk.getByTestId('skill-1-name').fill('Mijn eigen groep');
  await page.keyboard.press('Escape');
  // geen verticale geleidelijn, wel horizontale scheiding tussen groepen
  const geo = await sk.evaluate((root) => {
    const g = [...root.querySelectorAll('.group')];
    const r = (e) => e.getBoundingClientRect();
    const body = g[0].querySelector('.group-body'); const head = g[0].querySelector('.group-head');
    const hb = r(head), bb = r(body.querySelector('.combo'));
    const actions = g[0].querySelector('.group-actions'); const ab = r(actions.lastElementChild);
    const actionGap = Math.round(r(actions.firstElementChild).left - r(head.querySelector('.combo')).right);
    const bodyLeft = Math.round(bb.left); const chipsLeft = Math.round(r(body.querySelector('.pills') ?? body.querySelector('.combo')).left);
    const lab = root.querySelector('.field.row .field-label'); const seg = root.querySelector('.field.row .seg');
    return {
      n: g.length, guide: parseFloat(getComputedStyle(body).borderLeftWidth), top: g.map((e) => parseFloat(getComputedStyle(e).borderTopWidth)),
      indent: bb.left - hb.left, rightHead: Math.round(hb.right), rightInput: Math.round(bb.right), actionsRight: Math.round(ab.right),
      actionGap, bodyLeft, chipsLeft, headH: r(head.querySelector('.combo')).height, inputH: bb.height,
      labelLeftOfControl: r(lab).right <= r(seg).left && Math.abs((r(lab).top + r(lab).height / 2) - (r(seg).top + r(seg).height / 2)) < 4
    };
  });
  assert(geo.guide === 0, 'verticale geleidelijn aanwezig');
  assert(geo.top.every((w) => w === 1), 'horizontale scheiding tussen groepen ontbreekt: ' + JSON.stringify(geo.top));
  assert(geo.indent >= 40, 'te weinig inspringing: ' + geo.indent);
  assert(geo.rightHead - geo.rightInput >= 40, `invoer niet duidelijk smaller dan de kop: ${JSON.stringify(geo)}`);
  assert(geo.actionsRight <= geo.rightHead && geo.actionsRight >= geo.rightHead - 12, `acties niet uiterst rechts: ${JSON.stringify(geo)}`);
  assert(geo.actionGap >= 14 && geo.actionGap <= 40, `ruimte tussen veld en acties: ${geo.actionGap}`);
  assert(geo.chipsLeft === geo.bodyLeft, 'chips sluiten niet aan op het invoergebied');
  assert(geo.headH > geo.inputH, 'groepskop niet duidelijker dan de ingesprongen invoer');
  assert(geo.labelLeftOfControl, 'label staat niet links van de bediening');
  // bekende groep: geen categoriebalk, direct gefilterde lijst; onbekende groep houdt de balk
  await sk.getByTestId('skill-0-list-chevron').click();
  await page.getByTestId('skill-0-list-popup').waitFor();
  assert(await page.locator('.combo-cats').count() === 0, 'categoriebalk in bekende groep');
  assert(await page.getByTestId('skill-0-list-popup').getByRole('option', { name: /TypeScript/ }).count() > 0, 'lijst niet gefilterd op de groep');
  await page.keyboard.press('Escape');
  await sk.getByTestId('skill-1-list-chevron').click();
  await page.getByTestId('skill-1-list-popup').waitFor();
  assert(await page.locator('.combo-cats').count() === 1, 'categoriebalk ontbreekt in groep zonder bekende categorie');
  await page.keyboard.press('Escape');
});


// ================= v3.2.0: afsluitende tekst per onderdeel =================
const FOOT = 'Meer projecten bekijken op GitHub';
const footerOf = (type) => page.locator(`.cv-page .sec-${type} .sec-footer`);
const addFooter = async (type, text, linkWord, url) => {
  const card = await open(page, type);
  if (await card.getByTestId('footer-add').count()) await card.getByTestId('footer-add').click();
  await card.getByTestId('footer-text').fill(text);
  if (linkWord) {
    const at = text.indexOf(linkWord);
    await card.getByTestId('footer-text').evaluate((el, [a, b]) => { el.focus(); el.setSelectionRange(a, b); }, [at, at + linkWord.length]);
    await card.getByTestId('footer-link').click();
    await card.getByTestId('footer-link-url').fill(url);
    await card.getByTestId('footer-link-save').click();
  }
  return card;
};
const pdfInfo = async (file) => {
  const bytes = fs.readFileSync(file);
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: true }).promise;
  const pg = await pdf.getPage(1);
  const text = (await pg.getTextContent()).items.map((i) => i.str).join(' ');
  const links = (await pg.getAnnotations()).filter((a) => a.subtype === 'Link').map((a) => ({ url: a.url, rect: a.rect }));
  // ruwe controle op echte /Link-annotaties met /URI-actie in het bestand zelf
  const doc = await PDFDocument.load(bytes);
  const raw = doc.getPage(0).node.Annots()?.asArray().map((r) => doc.context.lookup(r)).map((a) => String(a)).filter((a) => /\/Subtype\s*\/Link/.test(a)).length ?? 0;
  return { pages: pdf.numPages, text, links, rawLinks: raw };
};

await scenario('50. Afsluitende tekst: leeg standaard, geen ruimte, geen placeholder, niets automatisch ingevuld', async () => {
  await newCv('Slotnotitie');
  await page.getByTestId('tab-layout').click();
  await page.getByTestId('tpl-sidebar').click();
  await page.getByTestId('tab-sections').click();
  const proj = await open(page, 'projects');
  await proj.getByTestId('proj-add').click();
  await proj.getByTestId('proj-0-name').fill('STEMM');
  await proj.getByTestId('proj-add').click();
  await proj.getByTestId('proj-1-name').fill('QuCT');
  assert(await page.locator('.cv-page .sec-footer').count() === 0, 'footer zonder invoer zichtbaar');
  const h0 = await page.locator('.cv-page .sec-projects').evaluate((e) => e.getBoundingClientRect().height);
  // elk uitgeklapt onderdeel heeft dezelfde stille actie
  for (const t of ['personal', 'profile', 'projects', 'education', 'experience', 'skills', 'languages']) {
    const c = await open(page, t);
    assert(await c.getByTestId('footer-add').count() === 1, `actie ontbreekt in ${t}`);
    assert((await c.getByTestId('footer-add').innerText()).trim() === 'Afsluitende tekst', 'label: ' + await c.getByTestId('footer-add').innerText());
    assert(await c.getByTestId('footer-text').count() === 0, 'veld standaard open in ' + t);
    await c.getByTestId(`sec-${t}-expand`).click();
  }
  await page.getByTestId('add-section').click();
  await page.getByTestId('add-extra').click();
  assert(await page.locator('[data-testid="sec-custom"]').last().getByTestId('footer-add').count() === 1, 'actie ontbreekt in eigen onderdeel');
  await page.locator('[data-testid="sec-custom"]').last().getByTestId('sec-custom-expand').click();
  // openen en weer sluiten zonder tekst verandert niets
  const p2 = await open(page, 'projects');
  await p2.getByTestId('footer-add').click();
  assert(await p2.getByTestId('footer-text').inputValue() === '', 'veld niet leeg');
  assert(await page.locator('.cv-page .sec-footer').count() === 0, 'lege footer getoond');
  assert(!/Afsluitende|Meer projecten|GitHub/.test(await page.locator('.cv-page').innerText()), 'placeholder in cv');
  await page.screenshot({ path: path.join(out, 'footer-1-leeg-veld.png') });
  await page.getByTestId('footer-text').blur();
  const h1 = await page.locator('.cv-page .sec-projects').evaluate((e) => e.getBoundingClientRect().height);
  assert(Math.abs(h1 - h0) < 0.5, `hoogte veranderd door leeg veld: ${h0} -> ${h1}`);
});

await scenario('51. Afsluitende tekst met link (Projecten): klikbaar label, geen kale URL, bewerken en verwijderen', async () => {
  const card = await addFooter('projects', FOOT, 'GitHub', 'github.com/voorbeeld');
  const f = footerOf('projects');
  assert((await f.innerText()) === FOOT, 'tekst: ' + await f.innerText());
  const a = f.locator('a');
  assert(await a.count() === 1 && (await a.innerText()) === 'GitHub' && (await a.getAttribute('href')) === 'https://github.com/voorbeeld', 'link: ' + await f.innerHTML());
  assert(!(await f.innerText()).includes('https://'), 'kale URL zichtbaar');
  // onder het laatste item, boven het volgende onderdeel
  const geo = await page.evaluate(() => {
    const sec = document.querySelector('.cv-page .sec-projects'); const items = sec.querySelectorAll('.item'); const foot = sec.querySelector('.sec-footer');
    const last = items[items.length - 1].getBoundingClientRect(), fr = foot.getBoundingClientRect(), sr = sec.getBoundingClientRect();
    const next = sec.nextElementSibling?.getBoundingClientRect();
    const cs = getComputedStyle(foot);
    return { gap: fr.top - last.bottom, inside: fr.bottom <= sr.bottom + 0.5, nextOk: !next || next.top >= fr.bottom, fs: parseFloat(cs.fontSize), body: parseFloat(getComputedStyle(sec).fontSize), border: cs.borderTopWidth, bg: cs.backgroundColor, deco: foot.querySelector('svg') !== null };
  });
  assert(geo.gap >= 0 && geo.gap < 12, 'afstand tot laatste item: ' + geo.gap);
  assert(geo.inside && geo.nextOk, 'overlap met volgend onderdeel');
  assert(geo.fs < geo.body && geo.border === '0px' && geo.bg === 'rgba(0, 0, 0, 0)' && !geo.deco, 'stijl: ' + JSON.stringify(geo));
  // bewerken: cursor in de link -> "Link bewerken"
  await card.getByTestId('footer-text').evaluate((el) => { el.focus(); el.setSelectionRange(29, 29); });
  await page.waitForFunction(() => /Link bewerken/.test(document.querySelector('[data-testid="footer-link"]')?.textContent ?? ''));
  await card.getByTestId('footer-link').click();
  assert(await card.getByTestId('footer-link-label').inputValue() === 'GitHub', 'linktekst niet voorgevuld');
  assert(await card.getByTestId('footer-link-url').inputValue() === 'https://github.com/voorbeeld', 'url niet voorgevuld');
  await card.getByTestId('footer-link-url').fill('https://github.com/anders');
  await card.getByTestId('footer-link-url').press('Enter');
  assert((await footerOf('projects').locator('a').getAttribute('href')) === 'https://github.com/anders', 'link niet bijgewerkt');
  // tekst ervoor typen: de link schuift mee
  await card.getByTestId('footer-text').evaluate((el) => { el.focus(); el.setSelectionRange(0, 0); });
  await page.keyboard.type('Zie ook: ');
  assert((await footerOf('projects').locator('a').innerText()) === 'GitHub', 'link schoof niet mee');
  await page.screenshot({ path: path.join(out, 'footer-2-editor-met-link.png') });
  // link verwijderen laat de tekst staan
  await card.getByTestId('footer-text').evaluate((el) => { el.focus(); el.setSelectionRange(el.value.length - 2, el.value.length - 2); });
  await card.getByTestId('footer-link').click();
  await card.getByTestId('footer-link-remove').click();
  assert(await footerOf('projects').locator('a').count() === 0 && (await footerOf('projects').innerText()).includes('GitHub'), 'link verwijderen');
  // opnieuw een link over de hele zin
  await card.getByTestId('footer-text').fill(FOOT);
  await card.getByTestId('footer-text').evaluate((el) => { el.focus(); el.setSelectionRange(0, el.value.length); });
  await card.getByTestId('footer-link').click();
  await card.getByTestId('footer-link-url').fill('https://github.com/voorbeeld');
  await card.getByTestId('footer-link-save').click();
  assert((await footerOf('projects').locator('a').innerText()) === FOOT, 'hele zin niet klikbaar');
  await card.getByTestId('footer-text').fill('Totaal andere tekst');
  assert(await footerOf('projects').locator('a').count() === 0, 'link bleef na vervangen tekst');
  await addFooter('projects', FOOT, 'GitHub', 'https://github.com/voorbeeld');
});

await scenario('52. Onveilige links worden geweigerd in de editor', async () => {
  const card = await open(page, 'projects');
  await card.getByTestId('footer-text').evaluate((el) => { el.focus(); el.setSelectionRange(29, 29); });
  await card.getByTestId('footer-link').click();
  for (const bad of ['javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'vbscript:x', 'geen adres']) {
    await card.getByTestId('footer-link-url').fill(bad);
    await card.getByTestId('footer-link-save').click();
    assert(await card.locator('.field-error').count() === 1, 'geen foutmelding voor ' + bad);
    assert((await footerOf('projects').locator('a').getAttribute('href')) === 'https://github.com/voorbeeld', 'onveilige link doorgelaten: ' + bad);
  }
  await card.getByTestId('footer-link-url').press('Escape');
  assert(await card.getByTestId('footer-link-url').count() === 0, 'Escape sluit het linkformulier niet');
});

await scenario('53. Vaardigheden, Opleiding en eigen onderdeel: afsluitende tekst, ook zonder gewone inhoud', async () => {
  const sk = await open(page, 'skills');
  await sk.getByTestId('skill-add').click();
  await sk.getByTestId('skill-0-name').fill('Programmeren');
  await sk.getByTestId('skill-0-list').fill('TypeScript, Python');
  await sk.getByTestId('skill-0-list').press('Enter');
  await addFooter('skills', 'Meer technische projecten en gebruikte tools op GitHub.', 'GitHub', 'https://github.com/voorbeeld');
  assert((await footerOf('skills').innerText()) === 'Meer technische projecten en gebruikte tools op GitHub.', 'skills-footer');
  const edu = await open(page, 'education');
  await edu.getByTestId('edu-add').click();
  await edu.getByTestId('edu-0-degree').fill('HBO Informatica');
  await addFooter('education', 'Relevante cursussen en certificaten beschikbaar op aanvraag.');
  assert(await footerOf('education').locator('a').count() === 0, 'onverwachte link');
  const custom = page.locator('[data-testid="sec-custom"]').last();
  if (!(await custom.locator('.card-body').count())) await custom.getByTestId('sec-custom-expand').click();
  await custom.getByTestId('footer-add').click();
  await custom.getByTestId('footer-text').fill('Portfolio en aanvullende informatie: mijnwebsite.nl');
  // een onderdeel zonder gewone inhoud toont toch zijn expliciete afsluitende tekst
  assert((await page.locator('.cv-page .sec-custom .sec-footer').innerText()).includes('mijnwebsite.nl'), 'footer bij leeg onderdeel ontbreekt');
  const exp = await open(page, 'experience');
  assert(await page.locator('.cv-page .sec-experience').count() === 0, 'werkervaring zonder footer zou verborgen zijn');
  await addFooter('experience', 'Referenties beschikbaar op aanvraag.');
  assert(await page.locator('.cv-page .sec-experience').count() === 1, 'footer-only werkervaring niet getoond');
  await exp.getByTestId('footer-remove').click();
  assert(await page.locator('.cv-page .sec-experience').count() === 0, 'verwijderen haalt onderdeel niet weg');
  assert(await exp.getByTestId('footer-add').count() === 1, 'actie komt niet terug na verwijderen');
  assert(await page.getByTestId('sec-experience').count() === 1, 'onderdeel zelf is verdwenen');
  // wrapping over meerdere regels, regeleinden behouden
  await addFooter('education', 'Eerste regel van de slotnotitie.\nTweede regel, een stuk langer zodat deze zeker over meerdere regels in de kolom moet afbreken en niet buiten de pagina valt.');
  const lines = await footerOf('education').evaluate((e) => Math.round(e.offsetHeight / parseFloat(getComputedStyle(e).lineHeight)));
  assert(lines >= 3, 'geen meerregelige weergave: ' + lines);
  const inBounds = await page.evaluate(() => { const r = document.querySelector('.cv-page').getBoundingClientRect(); return [...document.querySelectorAll('.cv-page .sec-footer')].every((f) => { const b = f.getBoundingClientRect(); return b.left >= r.left && b.right <= r.right; }); });
  assert(inBounds, 'footer valt buiten de pagina');
  await saved(page);
});

await scenario('54. Opslaan en heropenen, herordenen, verbergen, sjablonen, kopie en JSON-roundtrip', async () => {
  await saved(page);
  await app.close();
  ({ app, page } = await launch());
  assert((await footerOf('projects').innerText()) === FOOT, 'footer niet hersteld na herstart');
  assert((await footerOf('projects').locator('a').getAttribute('href')) === 'https://github.com/voorbeeld', 'link niet hersteld');
  // verplaatsen: footer gaat mee naar de aanvullende kolom
  await moveTo(page, 'projects', 'supplementary');
  assert(await page.locator('.col-side .sec-projects .sec-footer').count() === 1, 'footer ging niet mee naar aanvullend');
  await moveTo(page, 'projects', 'primary');
  assert(await page.locator('.col-main .sec-projects .sec-footer').count() === 1, 'footer ging niet mee terug');
  await page.getByTestId('sec-projects-up').count();
  // verbergen
  await page.getByTestId('sec-projects-toggle').click();
  assert(await page.locator('.cv-page .sec-projects, .cv-page :text("Meer projecten")').count() === 0, 'footer van verborgen onderdeel zichtbaar');
  await page.getByTestId('sec-projects-toggle').click();
  assert(await footerOf('projects').count() === 1, 'footer niet terug na tonen');
  // alle sjablonen
  for (const tpl of ['header', 'minimal', 'sidebar']) {
    await page.getByTestId('tab-layout').click();
    await page.getByTestId(`tpl-${tpl}`).click();
    await page.getByTestId('tab-sections').click();
    assert((await footerOf('projects').innerText()) === FOOT && await footerOf('projects').locator('a').count() === 1, `footer verdwenen in ${tpl}`);
    await page.screenshot({ path: path.join(out, `footer-tpl-${tpl}.png`) });
  }
  // kopie van het cv
  await menuAction(page, 'cv-duplicate');
  await page.getByTestId('prompt-input').fill('Slotnotitie kopie');
  await page.getByTestId('prompt-ok').click();
  await page.waitForFunction(() => document.querySelector('[data-testid="version-select-value"]')?.textContent === 'Slotnotitie kopie');
  assert((await footerOf('projects').innerText()) === FOOT && await footerOf('skills').count() === 1, 'footer niet in kopie');
  // JSON-export en import
  await menuAction(page, 'json-export');
  await page.waitForSelector('[data-testid="toast"]');
  const exported = JSON.parse(fs.readFileSync(path.join(out, 'Slotnotitie kopie.json'), 'utf8'));
  const cvj = exported.cv ?? exported;
  const pj = cvj.sections.find((x) => x.type === 'projects');
  assert(pj.footer.text === FOOT && pj.footer.links[0].url === 'https://github.com/voorbeeld' && FOOT.slice(pj.footer.links[0].start, pj.footer.links[0].end) === 'GitHub', 'export mist footer: ' + JSON.stringify(pj.footer));
  // onbetrouwbare import: onveilige link verdwijnt, veilige blijft
  pj.footer.links.push({ start: 0, end: 4, url: 'javascript:alert(1)' });
  pj.footer.text += ' <b>vet</b>';
  cvj.name = 'Footerimport';
  fs.writeFileSync(path.join(out, 'footer-import.json'), JSON.stringify(exported));
  await app.close();
  ({ app, page } = await launch({ CV_STUDIO_TEST_IMPORT: path.join(out, 'footer-import.json') }));
  await menuAction(page, 'json-import');
  await page.waitForFunction(() => /geïmporteerd/.test(document.querySelector('[data-testid="version-select-value"]')?.textContent ?? ''));
  const f = footerOf('projects');
  assert(await f.locator('a').count() === 1 && (await f.locator('a').getAttribute('href')) === 'https://github.com/voorbeeld', 'import: links ' + await f.innerHTML());
  assert((await f.innerText()).includes('<b>vet</b>') && await f.locator('b').count() === 0, 'import: HTML niet als tekst behandeld');
  assert(!(await page.locator('.cv-page').innerHTML()).includes('javascript:'), 'import: javascript: in DOM');
});

await scenario('55. PDF: footer zichtbaar, tekst selecteerbaar, echte link-annotaties, alle drie de sjablonen', async () => {
  await pickCv(page, 'Slotnotitie');
  await page.waitForFunction(() => !document.querySelector('[data-testid="overflow-banner"]'));
  await page.getByTestId('tab-sections').click();
  for (const tpl of ['sidebar', 'header', 'minimal']) {
    await page.getByTestId('tab-layout').click();
    await page.getByTestId(`tpl-${tpl}`).click();
    await page.getByTestId('tab-sections').click();
    assert(!(await page.getByTestId('export-pdf').isDisabled()), `export geblokkeerd in ${tpl}`);
    await page.getByTestId('export-pdf').click();
    await page.waitForFunction(() => /1 pagina/.test(document.querySelector('[data-testid="toast"]')?.textContent || ''));
    const file = path.join(out, `footer-${tpl}.pdf`);
    fs.copyFileSync(path.join(out, 'Slotnotitie.pdf'), file);
    const info = await pdfInfo(file);
    assert(info.pages === 1, `${tpl}: ${info.pages} pagina's`);
    assert(info.text.includes('Meer projecten bekijken op GitHub') || /Meer projecten bekijken op\s+GitHub/.test(info.text), `${tpl}: footertekst niet selecteerbaar: ` + info.text.slice(0, 300));
    assert(info.text.includes('Eerste regel van de slotnotitie'), `${tpl}: opleiding-footer ontbreekt`);
    const gh = info.links.filter((l) => l.url === 'https://github.com/voorbeeld/' || l.url === 'https://github.com/voorbeeld');
    assert(gh.length >= 1 && info.rawLinks >= 1, `${tpl}: geen link-annotatie (${JSON.stringify(info.links)})`);
    assert(info.links.every((l) => /^https?:\/\//.test(l.url)), `${tpl}: annotatie met onveilig schema`);
    // het annotatiegebied ligt over de woorden "GitHub" in de footer: vergelijk met de positie van de tekst
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), useSystemFonts: true }).promise;
    const pg = await pdf.getPage(1);
    const items = (await pg.getTextContent()).items.filter((i) => /GitHub/.test(i.str) && /Meer projecten/.test(i.str));
    assert(items.length >= 1, `${tpl}: footertekstitem niet gevonden`);
    const it = items[0];
    const hit = gh.some((l) => l.rect[0] >= it.transform[4] - 2 && l.rect[2] <= it.transform[4] + it.width + 2 && l.rect[1] <= it.transform[5] + it.height && l.rect[3] >= it.transform[5] - 2);
    assert(hit, `${tpl}: link ligt niet op de footertekst ${JSON.stringify(gh)} vs ${it.transform}/${it.width}`);
    await page.evaluate(() => { document.querySelector('[data-testid="toast"]')?.click(); });
  }
  if (hasPdftoppm) {
    execFileSync('pdftoppm', ['-png', '-r', '110', path.join(out, 'footer-sidebar.pdf'), path.join(out, 'footer-pdf-sidebar')]);
    execFileSync('pdftoppm', ['-png', '-r', '110', path.join(out, 'footer-header.pdf'), path.join(out, 'footer-pdf-header')]);
    execFileSync('pdftoppm', ['-png', '-r', '110', path.join(out, 'footer-minimal.pdf'), path.join(out, 'footer-pdf-minimal')]);
  }
});

await scenario('56. Een te lange afsluitende tekst telt mee voor A4: melding met onderdeel, export geblokkeerd, niets afgekapt', async () => {
  await page.getByTestId('tab-sections').click();
  const long = Array.from({ length: 40 }, (_, i) => `Regel ${i} van een bewust veel te lange slotnotitie.`).join('\n').slice(0, 590);
  const kinds = ['projects', 'education', 'skills', 'profile', 'languages', 'experience'];
  for (const t of kinds) {
    const c = await open(page, t);
    if (await c.getByTestId('footer-add').count()) await c.getByTestId('footer-add').click();
    await c.getByTestId('footer-text').fill(long);
    await c.getByTestId(`sec-${t}-expand`).click();
  }
  await page.waitForSelector('[data-testid="overflow-banner"]');
  const banner = await page.getByTestId('overflow-banner').innerText();
  assert(/mm te lang/.test(banner), 'banner: ' + banner);
  assert(await page.getByTestId('export-pdf').isDisabled(), 'export niet geblokkeerd');
  const r = await page.evaluate((cv) => window.cvApi.exportPdf(cv), await currentCv(page));
  assert(r.ok === false && /past niet op één A4/.test(r.error), 'main weigert niet: ' + JSON.stringify(r));
  assert(await page.locator('.cv-page .sec-footer').count() >= 5, 'footer weggehaald of afgekapt');
  assert((await page.locator('.cv-page .sec-footer').first().innerText()).length > 500, 'footer afgekapt');
  assert(await page.locator('[data-testid^="sec-"] .usage.bad').count() >= 1, 'geen onderdeel aangewezen');
  await page.screenshot({ path: path.join(out, 'footer-overflow.png') });
  for (const t of kinds) { const c = await open(page, t); await c.getByTestId('footer-remove').click(); await c.getByTestId(`sec-${t}-expand`).click(); }
  await page.waitForFunction(() => !document.querySelector('[data-testid="overflow-banner"]'));
  assert(!(await page.getByTestId('export-pdf').isDisabled()), 'export blijft geblokkeerd');
});

await scenario('57. Toegankelijkheid (axe) van de afsluitende-tekst-editor, ook met linkformulier en foutmelding', async () => {
  const card = await addFooter('skills', 'Meer op GitHub', 'GitHub', 'https://github.com/voorbeeld');
  await card.getByTestId('footer-text').evaluate((el) => { el.focus(); el.setSelectionRange(0, 4); });
  await card.getByTestId('footer-link').click();
  await card.getByTestId('footer-link-url').fill('javascript:x');
  await card.getByTestId('footer-link-save').click();
  await page.evaluate(fs.readFileSync(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8'));
  const res = await page.evaluate(async () => (await window.axe.run({ include: [['.editor']] }, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } })).violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`));
  assert(res.length === 0, 'axe: ' + res.join('\n'));
  // toetsenbord: Tab bereikt tekstveld, link en verwijderen; focusring zichtbaar
  await card.getByTestId('footer-link-url').press('Escape');
  await card.getByTestId('footer-text').focus();
  await page.keyboard.press('Tab');
  assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'footer-link', 'Tab bereikt Link niet: ' + await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 120)));
  await page.keyboard.press('Tab');
  assert(await page.evaluate(() => document.activeElement?.getAttribute('data-testid')) === 'footer-remove', 'Tab bereikt Verwijderen niet');
  await page.screenshot({ path: path.join(out, 'footer-3-skills-editor.png') });
});

await app.close();
fs.rmSync(userData, { recursive: true, force: true });
const failed = results.filter((r) => !r[0]);
console.log(`\n${results.length - failed.length}/${results.length} scenario's geslaagd`);
process.exit(failed.length ? 1 : 0);
