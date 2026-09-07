# ADR-0003: Rendering with plain Three.js and chunk meshing

**Status:** accepted (amended: per-block meshes → instancing → chunk meshing → per-chunk meshing with shapes, see ADR-0006)

## Context

Options considered:

1. **Three.js, plain scene management** — real 3D, small API surface, huge community
2. **react-three-fiber** — Three.js driven by React reconciliation
3. **Canvas 2D isometric renderer** — no WebGL dependency, but every camera/raycast
   feature gets hand-rolled, and rotation is painful
4. **Instanced/chunked voxel meshing** — the "correct" voxel technique, built for worlds
   thousands of times larger than ours

## Decision

Plain Three.js (option 1) with **chunk meshing**, the technique real voxel games use:
the whole world merges into four meshes (opaque terrain, water, alpha-cutout, glowing
blocks), emitting only faces that can actually be seen — a face is skipped when its
neighbor is opaque, or transparent of the same type. A full 64×64 world is ~20k
triangles across a handful of draw calls. Raycast hits resolve to grid cells from the
hit point and face normal.

We got here the honest way: per-block meshes were fine at 32×32, InstancedMesh looked
right for 64×64 but software rasterizers (SwiftShader in CI, GPU-less laptops) choke on
per-instance vertex cost (measured 3.5 fps), and chunk meshing fixed it outright
(measured 120 fps in the same environment). A dedicated engine (Babylon, PlayCanvas)
was considered and rejected: Three.js is the standard WebGL engine, and the win was the
meshing technique, not the framework.

Textures are procedural: `textures.ts` paints 16×16 pixel canvases at startup (seeded,
identical on every load), packed into a single texture atlas with half-texel insets.
Nearest-neighbor filtering keeps the chunky pixel look. The same canvases become
data-URL icons for the hotbar and panels, so the UI matches the world. Voxel lighting
(sky light + block light, ADR-0005 covers the visual-mode side) is flood-filled on the
CPU and baked into vertex attributes; a small shader patch combines them with the
time-of-day uniform.

Quality adapts to hardware: on software rasterizers the renderer disables shadows and
antialiasing and halves resolution; on real GPUs it keeps PCF soft shadows and native
DPI. If 2D canvas is unavailable, everything falls back to flat colors; jsdom tests
exercise exactly that path.

React owns every 2D surface (HUD, panels, dialogs). The canvas is managed imperatively by
a `VoxelRenderer` class that a single `useEffect` mounts and disposes; it syncs from the
zustand store by subscription. No react-three-fiber because reconciling ~1,000 identical
cubes through React buys nothing here and adds a dependency with real API churn.

## Amendment (v2, ADR-0006)

The whole-world merge became **one mesh set per 16×16 chunk** (`ChunkMesher` →
`ChunkRenderer`), rebuilt only for chunks marked dirty by an edit or a lighting
change, nearest-first with a per-frame budget. Blocks now have **shapes** (cube, slab,
stairs, cross, pane, fence, door, carpet, torch) that emit their own quads and
collision boxes; a quad is culled when the neighbor's shape fully covers that face and
the neighbor is not see-through. Picking uses a voxel-grid raycast against shape boxes
instead of Three.js mesh intersection. Lighting is incremental (ADR-0006).

## Consequences

- The renderer is split into a mesher (testable without WebGL) and a thin Three.js
  layer; component tests render the UI around a canvas that reports "unsupported";
  real rendering is covered by Playwright in Chromium
- A friendly fallback message covers browsers without WebGL
