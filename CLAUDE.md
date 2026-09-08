# MindCraft — working rules

A 100% small-kids-friendly creative voxel game: kids craft what they have in mind. Browser only, no backend, no accounts, no
ads, no tracking, no external requests at runtime (sole exception: the optional
helper model a grown-up downloads on purpose, ADR-0012). Original art generated in code.

## Architecture (ADR-0006)

- `src/engine/` is the game engine. It never imports React or the store.
  - `world/` chunked infinite world (`VoxelWorld`, `Chunk`, `ChunkManager`, generators)
  - `blocks/` the block catalog (`blocks.ts`), shapes, textures, registry
  - `lighting/` incremental sky + block light
  - `render/` chunk mesher, atlas, Three.js chunk renderer, environment
  - `physics/` swept-AABB player, voxel raycast
  - `input/` keyboard, mouse, touch, gamepad → `InputFrame`; camera; interaction
  - `entities/` creatures with `Brain`s; `ai/` the tiny trained neural policy (no LLM)
  - `commands/` undoable edits; `tools/` the tool registry + WebMCP adapter
  - `build/` room/fill/paint/copy/paste/mirror, the building generator
    (`BuildTools`, `buildingKit`, `livability`, `siteFinder`) + blueprint cards;
    `crafting/` recipes
  - `logic/` the 10 Hz power system and pistons; `audio/` Tone.js music and effects
  - `chat/` villager chat: the word lists and the little intent model trained in
    this repo (`intent*.ts`, ADR-0016), then the optional downloaded helper, the
    browser's built-in model, and outside agents
  - `core/Engine.ts` composes everything and runs the `GameLoop`
- `src/game/` is the app layer: zustand store (slices in `store/`), `GameCanvas`.
- `src/storage/` Dexie v2: `worlds` + `chunks` rows, RLE codec, v1 migration.
- `src/importExport/` schema v2 files, v1 import path, strict validation.

## Rules

- Engine code never compares a block id to a string. Put behavior, shape, light,
  collision, and textures on the `BlockDefinition`; add shapes as shape modules.
- Numeric block ids are permanent. Add at the end of a range; never renumber.
- Every world edit goes through a `Command` so undo works (tools included).
- New capabilities register a tool (`domain_verb`) in `ToolRegistry`; the UI and
  agents share the same path.
- Keep it kid-safe: no damage, hunger, death, hostile mobs, weapons, chat,
  accounts, multiplayer, purchases. Night is cozy, never scary.
- Inputs: keyboard+mouse, touch, and gamepad must all work for every feature.
- Storage and file formats are versioned; old saves and exports must keep loading.
- Anything a kid can ask for in words must work from the words alone, with no model
  downloaded: the parsers and the in-bundle intent model are the floor (ADR-0015,
  ADR-0016). Retrain with `npm run train:intent` after adding phrasings.

## Commands

```
npm run dev · npm test · npm run test:e2e · npm run build · npm run lint
npm run train:brain (creature policy) · npm run train:intent (sentence model)
```

`npm run lint` is the real typecheck: a bare `npx tsc --noEmit` checks nothing here,
because the root `tsconfig.json` holds only project references.

A push to `main` runs the tests; only a green run deploys to GitHub Pages, so a red
suite never reaches a child. Fix the browser tests rather than working around them —
they caught a worker that was silently dropping every prebuilt container's contents.
