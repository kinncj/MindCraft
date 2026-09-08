---
inclusion: fileMatch
fileMatchPattern: 'src/engine/**/*.ts'
---

The engine never imports React or the store. `core/Engine.ts` composes small systems on
one game loop. Blocks are data (`blocks/blocks.ts`) — never compare an id to a string,
never renumber a numeric id. World edits go through a `Command`.

Playbooks: `docs/contributing/add-a-block.md`, `add-a-building.md`, `add-a-tool.md`.
