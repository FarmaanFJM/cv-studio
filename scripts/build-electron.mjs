import { build } from 'esbuild';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
// Leeg zolang de installers niet ondertekend zijn; dan blijft automatisch installeren uit (zie electron/main.ts).
const publisher = pkg.build?.win?.publisherName ?? '';

const common = { bundle: true, platform: 'node', target: 'node22', format: 'cjs', sourcemap: false, external: ['electron', 'electron-updater'], define: { __PUBLISHER_NAME__: JSON.stringify(Array.isArray(publisher) ? publisher.join('|') : publisher) } };
await build({ ...common, entryPoints: ['electron/main.ts'], outfile: 'dist-electron/main.js' });
await build({ ...common, entryPoints: ['electron/preload.ts'], outfile: 'dist-electron/preload.js' });
console.log('electron gebouwd');
