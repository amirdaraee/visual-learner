# shared/

Code every topic uses. Topics contain only their own scenes and interface, so a change here upgrades all of them.

| File | What it is |
| --- | --- |
| `environments.js` | The 3D rooms, one fixed environment per category (`lab` for Biology), and the category registry |
| `stage.js` | Renderer, camera, orbit controls, bloom and the cinematic final pass, framing |
| `sound.js` | Procedural ambience and interaction sounds |
| `ui.css` | The interface style shared by every topic (the "smoked glass" look) |

Read [../docs/ENVIRONMENTS.md](../docs/ENVIRONMENTS.md) before changing anything here: it explains the contract, the look rules, and how to check every topic in a category after a change.

Still to come: vendored copies of pinned libraries such as three.js, and shared interface pieces (control dock, stat chips) once at least three topics repeat them.
