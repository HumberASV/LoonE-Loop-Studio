# LoonE Loop Studio

An animation engine for generating perfectly looping GIF/WebM assets: a
boat-on-waves **Loading Screen** and a corrupted **Technical Difficulty**
screen, rendered on a p5.js canvas and exported with frame-exact timing.

## Stack

| Concern        | Library                                        |
| -------------- | ---------------------------------------------- |
| Runtime/dev    | Bun (fullstack dev server, `serve.ts`)         |
| UI             | React 18 + `react-router-dom` + `@p5-wrapper/react` |
| Physics        | `toxiclibsjs` `VerletPhysics2D` (boat buoyancy)|
| Glitch         | `p5.glitch` (Technical Difficulty scene only)  |
| Export         | `p5.capture` (auto start frame 1 → stop on completion) |

## Run

```bash
bun install
bun run dev        # http://localhost:5173
bun run typecheck
```

## Using the app

The app is two pages, joined by a normal navigation — nothing renders live
across the two, on purpose (see *Why two pages* below).

### 1. Configure (`/`)

Everything here edits a **draft** only. A small isolated canvas preview
(no p5, no physics) updates instantly as you drag sliders, so you can see
the frame's aspect ratio and wave shape before committing to anything
expensive. `/config` also lands here (redirects to `/`).

