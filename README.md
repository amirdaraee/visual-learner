# Visual Learner

Interactive 3D explainers for science and engineering. Pick a subject, play with the idea, then read the explanation.

**Live site:** https://turnscience.com/

Every topic is a single self-contained web page: a full-screen 3D scene you can orbit, a small control dock, live readouts, and an "Explain this step" panel for the full story.

## Subjects

| Subject | Topics |
| --- | --- |
| Biology | [Exome Lab: Find the Variant](biology/exome-sequencing/) |
| Math | [Fourier Series: Waves from Circles](math/fourier-series/), [Binary Numbers: Counting with Two Digits](computer-science/binary-numbers/) |
| Physics | [Wave Interference: Two Ripples](physics/wave-interference/), [Boiling Point: Why Altitude Lowers It](physics/boiling-altitude/) |
| Electronics | [The RC Circuit: Charging a Capacitor](electronics/rc-circuit/), [Binary Numbers: Counting with Two Digits](computer-science/binary-numbers/), [The CPU: What Is Inside the Chip](computer-science/cpu/) |
| Aerospace | [Orbits: The Hohmann Transfer](aerospace/hohmann-transfer/) |
| Chemistry | [Molecular Shapes: Why Molecules Bend](chemistry/molecular-shapes/), [Boiling Point: Why Altitude Lowers It](physics/boiling-altitude/) |
| Astronomy | coming soon |
| Earth & Environment | [Boiling Point: Why Altitude Lowers It](physics/boiling-altitude/) |
| Engineering | coming soon |
| Materials | coming soon |
| Computer Science | [Binary Numbers: Counting with Two Digits](computer-science/binary-numbers/), [The CPU: What Is Inside the Chip](computer-science/cpu/) |
| Statistics & Data | coming soon |
| Health & Medicine | [Exome Lab: Find the Variant](biology/exome-sequencing/) |
| Neuroscience | coming soon |

The landing page builds itself from [`topics.json`](topics.json).

Every subject has one fixed 3D environment shared by all its topics (Biology is a wet lab). The environment, camera, effects and sound live in `shared/`, so improving them upgrades every topic of that subject at once. See [docs/ENVIRONMENTS.md](docs/ENVIRONMENTS.md).

## Run it locally

No build step. Any static file server works.

```sh
npm run serve        # http://localhost:8844
npm run validate     # checks topics.json and every topic page
```

If you do not use npm: `node scripts/serve.mjs 8844`, or any static file server on the repository folder.

Opening `index.html` straight from disk shows the topic pages but not the landing page, because browsers block `fetch` on `file://`.

## Repository layout

```
.
├── index.html            landing page, renders topics.json
├── topics.json           manifest: categories and topics
├── 404.html
├── <category>/<topic>/   one self-contained index.html per topic
├── templates/topic/      starter page for a new topic
├── shared/               environments.js (one fixed environment per subject), stage.js, sound.js
├── docs/                 topic guide and content policy
└── scripts/validate.mjs  manifest and page checks (also run in CI)
```

## Contributing

New topics and fixes are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), then the [topic guide](docs/TOPIC_GUIDE.md) and the [content policy](docs/CONTENT_POLICY.md).

## Hosting

GitHub Pages, served from the `main` branch root. The `.nojekyll` file turns off Jekyll processing.

## License

Code is MIT, see [LICENSE](LICENSE). Explanatory text and diagrams are CC BY 4.0, see [docs/CONTENT_POLICY.md](docs/CONTENT_POLICY.md).

Educational and schematic. Nothing here is medical, engineering or safety advice.
