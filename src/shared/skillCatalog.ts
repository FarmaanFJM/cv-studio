// Lokale catalogus met vaardigheden en categorie-presets (geen netwerk nodig). Pure data + zoekfuncties, gedeeld door editor en tests.
// Een preset maakt alleen de categorie aan; vaardigheden worden nooit automatisch aan een cv toegevoegd.

export type CategoryKind = 'it' | 'general';
export interface SkillCategory { id: string; label: string; kind: CategoryKind }
export interface SkillEntry { name: string; categories: string[]; aliases: string[]; rank: number }

export const SKILL_CATEGORIES: SkillCategory[] = [
  // IT
  { id: 'languages', label: 'Programmeertalen', kind: 'it' },
  { id: 'web', label: 'Webontwikkeling', kind: 'it' },
  { id: 'frameworks', label: 'Frameworks & Libraries', kind: 'it' },
  { id: 'tools', label: 'Tools', kind: 'it' },
  { id: 'devops', label: 'DevOps', kind: 'it' },
  { id: 'databases', label: 'Databases', kind: 'it' },
  { id: 'cloud', label: 'Cloud', kind: 'it' },
  { id: 'testing', label: 'Testing', kind: 'it' },
  { id: 'data-ai', label: 'Data & AI', kind: 'it' },
  { id: 'mobile', label: 'Mobiele apps', kind: 'it' },
  { id: 'os', label: 'Besturingssystemen', kind: 'it' },
  { id: 'security', label: 'Beveiliging', kind: 'it' },
  { id: 'methods', label: 'Werkwijzen', kind: 'it' },
  { id: 'gamedev', label: 'Game Development', kind: 'it' },
  // algemeen
  { id: 'communication', label: 'Communicatie', kind: 'general' },
  { id: 'teamwork', label: 'Samenwerking', kind: 'general' },
  { id: 'organisation', label: 'Organisatie', kind: 'general' },
  { id: 'planning', label: 'Planning', kind: 'general' },
  { id: 'leadership', label: 'Leiderschap', kind: 'general' },
  { id: 'customer', label: 'Klantenservice', kind: 'general' },
  { id: 'admin', label: 'Administratie', kind: 'general' },
  { id: 'design', label: 'Design', kind: 'general' },
  { id: 'office', label: 'Microsoft Office', kind: 'general' },
  { id: 'analysis', label: 'Analyse', kind: 'general' },
  { id: 'research', label: 'Onderzoek', kind: 'general' },
  { id: 'pm', label: 'Projectmanagement', kind: 'general' },
  { id: 'presenting', label: 'Presenteren', kind: 'general' }
];

