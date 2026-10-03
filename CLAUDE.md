# CLAUDE.md

Guidance for AI coding assistants working in this repository.

## What this repo is

Visual Learner: a static GitHub Pages site of interactive 3D explainers, grouped by subject (Biology, Math, Physics, Chemistry, Astronomy and more; the full list is in `topics.json`). Each topic is one self-contained `index.html`. A landing page lists them from `topics.json`.

## Layout

- `index.html` renders `topics.json` as two levels: a grid of subjects, then the concepts inside one (`#biology`), with search and a subject filter on both. Do not hard-code topics in it. It uses no libraries and no 3D; its CSS is inline (the page scrolls, unlike topics) but uses the same tokens as `shared/ui.css`.
- `topics.json` is the manifest. Schema in `docs/TOPIC_GUIDE.md`.
- `<category>/<topic>/index.html` is one topic. Topics must not depend on each other.
- `templates/topic/index.html` is the starter for new topics.
- `shared/environments.js` holds the 3D rooms, one fixed environment per category (Biology: `lab`), plus the category registry. `shared/stage.js` renders a topic inside its category's environment. `shared/sound.js` is the ambience. Read `docs/ENVIRONMENTS.md` before touching `shared/`.
- `scripts/validate.mjs` checks the manifest and topic pages. Run it before finishing any change.

## Commands

```sh
npm run serve       # static server on http://localhost:8844
npm run validate    # manifest + page checks, must pass
npm run test:unit   # unit tests (validator, writing rules, PR rules)
npm run test:e2e    # browser tests of every topic (Playwright); see docs/TESTING.md
```

There is no build step and none should be added. The test tooling is a dev dependency only; the site itself loads nothing from `node_modules`.

## Rules for this repo

1. **Git.** Do not commit, push, tag or open pull requests unless explicitly asked. The owner handles all commits.
2. **No AI attribution.** No co-author trailers, "generated with" lines, or mentions of an AI assistant in commits, code, comments, docs or page content.
3. **Originality.** Do not copy source, layout or visual style from other sites. If a site's notice asks not to be reproduced, respect it. Build from the topic's own subject instead.
4. **No tracking, no secrets.** No analytics, cookies, third-party embeds, API keys or user data collection. If a free API is useful, prefer it over scraping, and ask the owner for a token if one is needed.
5. **Accuracy.** Follow `docs/CONTENT_POLICY.md`. Hedge approximate numbers, label schematic visuals, never present invented data as real.
6. **Keep topics self-contained.** One HTML file per topic, relative links only, libraries from a pinned CDN URL (or from `shared/` once vendored).

## Environments and the shared stage

- Every topic renders through `VLStage.create({ ..., category })`. It never builds its own renderer, room or camera. `npm run validate` fails if it does.
- A topic's category must match `topics.json`. The category's environment is fixed and shared, so a topic never picks or forks one.
- Because the environment is shared, a change to `shared/environments.js`, `shared/stage.js` or `shared/sound.js` affects every topic of that category. After such a change, run `npm run validate` and look at every topic of the category at desktop and phone width, orbiting to both sides.
- Do not edit a copy of an environment inside a topic. Fix it in `shared/` so every topic benefits.
- New category: follow "Adding an environment for a new category" in `docs/ENVIRONMENTS.md`.

## Interface style

- Every topic links `shared/ui.css` and uses its classes. Do not add per-topic styling that changes the look; change `shared/ui.css` so every topic stays consistent.
- The look is original: do not copy another site's layout, typography or styling. If someone asks for "like site X", take the interaction ideas and make the visuals our own.

## Topic standards (short form)

Full version in `docs/TOPIC_GUIDE.md`.

- Pin three.js to an exact version. Do not mix versions across topics without a reason.
- Works at 400 px width and on desktop. No horizontal page scroll.
- Respects `prefers-reduced-motion`. Every control is keyboard reachable with a visible focus ring.
- Uses the category environment through the shared stage (backdrop can be switched off; the stage clamps camera yaw and zoom while it is on).
- Has sound only through `shared/sound.js` (procedural, no audio files), with a mute control, and never before a user gesture.
- Has an "Explain this step" panel with the full explanation, written to `docs/WRITING.md` (plain voice, right level, no filler), and a link back to `../../index.html`.
- Labels approximate numbers with `~`, and says "schematic" when the visual is not to scale.
- Fails gracefully when WebGL is unavailable.

## Adding a topic (checklist)

1. Copy `templates/topic/` to `<category>/<topic-id>/` and set `category` in `VLStage.create` to match.
2. Build the page.
3. Add an entry to `topics.json`.
4. `npm run validate`.
5. Check it in a browser at desktop and phone width, with the console open.
6. Update the table in `README.md`.

## Style

Match the surrounding code: plain ES5-style JavaScript inside an IIFE for topic pages, `var` and function declarations, no frameworks, no bundlers. Keep comments sparse and about why. UI copy is plain and direct.