**Canvas**
- **Preset** — common aspect ratios (1:1, 16:9, 9:16, 4:3, 3:2, 5:4, 16:10,
  cinema/cinemascope), or set **Width**/**Height** directly (200–3840px).
- **Lock 1:1** — keep width and height equal while dragging either.
- **Loop Duration** — 1–8 seconds in 0.5s steps (always a whole number of
  frames at 60fps).

**Waves**
- **Wave Height** — crest-to-trough amplitude, 1–8% of canvas height.
- **Waves Across Frame** — how many full wave crests fit the canvas width,
  1–6.

**Boat**
- **Size** — 50–200% scale.
- **Position** — resting X position (10–90% across), disabled while
  animating.
- **Flip boat** — mirror the art horizontally.
- **Animate boat movement** — sail the boat across the frame instead of
  bobbing in place, with **Direction**, **Speed**, and:
  - **Wrap at ends** (default) — the boat exits one edge and re-enters the
    other; speed is quantized to a whole number of crossings per loop so the
    loop stays seamless.
  - Unchecked = **bounce** — the boat turns around at the margins instead.
    Not loop-periodic by design (it's for a preview/demo feel, not a GIF
    export).

**Output**
- **Bake label into canvas** — draws "LOADING..." / "TECHNICAL DIFFICULTY"
  into the exported pixels. Off by default means the DOM text overlay you
  see on `/render` is *not* part of the recording.
- **Record on render** — auto-start capture the moment `/render` mounts.
  Always defaults to **off** when you land on this form (even if you saved
  a project with it on) — recording only re-arms when you explicitly check
  it and hit Apply, never as a side effect of just opening the page.
- **Export format** — GIF or WebM. **Quality** — 10–100%.
- **Record mode** (only selectable with wrap-mode boat animation on):
  - **Perfect loop** — captures exactly `loopSeconds` worth of frames.
  - **Until boat exits frame** — stops the moment the boat first sails
    fully off-screen, typically well under a full loop. Good for a
    one-shot "sailing away" clip rather than a seamless loop.

Click **Apply & Render** to save the settings and navigate to `/render`.

### 2. Render (`/render`)

Mounts the real p5/physics/capture pipeline fresh from whatever you just
applied. Switch between the **Loading Screen** and **Technical Difficulty**
scene tabs, or hit **⟲ Restart loop** to re-run the current settings
(re-arms recording if it was enabled). **← Edit settings** goes back to `/`
without losing what's saved.

If recording is on, the browser downloads the export automatically once
capture finishes — watch the console for `[capture] recording…` /
`⏳ encoding …%` / `✅ done`.

### Why two pages

Editing settings *live* against the actual render used to break recording
outright — p5's own hook-registration model doesn't survive a naive
remount-on-every-keystroke approach. Splitting the flow so the form only
ever produces a deliberate, full remount (via navigation) — with a
completely separate, physics-free canvas for live feedback — is what keeps
the capture pipeline reliable. See `src/anim/capture.ts`'s doc comment if
you're touching that file; the reasoning is spelled out there because it's
easy to accidentally reintroduce.

## Loop math

- Loop length is user-chosen (1–8s @ 60fps) but always an integer frame
  count. Everything periodic completes an integer number of cycles inside
  that window:
  - The wave field scrolls exactly one wavelength per loop, and the
    wavelength always divides the canvas width an exact integer number of
    times (`waveCrests`), so the field is seamless in both space and time
    at any size or duration.
  - The glitch schedule (random 45–60-frame gaps, 5-frame holds) comes from
    a seeded PRNG and corrupts via `p5.random()` re-seeded per loop frame,
    so every cycle replays byte-identically.
  - Wrap-mode boat sailing quantizes its speed to a whole number of
    off-screen-to-off-screen crossings per loop, so the wrap teleport never
    shows in the export.
- The boat is real physics, not a keyframe: the toxiclibs rig pre-rolls two
  full loops during `setup()` (sailing too, if wrap motion is on) so frame 1
  starts from the settled steady state and the seam shows no physics pop.

## Boat physics (`src/anim/boatRig.ts`)

Two `VerletParticle2D`s (bow/stern) joined by a rigid `VerletSpring2D`.
Per frame, for each particle: compute the wave surface Y at the particle's X;
if submerged, apply an upward force `depth × buoyancy` and scale velocity by
`waterDrag`. The hull renders at the spring midpoint, rotated by
`atan2(stern−bow)`.

## Themes

Five built-in palettes (`src/theme/themes.ts`), switchable live on `/` —
including two derived from the HumberASV brand guide (`brandLight` /
`brandDark`). Every color in the app — sky, wave layers, boat hull/detail,
UI chrome — comes from the active `ColorTheme`, so a palette swap recolors
everything, including a live-regenerated boat SVG (`src/anim/boatArt.ts`).

## Asset

Drop `public/assets/loone-boat.png` to use production art (bypasses theme
recoloring). Fallbacks: the theme-recolored LoonE SVG, then a plain
rectangle drawn between the physics particles — so the buoyancy simulation
is always visible even with zero art.

## Structure

```
serve.ts                     Bun dev server (HMR + /assets + a .debug/ frame-dump helper)
src/main.tsx                 plugin bootstrapping (p5 global → p5.capture), router + React root
src/App.tsx                  route table: / , /config → / , /render
src/settings.ts              RenderSettings shape, defaults, sanitizing, localStorage load/save
src/pages/ConfigPage.tsx     the settings form + live preview
src/pages/RenderPage.tsx     the real canvas + recording, scene tabs, restart
src/components/ConfigPreview.tsx  isolated canvas preview (no p5/capture/physics)
src/components/SceneStage.tsx     the real canvas + DOM text overlay
src/theme/                   ColorTheme interface, palettes, React context → CSS vars
src/anim/constants.ts        canvas/loop/wave/boat/export tuning — mutable, set from settings
src/anim/wave.ts             the loop-exact sine surface (pure core + live-singleton wrapper)
src/anim/boatMotion.ts       wrap-mode sailing math, shared by the runtime and the physics pre-roll
src/anim/boatRig.ts          toxiclibs Verlet rig + buoyancy + drag
src/anim/boatArt.ts          theme-recolored boat SVG rasterizer
src/anim/baseScene.ts        sky, 4 parallax wave layers, boat (shared by both scenes)
src/anim/glitchSchedule.ts   seeded 45–60-frame trigger schedule
src/anim/capture.ts          p5.capture bridge — start/stop helpers, the hook-registration fix
src/sketches/                the two scene sketches + shared runtime (SceneRuntime)
```
