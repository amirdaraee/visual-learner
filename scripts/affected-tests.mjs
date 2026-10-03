// Decides which browser tests a pull request needs, so a small change does not run the whole suite.
//   BASE_SHA=<sha> HEAD_SHA=<sha> node scripts/affected-tests.mjs     (writes run=, topics= to $GITHUB_OUTPUT and prints a summary)
// Rules, from most to least expensive:
//   shared stage, interface style, sound, core environments, tests or CI changed -> every topic
//   shared/rooms/<name>.js changed -> the topics whose subject uses that room
//   files inside a topic folder changed -> that topic
//   the landing page, manifest or previews changed -> only the (fast) landing page tests
//   anything else (docs, templates, scripts) -> no browser tests
import { readFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const EVERYTHING = [/^shared\/(stage\.js|ui\.css|sound\.js|environments\.js)$/, /^tests\//, /^playwright\.config\.mjs$/, /^package(-lock)?\.json$/, /^scripts\/lib\/writing-rules\.mjs$/, /^\.github\/workflows\/ci\.yml$/];
const SITE_ONLY = [/^index\.html$/, /^404\.html$/, /^topics\.json$/, /^assets\/(previews|social)\//, /^CNAME$/];

/** manifest: parsed topics.json. files: changed paths. Returns { all, topics: [ids], site, run }. */
export function affected(manifest, files) {
  const topics = new Set();
  let all = false, site = false;
  const roomOf = Object.fromEntries(manifest.categories.map((c) => [c.id, c.environment]));
  for (const f of files) {
    if (EVERYTHING.some((re) => re.test(f))) { all = true; continue; }
    const room = f.match(/^shared\/rooms\/([a-z]+)\.js$/);
    if (room) { manifest.topics.filter((t) => roomOf[t.category] === room[1]).forEach((t) => topics.add(t.id)); site = true; continue; }
    const t = manifest.topics.find((x) => f.startsWith(x.path));
    if (t) { topics.add(t.id); continue; }
    // a new topic folder that is not in the manifest yet is still a topic
    const folder = f.match(/^(?!templates\/|assets\/|docs\/|shared\/|scripts\/|tests\/|\.github\/|node_modules\/)([a-z0-9-]+\/[a-z0-9-]+)\/index\.html$/);
    if (folder) { const id = folder[1].split('/')[1]; topics.add(id); continue; }
    if (SITE_ONLY.some((re) => re.test(f))) site = true;
  }
  const list = all ? [] : [...topics].sort();
  return { all, topics: list, site: site || all || topics.size > 0, run: all || topics.size > 0 || site };
}

function main() {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const manifest = JSON.parse(readFileSync(join(root, 'topics.json'), 'utf8'));
  const base = process.env.BASE_SHA, head = process.env.HEAD_SHA || 'HEAD';
  const files = base ? execFileSync('git', ['diff', '--name-only', `${base}...${head}`], { encoding: 'utf8' }).split('\n').filter(Boolean) : null;
  // no base (a scheduled or manual run) means everything
  const r = files ? affected(manifest, files) : { all: true, topics: [], site: true, run: true };
  const scope = r.all ? 'every topic' : r.topics.length ? `topics: ${r.topics.join(', ')}` : r.site ? 'landing page only' : 'none (nothing a browser test covers changed)';
  console.log(`Browser tests needed: ${r.run ? 'yes' : 'no'}; scope: ${scope}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `run=${r.run}\nall=${r.all}\ntopics=${r.topics.join(',')}\n`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
