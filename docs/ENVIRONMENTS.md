# Environments

Every subject (category) has **one fixed environment**, and every topic in that subject uses it. Biology is the lab. Improve the lab once and every Biology topic, present and future, is upgraded the next time its page loads.

## How it fits together

| Layer | File | Owns |
| --- | --- | --- |
| Environment | `shared/environments.js`, `shared/rooms/<name>.js` | The 3D room: walls, furniture, props, lighting, the table the scene sits on. The core holds the lab, the studio and the shared helpers; each other subject has its own room file |
| Stage | `shared/stage.js` | Renderer, camera, orbit controls, framing, bloom, the cinematic final pass, the on/off toggles |
| Sound | `shared/sound.js` | The room's ambience and the interaction sounds |
| Topic | `<category>/<topic>/index.html` | Its own scenes and its interface, nothing else |

A topic never builds a room, a renderer or a camera. It creates a stage for its category and hands the stage its scenes:

```js
var stage = VLStage.create({ canvas: canvasEl, view: containerEl, category: 'biology' });
stage.add(subject);   // subject = { group, w, h, base, update(t, dt) }
stage.show(subject);
// each frame:  subject.update(t, dt);  stage.frame(dt, t);
```

`npm run validate` enforces this: a live topic must load the shared stage and environments, call `VLStage.create`, use its own category, and must not create its own renderer. That is what guarantees an upgrade reaches every topic.

## The category registry

The mapping lives in code, in `shared/environments.js`:

```js
ENV.CATEGORY_ENV = { biology: 'lab' };
```

and is mirrored in `topics.json`, where each category names its environment:

```json
{ "id": "biology", "name": "Biology", "environment": "lab", ... }
```

Categories without a dedicated environment use `studio`, a neutral default, until one is built. The validator fails if `topics.json` and the code disagree, if a category names an environment that does not exist, or if a topic uses a different category than the one in the manifest.

## Contract for an environment

An environment is a function on the `VLEnv` object:

```js
ENV.lab = function (T) {            // T is THREE
  var g = new T.Group();
  // ... build the room ...
  return { group: g, update: function (t, dt) { /* animate */ }, shadow: shadowMesh /* optional */ };
};
```

Conventions every environment follows, so any topic fits any environment of its category:

- **Local y = 0 is the work surface.** The stage places the group so the surface sits just under the subject.
- **The subject floats about 1.7 units above the surface**, centred on the origin. The stage sizes the soft shadow (`shadow`) to the subject.
- **Room size.** The Biology lab is a 68 × 55 unit room. The camera orbits about 60° either way and zoom-out is limited so it never leaves the room. A new environment must keep that true, or the stage's limits need a per-environment setting.
- **Built from code, no downloads.** No image or model files.
- **Scale.** One unit is about 7 cm. A work table is 13 units high, a stool seat about 10.

### Look rules

These came from review, and every environment keeps them:

- **Matte.** No mirrors, no reflection environment, little metalness, high roughness. Shiny surfaces glint distractingly as the camera moves. The stage forces this on every shaded material.
- **Calm.** No particles floating in the air, no bokeh, no hard-edged light shafts. The room supports the scene and never competes with it.
- **No shared planes.** Two surfaces in the same plane (a clock face on its ring, a poster on its frame) cut into each other from an angle. Give layers a gap, or build the object as one solid.
- **Nothing intersects.** Furniture, props and walls must not pass through each other. Check from several orbit angles, not just the default view.
- **Believable proportions and colour.** Real-world sizes, and a warm varied palette rather than one hue.
- **Readable text.** Text in the scene sits on a dark backing so it never disappears against a busy background.

## Changing an environment safely

Because one change reaches every topic of the category:

1. Edit `shared/environments.js` (or `shared/sound.js` for ambience).
2. Run `npm run validate`.
3. Open **every** topic in the category (see `topics.json`) at desktop width and at about 400 px, with the console open. Orbit to both sides and zoom in and out.
4. Look for overlaps, glare, text that is hard to read against the new backdrop, and any topic whose objects now sit at the wrong height.
5. Mention in the pull request which topics you checked.

The shared files are loaded straight from the repository, so a published change is live for every topic on the next page load. If a browser still shows the old look, a hard refresh clears its cache.

If you need to change the *contract* itself (the subject fields, the stage API), update every topic in the same pull request. There is no version pinning.