const RAW: Record<string, string[]> = {
  languages: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C#', 'C++', 'C', 'Go', 'Rust', 'PHP', 'Kotlin', 'Swift', 'Dart', 'Ruby', 'Scala', 'Lua', 'R', 'SQL', 'Bash', 'PowerShell', 'Perl', 'Haskell', 'Elixir', 'Clojure', 'F#', 'Visual Basic', 'MATLAB', 'Objective-C', 'Assembly', 'GDScript', 'Zig', 'Julia', 'Groovy', 'COBOL', 'Fortran', 'Delphi', 'Solidity', 'VHDL'],
  web: ['HTML', 'CSS', 'Responsive design', 'REST API', 'GraphQL', 'WebSockets', 'SEO', 'Accessibility (WCAG)', 'Progressive Web Apps', 'WebAssembly', 'JSON', 'XML', 'AJAX', 'OAuth', 'JWT', 'WordPress', 'Drupal', 'Shopify', 'Webflow', 'Strapi', 'Contentful'],
  frameworks: ['React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt', 'Remix', 'Astro', 'Node.js', 'Express', 'NestJS', 'Spring Boot', 'Django', 'Flask', 'FastAPI', 'Laravel', 'Symfony', 'Ruby on Rails', 'ASP.NET Core', '.NET', 'Blazor', 'Entity Framework', 'Hibernate', 'Tailwind CSS', 'Bootstrap', 'Sass', 'Redux', 'jQuery', 'Three.js', 'Electron', 'Flutter', 'React Native', 'Vite', 'Webpack', 'Prisma', 'Socket.IO', 'Pandas', 'NumPy', 'Qt', 'JavaFX', 'WPF', 'Material UI', 'Storybook'],
  tools: ['Git', 'GitHub', 'GitLab', 'Bitbucket', 'VS Code', 'Visual Studio', 'IntelliJ IDEA', 'PyCharm', 'Android Studio', 'Postman', 'Figma', 'Jira', 'Trello', 'Confluence', 'Notion', 'Slack', 'Microsoft Teams', 'npm', 'Yarn', 'pnpm', 'Gradle', 'Maven', 'ESLint', 'Prettier', 'Jupyter', 'Swagger', 'Insomnia', 'Wireshark', 'Vim', 'Linear'],
  devops: ['Docker', 'Kubernetes', 'GitHub Actions', 'GitLab CI', 'Azure DevOps', 'Jenkins', 'Terraform', 'Ansible', 'Helm', 'CI/CD', 'Nginx', 'Apache', 'Prometheus', 'Grafana', 'Infrastructure as Code', 'Linux administratie', 'Monitoring', 'Vagrant', 'ArgoCD', 'Docker Compose'],
  databases: ['PostgreSQL', 'MySQL', 'SQLite', 'MongoDB', 'Redis', 'MariaDB', 'Microsoft SQL Server', 'Oracle Database', 'Firebase', 'Supabase', 'Elasticsearch', 'Cassandra', 'DynamoDB', 'Neo4j', 'Database design', 'Normalisatie', 'Stored procedures', 'Data modelling'],
  cloud: ['Microsoft Azure', 'AWS', 'Google Cloud', 'Vercel', 'Netlify', 'Cloudflare', 'Heroku', 'DigitalOcean', 'Azure Functions', 'AWS Lambda', 'Amazon S3', 'Serverless', 'Firebase Hosting'],
  testing: ['Playwright', 'Vitest', 'Jest', 'Cypress', 'Selenium', 'JUnit', 'Pytest', 'Mocha', 'Testing Library', 'xUnit', 'NUnit', 'Unit testing', 'Integration testing', 'End-to-end testing', 'Test-driven development', 'Load testing', 'JMeter', 'Cucumber', 'Mockito', 'Testplanning'],
  'data-ai': ['Machine learning', 'Deep learning', 'PyTorch', 'TensorFlow', 'scikit-learn', 'Keras', 'OpenCV', 'Data analysis', 'Data visualisation', 'Power BI', 'Tableau', 'Apache Spark', 'ETL', 'NLP', 'Statistiek', 'Jupyter Notebook', 'Matplotlib', 'Hugging Face', 'Prompt engineering'],
  mobile: ['Android', 'iOS', 'Kotlin Multiplatform', 'SwiftUI', 'Jetpack Compose', 'Xamarin', 'Ionic', 'Expo', 'Capacitor'],
  os: ['Linux', 'Windows', 'macOS', 'Ubuntu', 'Debian', 'Windows Server', 'Raspberry Pi', 'Arduino', 'Active Directory', 'Netwerkbeheer', 'Virtualisatie', 'VMware', 'Hyper-V', 'VirtualBox'],
  security: ['Cybersecurity', 'Penetration testing', 'OWASP', 'Encryptie', 'Authenticatie', 'Netwerkbeveiliging', 'Kali Linux', 'Burp Suite', 'GDPR / AVG', 'Security awareness', 'Risicoanalyse', 'ISO 27001'],
  methods: ['Agile', 'Scrum', 'Kanban', 'Waterfall', 'DevOps cultuur', 'Pair programming', 'Code review', 'Clean code', 'Design patterns', 'SOLID', 'UML', 'Domain-driven design', 'Microservices', 'API-ontwerp', 'Technische documentatie', 'Versiebeheer', 'Object-oriented programming', 'Functional programming', 'Algoritmen en datastructuren'],
  gamedev: ['Godot', 'Unity', 'Unreal Engine', 'Blender', 'OpenGL', 'Vulkan', 'Game design', 'Level design', 'Shaders', 'Pixel art', '3D-modelleren', 'Animatie', 'Game physics', 'Multiplayer netwerken', 'SDL', 'Raylib', 'MonoGame', 'Game Maker'],
  communication: ['Luisteren', 'Schriftelijke communicatie', 'Mondelinge communicatie', 'Overtuigen', 'Feedback geven', 'Feedback ontvangen', 'Onderhandelen', 'Gespreksvoering', 'Conflicthantering', 'Empathie', 'Assertiviteit', 'Tactvol communiceren', 'Telefonisch contact', 'E-mailcorrespondentie', 'Storytelling', 'Interculturele communicatie', 'Notuleren', 'Rapporteren'],
  teamwork: ['Teamwerk', 'Samenwerken', 'Kennis delen', 'Flexibiliteit', 'Betrouwbaarheid', 'Verantwoordelijkheid', 'Behulpzaamheid', 'Open staan voor feedback', 'Coachen', 'Mentorschap', 'Multidisciplinair samenwerken', 'Afstemmen met collega\'s', 'Vertrouwen opbouwen', 'Hulp vragen'],
  organisation: ['Organiseren', 'Prioriteiten stellen', 'Zelfstandig werken', 'Nauwkeurigheid', 'Stressbestendigheid', 'Initiatief nemen', 'Probleemoplossend vermogen', 'Doorzettingsvermogen', 'Leergierigheid', 'Aandacht voor detail', 'Proactiviteit', 'Dossiervorming', 'Tijdmanagement', 'Multitasken', 'Structureren', 'Kwaliteitsbewaking'],
  planning: ['Planning', 'Tijdsplanning', 'Roosteren', 'Capaciteitsplanning', 'Deadlines bewaken', 'Agenda- en afsprakenbeheer', 'Roadmapping', 'Voorraadplanning', 'Reisplanning', 'Evenementenplanning', 'Urenregistratie', 'Planningstools', 'Resourceplanning', 'Realistisch inschatten'],
  leadership: ['Leidinggeven', 'Delegeren', 'Motiveren', 'Teamontwikkeling', 'Besluitvaardigheid', 'Visie ontwikkelen', 'Verandermanagement', 'Medewerkers begeleiden', 'Functioneringsgesprekken', 'Rolmodel zijn', 'Strategisch denken', 'Werving en selectie', 'Inwerken van nieuwe collega\'s', 'Ploegleiding'],
  customer: ['Klantgericht werken', 'Klantenservice', 'Klachtenafhandeling', 'Servicegerichtheid', 'Balie- en telefoondienst', 'Helpdesk', 'CRM-systemen', 'Zendesk', 'Adviseren', 'Verkoopgesprekken', 'Klanttevredenheid', 'Chatondersteuning', 'Retourafhandeling', 'Gastvrijheid', 'Accountbeheer', 'Upselling'],
  admin: ['Administratie', 'Boekhouden', 'Facturatie', 'Debiteuren- en crediteurenbeheer', 'Gegevensinvoer', 'Archivering', 'Correspondentie', 'Personeelsadministratie', 'Salarisadministratie', 'Declaraties', 'Inkoopadministratie', 'Contractbeheer', 'Typen', 'Vergaderondersteuning', 'Secretariële ondersteuning', 'Exact Online', 'AFAS', 'SAP', 'Snelstart', 'Kassa-afhandeling'],
  design: ['UX-design', 'UI-design', 'Grafisch ontwerp', 'Figma', 'Adobe Photoshop', 'Adobe Illustrator', 'Adobe InDesign', 'Adobe XD', 'Adobe Premiere Pro', 'After Effects', 'Canva', 'Sketch', 'Wireframing', 'Prototyping', 'Typografie', 'Kleurtheorie', 'Logo-ontwerp', 'Fotografie', 'Videobewerking', 'Motion design', 'Huisstijlontwikkeling', 'Gebruikersonderzoek', 'Design systems', 'Interactieontwerp'],
  office: ['Microsoft Word', 'Microsoft Excel', 'Microsoft PowerPoint', 'Microsoft Outlook', 'Microsoft Teams', 'Microsoft OneNote', 'Microsoft Access', 'Microsoft SharePoint', 'Microsoft Project', 'Microsoft Visio', 'Microsoft Power Automate', 'Excel-formules', 'Draaitabellen', 'Macro\'s (VBA)', 'Mail merge', 'OneDrive', 'Google Workspace', 'Google Sheets', 'Google Docs', 'LibreOffice'],
  analysis: ['Data-analyse', 'Rapportage', 'Kritisch denken', 'Analytisch denken', 'KPI\'s opstellen', 'Dashboards', 'Financiële analyse', 'Procesanalyse', 'Trendanalyse', 'Probleemanalyse', 'Business analyse', 'Statistiek', 'Kostenanalyse', 'Marktanalyse', 'SWOT-analyse', 'Root cause analyse', 'Datakwaliteit', 'Google Analytics', 'Requirements analyse', 'Data-interpretatie'],
  research: ['Onderzoek doen', 'Literatuuronderzoek', 'Interviewtechnieken', 'Enquêtes opstellen', 'Kwalitatief onderzoek', 'Kwantitatief onderzoek', 'Bronnen beoordelen', 'Rapportage schrijven', 'Hypotheses opstellen', 'Observatieonderzoek', 'Marktonderzoek', 'Gebruikersonderzoek', 'Casestudy\'s', 'Onderzoeksopzet', 'APA-bronvermelding', 'SPSS', 'Zotero', 'Wetenschappelijk schrijven'],
  pm: ['Projectmanagement', 'Projectplanning', 'Stakeholdermanagement', 'Risicomanagement', 'Budgetbeheer', 'Scrum Master', 'Product ownership', 'PRINCE2', 'Prioriteren van een backlog', 'Voortgangsrapportage', 'Kwaliteitsmanagement', 'Change management', 'Projectdocumentatie', 'Gantt-planning', 'Lean', 'Six Sigma', 'Scope management', 'Retrospectives', 'Sprintplanning', 'Verwachtingsmanagement'],
  presenting: ['Presenteren', 'Pitchen', 'Spreken voor een groep', 'Workshops geven', 'Trainingen geven', 'Demo\'s geven', 'Visuele presentaties', 'Verhalen vertellen', 'Vergaderingen leiden', 'Uitleggen van complexe onderwerpen', 'Publieksgericht communiceren', 'Voorlichting geven', 'Gastlessen', 'Instructie geven']
};

