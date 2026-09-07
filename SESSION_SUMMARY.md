# Session — 2026-09-06

## What was done

Rebuilt MindCraft's foundation for v2 (ADR-0006, ADR-0007): an infinite chunked
world with data-driven blocks, small systems on one game loop, undo everywhere, a
tool registry exposed through WebMCP, versioned storage with automatic v1
migration, and input from keyboard/mouse, touch, and gamepads. No visible feature
was lost; the world went from 64×64×32 to infinite and the block count from 21 to
about 70 (stairs, slabs, doors, fences, windows, ten colors, carpets, furniture,
lights, biome plants).

- `src/engine/` (new, framework-free): `world/` (Chunk, VoxelWorld, ChunkManager with
  a generation Web Worker, Infinite + Flat generators, structures), `blocks/`
  (catalog with behaviors, shapes, painters, registry with permanent numeric ids),
  `lighting/` (incremental sky + block light across chunk borders), `render/`
  (per-chunk mesher, atlas, Three.js chunk renderer, environment), `physics/`
  (swept-AABB player, DDA raycast against shape boxes), `input/` (InputSystem incl.
  gamepad, CameraSystem with wall check, InteractionSystem), `entities/` (Brain
  interface, EntitySystem, avatar), `commands/`, `tools/` (ToolRegistry, WebMCP
  adapter, core tools), `core/Engine.ts` + `GameLoop`.
- `src/game/`: sliced zustand store (world/ui/settings/inventory), `GameCanvas`
  mounting one Engine per world, block icons.
- `src/storage/`: Dexie v2 (`worlds`, `chunks`, `meta.storage`), RLE codec, v1 → v2
  migration into a flat world, storage version record.
- `src/importExport/`: schema v2 export (seed + edited chunks + palette), v1 import.
- UI: nine-slot hotbar + full block palette, undo/redo, worlds panel (multiple
  worlds), sleep panel, container panel reading block entities, controller reticle.
- Docs: README (2.0), CLAUDE.md, ADR-0006, ADR-0007, refreshed product/ops docs.
- Tests: 113 unit/component (Vitest) + 33 Playwright e2e, all green locally.

## Decisions made

- Infinite streamed world (user's choice over large-finite); only edited chunks
  are persisted, terrain regenerates from the seed.
- v1 worlds and v1 export files become **flat** worlds holding the old blocks
  verbatim (no cliffs around old builds). Migration is automatic and stamped in
  `meta.storage`.
- Two transparency notions: `transparent` (light passes) vs `seeThrough` (face
  culling). Slabs pass light but are not see-through.
- Rule-based creature brains behind a `Brain` interface; no in-browser LLM (CDN
  weights, load time, unmoderated output for a 6-year-old). Could be a parent-gated
  option later.
- Crafting grid is back in scope (user override), as a picture recipe book; a logic/
  automation layer and a programmable robot are planned; block behaviors already
  carry `onPowerChanged`/`tick` hooks.
- Tools are the single capability surface (`domain_verb`), exposed via
  `navigator.modelContext` (WebMCP) and `window.mindcraftTools`.
- Starting camera now faces the plaza landmarks (the old view had the rainbow
  arch between camera and player).

## Fixes applied

- Cross-shape quads carried the wrong normal for their winding.
- Stairs step was on the near side; now rises away from the player.
- Door top half is part of the same undo command (PlaceContext.place).
- Test hooks: `blockAt` returns "air", `pick(clientX, clientY)` for e2e targeting.

## Unfinished / follow-up

- Phases still to build (README roadmap): world polish + ghost preview; build
  mode (room tool, paint, stamps, mirror, blueprints); life layer (furniture that
  works, car/boat, pets, villagers with jobs, dress-up); crafting + logic + robot;
  Tone.js sound.
- Three.js stays at 0.169; upgrade is a separate change.
- Bundle is ~870 kB minified (Three.js); split into vendor chunks, could lazy-load.
- Villager/pet/vehicle/crafting/logic tool domains land with their features.
- GitHub Actions Node 20 deprecation warnings still pending (bump action majors).
- Not committed: this session's changes are in the working tree.

## Pending dashboard / manual actions

- None. Fully local; Pages deploy unchanged.
