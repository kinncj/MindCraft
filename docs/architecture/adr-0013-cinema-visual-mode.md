# ADR-0013: Cinema visual mode

Status: accepted (2026-09-07)

## Context

The three original visual modes (Classic, Ultra, Claude Dream) only change
lights, fog, tone mapping, and sky colors. The world is always flat-shaded
16px pixel art. We want an opt-in "AAA" look: physically based materials,
a real sky that lights the scene, reflections on water and glass, deeper
shadows, and later post-processing, a water shader, and rounder shapes.

Constraints: no external assets at runtime (every texture is generated in
code), the world format and meshes must not change, low-power devices keep
the flat renderer, and the other three modes must look exactly as before.

## Decision

A fourth `VisualModeDefinition`, `cinema`, carries a `rendering` block that
the other modes set to "all flat":

| flag | Cinema |
| --- | --- |
| `pbr` | `MeshStandardMaterial` per bucket instead of Lambert |
| `hiRes` | 64px material atlases generated from the 16px painters |
| `envMap` | procedural `Sky` baked through `PMREMGenerator` into `scene.environment` |
| `postFx` | reserved for the post-processing pass |
| `shadowMap` | 4096 sun shadow map |
| `viewRadiusBonus` | two more chunks of draw distance |

`atlasEnhance.ts` turns each 16px tile into a 64px color map (grain and a
soft texel bevel), a tangent-space normal map (Sobel over a height field
derived from luminance and the bevel), and a roughness map (a base value
per material family, glass and water near mirror, stone and dirt chalky).
`TextureAtlas.buildHiRes()` packs them with the *same* UV layout as the
16px atlas, so chunk meshes are untouched when the mode switches:
`ChunkRenderer.setPbr()` only swaps materials.

The voxel light patch (`patchVoxelLighting`) works on both material kinds,
so caves stay dark and torches stay warm under image-based lighting.

`EnvironmentSystem` owns the sky dome. Its sun position, turbidity, and
Rayleigh scattering follow the time of day and weather. Every two seconds
(or when time jumps) the dome is re-baked into the environment map, which
also becomes the background. Under water the dome is swapped for a flat
deep-blue background and a short fog.

## Consequences

- Cinema is opt-in in Menu → World looks. Low-power devices (and any device
  without shadow support) silently keep the flat renderer even when the
  setting says Cinema, so the setting can be shared between devices.
- The 64px atlases cost a few hundred milliseconds once, on first switch.
- Saves, exports, and the mesher are unaffected: a world looks the same in
  every mode, only the rendering differs.
- Later phases add: ambient occlusion, bloom, and vignette (`postFx`),
  an animated water surface with Fresnel and foam, wind on grass and
  leaves, a rounder look for creatures, trees, and natural terrain, and a
  terrain generator v2 for new worlds.