## Rooms: one file per subject

The lab and the neutral studio live in `shared/environments.js`. Every other subject's room is its own file, `shared/rooms/<name>.js`, so a page downloads only the room of its subject. A room registers itself on the same `VLEnv` object and builds from the shared helpers in `VLEnv.kit` (walls, windows, tables, floors, canvas textures, glass, contact shadows), which keeps all rooms looking like one family:

```js
/* shared/rooms/study.js */
(function () {
'use strict';
var ENV = window.VLEnv, K = ENV.kit;
ENV.study = function (T) {
  var g = new T.Group();
  // build the room with K.* helpers; local y = 0 is the table top, the floor is at y = -13, the back wall near z = -19
  var shadow = K.contactShadow(T, g, 0, 0, -1, 1, 1, 0.5);   // the stage resizes this under the subject
  return { group: g, shadow: shadow, update: function (t, dt) {} };
};
})();
```

A topic page loads the core first, then its subject's room, then the stage:

```html
<script src="../../shared/environments.js"></script>
<script src="../../shared/rooms/study.js"></script>
<script src="../../shared/stage.js"></script>
```

`npm run validate` fails if a topic of a subject with a room file does not load it, or loads it before the core. A topic that is listed under several subjects (`also`) always uses the room of its primary `category`; the extra listings only affect where its card appears.

### Room contract (on top of the rules above)

- **Clear zone.** The topic's model stands on the table at the origin and may be up to about 20 units wide and 10 high. Keep x in [-12, 12], y in [0, 10], z in [-9, 8] free of props. Props live behind it (z of -10 or further back), on the walls, or on the far side of the room.
- **Table.** Local y = 0 is the table top. Use a table that suits the subject (wood, steel, mat, epoxy), at least 60 units wide and 30 deep, with legs or a base that reach the floor at y = -13.
- **Walls.** The back wall is at about z = -19 and at least 110 wide. Side walls are not needed: the stage limits the orbit to about 60° either way and keeps the camera in front.
- **Light.** Moderate, warm or cool to suit the mood: no more than a hemisphere light (~0.5), a key light (~0.3), a fill (~0.12) and one invisible overhead point light (~0.16) in total. No large surface may be emissive above 1.0. Small LEDs and screens may go to 1.4. No visible light cones, shafts or camera-facing glow sprites.
- **Matte only,** as above. The stage forces it, but pick roughness 0.6 or higher and low metalness so it looks right before that.
- **Animation is optional and quiet.** A blinking LED, a slow trace on a screen, a tiny sway. Nothing that ticks, floats or distracts.
- **Real content on signs.** Equations, diagrams, charts and tables drawn on boards and posters must be correct and legible at normal view distance, on a dark or light backing with enough contrast. Original artwork only: no logos, brands or copied images.
- **Cost.** Reuse geometry and materials, use instancing for repeats, and stay under about 150 draw calls and a few 512-pixel canvas textures.
- **Test it** with the room harness (`.tmp/room.html`, ignored by git): `?room=<name>&cat=<category id>&yaw=0.6&pitch=0.2&zoom=1&sub=0`. Check yaw -0.6, 0 and 0.6, zoomed in and out, and with `sub=0` to see the whole room.

### The planned rooms

