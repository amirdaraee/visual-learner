import { test } from 'node:test';
import assert from 'node:assert/strict';
import { affected } from '../../scripts/affected-tests.mjs';

const manifest = {
  categories: [{ id: 'math', environment: 'study' }, { id: 'computer-science', environment: 'devroom' }, { id: 'biology', environment: 'lab' }],
  topics: [
    { id: 'fourier-series', category: 'math', path: 'math/fourier-series/' },
    { id: 'cpu', category: 'computer-science', path: 'computer-science/cpu/' },
    { id: 'binary-numbers', category: 'computer-science', path: 'computer-science/binary-numbers/', also: ['math'] },
    { id: 'exome-sequencing', category: 'biology', path: 'biology/exome-sequencing/' }
  ]
};

test('docs and templates need no browser tests', () => {
  const r = affected(manifest, ['docs/WRITING.md', 'CONTRIBUTING.md', 'templates/topic/index.html', 'scripts/check-pr.mjs', 'README.md']);
  assert.equal(r.run, false);
});
test('a change inside a topic runs that topic and the landing tests', () => {
  assert.deepEqual(affected(manifest, ['computer-science/cpu/index.html']), { all: false, topics: ['cpu'], site: true, run: true });
});
test('a room file runs the topics of the subjects that use it', () => {
  const r = affected(manifest, ['shared/rooms/devroom.js']);
  assert.deepEqual(r.topics, ['binary-numbers', 'cpu']); assert.equal(r.all, false);
});
test('the topic in several subjects follows its primary subject room', () => {
  assert.deepEqual(affected(manifest, ['shared/rooms/study.js']).topics, ['fourier-series']);
});
test('stage, style, sound, core environments, tests and CI run everything', () => {
  for (const f of ['shared/stage.js', 'shared/ui.css', 'shared/sound.js', 'shared/environments.js', 'tests/e2e/topics.spec.mjs', 'playwright.config.mjs', 'package.json', '.github/workflows/ci.yml', 'scripts/lib/writing-rules.mjs']) {
    const r = affected(manifest, [f]); assert.equal(r.all, true, f); assert.equal(r.run, true, f);
  }
});
test('the landing page, manifest and previews run only the landing tests', () => {
  for (const f of ['index.html', 'topics.json', 'assets/previews/cpu.jpg', 'assets/social/cpu.png', '404.html']) {
    const r = affected(manifest, [f]); assert.deepEqual([r.all, r.topics, r.site, r.run], [false, [], true, true], f);
  }
});
test('a brand-new topic folder is picked up before it is in the manifest', () => {
  assert.deepEqual(affected(manifest, ['physics/pendulum/index.html', 'topics.json']).topics, ['pendulum']);
});
test('several changes combine without duplicates', () => {
  const r = affected(manifest, ['computer-science/cpu/index.html', 'computer-science/cpu/extra.js', 'math/fourier-series/index.html', 'docs/TESTING.md']);
  assert.deepEqual(r.topics, ['cpu', 'fourier-series']);
});
test('a change to docs inside a topic-like folder name is not a topic', () => {
  assert.equal(affected(manifest, ['docs/TESTING.md', 'assets/other/readme.txt']).run, false);
});
