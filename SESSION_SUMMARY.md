# Session — 2026-07-08

## What was done

Built MindCraft from an empty directory to a deployed game at
https://kinncj.github.io/MindCraft/ (repo: https://github.com/kinncj/MindCraft).

- **Foundation**: Vite + React + TypeScript SPA, Dexie/IndexedDB persistence,
  versioned JSON export/import with strict validation, autosave with an honest
  save indicator, GitHub Actions for tests and Pages deployment
- **World**: 64×64×32 procedurally generated terrain (seeded noise — hills, lakes,
  beaches, snow peaks, trees, flowers) with a flat spawn plaza; Toy Land preset
  (playroom world with toy chest, block towers, original cowboy/astronaut statues)
- **Rendering**: chunk meshing (four merged meshes, visible faces only, texture
  atlas of generated 16×16 pixel art), soft shadows on real GPUs, adaptive quality
  on software rasterizers
- **Lighting**: Minecraft-style flood-fill (skylight + block light) baked into
  vertex attributes — sealed shelters are dark until lit by torch/campfire/light/star
- **Environment**: day/night cycle with stars, rain/snow, three visual modes
  (Classic / Ultra / Claude Dream) — all in the menu, persisted, exported/imported
- **Player**: voxel kid with column collision (step-up, walls, roofs, ceilings),
  jumping, swimming with surface breach-jump, first/third person with
  scroll-through zoom, first-person arm, crosshair
- **Creatures**: wandering bunnies/chicks/butterflies, pettable (happy hop + toast)
- **UI**: splash screen, Escape menu (how-to-play, settings, export/import/reset,
  Toy Land), hotbar with 21 textured blocks, Magic Delivery Box storage panel
  styled as cardboard
- **Touch**: virtual joystick + hold-to-jump button on touch devices, pinch zoom,
  responsive small-screen CSS
- **Legal**: MIT LICENSE, README trademark disclaimers (Mojang/Microsoft, Amazon,
  Disney/Pixar), base path fixed to `/MindCraft/`
- **Tests**: 82 unit/component (Vitest/RTL/fake-indexeddb) + 24 Playwright e2e
  (including emulated-tablet touch tests); CI green on the final push

## Decisions made

- **Three.js over a "proper game engine"** (Babylon/PlayCanvas): the needed win was
  the chunk-meshing technique, not a framework swap. Documented in ADR-0003 with
  measurements (instancing: 3.5fps on SwiftShader; chunk meshing: 120fps).
- **Lighting as baked vertex attributes + one shader patch** rather than real-time
  GI: recomputed per edit (few ms), combined with a `dayLight` uniform so night
  dims the sun but not torches.
- **Visual modes as pure data** (`src/shaders/visualModes.ts`) applied by one
  EnvironmentSystem — adding a mode is one object literal (ADR-0005).
- **IP boundaries held**: original textures/assets throughout; Magic Delivery Box
  is a generic cardboard box (no Amazon trade dress); Toy Land statues are stock
  toy archetypes, explicitly **not** Woody/Buzz — the request for "same textures,
  same everything" Toy Story was declined as copyright infringement and replaced
  with original designs.
- Export schema stayed at version 1: visual mode and weather/time were added as
  optional fields (additive, old files still import).

## Fixes applied

- **Stale-save race**: an in-flight autosave could report "Saved" for a world
  state it never saw (data loss window). Fixed with a change counter; only the
  save that observed the latest change may claim "saved".
- **StrictMode double-init** overwriting live state with a second starter world.
- **Roof-as-floor collision**: ground was the column's top block, so shelters
  were impossible. Rewrote physics to find support below the feet with headroom
  and ceiling checks.
- **Look-up clamp**: a leftover pitch clamp in the drag handler blocked looking
  at the sky/ceilings.
- **SwiftShader performance**: 3.5fps → 120fps via chunk meshing (after ruling
  out fill rate, triangle count, and rAF throttling by measurement).
- **Splash button unclickable by automation** (and shaky hands): infinite
  transform animation made it never "stable" — replaced with a glow pulse.
- **Swim exit**: breach jump at the water surface so swimmers can climb ashore.
- **CI flake**: save-wait timeout on two-core runners; longer wait + 2 workers.
- jsdom gaps patched in tests: `File.text()`, `PointerEvent` (drops clientX).

## Unfinished / follow-up

- **GitHub Actions Node 20 deprecation warnings**: bump `actions/checkout`,
  `setup-node`, `upload-artifact` to their next major versions to silence.
- **No sound** (spec said optional) — a mute-toggled gentle soundscape is the
  most-requested likely next feature.
- **Single world per browser** — multiple named worlds with thumbnails is the
  top future idea in the README.
- Animals and player position are not persisted (fresh flock and plaza spawn
  each session) — documented as a limitation, revisit if it bothers the kid.
- Water animation is an opacity shimmer, not UV scrolling (atlas constraint);
  a dedicated water texture would allow real scrolling.
- `docs/operations/browser-storage-and-reset.md` predates Toy Land and the
  settings tables — content is still accurate but could mention the new
  settings keys.

## Pending dashboard / manual actions

- **GitHub → Settings → Pages → Source: GitHub Actions** — deploy runs succeed,
  so this appears to be done already; verify the site loads at
  https://kinncj.github.io/MindCraft/ and that a world builds + saves.
- No other external services: the game is fully local by design (no Supabase,
  Vercel, or API keys anywhere).

## Commits

All 22 commits below were made this session (oldest first):

1. `bd3e39e` scaffold Vite + React + TypeScript app
2. `3779941` add world model, block registry, and starter scene
3. `7137be9` add IndexedDB persistence with Dexie
4. `f1f38dc` add world export/import with strict validation
5. `e67d813` add game store and Three.js voxel renderer
6. `1a58a01` add the kid-facing UI
7. `2e31b67` add unit and component tests
8. `d488b74` add Playwright smoke tests
9. `ee63b09` add README, product docs, ADRs, and CI
10. `70a5d58` ignore tsc build info files
11. `e88a082` add procedural pixel textures, shadows, and clouds
12. `8e1f9ae` use the block textures in the UI
13. `0ffa4ac` update rendering docs for textures and shadows
14. `3d5ef29` switch rendering to chunk meshing, was unplayable on software GL
15. `4d141ac` generate open-world terrain and grow the block set to 21
16. `ad8dc2e` add the player character and the animal friends
17. `1a84530` add voxel lighting, day/night, weather, and visual modes
18. `2328340` menu settings, visual mode picker, Toy Land button, FP arm
19. `26c0353` cover physics, lighting, modes, and Toy Land with tests
20. `2b94950` MIT license, trademark disclaimers, docs for everything new
21. `3fdc2c2` unflake CI: longer save wait, two e2e workers
22. `e2ae90a` add tablet and phone controls