const ALIASES: Record<string, string[]> = {
  JavaScript: ['js', 'ecmascript', 'es6'], TypeScript: ['ts'], Python: ['py'], 'C#': ['csharp', 'c sharp'], 'C++': ['cpp'], Go: ['golang'],
  'Node.js': ['node', 'nodejs'], 'Next.js': ['next', 'nextjs'], Vue: ['vue.js', 'vuejs'], React: ['react.js', 'reactjs'], Angular: ['angularjs'],
  PostgreSQL: ['postgres', 'psql'], MongoDB: ['mongo'], Kubernetes: ['k8s'], 'Microsoft Azure': ['azure'], AWS: ['amazon web services'],
  'Google Cloud': ['gcp'], 'Unreal Engine': ['unreal', 'ue4', 'ue5'], 'Spring Boot': ['spring'], 'VS Code': ['vscode', 'visual studio code'],
  'Ruby on Rails': ['rails', 'ror'], 'Tailwind CSS': ['tailwind'], '.NET': ['dotnet', 'asp.net'], 'Machine learning': ['ml'],
  'Microsoft Excel': ['excel'], 'Microsoft Word': ['word'], 'Microsoft PowerPoint': ['powerpoint', 'ppt'], 'Microsoft Outlook': ['outlook'],
  'Microsoft Teams': ['teams'], 'Adobe Photoshop': ['photoshop', 'ps'], 'Adobe Illustrator': ['illustrator'], 'Adobe InDesign': ['indesign'],
  'GitHub Actions': ['actions'], 'CI/CD': ['cicd', 'pipelines'], 'UX-design': ['ux'], 'UI-design': ['ui'], 'Docker Compose': ['compose'],
  'Microsoft SQL Server': ['mssql', 'sql server'], 'Test-driven development': ['tdd'], 'Object-oriented programming': ['oop'],
  'Zelfstandig werken': ['zelfstandigheid'], Teamwerk: ['teamwork', 'team'], Samenwerken: ['samenwerking'], 'GDPR / AVG': ['gdpr', 'avg'],
  Cybersecurity: ['security'], 'Data-analyse': ['data analyse', 'data analysis'], 'Probleemoplossend vermogen': ['probleemoplossing', 'problem solving'],
  Tijdmanagement: ['time management', 'tijdbeheer'], Leidinggeven: ['leiderschap', 'management'], 'Microsoft Power Automate': ['power automate', 'flow']
};

