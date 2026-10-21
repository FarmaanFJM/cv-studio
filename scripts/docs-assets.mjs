// Regenerates the README images in docs/images from the fictional example CV in scripts/docs-demo.ts.
// Needs a built app (npm run build), xvfb on Linux, and the command line tools pdftoppm and ImageMagick (convert).
//   xvfb-run -a node scripts/docs-assets.mjs
import { _electron as electron } from 'playwright-core';
import { build } from 'esbuild';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const out = path.join(root, 'docs/images');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cvstudio-docs-'));
fs.mkdirSync(out, { recursive: true });

// --- neutral placeholder avatar (no real person): head and shoulders silhouette ---
function avatarPng(size = 480) {
  const crc = (buf) => { let c, crc = ~0; for (const b of buf) { c = (crc ^ b) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return ~crc >>> 0; };
  const chunk = (type, data) => { const t = Buffer.from(type); const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, data]))); return Buffer.concat([l, t, data, c]); };
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2, head = Math.hypot(dx, y - size * 0.4) < size * 0.18;
      const body = (dx / (size * 0.36)) ** 2 + ((y - size * 0.98) / (size * 0.42)) ** 2 < 1;
      const [r, g, b] = head || body ? [148, 163, 184] : [226, 232, 240];
      const o = y * (size * 3 + 1) + 1 + x * 3; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

await build({ entryPoints: [path.join(root, 'scripts/docs-demo.ts')], bundle: true, format: 'esm', outfile: path.join(tmp, 'demo.mjs'), logLevel: 'silent' });
const { docsDemoCv } = await import(path.join(tmp, 'demo.mjs'));
const cv = docsDemoCv();
cv.photo = { src: 'data:image/png;base64,' + avatarPng().toString('base64'), aspect: 1, zoom: 1, offsetX: 0, offsetY: 0, shape: 'round', visible: true };
const userData = path.join(tmp, 'userdata');
fs.mkdirSync(path.join(userData, 'data'), { recursive: true });
fs.writeFileSync(path.join(userData, 'data/cvs.json'), JSON.stringify({ version: 4, activeId: cv.id, cvs: [cv], swatches: [] }));

const app = await electron.launch({
  args: [root, '--no-sandbox'],
  env: { ...process.env, CV_STUDIO_USER_DATA: userData, CV_STUDIO_TEST: '1', CV_STUDIO_TEST_DIR: tmp }
});
const page = await app.firstWindow();
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setContentSize(1500, 940));
await page.waitForSelector('[data-testid="page"]');
const toast = () => page.getByTestId('toast');

// 1) the three templates as exported PDFs, rendered to equally sized images
for (const tpl of ['sidebar', 'header', 'minimal']) {
  await page.getByTestId('tab-layout').click();
  await page.getByTestId(`tpl-${tpl}`).click();
  await page.waitForSelector(`.cv-page.t-${tpl}`);
  await toast().click().catch(() => {});
  await page.waitForFunction(() => !document.querySelector('[data-testid="toast"]'));
  await page.getByTestId('export-pdf').click();
  await page.waitForFunction(() => /1 pagina/.test(document.querySelector('[data-testid="toast"]')?.textContent || ''));
  const pdf = path.join(tmp, `template-${tpl}.pdf`);
  fs.copyFileSync(path.join(tmp, 'Alex Morgan.pdf'), pdf);
  execFileSync('pdftoppm', ['-r', '110', '-png', '-singlefile', pdf, path.join(tmp, `template-${tpl}`)]);
  execFileSync('convert', [path.join(tmp, `template-${tpl}.png`), '-resize', '640x', '-strip', '-colors', '192', `PNG8:${path.join(out, `template-${tpl}.png`)}`]);
}

// 2) the main window: sidebar template, content tab with the projects section open
await page.getByTestId('tab-layout').click();
await page.getByTestId('tpl-sidebar').click();
await page.getByTestId('tab-sections').click();
await page.getByTestId('sec-projects-expand').click();
await page.getByTestId('proj-0').locator('.item-toggle').click();
await toast().click().catch(() => {}); // hide the export message (it shows a local path)
await page.waitForTimeout(2200); // let the highlight in the preview fade out
await page.mouse.move(5, 5);
await page.screenshot({ path: path.join(tmp, 'app.png') });
execFileSync('convert', [path.join(tmp, 'app.png'), '-strip', '-colors', '160', `PNG8:${path.join(out, 'app-editor.png')}`]);

// 3) the style tab (colors, typography and technology icon settings)
await page.getByTestId('tab-style').click();
await page.mouse.move(5, 5);
await page.screenshot({ path: path.join(tmp, 'style.png') });
execFileSync('convert', [path.join(tmp, 'style.png'), '-strip', '-colors', '160', `PNG8:${path.join(out, 'app-style.png')}`]);

await app.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log('docs/images updated');
