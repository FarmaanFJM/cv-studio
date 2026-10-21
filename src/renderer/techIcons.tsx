// Meegeleverd iconenpakket (offline). Merk-iconen komen uit het pakket 'simple-icons' (CC0); algemene iconen zijn eigen lijntekeningen.
import React from 'react';
import {
  siAndroid,
  siAndroidstudio,
  siAngular,
  siArduino,
  siBitbucket,
  siBlender,
  siBootstrap,
  siC,
  siCloudflare,
  siCplusplus,
  siCss,
  siCypress,
  siDart,
  siDjango,
  siDocker,
  siDotnet,
  siEslint,
  siExpress,
  siFastapi,
  siFigma,
  siFirebase,
  siFlask,
  siFlutter,
  siGit,
  siGithub,
  siGithubactions,
  siGitlab,
  siGo,
  siGodotengine,
  siGooglecloud,
  siGradle,
  siGraphql,
  siHtml5,
  siIntellijidea,
  siJavascript,
  siJenkins,
  siJest,
  siJira,
  siJupyter,
  siKotlin,
  siKubernetes,
  siLaravel,
  siLinux,
  siLua,
  siMariadb,
  siMarkdown,
  siMongodb,
  siMysql,
  siNestjs,
  siNetlify,
  siNextdotjs,
  siNginx,
  siNodedotjs,
  siNotion,
  siNpm,
  siNumpy,
  siOpengl,
  siPandas,
  siPhp,
  siPnpm,
  siPostgresql,
  siPostman,
  siPrisma,
  siPycharm,
  siPython,
  siPytorch,
  siR,
  siRaspberrypi,
  siReact,
  siRedis,
  siRuby,
  siRubyonrails,
  siRust,
  siSass,
  siScala,
  siSelenium,
  siSpring,
  siSqlite,
  siSupabase,
  siSvelte,
  siSwift,
  siTailwindcss,
  siTensorflow,
  siTerraform,
  siThreedotjs,
  siTrello,
  siTypescript,
  siUbuntu,
  siUnity,
  siUnrealengine,
  siVercel,
  siVite,
  siVuedotjs,
  siWebpack,
  siYarn
} from 'simple-icons';
import { BRAND_PATHS } from './icons';
import { contrast } from '../shared/color';

export type TechGroup = 'Talen' | 'Frameworks' | 'Data' | 'Tools' | 'Platformen' | 'Game & 3D' | 'Algemeen';

export interface TechDef {
  id: string;
  label: string;
  aliases: string[];
  group: TechGroup;
  /** merk-icoon: gevuld pad op 24x24 */
  path?: string;
  hex?: string;
  /** algemeen icoon: lijntekening */
  draw?: React.ReactNode;
}

const si = (id: string, label: string, i: { path: string; hex: string }, aliases: string[], group: TechGroup): TechDef =>
  ({ id, label, aliases, group, path: i.path, hex: i.hex });

// Handgetekende varianten voor merken die niet in simple-icons zitten (vereenvoudigd).
const JAVA_PATH = 'M8.851 18.56s-.917.534.653.714c1.902.218 2.874.187 4.969-.211 0 0 .552.346 1.321.646-4.699 2.013-10.633-.118-6.943-1.149M8.276 15.933s-1.028.761.542.924c2.032.209 3.636.227 6.413-.308 0 0 .384.389.987.602-5.679 1.661-12.007.13-7.942-1.218M13.116 11.475c1.158 1.333-.304 2.533-.304 2.533s2.939-1.518 1.589-3.418c-1.261-1.772-2.228-2.652 3.007-5.688 0-.001-8.216 2.051-4.292 6.573M19.33 20.504s.679.559-.747.991c-2.712.822-11.288 1.069-13.669.033-.856-.373.75-.89 1.254-.998.527-.114.828-.093.828-.093-.953-.671-6.156 1.317-2.643 1.887 9.58 1.553 17.462-.7 14.977-1.82M9.292 13.21s-4.362 1.036-1.544 1.412c1.189.159 3.561.123 5.77-.062 1.806-.152 3.618-.477 3.618-.477s-.637.272-1.098.587c-4.429 1.165-12.986.623-10.522-.568 2.082-1.006 3.776-.892 3.776-.892M17.116 17.584c4.503-2.34 2.421-4.589.968-4.285-.355.074-.515.138-.515.138s.132-.207.385-.297c2.875-1.011 5.086 2.981-.928 4.562 0 0 .07-.062.09-.118M14.401 0s2.494 2.494-2.365 6.33c-3.896 3.077-.888 4.832-.001 6.836-2.274-2.053-3.943-3.858-2.824-5.539 1.644-2.469 6.197-3.665 5.19-7.627M9.734 23.924c4.322.277 10.959-.153 11.116-2.198 0 0-.302.775-3.572 1.391-3.688.694-8.239.613-10.937.168 0 0 .553.457 3.393.639';
const AZURE_PATH = 'M5.483 21.3H24L14.025 4.013l-3.038 8.347 5.836 6.938L5.483 21.3zM13.23 2.7L6.105 8.677 0 19.253h5.505v-.014L13.23 2.7z';

