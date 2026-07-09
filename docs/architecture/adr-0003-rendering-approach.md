# ADR-0003: Rendering with plain Three.js, one mesh per block

**Status:** accepted

## Context

Options considered:

1. **Three.js, plain scene management** — real 3D, small API surface, huge community
2. **react-three-fiber** — Three.js driven by React reconciliation
3. **Canvas 2D isometric renderer** — no WebGL dependency, but every camera/raycast
   feature gets hand-rolled, and rotation is painful
4. **Instanced/chunked voxel meshing** — the "correct" voxel technique, built for worlds
   thousands of times larger than ours

## Decision

Plain Three.js (option 1) with the simplest thing that works: one shared `BoxGeometry`,
cached materials per block type, one `Mesh` per block. The world caps at 32×32×16, so the
worst realistic scene is a couple thousand meshes — trivial for WebGL. Raycasting against
individual meshes gives block picking and face-adjacent placement for free.

Textures are procedural: `textures.ts` paints 16×16 pixel canvases at startup (seeded,
so they look identical on every load) and wraps them in `CanvasTexture` with
nearest-neighbor filtering for the chunky pixel look. Blocks with distinct faces (grass,
wood, the Magic Delivery Box) get a 6-material array; the rest share one material on all
faces. The same canvases become data-URL icons for the hotbar and panels, so the UI and
the world match. A directional light casts soft shadows (PCF, 2048 map — one extra render
pass, cheap at this scene size). If 2D canvas is unavailable, everything falls back to
flat colors; jsdom tests exercise exactly that path.

React owns every 2D surface (HUD, panels, dialogs). The canvas is managed imperatively by
a `VoxelRenderer` class that a single `useEffect` mounts and disposes; it syncs from the
zustand store by subscription. No react-three-fiber because reconciling ~1,000 identical
cubes through React buys nothing here and adds a dependency with real API churn.

## Consequences

- The renderer is ~300 lines and fully replaceable behind `syncBlocks()` + 4 callbacks
- Per-mesh rendering would not survive a much bigger world; if the world ever grows,
  swap in `InstancedMesh` per block type behind the same interface
- jsdom cannot run WebGL, so component tests render the UI around a canvas that reports
  "unsupported"; real rendering is covered by Playwright in Chromium
- A friendly fallback message covers browsers without WebGL