export const CATEGORY_BY_ID = new Map(SKILL_CATEGORIES.map((c) => [c.id, c]));

/** Normaliseert een naam voor vergelijking: "Node.js", "node js" en "NodeJS" worden gelijk. */
export const compact = (s: string) => {
  const k = s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9#+]/g, '');
  return k || s.toLowerCase().trim();
};

/** Spaties inkorten, hoofdletters ongemoeid laten. */
export const cleanSkillName = (s: string) => s.replace(/\s+/g, ' ').trim();
/** Sleutel voor duplicaatherkenning: hoofdletters en overbodige spaties tellen niet mee. */
export const skillKey = (s: string) => cleanSkillName(s).toLowerCase();

function build(): SkillEntry[] {
  const by = new Map<string, SkillEntry>();
  let rank = 0;
  for (const cat of SKILL_CATEGORIES) {
    for (const name of RAW[cat.id] ?? []) {
      const k = skillKey(name);
      const hit = by.get(k);
      if (hit) { if (!hit.categories.includes(cat.id)) hit.categories.push(cat.id); continue; }
      by.set(k, { name, categories: [cat.id], aliases: ALIASES[name] ?? [], rank: rank++ });
    }
  }
  return [...by.values()];
}
export const SKILL_CATALOG: SkillEntry[] = build();
const NORM = SKILL_CATALOG.map((e) => ({ e, name: compact(e.name), words: e.name.toLowerCase().split(/[\s/&()\-–.]+/).filter(Boolean).map(compact), aliases: e.aliases.map(compact) }));

