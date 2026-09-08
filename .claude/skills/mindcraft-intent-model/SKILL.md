---
name: mindcraft-intent-model
description: Teaching MindCraft's in-bundle sentence model new things kids can ask for: labels, training corpus, retraining, and the tests that are the real contract. Use when chat misunderstands a request.
---

# intent-model

Read `docs/contributing/teach-the-model.md` in this repository and follow it exactly — it is
the canonical procedure and it is kept in step with the code.

The project rules that override defaults are in `AGENTS.md` (same as `CLAUDE.md`).
The ones people get wrong most often:

- Numeric block ids are permanent; add at the end of a range.
- Engine code never compares a block id to a string.
- Every world edit goes through a `Command` so Undo works.
- `npm run lint` is the typecheck; `npx tsc --noEmit` checks nothing here.
- New behaviour needs a test that fails without the change. Anything a character
  walks through needs a physics test, not just a rule.
