# Checks and tests

Every pull request runs these automatically (see `.github/workflows/ci.yml`), so you find problems before a person reviews it. Run them yourself first.

```sh
npm install                     # once: the test runner (the site itself has no dependencies)
npx playwright install chromium # once: the browser the tests drive
npm run validate                # manifest and page rules
npm run test:unit               # unit tests, a few seconds
npm run test:e2e                # browser tests, a few minutes
npm test                        # all three
```

`npm run test:e2e` starts its own static server on port 8844 (or reuses one that is running). To use your installed Chrome instead of the downloaded browser, set `CHROME` to its path. If WebGL does not render on your machine, the tests use software rendering automatically.

## What each layer checks

**Validate** (`scripts/validate.mjs`) reads the files. The manifest (fields, lengths, levels, subjects, `also`), each live topic (shared stage, room, style, back link, share tags, preview and card files), the room registry, no secrets or analytics, no stray `_` or `.` files in a topic folder.

**Unit tests** (`tests/unit/`, `node --test`):
- `validator.test.mjs` copies the repo, breaks one rule at a time and checks that the validator says so.
- `writing-rules.test.mjs` covers the writing rules in `scripts/lib/writing-rules.mjs` (banned phrases, panel length and structure).
- `check-pr.test.mjs` covers the pull request rules in `scripts/check-pr.mjs`.

**Browser tests** (`tests/e2e/`, Playwright). They run the real pages:
- Analytics and consent (`analytics.spec.mjs`): nothing is sent off the live site or with Do Not Track; the banner, decline, accept, a saved choice and withdrawing consent; the privacy page.
- Landing page: every subject shows, opening a subject and going back, search, filters, topics listed under several subjects, preview images, phone width, share tags, the 404 page.
- Every live topic, from `topics.json`, so a new topic is picked up with no test changes:
  - loads with no script or console errors, draws a real picture, loads only from allowed hosts (our server, cdnjs, jsDelivr, Google Fonts);
  - every step opens, and its note and "Explain this step" panel follow the writing guide (sections, length, no banned phrases);
  - arrow keys, the explain key, and a step reached from the address bar;
  - phone width: no sideways scroll, the card does not overlap the controls, controls are at least 36 px;
  - reduced motion;
  - no WebGL: the page shows its fallback message and does not crash.

**Pull request checks** (`scripts/check-pr.mjs`, only on pull requests):
- A new topic arrives complete: manifest entry, README row, preview image, share card.
- One new topic per pull request (editing several topics only warns).
- Size limits: preview 200 KB, share card 700 KB, topic page 250 KB, anything else 1 MB.
- Binary files only under `assets/previews` and `assets/social`. No dev, test or secret-looking files.
- No AI attribution lines in commit messages.
- The checklist from the pull request template is filled in and ticked, and "What this changes" and (for a new topic) "Sources" are not empty.

## What runs when

The browser tests are the slow part (about 12 minutes for everything on GitHub), so they are limited:

| Event | Fast checks (validate, unit) | Browser tests |
| --- | --- | --- |
| Pull request | yes | only for what the change touches (see below) |
| Push to `main` | yes | no |
| Weekly (Monday) and "Run workflow" | yes | everything |

`scripts/affected-tests.mjs` decides what a pull request needs:
- The stage, interface style, sound, core environments, tests or CI changed: every topic.
- `shared/rooms/<name>.js` changed: the topics of the subjects that use that room.
- Files inside a topic folder changed: that topic.
- The landing page, manifest or previews changed: just the landing page tests (seconds).
- Only docs, templates or scripts changed: no browser tests.

To run the same subset locally: `TOPICS=cpu,binary-numbers npm run test:e2e`.

## When a check fails

The message says what to fix. Common ones: add the missing share tags or image (`npm run cards -- <topic-id>`), trim an explanation to 90 to 290 words, rewrite a sentence that uses a phrase from the avoid-list in [WRITING.md](WRITING.md), move a control that overlaps on a phone.

## Adding tests

- A rule about files: add a case to `tests/unit/validator.test.mjs` and the rule to `scripts/validate.mjs`.
- A rule about what readers see: add it to `tests/e2e/topics.spec.mjs`. It then applies to every topic.
- Logic specific to one topic (for example a conversion or a formula): move the pure function out of the page if you can and test it, or add a test that drives the page and reads the result from the screen.

## For the maintainer

To make these checks block merging, turn on branch protection for `main` (Settings, Branches) and require the three CI jobs: "Validate and unit tests", "Browser tests" and "Contribution guidelines".
