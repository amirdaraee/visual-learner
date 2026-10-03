# Topic Guide

How to build a topic page that fits the rest of the site.

## Folder and naming

```
<category>/<topic-id>/index.html
```

Both parts are lowercase kebab-case. The category must exist in `topics.json`. Extra files (images, data) may sit next to `index.html`, but prefer a single self-contained file.

## Manifest entry

Add one object to `topics` in `topics.json`:

```json
{
  "id": "exome-sequencing",
  "category": "biology",
  "title": "Exome Lab: Find the Variant",
  "summary": "One sentence, plain words, under 160 characters.",
  "path": "biology/exome-sequencing/",
  "tags": ["genetics", "sequencing"],
  "level": "Intermediate",
  "status": "live",
  "added": "2026-10-02"
}
```

| Field | Rule |
| --- | --- |
| `id` | unique across the file, kebab-case, matches the folder name |
| `category` | the PRIMARY category: an existing category `id`. It sets the folder (`<category>/<id>/`), the 3D environment and the back link |
| `also` | optional list of other category ids the topic is shown under too (not the primary one). Use it when a topic really belongs to more than one subject, such as Binary Numbers in Computer Science, Math and Electronics |
| `title` | a name, not a sentence |
| `summary` | one sentence, at most 160 characters |
| `path` | folder path ending in `/`, must contain `index.html` when `status` is `live` |
| `tags` | up to 5 short lowercase words |
| `level` | `Beginner`, `Intermediate` or `Advanced` |
| `status` | `live` or `soon` |
| `added` | `YYYY-MM-DD` |

**Share cards.** Every live topic has Open Graph and Twitter tags and a 1200 x 630 image at `assets/social/<topic-id>.png`, so links look good when shared. Generate them with `node scripts/social-cards.mjs` (all) or `node scripts/social-cards.mjs <topic-id>` (one, or `site` for the site card). Regenerate after changing a title, a level or a preview. The validator checks the tags and the file.

**One topic, several subjects.** A topic has exactly one home (`category`) and any number of extra listings (`also`). It is built once, in the primary category's folder and environment, and the landing page shows its card under every subject it is listed in. Pick the primary by asking "which subject's room should this be in?".

**Preview images.** A category and a topic can have an optional `preview`: a JPEG path such as `assets/previews/biology.jpg`, shown at the top of its card on the landing page. A card without one gets a tinted tile with the subject's icon. To make one: open the topic at 1200 x 750 and pick a stage that reads well. Turn the backdrop off (the environment button), hide the interface (the eye button, and the tool buttons), so only the model is left. Crop to an 800 x 500 region around the model (16:10, the card's proportions) and save it as a JPEG at about 80% quality (aim for under 150 KB) in `assets/previews/`. Focus on the model, not the room. Retake it when a shared environment or the interface style changes enough to make it look dated. Use a real capture of the topic, never a mock-up.

New categories go in `categories` with an `id`, `name`, `blurb`, `accent` colour (hex) and `environment` (the name of an environment in `shared/environments.js`, mirrored in `ENV.CATEGORY_ENV`). See [ENVIRONMENTS.md](ENVIRONMENTS.md).

## Page requirements

**Structure**
- One `index.html`, with a `<title>` and a meta description.
- A link back to the landing page, opened on your subject: `href="../../index.html#biology"` (use your own category id; adjust the depth if you nest deeper).
- Relative links only. The site is served at the root of turnscience.com, and under `/visual-learner/` when run from a fork.

**Libraries**
- three.js pinned to an exact version, loaded from `cdnjs.cloudflare.com`, or copied into `shared/`.
- The shared stage, environments and sound from `shared/` (see Environments below). Never create your own renderer.
- No frameworks or bundlers.
- Add `integrity` and `crossorigin="anonymous"` attributes to external scripts once the hash is known.

**Interaction**
- Drag to orbit, scroll to zoom, double-click to reset.
- At least one control that changes the scene, with a live readout of what changed.
- An "Explain this step" panel (a `<dialog>`) holding the full explanation, so the main screen needs little text.
- Keyboard shortcuts documented on the page.

**Responsive and accessible**
- Usable at 400 px wide, no horizontal page scroll.
- `prefers-reduced-motion` slows or stops continuous motion.
- All controls reachable by keyboard with a visible focus ring.
- A readable message when WebGL is unavailable.

**Performance**
- Use instanced meshes for many identical objects.
- Pause the render loop when the tab is hidden.
- Cap the pixel ratio at 2.
- Target a smooth frame rate on a mid-range laptop.

**Content**
- Follow [CONTENT_POLICY.md](CONTENT_POLICY.md): sourced claims, hedged numbers, schematic visuals labelled, an educational-only note on sensitive subjects.

## Environments

