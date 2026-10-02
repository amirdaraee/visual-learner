// Validates topics.json and every live topic page. No dependencies.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const fail = (msg) => errors.push(msg);
const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
const STATUS = ['live', 'soon'];
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

let data;
try { data = JSON.parse(readFileSync(join(root, 'topics.json'), 'utf8')); }
catch (e) { console.error('topics.json: ' + e.message); process.exit(1); }

if (!Array.isArray(data.categories) || !data.categories.length) fail('topics.json: "categories" must be a non-empty array');
if (!Array.isArray(data.topics)) fail('topics.json: "topics" must be an array');

const catIds = new Set();
for (const c of data.categories || []) {
  if (!KEBAB.test(c.id || '')) fail(`category "${c.id}": id must be kebab-case`);
  if (catIds.has(c.id)) fail(`category "${c.id}": duplicate id`);
  catIds.add(c.id);
  if (!c.name) fail(`category "${c.id}": missing name`);
  if (!c.blurb) fail(`category "${c.id}": missing blurb`);
  if (!HEX.test(c.accent || '')) fail(`category "${c.id}": accent must be a #rrggbb colour`);
}

/* environments: every category has ONE fixed environment, defined in shared/environments.js and shared by all its topics */
const envSrc = readFileSync(join(root, 'shared', 'environments.js'), 'utf8');
const envNames = new Set([...envSrc.matchAll(/ENV\.([a-z]+) = function \(T\)/g)].map((m) => m[1]));
const mapSrc = (envSrc.match(/ENV\.CATEGORY_ENV = \{([^}]*)\}/) || [])[1] || '';
const codeEnv = Object.fromEntries([...mapSrc.matchAll(/([a-z-]+):\s*'([a-z]+)'/g)].map((m) => [m[1], m[2]]));
for (const c of data.categories || []) {
  if (!envNames.has(c.environment)) fail(`category "${c.id}": environment must be one of ${[...envNames].join(', ')}`);
  else if ((codeEnv[c.id] || 'studio') !== c.environment) fail(`category "${c.id}": topics.json says "${c.environment}" but ENV.CATEGORY_ENV in shared/environments.js says "${codeEnv[c.id] || 'studio'}"`);
}
for (const [cat, name] of Object.entries(codeEnv)) {
  if (!catIds.has(cat)) fail(`ENV.CATEGORY_ENV maps unknown category "${cat}"`);
  if (!envNames.has(name)) fail(`ENV.CATEGORY_ENV maps "${cat}" to "${name}", which is not defined`);
}

const topicIds = new Set();
for (const t of data.topics || []) {
  const where = `topic "${t.id}"`;
  if (!KEBAB.test(t.id || '')) fail(`${where}: id must be kebab-case`);
  if (topicIds.has(t.id)) fail(`${where}: duplicate id`);
  topicIds.add(t.id);
  if (!catIds.has(t.category)) fail(`${where}: unknown category "${t.category}"`);
  if (!t.title) fail(`${where}: missing title`);
  if (!t.summary) fail(`${where}: missing summary`);
  else if (t.summary.length > 160) fail(`${where}: summary is ${t.summary.length} characters, max 160`);
  if (!LEVELS.includes(t.level)) fail(`${where}: level must be one of ${LEVELS.join(', ')}`);
  if (!STATUS.includes(t.status)) fail(`${where}: status must be one of ${STATUS.join(', ')}`);
  if (!DATE.test(t.added || '')) fail(`${where}: "added" must be YYYY-MM-DD`);
  if (t.tags && (!Array.isArray(t.tags) || t.tags.length > 5)) fail(`${where}: tags must be an array of at most 5`);
  if (!t.path || !t.path.endsWith('/') || t.path.startsWith('/') || t.path.includes('..')) { fail(`${where}: path must be relative and end in "/"`); continue; }
  if (t.category && !t.path.startsWith(t.category + '/')) fail(`${where}: path must start with "${t.category}/"`);
  if (t.status !== 'live') continue;

  const file = join(root, t.path, 'index.html');
  if (!existsSync(file) || !statSync(file).isFile()) { fail(`${where}: ${t.path}index.html does not exist`); continue; }
  const html = readFileSync(file, 'utf8');
  const depth = t.path.split('/').filter(Boolean).length;
  const back = '../'.repeat(depth) + 'index.html';
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(`${where}: page has no <title>`);
  if (!/<meta[^>]+name=["']description["']/i.test(html)) fail(`${where}: page has no meta description`);
  if (!html.includes(`href="${back}"`)) fail(`${where}: page must link back with href="${back}"`);
  if (/<script[^>]+src=["']http:\/\//i.test(html)) fail(`${where}: scripts must use https`);
  if (/\b(AIza[0-9A-Za-z_-]{20,}|sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,})/.test(html)) fail(`${where}: looks like it contains a secret`);
  if (/google-analytics|googletagmanager|gtag\(|plausible\.io|segment\.com/i.test(html)) fail(`${where}: analytics and trackers are not allowed`);
  /* the shared stylesheet counts as part of the page, since the rule lives there for every topic */
  const sharedCss = readFileSync(join(root, 'shared', 'ui.css'), 'utf8');
  if (!/prefers-reduced-motion/.test(html + (html.includes('shared/ui.css') ? sharedCss : ''))) fail(`${where}: page must respect prefers-reduced-motion`);
  /* every topic renders through the shared stage, inside its category's fixed environment, so upgrades reach it automatically */
  const stageSrc = '../'.repeat(depth) + 'shared/stage.js', envSrcPath = '../'.repeat(depth) + 'shared/environments.js';
  if (!html.includes(`src="${stageSrc}"`)) fail(`${where}: page must load the shared stage with <script src="${stageSrc}">`);
  if (!html.includes(`src="${envSrcPath}"`)) fail(`${where}: page must load the shared environments with <script src="${envSrcPath}">`);
  const uiSrc = '../'.repeat(depth) + 'shared/ui.css';
  if (!html.includes(`href="${uiSrc}"`)) fail(`${where}: page must use the shared interface style with <link rel="stylesheet" href="${uiSrc}">`);
  if (!/VLStage\.create\(/.test(html)) fail(`${where}: page must create its scene with VLStage.create(...)`);
  const cat = (html.match(/category:\s*'([a-z-]+)'/) || [])[1];
  if (cat !== t.category) fail(`${where}: VLStage.create must use category: '${t.category}' (found ${cat ? "'" + cat + "'" : 'none'})`);
  if (/new\s+(?:T|THREE)\.WebGLRenderer/.test(html)) fail(`${where}: do not create your own renderer, use VLStage so environment upgrades reach this topic`);
  if (/<img[^>]+src=["']\//i.test(html)) fail(`${where}: use relative asset paths, not root-absolute ones`);
}

for (const f of ['shared/stage.js', 'shared/environments.js', 'shared/sound.js', 'shared/ui.css', 'README.md', 'LICENSE', 'CONTRIBUTING.md', 'CODE_OF_CONDUCT.md', 'SECURITY.md', 'CLAUDE.md', '.nojekyll', 'index.html']) {
  if (!existsSync(join(root, f))) fail(`missing required file: ${f}`);
}

if (errors.length) {
  console.error(`\nValidation failed (${errors.length}):\n` + errors.map((e) => '  - ' + e).join('\n') + '\n');
  process.exit(1);
}
console.log(`OK: ${data.categories.length} categories, ${data.topics.length} topics (${data.topics.filter((t) => t.status === 'live').length} live)`);
