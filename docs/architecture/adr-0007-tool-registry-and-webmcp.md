# ADR-0007: One tool registry for the UI, agents, and WebMCP

**Status:** accepted

## Context

The product wants everything the player can do to be reachable by agents as
well: move, look, build, fill, open boxes, spawn and pet creatures, change time and
weather, and later drive vehicles, talk to villagers, craft, and program robots.
Browsers are starting to ship **WebMCP** (`navigator.modelContext`), which lets a
page register tools that a browser-side agent can call. Tests need the same hooks.

## Decision

- `src/engine/tools/ToolRegistry.ts` holds every capability once: a `domain_verb`
  name, a description, a JSON schema, and an `execute` function. Names are validated
  (`player_walk_to`, `world_place_block`, `villager_spawn`, `pet_follow`, …).
- `src/engine/tools/webmcp.ts` publishes the registry to `navigator.modelContext`
  when the browser has it (both the `registerTool` and `provideContext` shapes of
  the proposal), and always to `window.mindcraftTools` for Playwright, bookmarklets,
  and bridges to external MCP servers.
- Tools call the same engine paths the UI uses (`InteractionSystem.placeBlock`,
  `CommandHistory`), so agent edits are undoable and obey the same rules.
- Core tools ship with the engine (`coreTools.ts`); features register their own
  domains when they load.

## Consequences

- No secrets are exposed: the game is fully local and the registry only touches
  the running world.
- The registry is also the natural backend for the in-game robot programmer
  (Scratch-style cards map to tool calls).
- The WebMCP API is experimental; the adapter swallows shape changes so the game
  never breaks if the browser API moves.
