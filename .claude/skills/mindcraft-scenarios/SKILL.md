---
name: mindcraft-scenarios
description: Building prebuilt worlds (preset maps) with MapBuilder: landmarks, containers, villagers, spawn points, and registering the preset. Use for a new scenario or world.
---

# scenarios

Read `docs/contributing/add-a-scenario.md` in this repository and follow it exactly — it is
the canonical procedure and it is kept in step with the code.

The project rules that override defaults are in `AGENTS.md` (same as `CLAUDE.md`).
The ones people get wrong most often:

- Numeric block ids are permanent; add at the end of a range.
- Engine code never compares a block id to a string.
- Every world edit goes through a `Command` so Undo works.
- `npm run lint` is the typecheck; `npx tsc --noEmit` checks nothing here.
- New behaviour needs a test that fails without the change. Anything a character
  walks through needs a physics test, not just a rule.
