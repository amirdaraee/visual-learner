// The mechanical part of docs/WRITING.md: phrases and punctuation that make text read as machine-written, and panel length.
// Used by the browser tests (on the text a reader actually sees) and by the unit tests.

export const BANNED = [
  [/\blet['’]s dive\b/i, "opener: 'let's dive in'"],
  [/\bimagine\b/i, "opener: 'imagine'"],
  [/\bpicture this\b/i, "opener: 'picture this'"],
  [/\bhere['’]s the thing\b/i, "filler: 'here's the thing'"],
  [/\bit['’]s worth noting\b/i, "filler: 'it's worth noting'"],
  [/\bessentially\b/i, "filler: 'essentially'"],
  [/\bin essence\b/i, "filler: 'in essence'"],
  [/\bsimply put\b/i, "filler: 'simply put'"],
  [/\bat its core\b/i, "filler: 'at its core'"],
  [/\bcrucially\b/i, "filler: 'crucially'"],
  [/\bremember that\b/i, "filler: 'remember that'"],
  [/\b(fascinating|incredible|game-changer|seamless|seamlessly)\b/i, 'hype word'],
  [/\b(powerful|magic|magical|elegant|beautiful|stunning|journey)\b/i, 'hype word'],
  [/\bunlock(s|ed|ing)?\b/i, "hype word: 'unlock'"],
  [/\bdon['’]t worry\b/i, 'reassurance aimed at the reader'],
  [/\bit(?:'s|’s| is) not just\b|\bnot just\b.*\bbut\b/i, "'not just X but Y' contrast"],
  [/—/, 'em dash (use a comma, colon or full stop)'],
  [/!/, 'exclamation mark']
];

export function countWords(text) { return (String(text).match(/\S+/g) || []).length; }

/** Returns a list of problems found in a piece of reader-facing text. */
export function lintText(text) {
  const problems = [];
  for (const [re, why] of BANNED) { const m = String(text).match(re); if (m) problems.push(`${why} ("${m[0]}")`); }
  return problems;
}

/**
 * Checks one rendered explain panel.
 * panel = { title, headings: [h3 text...], body: all visible text, hasTry: boolean }
 * The first heading is the "Step n of N" label the page adds itself and is ignored.
 */
export function lintPanel(panel, { min = 90, max = 290 } = {}) {
  const problems = lintText(panel.body);
  const sections = (panel.headings || []).filter((h) => !/^(step|stage)\s+\d/i.test(h)).map((h) => h.toLowerCase());
  if (!sections.includes('what you see')) problems.push('missing the "What you see" section');
  if (!sections.includes('how it works')) problems.push('missing the "How it works" section');
  if (!panel.hasTry) problems.push('missing the "Try this" box');
  if (!panel.title || panel.title.length < 8) problems.push('missing a title');
  const words = countWords(panel.body);
  if (words < min) problems.push(`only ${words} words (at least ${min})`);
  if (words > max) problems.push(`${words} words (at most ${max}); trim it`);
  return problems;
}

/** The one-sentence note on the left card. */
export function lintNote(text) {
  const problems = lintText(text);
  const words = countWords(text);
  if (words < 4) problems.push('the note is empty or too short');
  if (words > 40) problems.push(`the note is ${words} words; keep it to one or two short sentences`);
  return problems;
}
