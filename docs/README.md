# MindCraft docs

Everything written down about the game, by area. Start with the vision, then the
guide to whichever part you are touching.

## Product

| Doc | What it covers |
|---|---|
| [vision.md](product/vision.md) | What MindCraft is for, and who it is for |
| [gameplay-scope.md](product/gameplay-scope.md) | What is in the game and what is deliberately left out |
| [kid-friendly-design-principles.md](product/kid-friendly-design-principles.md) | The rules every feature is held to |
| [visual-modes.md](product/visual-modes.md) | Classic, Ultra and Cinema, and what each is for |

## How things work

| Doc | What it covers |
|---|---|
| [ai/how-we-built-the-little-model.md](ai/how-we-built-the-little-model.md) | A didactic walkthrough of the language-understanding model that ships in the bundle: features, corpus, training, pruning, and how to extend it |

## Operations

| Doc | What it covers |
|---|---|
| [github-pages-deployment.md](operations/github-pages-deployment.md) | How the game is published |
| [world-export-import.md](operations/world-export-import.md) | Save files, versions, and moving a world between devices |
| [browser-storage-and-reset.md](operations/browser-storage-and-reset.md) | Where a world lives in the browser, and how to clear it |

## Decisions (ADRs)

Each one records a decision, why it was made, and what it costs. Newest last.

| ADR | Decision |
|---|---|
| [0001](architecture/adr-0001-businessrepo-structure.md) | Repository structure |
| [0002](architecture/adr-0002-browser-only-storage.md) | Browser-only storage, no backend |
| [0003](architecture/adr-0003-rendering-approach.md) | How the world is drawn |
| [0004](architecture/adr-0004-world-export-import-format.md) | The world file format |
| [0005](architecture/adr-0005-visual-mode-and-shader-package.md) | Visual modes and shaders |
| [0006](architecture/adr-0006-v2-engine-foundation.md) | The v2 engine: chunks, systems, store |
| [0007](architecture/adr-0007-tool-registry-and-webmcp.md) | One tool registry for the UI and for agents |
| [0008](architecture/adr-0008-logic-crafting-robots.md) | Power, crafting, robots |
| [0009](architecture/adr-0009-sound.md) | Music and effects |
| [0010](architecture/adr-0010-creature-brain.md) | The tiny trained brain behind the animals |
| [0011](architecture/adr-0011-villager-chat.md) | Talking to villagers |
| [0012](architecture/adr-0012-downloadable-helper-model.md) | The optional downloadable helper model |
| [0013](architecture/adr-0013-cinema-visual-mode.md) | Cinema mode |
| [0014](architecture/adr-0014-water-flight-rides.md) | Water, flying and rides |
| [0015](architecture/adr-0015-building-generator-and-livability.md) | Buildings from words, the livability rules, and where things get built |
| [0016](architecture/adr-0016-intent-model.md) | The little intent model |
