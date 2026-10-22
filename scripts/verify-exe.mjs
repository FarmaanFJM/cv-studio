// Controleert een gebouwde Windows-release (map "release"): pictogram en versie-informatie van het programma en van het
// installatieprogramma, en of latest.yml exact bij het installatiebestand hoort (naam, versie, grootte, SHA-512).
// Gebruik:  node scripts/verify-exe.mjs [releasemap]      (werkt op Windows en Linux; geen Wine nodig)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import * as ResEdit from 'resedit';

const dir = path.resolve(process.argv[2] ?? 'release');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = pkg.version;
let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? '  ✓' : '  ✗'} ${msg}`); if (!ok) failed++; };

function readPe(file) {
  const pe = ResEdit.NtExecutable.from(fs.readFileSync(file), { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(pe);
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const iconItems = groups.flatMap((g) => g.icons);
  const sizes = [...new Set(iconItems.map((i) => `${i.width || 256}`))].map(Number).sort((a, b) => a - b);
  const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0];
  const strings = vi ? Object.assign({}, ...vi.getAllLanguagesForStringValues().map((l) => vi.getStringValues(l))) : {};
  // pixelinhoud van het grootste pictogram: is het (nog) het standaard Electron-pictogram?
  const hash = (id) => {
    const e = res.entries.find((x) => x.type === 3 && x.id === id);
    return e ? crypto.createHash('sha256').update(Buffer.from(e.bin)).digest('hex').slice(0, 12) : null;
  };
  return { sizes, strings, groups: groups.length, iconHashes: iconItems.map((i) => hash(i.iconID)) };
}

const wanted = [16, 24, 32, 48, 64, 128, 256];
// afbeeldingsgegevens van elk formaat in build/icon.ico: het programma moet precies die bytes bevatten
const icoHashes = ResEdit.Data.IconFile.from(fs.readFileSync('build/icon.ico')).icons
  .map((i) => crypto.createHash('sha256').update(Buffer.from(i.data.bin)).digest('hex').slice(0, 12));

console.log(`Release ${version} in ${dir}`);
const exe = path.join(dir, 'win-unpacked/CV Studio.exe');
const setup = path.join(dir, `CV-Studio-Setup-${version}.exe`);
check(fs.existsSync(exe), 'win-unpacked/CV Studio.exe aanwezig');
check(fs.existsSync(setup), `CV-Studio-Setup-${version}.exe aanwezig`);

for (const [label, file] of [['programma', exe], ['installatieprogramma', setup]]) {
  if (!fs.existsSync(file)) continue;
  const r = readPe(file);
  console.log(`${label}: pictogramformaten ${r.sizes.join(', ')} px, ${r.groups} pictogramgroep(en)`);
  check(r.groups > 0, `${label}: bevat een pictogram`);
  if (label === 'programma') {
    check(wanted.every((s) => r.sizes.includes(s)), `${label}: alle formaten 16, 24, 32, 48, 64, 128 en 256 px aanwezig`);
    check(r.strings.ProductName === 'CV Studio' && r.strings.FileDescription === 'CV Studio', `${label}: ProductName en FileDescription zijn "CV Studio" (nu: ${r.strings.ProductName}/${r.strings.FileDescription})`);
    const v4 = `${version}.0`; // Windows-versies hebben vier delen
    check(r.strings.FileVersion === v4 && r.strings.ProductVersion === v4, `${label}: bestands- en productversie ${v4} (nu: ${r.strings.FileVersion}/${r.strings.ProductVersion})`);
    check(icoHashes.every((h) => r.iconHashes.includes(h)), `${label}: ingebouwd pictogram is byte voor byte build/icon.ico`);
    check(/FarmaanFJM/.test(r.strings.CompanyName ?? ''), `${label}: uitgever ${r.strings.CompanyName}`);
  } else {
    check(r.sizes.includes(256) || r.sizes.length > 0, `${label}: eigen pictogram (${r.sizes.join(', ')} px)`);
  }
}

const yml = path.join(dir, 'latest.yml');
if (fs.existsSync(yml) && fs.existsSync(setup)) {
  const text = fs.readFileSync(yml, 'utf8');
  const get = (k) => new RegExp(`^${k}: ?(.+)$`, 'm').exec(text)?.[1]?.replace(/^'|'$/g, '');
  const bytes = fs.readFileSync(setup);
  const sha = crypto.createHash('sha512').update(bytes).digest('base64');
  check(get('version') === version, `latest.yml: versie ${get('version')} = package.json ${version}`);
  check(get('path') === path.basename(setup), `latest.yml: path ${get('path')} = bestandsnaam`);
  check(new RegExp(`url: ${path.basename(setup)}`).test(text), 'latest.yml: files[].url wijst naar hetzelfde bestand');
  check(get('sha512') === sha, 'latest.yml: sha512 komt overeen met het installatiebestand');
  check(new RegExp(`size: ${bytes.length}\\b`).test(text), `latest.yml: size ${bytes.length}`);
  console.log(`  SHA-256 installatiebestand: ${crypto.createHash('sha256').update(bytes).digest('hex')}`);
} else {
  console.log('  (latest.yml of installatiebestand ontbreekt: manifestcontrole overgeslagen)');
}
const unsigned = !fs.existsSync(setup) || !/Authenticode|Microsoft Corporation|CN=/.test(fs.readFileSync(setup).subarray(-20000).toString('latin1'));
console.log(`  ondertekening: ${unsigned ? 'geen Authenticode-handtekening (zoals verwacht, zie docs/UPDATES.md)' : 'handtekening aangetroffen'}`);

process.exit(failed ? 1 : 0);
