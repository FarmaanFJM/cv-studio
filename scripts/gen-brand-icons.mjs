// Genereert src/renderer/brandIcons.generated.ts uit het pakket 'devicon' (MIT): de meerkleurige originele logo's.
// Alleen een gekozen subset wordt meegenomen; het resultaat wordt ingecheckt, zodat de app offline en zonder devicon bouwt.
import fs from 'node:fs';
import path from 'node:path';

const dir = 'node_modules/devicon/icons';
// onze icoon-id -> devicon-map
const MAP = {
  typescript: 'typescript', javascript: 'javascript', html: 'html5', css: 'css3', python: 'python', java: 'java', csharp: 'csharp',
  cpp: 'cplusplus', c: 'c', go: 'go', rust: 'rust', php: 'php', kotlin: 'kotlin', swift: 'swift', dart: 'dart', ruby: 'ruby',
  scala: 'scala', lua: 'lua', r: 'r', markdown: 'markdown', react: 'react', vue: 'vuejs', angular: 'angularjs', svelte: 'svelte',
  nextjs: 'nextjs', nodejs: 'nodejs', express: 'express', nestjs: 'nestjs', spring: 'spring', flask: 'flask', fastapi: 'fastapi',
  laravel: 'laravel', flutter: 'flutter', tailwind: 'tailwindcss', bootstrap: 'bootstrap', sass: 'sass', threejs: 'threejs',
  mongodb: 'mongodb', postgresql: 'postgresql', mysql: 'mysql', mariadb: 'mariadb', sqlite: 'sqlite', redis: 'redis', firebase: 'firebase',
  supabase: 'supabase', prisma: 'prisma', pandas: 'pandas', numpy: 'numpy', tensorflow: 'tensorflow', pytorch: 'pytorch', jupyter: 'jupyter',
  git: 'git', github: 'github', gitlab: 'gitlab', bitbucket: 'bitbucket', githubactions: 'githubactions', jenkins: 'jenkins', npm: 'npm',
  yarn: 'yarn', pnpm: 'pnpm', vite: 'vitejs', webpack: 'webpack', eslint: 'eslint', selenium: 'selenium', postman: 'postman', figma: 'figma',
  jira: 'jira', trello: 'trello', notion: 'notion', gradle: 'gradle', intellij: 'intellij', pycharm: 'pycharm', androidstudio: 'androidstudio',
  docker: 'docker', kubernetes: 'kubernetes', ubuntu: 'ubuntu', azure: 'azure', googlecloud: 'googlecloud', vercel: 'vercel',
  netlify: 'netlify', cloudflare: 'cloudflare', nginx: 'nginx', terraform: 'terraform', android: 'android', raspberrypi: 'raspberrypi',
  arduino: 'arduino', godot: 'godot', unreal: 'unrealengine', unity: 'unity', blender: 'blender', opengl: 'opengl'
};
const MAX_BYTES = 16000;
const out = {};
const skipped = [];
for (const [id, d] of Object.entries(MAP)) {
  const f = path.join(dir, d, `${d}-original.svg`);
  if (!fs.existsSync(f)) { skipped.push(`${id} (ontbreekt)`); continue; }
  let s = fs.readFileSync(f, 'utf8');
  if (s.length > MAX_BYTES) { skipped.push(`${id} (te groot)`); continue; }
  // veiligheid: alleen statische vorm-elementen
  if (/<script|<foreignObject|<image|<style|<use|<text|\son\w+\s*=|(?:xlink:)?href\s*=\s*["'](?!#)/i.test(s)) { skipped.push(`${id} (onveilige/complexe inhoud)`); continue; }
  const vb = /viewBox="([^"]+)"/.exec(s)?.[1];
  const inner = /<svg\b[^>]*>([\s\S]*)<\/svg>/.exec(s)?.[1];
  if (!vb || !inner) { skipped.push(`${id} (geen viewBox)`); continue; }
  let body = inner.replace(/<!--[\s\S]*?-->/g, '').replace(/<title>[\s\S]*?<\/title>/g, '').replace(/\s*\n\s*/g, '').replace(/\s{2,}/g, ' ').trim();
  // unieke gradient-/clip-id's per icoon (meerdere inline svg's op één pagina)
  const ids = [...body.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  for (const old of new Set(ids)) {
    const nu = `b-${id}-${old}`;
    body = body.replaceAll(`id="${old}"`, `id="${nu}"`).replaceAll(`url(#${old})`, `url(#${nu})`).replaceAll(`href="#${old}"`, `href="#${nu}"`);
  }
  out[id] = { vb, body };
}
const header = `// GEGENEREERD door scripts/gen-brand-icons.mjs uit het pakket 'devicon' v${JSON.parse(fs.readFileSync('node_modules/devicon/package.json', 'utf8')).version} (MIT, https://github.com/devicons/devicon).\n// Logo's zijn handelsmerken van hun eigenaren en worden alleen gebruikt om de technologie te herkennen. Niet met de hand bewerken.\n`;
fs.writeFileSync('src/renderer/brandIcons.generated.ts', `${header}export const BRAND_MULTI: Record<string, { vb: string; body: string }> = ${JSON.stringify(out, null, 1)};\n`);
console.log(`${Object.keys(out).length} meerkleurige logo's, overgeslagen: ${skipped.join(', ') || '-'}`);
