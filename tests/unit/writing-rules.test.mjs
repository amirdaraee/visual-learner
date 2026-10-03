import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lintText, lintPanel, lintNote, countWords } from '../../scripts/lib/writing-rules.mjs';

const good = { title: 'A circle draws a sine wave', headings: ['Step 1 of 3 · Circles', 'What you see', 'How it works'], body: 'word '.repeat(150), hasTry: true };

test('clean text has no problems', () => { assert.deepEqual(lintText('The counter has three columns: ones, tens and hundreds.'), []); });
test('openers and hype are flagged', () => {
  for (const t of ['Imagine a wave.', "Let's dive in.", 'This is fascinating.', 'It is a powerful idea.', 'Unlock the pattern.', "Don't worry about it."]) assert.ok(lintText(t).length, t);
});
test('em dashes and exclamation marks are flagged', () => { assert.ok(lintText('a — b').length); assert.ok(lintText('Look!').length); });
test('"not just X but Y" is flagged', () => { assert.ok(lintText('It is not just a wave but a recipe.').length); });
test('words that merely contain a banned stem are fine', () => { assert.deepEqual(lintText('The unlocked state and the magician are different words.').filter((p) => /magic/.test(p)), []); });
test('countWords counts whitespace separated tokens', () => { assert.equal(countWords('  one two\nthree  '), 3); assert.equal(countWords(''), 0); });

test('a well-formed panel passes', () => { assert.deepEqual(lintPanel(good), []); });
test('a panel needs both core sections and a Try box', () => {
  const p = lintPanel({ ...good, headings: ['Step 1 of 3', 'What you see'], hasTry: false });
  assert.ok(p.some((x) => /How it works/.test(x))); assert.ok(p.some((x) => /Try this/.test(x)));
});
test('panel length is bounded both ways', () => {
  assert.ok(lintPanel({ ...good, body: 'word '.repeat(20) }).some((x) => /only 20 words/.test(x)));
  assert.ok(lintPanel({ ...good, body: 'word '.repeat(400) }).some((x) => /400 words/.test(x)));
});
test('the "Step n of N" heading the page adds does not count as a section', () => {
  assert.ok(lintPanel({ ...good, headings: ['Step 1 of 3 · What you see', 'How it works'] }).some((x) => /What you see/.test(x)));
});
test('a note must be short but not empty', () => {
  assert.deepEqual(lintNote('Watch the ones column. After 9 it has no digit left.'), []);
  assert.ok(lintNote('Hi').length); assert.ok(lintNote('word '.repeat(60)).length);
});