const g = (id: string, label: string, aliases: string[], draw: React.ReactNode): TechDef => ({ id, label, aliases, group: 'Algemeen', draw });

export const TECH_ICONS: TechDef[] = [
  si('typescript', 'TypeScript', siTypescript, ['ts'], 'Talen'),
  si('javascript', 'JavaScript', siJavascript, ['js', 'ecmascript', 'es6'], 'Talen'),
  si('html', 'HTML', siHtml5, ['html5'], 'Talen'),
  si('css', 'CSS', siCss, ['css3'], 'Talen'),
  si('python', 'Python', siPython, ['py'], 'Talen'),
  { id: 'java', label: 'Java', aliases: ['jdk', 'jvm'], group: 'Talen', path: JAVA_PATH, hex: 'ED8B00' },
  si('csharp', 'C#', siDotnet, ['c sharp', 'csharp', '.net', 'dotnet', 'asp.net'], 'Talen'),
  si('cpp', 'C++', siCplusplus, ['cpp', 'c plus plus'], 'Talen'),
  si('c', 'C', siC, [], 'Talen'),
  si('go', 'Go', siGo, ['golang'], 'Talen'),
  si('rust', 'Rust', siRust, [], 'Talen'),
  si('php', 'PHP', siPhp, [], 'Talen'),
  si('kotlin', 'Kotlin', siKotlin, [], 'Talen'),
  si('swift', 'Swift', siSwift, [], 'Talen'),
  si('dart', 'Dart', siDart, [], 'Talen'),
  si('ruby', 'Ruby', siRuby, [], 'Talen'),
  si('scala', 'Scala', siScala, [], 'Talen'),
  si('lua', 'Lua', siLua, [], 'Talen'),
  si('r', 'R', siR, ['r language'], 'Talen'),
  si('markdown', 'Markdown', siMarkdown, ['md'], 'Talen'),
  si('react', 'React', siReact, ['react.js', 'reactjs', 'react js'], 'Frameworks'),
  si('vue', 'Vue', siVuedotjs, ['vue.js', 'vuejs', 'vue js'], 'Frameworks'),
  si('angular', 'Angular', siAngular, ['angularjs'], 'Frameworks'),
  si('svelte', 'Svelte', siSvelte, [], 'Frameworks'),
  si('nextjs', 'Next.js', siNextdotjs, ['next', 'nextjs', 'next js'], 'Frameworks'),
  si('nodejs', 'Node.js', siNodedotjs, ['node', 'nodejs', 'node js'], 'Frameworks'),
  si('express', 'Express', siExpress, ['express.js', 'expressjs'], 'Frameworks'),
  si('nestjs', 'NestJS', siNestjs, ['nest.js', 'nest'], 'Frameworks'),
  si('spring', 'Spring', siSpring, ['spring boot', 'springboot', 'spring framework'], 'Frameworks'),
  si('django', 'Django', siDjango, [], 'Frameworks'),
  si('flask', 'Flask', siFlask, [], 'Frameworks'),
  si('fastapi', 'FastAPI', siFastapi, [], 'Frameworks'),
  si('laravel', 'Laravel', siLaravel, [], 'Frameworks'),
  si('rails', 'Rails', siRubyonrails, ['ruby on rails', 'ror'], 'Frameworks'),
  si('flutter', 'Flutter', siFlutter, [], 'Frameworks'),
  si('tailwind', 'Tailwind CSS', siTailwindcss, ['tailwind', 'tailwindcss'], 'Frameworks'),
  si('bootstrap', 'Bootstrap', siBootstrap, [], 'Frameworks'),
  si('sass', 'Sass', siSass, ['scss'], 'Frameworks'),
  si('threejs', 'Three.js', siThreedotjs, ['three', 'threejs'], 'Frameworks'),
  si('mongodb', 'MongoDB', siMongodb, ['mongo'], 'Data'),
  si('postgresql', 'PostgreSQL', siPostgresql, ['postgres', 'psql'], 'Data'),
  si('mysql', 'MySQL', siMysql, [], 'Data'),
  si('mariadb', 'MariaDB', siMariadb, [], 'Data'),
  si('sqlite', 'SQLite', siSqlite, [], 'Data'),
  si('redis', 'Redis', siRedis, [], 'Data'),
  si('graphql', 'GraphQL', siGraphql, [], 'Data'),
  si('firebase', 'Firebase', siFirebase, [], 'Data'),
  si('supabase', 'Supabase', siSupabase, [], 'Data'),
  si('prisma', 'Prisma', siPrisma, [], 'Data'),
  si('pandas', 'Pandas', siPandas, [], 'Data'),
  si('numpy', 'NumPy', siNumpy, [], 'Data'),
  si('tensorflow', 'TensorFlow', siTensorflow, [], 'Data'),
  si('pytorch', 'PyTorch', siPytorch, [], 'Data'),
  si('jupyter', 'Jupyter', siJupyter, ['jupyter notebook'], 'Data'),
  si('git', 'Git', siGit, [], 'Tools'),
  si('github', 'GitHub', siGithub, [], 'Tools'),
  si('gitlab', 'GitLab', siGitlab, [], 'Tools'),
  si('bitbucket', 'Bitbucket', siBitbucket, [], 'Tools'),
  si('githubactions', 'GitHub Actions', siGithubactions, ['actions'], 'Tools'),
  si('jenkins', 'Jenkins', siJenkins, [], 'Tools'),
  si('npm', 'npm', siNpm, [], 'Tools'),
  si('yarn', 'Yarn', siYarn, [], 'Tools'),
  si('pnpm', 'pnpm', siPnpm, [], 'Tools'),
  si('vite', 'Vite', siVite, [], 'Tools'),
  si('webpack', 'Webpack', siWebpack, [], 'Tools'),
  si('eslint', 'ESLint', siEslint, [], 'Tools'),
  si('jest', 'Jest', siJest, [], 'Tools'),
  si('cypress', 'Cypress', siCypress, [], 'Tools'),
  si('selenium', 'Selenium', siSelenium, [], 'Tools'),
  si('postman', 'Postman', siPostman, [], 'Tools'),
  si('figma', 'Figma', siFigma, [], 'Tools'),
  si('jira', 'Jira', siJira, [], 'Tools'),
  si('trello', 'Trello', siTrello, [], 'Tools'),
  si('notion', 'Notion', siNotion, [], 'Tools'),
  si('gradle', 'Gradle', siGradle, [], 'Tools'),
  si('intellij', 'IntelliJ IDEA', siIntellijidea, ['intellij', 'idea'], 'Tools'),
  si('pycharm', 'PyCharm', siPycharm, [], 'Tools'),
  si('androidstudio', 'Android Studio', siAndroidstudio, [], 'Tools'),
  si('docker', 'Docker', siDocker, [], 'Platformen'),
  si('kubernetes', 'Kubernetes', siKubernetes, ['k8s'], 'Platformen'),
  si('linux', 'Linux', siLinux, [], 'Platformen'),
  si('ubuntu', 'Ubuntu', siUbuntu, [], 'Platformen'),
  { id: 'azure', label: 'Azure', aliases: ['microsoft azure'], group: 'Platformen', path: AZURE_PATH, hex: '0078D4' },
  si('googlecloud', 'Google Cloud', siGooglecloud, ['gcp'], 'Platformen'),
  si('vercel', 'Vercel', siVercel, [], 'Platformen'),
  si('netlify', 'Netlify', siNetlify, [], 'Platformen'),
  si('cloudflare', 'Cloudflare', siCloudflare, [], 'Platformen'),
  si('nginx', 'Nginx', siNginx, [], 'Platformen'),
  si('terraform', 'Terraform', siTerraform, [], 'Platformen'),
  si('android', 'Android', siAndroid, [], 'Platformen'),
  si('raspberrypi', 'Raspberry Pi', siRaspberrypi, ['raspberry pi'], 'Platformen'),
  si('arduino', 'Arduino', siArduino, [], 'Platformen'),
  si('godot', 'Godot', siGodotengine, ['godot engine', 'gdscript'], 'Game & 3D'),
  si('unreal', 'Unreal Engine', siUnrealengine, ['unreal', 'ue4', 'ue5'], 'Game & 3D'),
  si('unity', 'Unity', siUnity, ['unity3d'], 'Game & 3D'),
  si('blender', 'Blender', siBlender, [], 'Game & 3D'),
  si('opengl', 'OpenGL', siOpengl, [], 'Game & 3D'),
  { id: 'linkedin', label: 'LinkedIn', aliases: [], group: 'Algemeen', path: BRAND_PATHS.linkedin, hex: '0A66C2' },
  g('database', 'Database', ['sql', 'db', 'databases', 'nosql', 'database'], <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></>),
  g('server', 'Backend / server', ['backend', 'back-end', 'back end', 'server', 'servers'], <><rect x="3" y="3" width="18" height="7" rx="2" /><rect x="3" y="14" width="18" height="7" rx="2" /><path d="M7 6.5h.01M7 17.5h.01" /></>),
  g('api', 'REST API', ['rest', 'rest api', 'restful', 'api', 'apis', 'web api'], <><path d="M8 3 3 12l5 9" /><path d="M16 3l5 9-5 9" /><path d="M13 7l-2 10" /></>),
  g('code', 'Code', ['programming', 'programmeren', 'coding', 'development'], <><path d="M16 18l6-6-6-6" /><path d="M8 6l-6 6 6 6" /></>),
  g('terminal', 'Terminal', ['cli', 'command line', 'bash', 'shell', 'powershell'], <><path d="M4 17l6-6-6-6" /><path d="M12 19h8" /></>),
  g('tool', 'Tool', ['tools', 'tool'], <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z" />),
  g('cloud', 'Cloud', ['cloud', 'aws', 'amazon web services'], <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />),
  g('globe', 'Web', ['website', 'web', 'internet'], <><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>),
  g('cpu', 'Hardware / embedded', ['hardware', 'embedded', 'cpu', 'iot'], <><rect x="4" y="4" width="16" height="16" rx="2" /><rect x="9" y="9" width="6" height="6" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" /></>)
];

export const TECH_GROUPS: TechGroup[] = ['Talen', 'Frameworks', 'Data', 'Tools', 'Platformen', 'Game & 3D', 'Algemeen'];

const byId = new Map(TECH_ICONS.map((t) => [t.id, t]));
export const getTech = (id: string | undefined | null): TechDef | undefined => (id ? byId.get(id) : undefined);

/** Normaliseert een naam voor vergelijking: "Node.js", "node js" en "NodeJS" worden gelijk. */
export const compact = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9#+]/g, '');

const aliasMap = new Map<string, string>();
for (const t of TECH_ICONS) {
  for (const a of [t.id, t.label, ...t.aliases]) {
    const k = compact(a);
    if (k && !aliasMap.has(k)) aliasMap.set(k, t.id);
  }
}

/** Herkent een bekende technologie aan zijn naam; null als er geen specifiek icoon is. */
export function matchTech(name: string): string | null {
  const k = compact(name);
  return k ? aliasMap.get(k) ?? null : null;
}

/** Suggesties tijdens het typen (voorvoegsel of deel van de naam). */
export function suggestTech(partial: string, limit = 6): TechDef[] {
  const k = compact(partial);
  if (k.length < 2) return [];
  const score = (t: TechDef) => {
    let best = 0;
    for (const a of [t.label, t.id, ...t.aliases]) {
      const c = compact(a);
      if (c === k) return 3;
      if (c.startsWith(k)) best = Math.max(best, 2);
      else if (k.length >= 3 && c.includes(k)) best = Math.max(best, 1);
    }
    return best;
  };
  return TECH_ICONS.map((t) => ({ t, s: score(t) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.t);
}

// ---------- weergave ----------

export interface TechRenderCtx { brandColors: boolean; bg: string }
export const TechCtx = React.createContext<TechRenderCtx>({ brandColors: false, bg: '#ffffff' });

/** Eén icoon. Standaard in de tekstkleur (consistent over alle sjablonen); optioneel in merkkleur als het contrast genoeg is. */
export function TechIcon({ id }: { id: string }) {
  const t = getTech(id);
  const ctx = React.useContext(TechCtx);
  if (!t) return null;
  if (t.path) {
    const color = ctx.brandColors && t.hex && contrast(`#${t.hex.toLowerCase()}`, ctx.bg) >= 3 ? `#${t.hex}` : undefined;
    return (
      <svg className="tic" viewBox="0 0 24 24" fill="currentColor" style={color ? { color } : undefined} aria-hidden="true" data-tech={t.id}>
        <path d={t.path} />
      </svg>
    );
  }
  return (
    <svg className="tic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-tech={t.id}>
      {t.draw}
    </svg>
  );
}

/** Welk icoon hoort bij een vaardigheid? Override (id of 'none') wint van automatisch herkennen. */
export function resolveSkillIcon(name: string, mode: 'off' | 'auto', overrides: Record<string, string>): string | null {
  const o = overrides[compact(name)];
  if (o === 'none') return null;
  if (o && getTech(o)) return o;
  return mode === 'auto' ? matchTech(name) : null;
}
