---
applyTo: "src/engine/**/*.ts"
---

The engine never imports React or the store. Keep systems small and single-purpose;
`core/Engine.ts` composes them on one game loop.

Blocks are data: behaviour, shape, light, collision and textures belong on the
`BlockDefinition`. Never compare a block id to a string. Numeric ids are permanent.

Every world edit goes through a `Command` (`commands/`) so Undo removes it.

Playbooks: `docs/contributing/add-a-block.md`, `add-a-building.md`, `add-a-tool.md`.
