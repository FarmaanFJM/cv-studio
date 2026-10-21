// Controleert dat alle onderdelen van een release bij dezelfde build horen: tag, versie, commit, installatiebestand,
// SHA-256/SHA-512, latest.yml en release-manifest.json. Wordt door de workflow gebruikt vóór er iets wordt aangemaakt.
//   node scripts/verify-release-assets.mjs <map> [--tag v3.1.0] [--sha <commit>]
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const dir = path.resolve(args.find((a) => !a.startsWith('--') && args[args.indexOf(a) - 1] !== '--tag' && args[args.indexOf(a) - 1] !== '--sha') ?? 'release');
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const tag = opt('--tag') ?? process.env.EXPECTED_TAG;
const sha = opt('--sha') ?? process.env.EXPECTED_SHA;
const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
let failed = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failed++; };
const read = (f) => fs.readFileSync(path.join(dir, f));

const installer = `CV-Studio-Setup-${version}.exe`;
check(fs.existsSync(path.join(dir, installer)), `installatiebestand ${installer} (versie uit package.json)`);
const others = fs.readdirSync(dir).filter((f) => /^CV-Studio-Setup-.*\.exe$/.test(f) && f !== installer);
check(others.length === 0, `geen installatiebestanden van een andere versie in de map${others.length ? ': ' + others.join(', ') : ''}`);
if (tag) check(tag === `v${version}`, `tag ${tag} hoort bij versie ${version}`);
const stable = !/-/.test(version);
console.log(`  kanaal: ${stable ? 'stabiel' : 'pre-release (versie bevat een koppelteken)'}`);

if (fs.existsSync(path.join(dir, installer))) {
  const bytes = read(installer);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const sha512 = crypto.createHash('sha512').update(bytes).digest('base64');
  const sums = fs.existsSync(path.join(dir, 'SHA256SUMS.txt')) ? read('SHA256SUMS.txt').toString('utf8') : '';
  check(sums.split(/\r?\n/).some((l) => l.trim() === `${sha256}  ${installer}`), 'SHA256SUMS.txt bevat de SHA-256 van dit installatiebestand');
  if (fs.existsSync(path.join(dir, 'latest.yml'))) {
    const yml = read('latest.yml').toString('utf8');
    const get = (k) => new RegExp(`^${k}: ?(.+)$`, 'm').exec(yml)?.[1]?.trim().replace(/^'|'$/g, '');
    check(get('version') === version, `latest.yml: versie ${get('version')}`);
    check(get('path') === installer, `latest.yml: path ${get('path')}`);
    check(get('sha512') === sha512, 'latest.yml: sha512 komt overeen met het installatiebestand');
    check(new RegExp(`size: ${bytes.length}\\b`).test(yml), `latest.yml: size ${bytes.length}`);
    check(new RegExp(`url: ${installer}\\b`).test(yml), 'latest.yml: files[].url wijst naar het installatiebestand');
  } else check(false, 'latest.yml aanwezig');
  if (fs.existsSync(path.join(dir, 'release-manifest.json'))) {
    const m = JSON.parse(read('release-manifest.json').toString('utf8'));
    check(m.version === version && m.installer === installer, `release-manifest.json: versie ${m.version}, bestand ${m.installer}`);
    check(m.sha256 === sha256 && m.sha512 === sha512, 'release-manifest.json: checksums komen overeen');
    if (sha) check(m.commit === sha, `release-manifest.json: commit ${String(m.commit).slice(0, 12)} = verwachte commit ${sha.slice(0, 12)}`);
    if (tag) check(m.tag === tag, `release-manifest.json: tag ${m.tag}`);
    check(m.checks && m.checks.licenses === true && m.checks.verifyExe === true, 'release-manifest.json: licentiebestanden en pakketcontrole vastgelegd als geslaagd');
    console.log(`  e2e-rooktest tegen de ingepakte app: ${m.checks?.smoke ?? 'onbekend'}`);
  } else check(false, 'release-manifest.json aanwezig');
}
process.exit(failed ? 1 : 0);
