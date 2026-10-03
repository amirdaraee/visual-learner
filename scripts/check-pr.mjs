// Checks a pull request against CONTRIBUTING.md before a human looks at it.
//   BASE_SHA=<sha> HEAD_SHA=<sha> PR_BODY_FILE=<file> node scripts/check-pr.mjs
// Prints GitHub annotations and exits 1 on any error. The decision is the pure function evaluate(), which the unit tests cover.
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const KB = 1024;
export const LIMITS = { preview: 200 * KB, social: 700 * KB, topicPage: 250 * KB, other: 1024 * KB };
const TOPIC_PAGE = /^(?!templates\/)([a-z0-9-]+)\/([a-z0-9-]+)\/index\.html$/;
const AI_TRAILER = /co-authored-by:.*(claude|copilot|chatgpt|gpt-|openai|anthropic|gemini)|generated (with|by) .*(claude|copilot|chatgpt|openai|anthropic|gemini)/i;

/**
 * files: [{ status: 'A'|'M'|'D'|'R', path, size }]   commits: [message]   body: PR description markdown
 * Returns { errors: [], warnings: [] }.
 */
/** The text under a "## Heading" in the description, with comments and whitespace removed. */
function section(body, name) {
  const m = body.match(new RegExp(`^##\\s+${name}\\s*\\n([\\s\\S]*?)(?=^##\\s|(?![\\s\\S]))`, 'm'));
  return m ? m[1].replace(/<!--[\s\S]*?-->/g, '').trim() : '';
}

export function evaluate({ files, commits = [], body = '' }) {
  const errors = [], warnings = [];
  const live = files.filter((f) => f.status !== 'D');
  const added = live.filter((f) => f.status === 'A');
  const has = (p) => live.some((f) => f.path === p);
  const newTopics = added.map((f) => f.path.match(TOPIC_PAGE)).filter(Boolean).map((m) => ({ cat: m[1], id: m[2] }));
  const touchedTopics = new Set(live.map((f) => f.path.match(/^(?!templates\/|assets\/|docs\/|shared\/|scripts\/|tests\/|\.github\/)([a-z0-9-]+\/[a-z0-9-]+)\//)).filter(Boolean).map((m) => m[1]));
  const sharedChanged = live.some((f) => f.path.startsWith('shared/'));

  // 1. a new topic arrives complete
  for (const t of newTopics) {
    if (!has('topics.json')) errors.push(`New topic ${t.cat}/${t.id}: add its entry to topics.json.`);
    if (!has('README.md')) errors.push(`New topic ${t.cat}/${t.id}: add it to the table in README.md.`);
    if (!has(`assets/previews/${t.id}.jpg`)) errors.push(`New topic ${t.cat}/${t.id}: add assets/previews/${t.id}.jpg (a real capture, model only).`);
    if (!has(`assets/social/${t.id}.png`)) errors.push(`New topic ${t.cat}/${t.id}: run node scripts/social-cards.mjs ${t.id} and commit assets/social/${t.id}.png.`);
  }
  if (newTopics.length > 1) errors.push(`This adds ${newTopics.length} topics. Open one pull request per topic.`);
  else if (touchedTopics.size > 1) warnings.push(`This touches ${touchedTopics.size} topics (${[...touchedTopics].join(', ')}). One topic or one fix per pull request is easier to review.`);

  // 2. size and file-type limits
  for (const f of added.concat(live.filter((x) => x.status === 'M'))) {
    const limit = /^assets\/previews\//.test(f.path) ? LIMITS.preview : /^assets\/social\//.test(f.path) ? LIMITS.social : TOPIC_PAGE.test(f.path) ? LIMITS.topicPage : LIMITS.other;
    if (f.size != null && f.size > limit) errors.push(`${f.path} is ${Math.round(f.size / KB)} KB; the limit here is ${Math.round(limit / KB)} KB.`);
    if (/\.(png|jpe?g|gif|webp|mp4|mov|woff2?|ttf|zip|wav|mp3)$/i.test(f.path) && !/^assets\/(previews|social)\//.test(f.path)) errors.push(`${f.path}: binary files are only allowed in assets/previews and assets/social. Everything else is built from code.`);
    if (/(^|\/)(_[^/]*|\.env.*|.*\.pem|.*\.key)$/.test(f.path) && !/\.DS_Store$/.test(f.path)) errors.push(`${f.path}: dev, test or secret-looking files must not be committed.`);
  }

  // 3. no AI attribution (CLAUDE.md rule 2)
  commits.forEach((m, i) => { if (AI_TRAILER.test(m)) errors.push(`Commit message ${i + 1} contains an AI attribution line. The repo does not allow those.`); });

  // 4. the checklist in the description is complete
  const boxes = [...body.matchAll(/^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/gm)].map((m) => ({ done: m[1] !== ' ', text: m[2] }));
  if (!boxes.length) errors.push('The pull request description is missing the checklist from the template.');
  for (const b of boxes) {
    if (b.done) continue;
    if (/If `shared\/` changed/i.test(b.text) && !sharedChanged) continue;
    if (/\(new topics\)/i.test(b.text) && !newTopics.length) continue;
    errors.push(`Unchecked item in the description: "${b.text.replace(/`/g, '')}"`);
  }
  if (!section(body, 'What this changes')) errors.push('Fill in "What this changes" in the description.');
  if (newTopics.length && !section(body, 'Sources')) errors.push('Fill in "Sources" for the facts in the new topic (or say "none, code-only change").');

  // 5. shared code needs a heads-up
  if (sharedChanged && !/shared\//.test(body.replace(/If `shared\/` changed[^\n]*/gi, ''))) warnings.push('shared/ changed: say in the description which topics you checked and at which widths.');
  return { errors, warnings };
}

function git(...args) { return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); }

function main() {
  const base = process.env.BASE_SHA, head = process.env.HEAD_SHA || 'HEAD';
  if (!base) { console.error('Set BASE_SHA (and optionally HEAD_SHA, PR_BODY_FILE).'); process.exit(2); }
  const files = git('diff', '--name-status', '--no-renames', `${base}...${head}`).split('\n').filter(Boolean).map((l) => {
    const [status, path] = l.split('\t');
    let size = null; if (status !== 'D') { try { size = Number(git('cat-file', '-s', `${head}:${path}`)); } catch { /* ignore */ } }
    return { status, path, size };
  });
  const commits = git('log', '--format=%B%x00', `${base}..${head}`).split('\0').map((s) => s.trim()).filter(Boolean);
  const bodyFile = process.env.PR_BODY_FILE;
  const body = bodyFile && existsSync(bodyFile) ? readFileSync(bodyFile, 'utf8') : (process.env.PR_BODY || '');
  const { errors, warnings } = evaluate({ files, commits, body });
  warnings.forEach((w) => console.log(`::warning::${w}`));
  errors.forEach((e) => console.log(`::error::${e}`));
  console.log(`\n${files.length} files changed: ${errors.length} problem(s), ${warnings.length} warning(s).`);
  if (errors.length) process.exit(1);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main();