/** Zoekt een categorie-preset op naam (hoofdletter- en spatieongevoelig); null bij een eigen categorienaam. */
export function categoryByName(name: string): SkillCategory | null {
  const k = skillKey(name);
  return k ? SKILL_CATEGORIES.find((c) => skillKey(c.label) === k) ?? null : null;
}

export interface SearchOptions { exclude?: Iterable<string>; category?: string; boost?: string | null; limit?: number }

/**
 * Zoekt in de catalogus. Rangorde: exacte naam, begin van de naam, begin van een woord, begin van een alias, ergens in de naam.
 * Gelijke scores gaan op catalogusvolgorde (populairste eerst). Zonder zoekterm volgen alle vaardigheden (eerst die van `boost`).
 */
export function searchSkills(query: string, opts: SearchOptions = {}): SkillEntry[] {
  const q = compact(query);
  const skip = new Set([...(opts.exclude ?? [])].map(skillKey));
  const limit = opts.limit ?? 50;
  const rows: { e: SkillEntry; s: number }[] = [];
  for (const n of NORM) {
    if (skip.has(skillKey(n.e.name))) continue;
    if (opts.category && !n.e.categories.includes(opts.category)) continue;
    let s = 0;
    if (!q) s = 1;
    else if (n.name === q) s = 100;
    else if (n.name.startsWith(q)) s = 80;
    else if (n.aliases.includes(q)) s = 90;
    else if (n.words.some((w) => w.startsWith(q))) s = 60;
    else if (n.aliases.some((a) => a.startsWith(q))) s = 55;
    else if (q.length >= 2 && n.name.includes(q)) s = 40;
    if (!s) continue;
    if (opts.boost && n.e.categories.includes(opts.boost)) s += 5;
    rows.push({ e: n.e, s });
  }
  rows.sort((a, b) => b.s - a.s || a.e.rank - b.e.rank);
  return rows.slice(0, limit).map((r) => r.e);
}

/** Zoekt categorie-presets op naam; zonder zoekterm alle categorieën in vaste volgorde. */
export function searchCategories(query: string, limit = 40): SkillCategory[] {
  const q = compact(query);
  if (!q) return SKILL_CATEGORIES.slice(0, limit);
  const rows: { c: SkillCategory; s: number; i: number }[] = [];
  SKILL_CATEGORIES.forEach((c, i) => {
    const n = compact(c.label);
    const words = c.label.toLowerCase().split(/[\s&]+/).filter(Boolean).map(compact);
    const s = n === q ? 100 : n.startsWith(q) ? 80 : words.some((w) => w.startsWith(q)) ? 60 : q.length >= 2 && n.includes(q) ? 40 : 0;
    if (s) rows.push({ c, s, i });
  });
  rows.sort((a, b) => b.s - a.s || a.i - b.i);
  return rows.slice(0, limit).map((r) => r.c);
}

/** Voegt een vaardigheid toe zonder duplicaat in dezelfde lijst. De ingevoerde hoofdletters blijven behouden. */
export function addSkill(list: string[], raw: string): { list: string[]; added: boolean; name: string; duplicate: boolean } {
  const name = cleanSkillName(raw);
  if (!name) return { list, added: false, name, duplicate: false };
  if (list.some((s) => skillKey(s) === skillKey(name))) return { list, added: false, name, duplicate: true };
  return { list: [...list, name], added: true, name, duplicate: false };
}

/** Splitst geplakte tekst ("a, b; c") in losse namen. */
export const splitSkills = (t: string): string[] => t.split(/[,;\n]/).map(cleanSkillName).filter(Boolean);
