# Environments

Every subject (category) has **one fixed environment**, and every topic in that subject uses it. Biology is the lab. Improve the lab once and every Biology topic, present and future, is upgraded the next time its page loads.

## How it fits together

| Layer | File | Owns |
| --- | --- | --- |
| Environment | `shared/environments.js` | The 3D room: walls, furniture, props, lighting, the table the scene sits on |
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

## Adding an environment for a new category

1. Add a function to `shared/environments.js`: `ENV.<name> = function (T) { ... }`, following the contract and look rules above.
2. Map the category to it in `ENV.CATEGORY_ENV`.
3. Set `"environment": "<name>"` on the category in `topics.json`.
4. If it needs its own ambience, add a profile to `shared/sound.js` with the same name.
5. Build a first topic from `templates/topic/` with `category: '<id>'`, and check it in the new environment.
6. Add the environment to the table in [TOPIC_GUIDE.md](TOPIC_GUIDE.md).
7. `npm run validate`.

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
| `stage.setEnv(on)`, `setFx(on)`, `setCine(on)` | Backdrop, cinematic effects and camera sway toggles. Env and fx are remembered between visits |
| `stage.pointer`, `stage.dragging()`, `stage.camera` | For topic-level hover and picking |
| `stage.yaw` | Current camera yaw, for panning sound |
| `VLStage.soft(color, glow)` | The shared matte finish for shaded objects |
| `VLStage.label(text, opts)` | Readable in-scene text on a dark backing (`plane: true` prints it flat on a surface) |
| `VLStage.calmMaterials(group)` | Forces matte on every shaded material (the stage does this for you in `stage.add`) |
| `stage.environmentName` | Resolved environment (`'lab'`), which also names the sound profile |
