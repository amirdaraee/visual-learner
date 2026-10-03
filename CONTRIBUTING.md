# Contributing

Thanks for helping. Visual Learner grows by adding topics, and by making the existing ones clearer and more correct.

## Ways to help

- **Add a topic** in an existing subject, or propose a new subject.
- **Fix an error.** Wrong numbers, unclear wording, a broken control.
- **Improve accessibility or performance** of an existing page.

Open an issue first for a new topic so we can agree on scope. Small fixes can go straight to a pull request.

## Setup

```sh
git clone https://github.com/amirdaraee/visual-learner.git
cd visual-learner
npm run serve       # http://localhost:8844
```

Node 18 or newer is only needed for `npm run validate`. The site itself has no dependencies.

## Adding a topic

Work through these in order. Each step links to the document that has the detail.

**1. Agree the idea.** Open an issue with the topic, the subject, the level and what the reader will change on screen. Keep it to one idea.

**2. Pick the subject and the level.**
- The subject is the topic's primary category in `topics.json`. It decides the folder, the 3D room and the back link. If the topic really belongs to other subjects too, list them in `also` (Binary Numbers is in Computer Science, Math and Electronics, and uses the Computer Science room).
- The level is `Beginner`, `Intermediate` or `Advanced`, and it must be honest. Beginner means no prior knowledge: every term defined, one idea per step, gentle start. If a reader needs school maths or science first, mark it Intermediate. See [docs/WRITING.md](docs/WRITING.md).

**3. Create the page.** Copy `templates/topic/` to `<category>/<topic-id>/` (lowercase kebab-case for both). Set `category` in `VLStage.create` to your primary category, point the home link at `../../index.html#<category>`, and load the category's room script after `environments.js` if the category has one (the validator tells you). Do not build your own room, renderer or camera, and do not restyle the interface: use `shared/ui.css`. Technical standards: [docs/TOPIC_GUIDE.md](docs/TOPIC_GUIDE.md). Rooms and the stage: [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md).

**4. Design it as steps.** Three to six short steps, each with one thing to look at and one control or two. Start from what a newcomer already knows and build up. Every step is reachable by hash (`#step-name`), by the stage buttons and by the arrow keys. Keep on-screen text short.

**5. Write the explanations.** Each step has a one-sentence note on the left card and an "Explain this step" panel. Write them to [docs/WRITING.md](docs/WRITING.md): the section structure (What you see, How it works, optional In real life or What is left out), 150 to 220 words, plain voice, real numbers, no filler, no hype, no em dashes. Check every number against a source, hedge approximations with `~`, and say what is simplified ([docs/CONTENT_POLICY.md](docs/CONTENT_POLICY.md)).

**6. Add it to the manifest.** One entry in `topics.json`: `id`, `category`, optional `also`, `title`, a summary of at most 160 characters, `path`, up to five `tags`, `level`, `status` and `added`. The field table is in the topic guide.

**7. Make a preview image.** Open the page at 1200 x 750, turn the backdrop off, hide the interface, crop to the model at 16:10 and save a JPEG under 150 KB as `assets/previews/<topic-id>.jpg`. Add it as `preview` on the topic. The steps are in the topic guide. It must be a real capture, not a mock-up.

**8. Make the share card.** Fill in the share tags in your page (the template has them with placeholders: canonical, Open Graph and Twitter), then run `node scripts/social-cards.mjs <topic-id>` to create `assets/social/<topic-id>.png` (1200 x 630) from your title, subject, level and preview. It needs Chrome installed (set `CHROME` to its path if it is not in the macOS default). Commit the image.

**9. Run the checks.** `npm install`, then `npm test` runs the validator, the unit tests and the browser tests (every step of every topic, phone width, no-WebGL, the writing rules). The same checks run on your pull request, with one more that reads your description and file list. Details: [docs/TESTING.md](docs/TESTING.md).

**10. Check it by eye.**
- `npm run validate` passes.
- Open every step on desktop and at about 400 px wide, with the console open: no errors, no overlapping controls, no horizontal scroll, labels readable.
- Orbit to both sides and zoom in and out: nothing collides, and the model stays clear of the room.
- Try the keyboard (every control reachable, visible focus), mute and unmute, and reduced motion.
- Read each explain panel next to the screen: does every sentence match what is shown?
- Leave no dev or test files in the topic folder.

**11. Update the docs and open a pull request.** Add the topic to the table in `README.md`, then open a pull request using the template with screenshots at desktop and phone width and the sources for your facts.

### Adding a new subject

Add the category to `topics.json` (`id`, `name`, `blurb`, `accent`, `environment`), build its room as `shared/rooms/<name>.js` following "Adding an environment for a new category" in [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md), add an ambience profile in `shared/sound.js` with the same name, and add a line icon for it in `index.html`. Then add the first topic.

## What a good topic does

- Teaches one idea well, by letting the reader change something and see the result.
- Needs little text. The scene and controls carry the lesson, and the explanation panel adds depth.
- Starts where the reader is. A beginner topic does not open with the hard part.
- Is correct. See [docs/CONTENT_POLICY.md](docs/CONTENT_POLICY.md) for sourcing and how to word approximate numbers.
- Is original work. Do not copy another site's code, layout or visual style.

## Pull requests

- One topic or one fix per pull request.
- Describe what the page teaches and list the sources for any factual claims.
- Include a screenshot or short recording at desktop and phone width.
- `npm test` must pass. CI runs it, plus a check that the description and files follow these guidelines, and it will tell you what to fix.
- Keep commits focused. Write messages in the imperative: "Add pendulum phase-space topic".

## Code style

- Plain JavaScript in an IIFE, `var` and function declarations, no frameworks or bundlers.
- Pinned library versions, loaded from a CDN or from `shared/`.
- Relative links only, so the site works from any base path (it is served at the root of turnscience.com, and under `/visual-learner/` when run from a fork).
- Comments only where the reason is not obvious.

## Licensing of contributions

By contributing you agree that your code is released under the MIT license and your explanatory text and diagrams under CC BY 4.0, as described in [docs/CONTENT_POLICY.md](docs/CONTENT_POLICY.md). Only submit work you wrote or have the right to share, and credit any third-party material.

## Conduct and security

Be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report security problems privately, see [SECURITY.md](SECURITY.md).
