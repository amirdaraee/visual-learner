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

1. Pick a subject folder, or add a new category to `topics.json`.
2. Copy `templates/topic/` to `<category>/<topic-id>/`. Use lowercase kebab-case for both.
3. Build the page. Read [docs/TOPIC_GUIDE.md](docs/TOPIC_GUIDE.md) for the technical standards. Your scenes run inside the category's fixed environment through the shared stage, see [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md).
4. Add an entry to `topics.json`.
5. Run `npm run validate`.
6. Check the page on desktop and at 400 px width, in a clean browser profile, with the console open.
7. Add the topic to the table in `README.md`.
8. Open a pull request using the template.

## Changing a shared environment

Each category has one environment shared by all its topics (Biology is the lab), so changes to `shared/` reach every topic. If you change it, open every topic in that category at desktop width and at 400 px, orbit both sides, and say which you checked in the pull request. Never copy an environment into a topic. The checklist is in [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md).

## What a good topic does

- Teaches one idea well, by letting the reader change something and see the result.
- Needs little text. The scene and controls carry the lesson, and the explanation panel adds depth.
- Is correct. See [docs/CONTENT_POLICY.md](docs/CONTENT_POLICY.md) for sourcing and how to word approximate numbers.
- Is original work. Do not copy another site's code, layout or visual style.

## Pull requests

- One topic or one fix per pull request.
- Describe what the page teaches and list the sources for any factual claims.
- Include a screenshot or short recording at desktop and phone width.
- `npm run validate` must pass. CI runs it too.
- Keep commits focused. Write messages in the imperative: "Add pendulum phase-space topic".

## Code style

- Plain JavaScript in an IIFE, `var` and function declarations, no frameworks or bundlers.
- Pinned library versions, loaded from a CDN or from `shared/`.
- Relative links only, so the site works under `/visual-learner/`.
- Comments only where the reason is not obvious.

## Licensing of contributions

By contributing you agree that your code is released under the MIT license and your explanatory text and diagrams under CC BY 4.0, as described in [docs/CONTENT_POLICY.md](docs/CONTENT_POLICY.md). Only submit work you wrote or have the right to share, and credit any third-party material.

## Conduct and security

Be kind. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report security problems privately, see [SECURITY.md](SECURITY.md).