| Subject | Room | Mood and palette | Signature props |
| --- | --- | --- | --- |
| Biology | `lab` | Bright wet lab: sage walls, wood bench | window, bottles, glassware, sequencer, centrifuge, microscope (built) |
| Math | `study` | A mathematician's study: slate green, walnut, brass | chalkboard wall with real proofs and diagrams, bookshelf, geometric solids, brass lamp, compass and set square |
| Physics | `physicslab` | Teaching lab: cool slate, steel, white | optical table with a hole grid, optical rail with lens and prism, Newton's cradle, pendulum, whiteboard with correct physics |
| Electronics | `bench` | Workbench: anti-static green mat, charcoal, orange | pegboard with tools, labelled parts drawers, oscilloscope with a slow trace, bench power supply with LEDs, soldering station, wire spools |
| Aerospace | `hangar` | Hangar: concrete, light grey-blue, safety orange | big door window onto a runway and sky, scale aircraft and rocket models on stands, blueprint, telemetry screens, toolbox |
| Chemistry | `chemlab` | Chemistry lab: cream tile, amber, teal | fume hood with sash, large periodic table poster, reagent shelf, burette stand, Bunsen burner, coloured flasks |
| Astronomy | `observatory` | Dome at night: deep navy, brass, warm red lamp | ribbed dome with an open slit onto stars, refractor telescope on a mount, star charts, celestial globe |
| Earth & Environment | `fieldstation` | Field station: earth browns, sage, sky blue | window onto mountains and sea, rock and mineral samples, soil-layer jars, topographic map, barometer and anemometer |
| Engineering | `workshop` | Machine shop: industrial grey, safety yellow | vise on a steel bench, gear wall, steel shelving with parts bins, drafting table with blueprint, hard hats, calipers and wrench rack |
| Materials | `materialslab` | Materials lab: copper, teal, charcoal | crystal specimens, metal ingot stacks, tensile-testing frame, furnace with a dim window, lattice-cell posters |
| Computer Science | `devroom` | Developer's den: indigo, charcoal, teal and magenta accents | two monitors with real code, server rack with blinking LEDs, mechanical keyboard, flowchart or binary-tree whiteboard, headphones |
| Statistics & Data | `analyst` | Analyst's office: beige, navy, mustard | whiteboard with a histogram and normal curve, Galton board, jar of marbles, dice and coins, bar-chart wall art |
| Health & Medicine | `clinic` | Exam room: soft white, seafoam | exam bed, anatomy poster, supply cabinet, sink, patient monitor with an ECG trace, privacy curtain |
| Neuroscience | `neurolab` | Neuro lab: dusk violet, teal | brain model on a stand, EEG monitor with live traces, neuron artwork, electrode-cap head form, microscope |

## Adding an environment for a new category

1. Create `shared/rooms/<name>.js` as above (lowercase letters only; the file name must match `ENV.<name>`), following the contract and look rules.
2. Map the category to it in `ENV.CATEGORY_ENV` in `shared/environments.js`.
3. Set `"environment": "<name>"` on the category in `topics.json`.
4. If it needs its own ambience, add a profile to `shared/sound.js` with the same name.
5. Add `<script src="../../shared/rooms/<name>.js"></script>` after `environments.js` in every topic of that category, and in `templates/topic/index.html` when the template's category changes.
6. Check every topic of the category (see "Changing an environment safely").
7. Update the table above and in [TOPIC_GUIDE.md](TOPIC_GUIDE.md).
8. `npm run validate`.

## Subject contract

What a topic scene hands the stage:

| Field | Meaning |
| --- | --- |
| `group` | A `THREE.Group` centred on the origin |
| `w`, `h` | Half-width and half-height, in scene units, that the camera must keep in view |
| `base` | How far below the origin the lowest part reaches. The work surface is placed under it. Defaults to `h` |
| `update(t, dt)` | Optional. Called by the topic each frame before `stage.frame` |
| `tips()` | Optional. Meshes with `userData.tip` text for hover tooltips (topic-level feature) |

`w`, `h` and `base` may change while the scene runs (the stage reads them every frame).

## Stage reference

| Call | Does |
| --- | --- |
| `VLStage.create(opts)` | Builds the renderer, camera, lights, category environment and effects. `opts`: `canvas`, `view`, `category`, optional `onFirstFrame`, `fallbackText`, `viewOffset(w, h)`, `prefix` |
| `stage.add(subject)` | Registers a scene (made matte, hidden) |
| `stage.show(subject)` | Shows one scene, hides the rest, resets the camera |
| `stage.frame(dt, t)` | Frames the subject, updates the environment, renders |
| `stage.setEnv(on)`, `setFx(on)`, `setCine(on)` | Backdrop, cinematic effects and camera sway toggles. Camera sway is off by default (opt-in). Env and fx are remembered between visits |
| `stage.pointer`, `stage.dragging()`, `stage.camera` | For topic-level hover and picking |
| `stage.yaw` | Current camera yaw, for panning sound |
| `VLStage.soft(color, glow)` | The shared matte finish for shaded objects |
| `VLStage.label(text, opts)` | Readable in-scene text on a dark backing (`plane: true` prints it flat on a surface) |
| `VLStage.calmMaterials(group)` | Forces matte on every shaded material (the stage does this for you in `stage.add`) |
| `stage.environmentName` | Resolved environment (`'lab'`), which also names the sound profile |
