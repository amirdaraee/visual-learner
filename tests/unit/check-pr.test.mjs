import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, LIMITS } from '../../scripts/check-pr.mjs';

const BODY = `## What this changes\n\nAdds a pendulum topic.\n\n## Sources\n\nThe textbook.\n\n## Checklist\n\n- [x] \`npm run validate\` passes\n- [x] Tested at desktop width and at 400 px, console clean\n- [x] Keyboard works\n- [x] Numbers are hedged\n- [x] Original work\n- [x] \`topics.json\` and the \`README.md\` table updated (new topics)\n- [ ] If \`shared/\` changed: every topic in the affected category was checked\n`;
const f = (status, path, size = 1000) => ({ status, path, size });
const fullTopic = [f('A', 'physics/pendulum/index.html', 60000), f('M', 'topics.json'), f('M', 'README.md'), f('A', 'assets/previews/pendulum.jpg', 60000), f('A', 'assets/social/pendulum.png', 300000)];

test('a complete new topic passes', () => { const r = evaluate({ files: fullTopic, body: BODY }); assert.deepEqual(r.errors, []); });
test('a new topic without manifest, README, preview or card fails', () => {
  const r = evaluate({ files: [f('A', 'physics/pendulum/index.html')], body: BODY });
  for (const w of ['topics.json', 'README.md', 'previews/pendulum.jpg', 'social/pendulum.png']) assert.ok(r.errors.some((e) => e.includes(w)), w);
});
test('two new topics in one pull request fail', () => {
  const r = evaluate({ files: [...fullTopic, f('A', 'math/knots/index.html')], body: BODY });
  assert.ok(r.errors.some((e) => /one pull request per topic/i.test(e)));
});
test('editing two existing topics only warns', () => {
  const r = evaluate({ files: [f('M', 'math/fourier-series/index.html'), f('M', 'physics/wave-interference/index.html')], body: BODY.replace('(new topics)', '(new topics)') });
  assert.deepEqual(r.errors, []); assert.equal(r.warnings.length, 1);
});
test('templates, docs and shared are not counted as topics', () => {
  const r = evaluate({ files: [f('M', 'templates/topic/index.html'), f('M', 'docs/WRITING.md'), f('M', 'shared/ui.css')], body: BODY.replace('- [ ] If', '- [x] If') + '\nChecked shared/ui.css on every topic.' });
  assert.deepEqual(r.errors, []);
});
test('oversized files are rejected', () => {
  const r = evaluate({ files: [f('M', 'assets/previews/cpu.jpg', LIMITS.preview + 1), f('M', 'assets/social/cpu.png', LIMITS.social + 1), f('M', 'math/fourier-series/index.html', LIMITS.topicPage + 1)], body: BODY });
  assert.equal(r.errors.filter((e) => /limit/.test(e)).length, 3);
});
test('binary files outside assets/previews and assets/social are rejected', () => {
  assert.ok(evaluate({ files: [f('A', 'shared/logo.png'), f('A', 'physics/x/clip.mp4')], body: BODY }).errors.length >= 2);
  assert.deepEqual(evaluate({ files: [f('M', 'assets/previews/cpu.jpg')], body: BODY }).errors, []);
});
test('dev and secret-looking files are rejected', () => {
  const r = evaluate({ files: [f('A', 'physics/x/_dev.html'), f('A', '.env'), f('A', 'keys/site.pem')], body: BODY });
  assert.equal(r.errors.length, 3);
});
test('AI attribution in a commit message is rejected', () => {
  assert.ok(evaluate({ files: [f('M', 'docs/WRITING.md')], commits: ['Fix typo\n\nCo-Authored-By: Claude <noreply@anthropic.com>'], body: BODY }).errors.length);
  assert.ok(evaluate({ files: [f('M', 'docs/WRITING.md')], commits: ['Add x\n\nGenerated with Claude Code'], body: BODY }).errors.length);
  assert.deepEqual(evaluate({ files: [f('M', 'docs/WRITING.md')], commits: ['Fix typo'], body: BODY }).errors, []);
});
test('unchecked checklist items fail, except the ones that do not apply', () => {
  const r = evaluate({ files: [f('M', 'docs/WRITING.md')], body: BODY.replace('[x] Keyboard works', '[ ] Keyboard works') });
  assert.equal(r.errors.length, 1); assert.match(r.errors[0], /Keyboard works/);
  assert.deepEqual(evaluate({ files: [f('M', 'docs/WRITING.md')], body: BODY.replace('- [x] `topics.json`', '- [ ] `topics.json`') }).errors, []);
});
test('the shared/ item must be ticked when shared/ changed', () => {
  const r = evaluate({ files: [f('M', 'shared/ui.css')], body: BODY });
  assert.ok(r.errors.some((e) => /shared/.test(e)));
});
test('an empty or missing description fails', () => {
  assert.ok(evaluate({ files: [f('M', 'docs/WRITING.md')], body: '' }).errors.length >= 2);
  assert.ok(evaluate({ files: [f('M', 'docs/WRITING.md')], body: BODY.replace('Adds a pendulum topic.', '') }).errors.some((e) => /What this changes/.test(e)));
});
test('a new topic needs its sources filled in', () => {
  assert.ok(evaluate({ files: fullTopic, body: BODY.replace('The textbook.', '') }).errors.some((e) => /Sources/.test(e)));
});
