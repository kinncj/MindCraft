---
name: mindcraft-tools
description: Adding a capability to the tool registry, which is also the WebMCP surface, plus the chat allowlist and hands-on villager work. Use for new tools or MCP capabilities.
---

# tools

Read `docs/contributing/add-a-tool.md` in this repository and follow it exactly — it is
the canonical procedure and it is kept in step with the code.

The project rules that override defaults are in `AGENTS.md` (same as `CLAUDE.md`).
The ones people get wrong most often:

- Numeric block ids are permanent; add at the end of a range.
- Engine code never compares a block id to a string.
- Every world edit goes through a `Command` so Undo works.
- `npm run lint` is the typecheck; `npx tsc --noEmit` checks nothing here.
- New behaviour needs a test that fails without the change. Anything a character
  walks through needs a physics test, not just a rule.
