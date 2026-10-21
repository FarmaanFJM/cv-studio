// electron-builder afterPack: zet het CV Studio-pictogram en de versie-informatie in het Windows-programma.
// Reden: met signAndEditExecutable=false slaat electron-builder rcedit (en daarmee Wine op Linux) over, waardoor het
// standaard Electron-pictogram in "CV Studio.exe" zou blijven. 'resedit' is pure JavaScript en werkt op Windows én Linux.
const fs = require('node:fs');
const path = require('node:path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const ResEdit = await import('resedit');
  const pkg = JSON.parse(fs.readFileSync(path.join(context.packager.projectDir, 'package.json'), 'utf8'));
  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const ico = fs.readFileSync(path.join(context.packager.projectDir, 'build/icon.ico'));

  const pe = ResEdit.NtExecutable.from(fs.readFileSync(exe), { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(pe);

  // pictogram: vervang elk bestaand pictogram van het programma door alle formaten uit build/icon.ico (16 t/m 256 px)
  const icons = ResEdit.Data.IconFile.from(ico).icons.map((i) => i.data);
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  if (groups.length === 0) ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, 1, 1033, icons);
  for (const g of groups) ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, g.id, g.lang, icons);

  // versie-informatie (Eigenschappen > Details in Windows)
  const [major, minor, patch] = pkg.version.split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0] ?? ResEdit.Resource.VersionInfo.createEmpty();
  const lang = { lang: 1033, codepage: 1200 };
  vi.setStringValues(lang, {
    FileDescription: 'CV Studio',
    ProductName: 'CV Studio',
    CompanyName: pkg.author,
    LegalCopyright: pkg.build.copyright,
    OriginalFilename: `${context.packager.appInfo.productFilename}.exe`,
    InternalName: 'CV Studio',
    FileVersion: pkg.version,
    ProductVersion: pkg.version
  });
  vi.setFileVersion(major, minor, patch, 0, 1033);
  vi.setProductVersion(major, minor, patch, 0, 1033);
  vi.outputToResourceEntries(res.entries);

  res.outputResource(pe);
  fs.writeFileSync(exe, Buffer.from(pe.generate()));
  console.log(`  • pictogram en versie-informatie ingesteld in ${path.basename(exe)}`);
};
