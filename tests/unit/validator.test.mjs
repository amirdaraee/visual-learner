// Runs scripts/validate.mjs against a scratch copy of the repo with one defect at a time.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
let dir;
const skip = (src) => !/(^|\/)(node_modules|\.git|\.tmp|\.serena|test-results|playwright-report)(\/|$)/.test(src);

before(() => { dir = mkdtempSync(join(tmpdir(), 'vl-validate-')); cpSync(repo, dir, { recursive: true, filter: skip }); });
after(() => rmSync(dir, { recursive: true, force: true }));

function run() { const r = spawnSync('node', ['scripts/validate.mjs'], { cwd: dir, encoding: 'utf8' }); return { ok: r.status === 0, out: r.stdout + r.stderr }; }
/** Applies a change, runs the validator, then puts everything back. */
function withDefect(edit, undo, fn) { edit(); try { fn(run()); } finally { undo(); } }
function editFile(rel, fn) { const p = join(dir, rel), before = readFileSync(p, 'utf8'); return { edit: () => writeFileSync(p, fn(before)), undo: () => writeFileSync(p, before) }; }
function manifest(fn) { return editFile('topics.json', (t) => { const d = JSON.parse(t); fn(d); return JSON.stringify(d, null, 2); }); }

test('the repo as it stands is valid', () => { const r = run(); assert.ok(r.ok, r.out); });

test('a topic folder with a stray dev file fails', () => {
  const p = join(dir, 'computer-science/cpu/_test.html');
  withDefect(() => writeFileSync(p, '<html></html>'), () => rmSync(p), (r) => { assert.ok(!r.ok); assert.match(r.out, /stray file "_test\.html"/); });
});
test('a topic page without share tags fails', () => {
  const e = editFile('math/fourier-series/index.html', (h) => h.replace(/<meta property="og:image" content="[^"]*">\n/, ''));
  withDefect(e.edit, e.undo, (r) => { assert.ok(!r.ok); assert.match(r.out, /og:image/); });
});
test('a wrong canonical link fails', () => {
  const e = editFile('math/fourier-series/index.html', (h) => h.replace('<link rel="canonical" href="https://turnscience.com/math/fourier-series/">', '<link rel="canonical" href="https://example.com/">'));
  withDefect(e.edit, e.undo, (r) => { assert.ok(!r.ok); assert.match(r.out, /canonical/); });
});
test('a topic page that does not link the shared stylesheet fails', () => {
  const e = editFile('math/fourier-series/index.html', (h) => h.replace('<link rel="stylesheet" href="../../shared/ui.css">', ''));
  withDefect(e.edit, e.undo, (r) => { assert.ok(!r.ok); assert.match(r.out, /shared interface style/); });
});
test('a topic that builds its own renderer fails', () => {
  const e = editFile('math/fourier-series/index.html', (h) => h.replace('</script>\n</body>', 'var r = new THREE.WebGLRenderer();\n</script>\n</body>'));
  withDefect(e.edit, e.undo, (r) => { assert.ok(!r.ok); assert.match(r.out, /renderer/i); });
});
test('a topic page that does not load its subject room fails', () => {
  const e = editFile('math/fourier-series/index.html', (h) => h.replace('<script src="../../shared/rooms/study.js"></script>', ''));
  withDefect(e.edit, e.undo, (r) => { assert.ok(!r.ok); assert.match(r.out, /room/); });
});
test('a back link to the wrong subject fails', () => {
  const e = editFile('math/fourier-series/index.html', (h) => h.replace('../../index.html#math', '../../index.html#physics'));
  withDefect(e.edit, e.undo, (r) => { assert.ok(!r.ok); assert.match(r.out, /link back/); });
});
test('a summary over 160 characters fails', () => {
  const m = manifest((d) => { d.topics[0].summary = 'x'.repeat(161); });
  withDefect(m.edit, m.undo, (r) => { assert.ok(!r.ok); assert.match(r.out, /max 160/); });
});
test('a bad level fails', () => {
  const m = manifest((d) => { d.topics[0].level = 'Easy'; });
  withDefect(m.edit, m.undo, (r) => { assert.ok(!r.ok); assert.match(r.out, /level must be one of/); });
});
test('"also" must name known subjects other than the primary one', () => {
  const m1 = manifest((d) => { d.topics[0].also = ['nonsense']; });
  withDefect(m1.edit, m1.undo, (r) => { assert.ok(!r.ok); assert.match(r.out, /unknown category "nonsense"/); });
  const m2 = manifest((d) => { d.topics[0].also = [d.topics[0].category]; });
  withDefect(m2.edit, m2.undo, (r) => { assert.ok(!r.ok); assert.match(r.out, /repeats the primary category/); });
});
test('a topic whose folder does not match its category fails', () => {
  const m = manifest((d) => { d.topics[0].category = 'physics'; });
  withDefect(m.edit, m.undo, (r) => { assert.ok(!r.ok); assert.match(r.out, /path must start with|VLStage\.create must use category/); });
});
test('a missing preview image fails', () => {
  const m = manifest((d) => { d.categories[0].preview = 'assets/previews/does-not-exist.jpg'; });
  withDefect(m.edit, m.undo, (r) => { assert.ok(!r.ok); assert.match(r.out, /does not exist/); });
});
test('a missing share card fails', () => {
  const p = join(dir, 'assets/social/cpu.png'), bytes = readFileSync(p);
  withDefect(() => rmSync(p), () => writeFileSync(p, bytes), (r) => { assert.ok(!r.ok); assert.match(r.out, /assets\/social\/cpu\.png is missing/); });
});
test('a key-looking string in a page fails', () => {
  const e = editFile('math/fourier-series/index.html', (h) => h.replace('</body>', '<!-- ghp_abcdefghijklmnopqrstuvwxyz0123456789 --></body>'));
  withDefect(e.edit, e.undo, (r) => { assert.ok(!r.ok); assert.match(r.out, /secret/); });
});
test('a category mapped to the wrong room fails', () => {
  const e = editFile('topics.json', (t) => t.replace('"environment": "study"', '"environment": "hangar"'));
  withDefect(e.edit, e.undo, (r) => { assert.ok(!r.ok); assert.match(r.out, /ENV\.CATEGORY_ENV/); });
});
test('the scratch copy really is separate from the repo', () => { assert.notEqual(dir, repo); assert.ok(existsSync(join(dir, 'topics.json'))); });
