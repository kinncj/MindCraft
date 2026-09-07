# ADR-0006: The v2 engine foundation — infinite chunked world, data-driven blocks, systems

**Status:** accepted

## Context

MindCraft v1 was a 64×64×32 world with one merged mesh set, a 649-line renderer that
owned input, camera, picking, and the frame loop, and a 400-line store that owned the
world, inventory, boxes, settings, panels, toasts, save, export, and import. Every edit
remeshed and relit the whole world. Block behavior was decided by string comparisons
spread across five files.

The v2 goal is a Minecraft-feel world (infinite terrain, biomes, caves, block shapes,
dozens more blocks) with a Brookhaven-style life layer (furniture, doors, vehicles, pets,
villagers, dress-up), Sims-style build tools (room tool, paint, stamps, undo), and
generated music through Tone.js — still creative-only and built for small kids.
None of that fits on the v1 skeleton.

## Decision

### World: infinite, streamed, chunked

- The world is a map of **chunks**: 16×16 columns, 128 blocks tall. A chunk stores block
  ids in a `Uint16Array`, a packed state byte per block in a `Uint8Array` (rotation,
  half, open, variant), sky and block light in two `Uint8Array`s, and sparse **block
  entities** (box contents, sign text) in a map.
- A **ChunkManager** keeps chunks loaded within a radius of the player, generates
  missing ones, and unloads distant ones after saving. Generation runs in a Web Worker
  when available and inline otherwise (tests, old browsers).
- Terrain is **deterministic per seed**. Only chunks that were edited are persisted;
  everything else regenerates. That is what makes "infinite" cheap to save and export.
- Two generators share one interface: `infinite` (biomes, caves, trees) and `flat`
  (superflat). v1 worlds and Toy Land become `flat` worlds with their blocks placed
  verbatim, so nothing a kid built is lost and no cliffs appear around old builds.

### Blocks: data, not code

A `BlockDefinition` carries everything the engine needs: a stable numeric id for
storage, label and category for the palette, a **shape** (cube, slab, stairs, cross,
pane, fence, door, …) that yields both faces for the mesher and collision boxes for
physics, transparency and light level for the light engine, a render bucket, texture
painters, and optional **behaviors** (`onInteract`, `onPlace`, `onRemove`, `tick`).
Engine code never compares a block id to a string. Adding a block is one definition;
adding a shape is one shape module.

### Systems, one loop

An `Engine` composes a `VoxelWorld` with small single-purpose systems ticked by one
`GameLoop`: input, camera, player physics, chunk streaming and meshing, lighting,
interaction, entities, environment, render, audio. Each system depends on interfaces,
not on the renderer. React only mounts the engine and reads the store.

### Edits are commands

Every world edit (place, remove, fill, paint, stamp) is a command with before/after
block lists. A `CommandHistory` gives undo and redo everywhere for free.

### Store slices

Zustand is split into slices (world, ui, settings, inventory). Chunk data never enters
the store; it lives in the engine and the store only tracks ids, names, and save state.

### Persistence and export, version 2

IndexedDB gets `worlds` (id, name, seed, generator, settings, thumbnail) and `chunks`
(worldId + chunk key → block/state buffers + entities). The Dexie migration converts a
v1 database into one `flat` world. The export file bumps to `schemaVersion: 2` with
run-length-encoded chunk data and a per-file palette so block ids can change later.
Version 1 files still import through the same flat-world conversion.

## Consequences

- The v1 engine files are replaced, not patched; tests move with them.
- Lighting becomes incremental (add/remove flood fill across chunk borders) instead of
  a whole-world recompute. This is the hardest part and gets its own tests.
- Bundle grows with Tone.js and simplex-noise; still no runtime assets or network.
- Three.js stays at 0.169 for this phase; upgrading is a separate, testable change.
