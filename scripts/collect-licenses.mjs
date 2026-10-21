// Collects the license texts of bundled fonts, icon sets and bundled npm packages into ./licenses.
// The output is committed and shipped inside the installer by electron-builder (extraResources).
import fs from 'node:fs';
import path from 'node:path';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const read = (name) => {
  const dir = path.join('node_modules', name);
  const file = fs.readdirSync(dir).find((f) => /^licen[sc]e(\.(md|txt))?$/i.test(f));
  const meta = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  if (!file) {
    // sommige pakketten leveren geen licentiebestand mee; leg dan vast wat het pakket zelf declareert
    const repo = typeof meta.repository === 'string' ? meta.repository : meta.repository?.url ?? 'onbekend';
    const holder = typeof meta.author === 'string' ? meta.author : meta.author?.name ?? 'the package authors';
    return { name, version: meta.version, license: meta.license, text: `This package does not ship a license file. Its package.json declares the license "${meta.license}". Author: ${holder}. Repository: ${repo}.` };
  }
  return { name, version: meta.version, license: meta.license, text: fs.readFileSync(path.join(dir, file), 'utf8').trim() };
};
const section = (e) => `${'='.repeat(78)}\n${e.name} ${e.version} (${e.license})\n${'='.repeat(78)}\n\n${e.text}\n`;

fs.mkdirSync('licenses', { recursive: true });
const fonts = Object.keys(pkg.devDependencies).filter((n) => n.startsWith('@fontsource/')).sort().map(read);
fs.writeFileSync('licenses/fonts-OFL-1.1.txt', `Fonts from Fontsource (https://fontsource.org), each under the SIL Open Font License 1.1.\nThe copyright notice of each font is at the top of its license text.\n\n${fonts.map(section).join('\n')}`);
fs.writeFileSync('licenses/devicon-MIT.txt', section(read('devicon')));
fs.writeFileSync('licenses/simple-icons-CC0-1.0.txt', section(read('simple-icons')));
fs.writeFileSync('licenses/feather-MIT.txt', section(read('feather-icons')));
// Alles wat in de app belandt: de pakketten die Vite meebundelt, plus de productie-afhankelijkheden (met hun eigen afhankelijkheden) in package.json "dependencies".
const runtime = new Set();
const walk = (name) => {
  if (runtime.has(name)) return;
  runtime.add(name);
  const meta = JSON.parse(fs.readFileSync(path.join('node_modules', name, 'package.json'), 'utf8'));
  for (const d of Object.keys(meta.dependencies ?? {})) walk(d);
};
for (const d of Object.keys(pkg.dependencies ?? {})) walk(d);
const bundled = [...new Set(['react', 'react-dom', 'scheduler', 'pdf-lib', '@pdf-lib/standard-fonts', '@pdf-lib/upng', 'pako', 'tslib', ...[...runtime].sort()])].map(read);
fs.writeFileSync('licenses/npm-bundled.txt', `npm packages bundled into the application.\n\n${bundled.map(section).join('\n')}`);
console.log(`licenses/ updated: ${fonts.length} fonts, ${bundled.length} bundled packages`);
