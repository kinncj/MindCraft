# What is configurable, and where

| Thing | Where | Notes |
|---|---|---|
| Blocks | `src/engine/blocks/blocks.ts` | data only; ids permanent |
| Crafting recipes | `src/engine/crafting/recipes.ts` | 36 today, picture book |
| Villager jobs | `src/engine/entities/villagers.ts` | look, gift, four spoken lines |
| Creature personalities | `scripts/train-brain.mjs` → `src/engine/ai/weights.ts` | `npm run train:brain` |
| Sentences kids can say | `src/engine/chat/intentCorpus.ts` → `intentWeights.ts` | `npm run train:intent` |
| Buildings, features, digs | `src/engine/build/` + `buildRequest.ts` | see add-a-building.md |
| Prebuilt worlds | `src/engine/world/generation/maps/` | see add-a-scenario.md |
| Terrain | `src/engine/world/generation/InfiniteGenerator.ts` | biomes, caves, trees |
| Visual modes | `src/shaders/visualModes.ts` (data) + `EnvironmentSystem` | Classic, Ultra, Claude Dream, Cinema |
| Device budgets | `src/engine/core/deviceProfile.ts` | per GPU class: pixel ratio, shadows, draw distance, detail radii |
| Helper model sizes | `src/engine/chat/WebLlmProvider.ts` | Fast 0.5B / Smart 1.5B / Smartest 3B |
| Tools (and MCP surface) | `src/engine/tools/*.ts` | see add-a-tool.md |
| Sound | `src/engine/audio/` | Tone.js, generated, no files |

## Query flags

| Flag | Effect |
|---|---|
| `?debug=true` | overlay: GPU, profile, frame time, helper model, prompts, replies |
| `?power=high` | force the full renderer on software GL |
| `?mouse=tap` | plain click-to-build instead of grabbing the pointer (trackpads, tests) |
| `?mouse=game` | force the grab-the-pointer scheme anywhere |

## Non-negotiables

These are not configuration. They are what the game is:

- No backend, no accounts, no ads, no tracking, no network at runtime — the one
  exception is the helper model a grown-up downloads on purpose.
- No damage, hunger, death, monsters, weapons, or failure. Night is cozy.
- Every world edit is undoable.
- Keyboard and mouse, touch, and gamepad all work for every feature.
- Old saves and export files keep loading.
