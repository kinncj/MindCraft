# ADR-0011: Villager chat that can build

**Status:** accepted

## Context

The kid should be able to talk to a villager, ask for things ("build me a
house"), and see the villager do them. The game has a tool registry already
(ADR-0007); the missing pieces were a way to turn words into tool calls and a
way to make the villager *perform* builds rather than have them appear.

## Decision

- **Providers** answer a `ChatContext` with `{ say, actions[] }` where each
  action is a tool call from an allowlist. Three providers, in order:
  1. an **outside agent** registered on `window.mindcraftChat` (a WebMCP
     client or a bridge to an MCP server) — the agent can also drive the
     villager directly through `villager_chat`, `villager_say`, `villager_build`;
  2. the **browser's built-in on-device model** (Prompt API `LanguageModel`),
     only when the parent turned it on in Menu → Friends and only if the
     browser already has the model (we never trigger a download). Its reply
     is forced into JSON, tool names are checked against the allowlist, text
     is capped, URLs stripped, and a small deny-list falls back to the rules;
  3. the **rule provider**: regex intents for building (blueprints, blocks,
     rooms, walls), company (follow, stay, dance), gifts, time and weather,
     pets and rides, and small talk. Works offline, always safe.
- **Hands-on tools** (`build_stamp_blueprint`, `build_room`, `world_fill`,
  `world_place_block`) are *planned* into edits, not executed: the villager
  gets a work queue, walks to the site, and lays blocks one every 0.12 s with
  particles and a hammer bob; when done the pre-captured command is recorded
  so Undo removes the whole build.
- Chips in the chat panel cover the requests a beginning reader makes; a text
  box covers the rest.

## Consequences

- No text reaches the child that was not written by us or produced on-device
  by the browser's own model behind a parent toggle.
- Any agent that can call tools can be a villager brain; the game does not
  ship or fetch a language model.