Each category has one fixed environment shared by all its topics. Biology is the lab. A topic does not build or pick its environment. It names its category and the stage supplies it:

```js
var stage = VLStage.create({ canvas: canvasEl, view: containerEl, category: 'biology' });
stage.add(subject);                 // subject = { group, w, h, base, update(t, dt) }
stage.show(subject);
// each frame: subject.update(t, dt); stage.frame(dt, t);
```

Because every topic goes through `shared/stage.js` and `shared/environments.js`, improving the environment upgrades all of them at once. `npm run validate` enforces it (shared scripts loaded, `VLStage.create` used, correct category, no private renderer).

| Category | Environment | What it is |
| --- | --- | --- |
| Biology | `lab` | A furnished wet lab at dusk: two windows with a city skyline, whiteboard, shelving, cabinets, sink, microscope, glassware, a sequencer and centrifuge, stools, and a wooden table the scene sits on. Enclosed on all sides, so zoom is limited to keep the camera inside |
| everything else | `studio` | Neutral default until the category gets its own |

The full contract, look rules, how to change an environment safely and how to add one for a new category are in [ENVIRONMENTS.md](ENVIRONMENTS.md). Read it before changing anything in `shared/`.

Your scenes follow the subject contract (`group`, `w`, `h`, `base`, `update`). Use the shared look for shaded objects: matte, no reflections, a little self-glow. Text inside the scene goes on a dark backing so it stays readable.

Write every explanation and note to [WRITING.md](WRITING.md): plain voice, the right level for the card, the section structure, no filler.

## Interface style

Every topic uses the shared interface style in `shared/ui.css`: "smoked glass". Dark, translucent panes (with a background blur) that let the 3D room show through, white text, one acid-lime accent. Keep it dark and keep the panes see-through; do not make panels solid or bright.

- **Type:** Bricolage Grotesque (chunky) for titles, Figtree for text, Martian Mono (wide mono) for numbers and labels.
- **Colour:** white on smoked glass with one lime accent. Coral and teal mark pathogenic and benign choices. Cyan and coral stay as data colour inside scenes and charts.
- **Signature details:** the title's accent word is lime. Readouts are ruled rows. The stage selector is a pill strip with the active stage filled lime. Chips and tools are rounded. The note carries an outlined `Note` tag and a lime key phrase.

```html
<link rel="stylesheet" href="../../shared/ui.css">
```

- **Do not restyle per topic.** Use the shared classes (`.sheet`, `.stats`, `.ctl`, `.seg`, `.btn`, `.chip`, `.tools`, `dialog`). A change to `shared/ui.css` updates every topic, the same way an environment change does.
- **The left pane** is one card: a tag line (category, stage), a title with one accent word in `<em>`, a short paragraph, a ruled readout (`.stat` rows), an optional chart, and a one-sentence note (`.why`).
- **Charts** are drawn for a dark inset, so use light strokes and text on the `.trk canvas`.
- **Phones.** Below 900 px the layout is fixed by `shared/ui.css`: a row of tool buttons on top, a compact card under it, and a short scrollable dock at the bottom (at most 42% of the screen). Tap targets are at least 40 px, the stage selector shows the name only for the current stage, and keyboard hints are hidden. The stage fits the 3D scene into the space left between the card and the dock, so keep only `.side`, `.ctl` and `.tools` at the screen edges and do not add other fixed panels. Check every topic at 390 px wide, portrait and landscape.
- **Original work.** The identity is ours. Do not copy another site's layout, type or styling.
- Fonts load from Google Fonts: Bricolage Grotesque, Figtree, Martian Mono.

## Sound

`shared/sound.js` builds ambience and interaction sounds with the Web Audio API. There are no audio files and nothing to download.

```html
<script src="../../shared/sound.js"></script>
```

```js
VLSound.arm('lab', true);   // starts at the first click or key press, because browsers block audio before that
VLSound.sfx('ping');        // one-shot sounds: ui, stage, pop, ping, blip, thump, step, tick, verdict_*
VLSound.setYaw(cameraYaw);  // optional: pans sources as the camera orbits
```

Rules:

- Always provide a mute control (the exome lab uses an `M` key and a toolbar button) and remember the choice.
- Keep it quiet. Ambience should sit under the experience and never compete with it.
- Never play sound before a user gesture, and suspend it when the tab is hidden (the module does both).
- Generate sound in code. Do not ship audio files.

## Using the template

`templates/topic/index.html` is a working starter already wired to the shared stage: the dock, stat chips, explain panel, and a simple subject inside the category environment. Copy it, set `category` to yours, replace the subject with your scenes, and keep the structure.

## Checks

```sh
npm run validate
```

This verifies the manifest, that live topics have an `index.html`, and that each has a title, a back link and no obviously broken references. CI runs the same script on every push and pull request.
