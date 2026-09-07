# Session — 2026-09-06

## What was done

MindCraft went from a 64×64 single-world toy to MindCraft 2.0 in one session,
in seven pushed phases (each green on 100+ unit tests, typecheck, and build):

1. **Foundation** (ADR-0006/0007): infinite chunked world generated in a worker,
   ~70 data-driven blocks with shapes and behaviors, incremental lighting, per-chunk
   meshing, swept-AABB physics, voxel raycast, keyboard/mouse/touch/gamepad input,
   rule-based creature brains, undo/redo commands, a tool registry exposed via
   WebMCP and `window.mindcraftTools`, Dexie v2 with automatic v1 migration, schema
   v2 export with v1 import, multiple worlds. 33 Playwright tests passed locally
   (the user then asked not to run Playwright locally; CI still runs it).
2. **World polish**: placement ghost, replaceable plants, ladders, sandstone/hay/
   stone wall, big oaks, flower meadows, clouds, particles.
3. **Build mode**: room, fill, paint, copy/paste with rotation, mirror, six
   blueprint cards, `build_*` tools.
4. **Life layer**: chairs to sit, TV/lamp switches, fridge, stove, sink; car and
   boat; pets (dog, cat) that follow/stay/trick; villagers with eight jobs, picture
   dialogue, gifts, "let's play"; dress-up; persistent entities; `villager_*`,
   `pet_*`, `vehicle_*`, `player_set_look` tools.
5. **UI refresh**: Sheet/IconButton/MenuRow design system, bottom sheets on phones,
   menu with submenus, tools drawer, safe-area insets, thumb-sized buttons.
6. **Crafting, logic, robots** (ADR-0008): 36-recipe picture book with a tap-to-
   fill grid; lever/button/plate/wire/lamp/piston/sticky piston/powered door/note
   block on a 10 Hz `LogicSystem`; card-programmed robots; `crafting_*`, `logic_*`,
   `robot_*` tools.
7. **Sound** (ADR-0009): generative Tone.js soundtrack by biome and time of day,
   synth effects, mute/music/volume, `audio_*` tools. No audio files.

8. **Premium UI** (dark-glass design system), then follow-ups the user asked for
   during play: a **tiny trained neural brain** for creatures (ADR-0010, 600 weights,
   `npm run train:brain`), an **Interact** tool, two prebuilt maps (**Toy Land**
   bedroom, **Sunny Town**) drawn by a MapBuilder inside the flat generator, zoom
   buttons and D-pad zoom, **villager chat that builds** (ADR-0011: rules, the
   browser's built-in on-device model behind a parent toggle, outside agents via
   `window.mindcraftChat`; villagers lay blocks by hand, undoable), a live 3D
   **dress-up preview** with boy/girl styles, rider facing and a chase camera for
   vehicles, and a block picker for robots.

9. **Helper model** (ADR-0012): Qwen2.5-0.5B-Instruct via WebLLM behind a parent's
   two-tap download in Menu → Friends; worker-backed, JSON-forced, filtered; lazy
   chunk; the only deliberate network exception. Real model untested here (no WebGPU
   in this environment); provider tested with a fake engine.

Docs kept in step: README, CLAUDE.md, gameplay scope, kid-friendly principles,
storage and export/import ops docs, ADR-0003/0004 amendments, ADR-0006..0009.
`npm audit fix` cleared the three transitive advisories; checkout/setup-node
actions bumped to v5.

## Decisions made

- Infinite streamed world; only edited chunks persist; v1 saves/files become flat
  worlds verbatim (user asked for auto-import + version tracking → `meta.storage`).
- No in-browser LLM for villagers (CDN weights, load time, unmoderated output);
  `Brain` interface leaves room for a parent-gated mode.
- Crafting is playful (nothing consumed); logic edits by pistons bypass undo.
- Tools are the single capability surface; the UI and agents share code paths.
- Local Playwright runs are off by user request (laptop load); CI runs them. Single
  headless screenshot passes were used to eyeball the UI and maps.

## Unfinished / follow-up

- CI has not been observed since the last pushes (gh is not authenticated here);
  check the Actions tab — the e2e suite was updated for the new menu but ran
  locally only before the UI refresh.
- Possible polish: robot "place below" card, vehicle sounds while driving, villager
  homes/jobs tied to blocks, a "smart villagers" parent-gated option, Three.js
  upgrade from 0.169, bundle splitting beyond vendor chunks.
- Dependabot's open postcss branch can be closed (audit fix covered it).

## Pending dashboard / manual actions

- Verify the GitHub Pages deploy of the latest `main` and that a v1 world in the
  live site's IndexedDB migrates with the "moved into the new MindCraft" toast.
