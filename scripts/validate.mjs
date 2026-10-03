// Validates topics.json and every live topic page. No dependencies.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
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
  if (c.preview && !existsSync(join(root, c.preview))) fail(`category "${c.id}": preview ${c.preview} does not exist`);
}

/* environments: every category has ONE fixed environment, defined in shared/environments.js and shared by all its topics */
const envSrc = readFileSync(join(root, 'shared', 'environments.js'), 'utf8');
const roomDir = join(root, 'shared', 'rooms');
const roomFiles = existsSync(roomDir) ? readdirSync(roomDir).filter((f) => f.endsWith('.js')) : [];
const roomNames = new Set();
for (const f of roomFiles) for (const m of readFileSync(join(roomDir, f), 'utf8').matchAll(/ENV\.([a-z]+) = function \(T\)/g)) { roomNames.add(m[1]); if (m[1] + '.js' !== f) fail(`shared/rooms/${f}: defines room "${m[1]}", the file must be named ${m[1]}.js`); }
const envNames = new Set([...envSrc.matchAll(/ENV\.([a-z]+) = function \(T\)/g)].map((m) => m[1]).concat([...roomNames]));
const mapSrc = (envSrc.match(/ENV\.CATEGORY_ENV = \{([^}]*)\}/) || [])[1] || '';
const codeEnv = Object.fromEntries([...mapSrc.matchAll(/'?([a-z-]+)'?:\s*'([a-z]+)'/g)].map((m) => [m[1], m[2]]));
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
  /* a topic lives in one primary category (folder, environment, back link) and may also be listed under others */
  if (t.also !== undefined) {
    if (!Array.isArray(t.also)) fail(`${where}: "also" must be an array of category ids`);
    else {
      if (new Set(t.also).size !== t.also.length) fail(`${where}: "also" has duplicates`);
      for (const id of t.also) {
        if (!catIds.has(id)) fail(`${where}: "also" lists unknown category "${id}"`);
        else if (id === t.category) fail(`${where}: "also" repeats the primary category "${id}"`);
      }
    }
  }
  if (!t.title) fail(`${where}: missing title`);
  if (!t.summary) fail(`${where}: missing summary`);
  else if (t.summary.length > 160) fail(`${where}: summary is ${t.summary.length} characters, max 160`);
  if (!LEVELS.includes(t.level)) fail(`${where}: level must be one of ${LEVELS.join(', ')}`);
  if (!STATUS.includes(t.status)) fail(`${where}: status must be one of ${STATUS.join(', ')}`);
  if (!DATE.test(t.added || '')) fail(`${where}: "added" must be YYYY-MM-DD`);
  if (t.tags && (!Array.isArray(t.tags) || t.tags.length > 5)) fail(`${where}: tags must be an array of at most 5`);
  if (!t.path || !t.path.endsWith('/') || t.path.startsWith('/') || t.path.includes('..')) { fail(`${where}: path must be relative and end in "/"`); continue; }
  if (t.category && !t.path.startsWith(t.category + '/')) fail(`${where}: path must start with "${t.category}/"`);
  /* no leftover dev/test pages, and no eval of page input, may ship inside a topic folder */
  { const dir = join(root, t.path); if (existsSync(dir)) for (const f of readdirSync(dir)) if ((f.startsWith('_') || f.startsWith('.')) && f !== '.DS_Store') fail(`${where}: stray file "${f}" in the topic folder (remove dev/test files)`); }
  if (t.status !== 'live') continue;

  const file = join(root, t.path, 'index.html');
  if (!existsSync(file) || !statSync(file).isFile()) { fail(`${where}: ${t.path}index.html does not exist`); continue; }
  const html = readFileSync(file, 'utf8');
  const depth = t.path.split('/').filter(Boolean).length;
  const back = '../'.repeat(depth) + 'index.html';
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(`${where}: page has no <title>`);
  if (!/<meta[^>]+name=["']description["']/i.test(html)) fail(`${where}: page has no meta description`);
  /* the link may carry the subject anchor, e.g. ../../index.html#biology, so it opens on that subject */
  if (!html.includes(`href="${back}"`) && !html.includes(`href="${back}#${t.category}"`)) fail(`${where}: page must link back with href="${back}#${t.category}"`);
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
  /* a subject whose room lives in shared/rooms/ must have its room file loaded after the core environments */
  const roomOfTopic = (data.categories || []).find((c) => c.id === t.category);
  if (roomOfTopic && roomNames.has(roomOfTopic.environment)) {
    const roomSrc = '../'.repeat(depth) + `shared/rooms/${roomOfTopic.environment}.js`;
    if (!html.includes(`src="${roomSrc}"`)) fail(`${where}: page must load its subject's room with <script src="${roomSrc}"> (after environments.js)`);
    else if (html.indexOf(roomSrc) < html.indexOf(envSrcPath)) fail(`${where}: the room script must come after environments.js`);
  }
  /* share card: Open Graph and Twitter tags that point at this topic's own image */
  const cardUrl = `https://turnscience.com/assets/social/${t.id}.png`;
  if (!html.includes(`<meta property="og:image" content="${cardUrl}">`)) fail(`${where}: add <meta property="og:image" content="${cardUrl}"> and the other share tags (see templates/topic/index.html)`);
  if (!html.includes('<meta name="twitter:card" content="summary_large_image">')) fail(`${where}: missing the twitter:card tag`);
  if (!html.includes(`<link rel="canonical" href="https://turnscience.com/${t.path}">`)) fail(`${where}: canonical link must be https://turnscience.com/${t.path}`);
  if (!existsSync(join(root, 'assets', 'social', `${t.id}.png`))) fail(`${where}: assets/social/${t.id}.png is missing (node scripts/social-cards.mjs ${t.id})`);
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
