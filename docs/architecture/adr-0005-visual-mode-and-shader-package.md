# ADR-0005: Visual modes as data, one environment system applies them

**Status:** accepted

## Context

The product asks for three visual modes (Classic, Ultra-Realistic, Claude Dream) plus a
day/night cycle and weather. A naive implementation would branch on the mode everywhere
in the renderer — lights here, sky there, effects sprinkled around.

## Decision

Split into two pieces:

- `src/shaders/visualModes.ts` — mode **definitions** as pure data: sky palette
  (day/dawn/night), sun/hemisphere intensities, tone mapping choice, exposure, fog range,
  effect flags. No Three.js imports, trivially unit-testable.
- `src/game/engine/environment.ts` — one **EnvironmentSystem** that owns everything
  atmospheric: it applies a mode, advances the day/night cycle, orbits the sun, blends
  sky colors, fades stars in at night, runs rain/snow particles, and drives the shared
  `dayLight` uniform that the voxel-light shader multiplies against baked sky light.

Adding a fourth mode is one new object in `visualModes.ts`. Nothing else changes.

## What "Ultra-Realistic" means here

Browser-honest realism: ACES tone mapping, stronger directional light, deeper palette,
longer fog. No SSAO or bloom chains — on a laptop they cost more frames than they add
charm for this audience. This limitation is documented in the product docs.

## Persistence and portability

The selected mode is part of `GameSettings` (IndexedDB) and rides along in exports as
`visualMode.selectedMode`, restored on import when the value is a known mode id and
silently defaulted otherwise. Time-of-day and weather toggles persist the same way under
`settings`.
