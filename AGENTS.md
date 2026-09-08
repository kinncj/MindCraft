# AGENTS.md — working on MindCraft with an AI assistant

This file is the portable brief: Claude Code, Cursor, opencode, Copilot, Kiro, Qwen
Code, Codex and friends all read something like it. Tool-specific wrappers live in
`.claude/`, `.cursor/`, `.github/`, `.kiro/`, `.qwen/` and `.opencode/`, and every one
of them points back at the same playbooks in `docs/contributing/`.

## What this project is

A 100% small-kids-friendly creative voxel game that runs entirely in the browser.
No backend, no accounts, no ads, no tracking, no network at runtime — the sole
exception is an optional helper model a grown-up downloads on purpose. All art is
generated in code.

## The rules that are not negotiable

1. **Kid-safe, forever.** No damage, hunger, death, monsters, weapons, or failure.
   Night is cozy, never scary. Nothing unmoderated ever talks to a child.
2. **No network at runtime**, no accounts, no analytics, no external assets.
3. **Blocks are data.** Engine code never compares a block id to a string; put
   behaviour, shape, light, collision and textures on the `BlockDefinition`.
4. **Numeric block ids are permanent.** Add at the end of a range; never renumber.
5. **Every world edit goes through a `Command`**, so Undo always works.
6. **Every capability is a tool** (`domain_verb`) in the one registry, shared by the
   UI, the villagers and outside agents.
7. **Keyboard and mouse, touch, and gamepad** must all work for every feature.
8. **Old saves and export files must keep loading.**
9. **Anything a kid can ask for in words must work with no model downloaded.**

## How to do the common jobs

| I want to… | Read |
|---|---|
| Add a block | [docs/contributing/add-a-block.md](docs/contributing/add-a-block.md) |
| Add a villager job, pet or creature | [docs/contributing/add-a-character.md](docs/contributing/add-a-character.md) |
| Add a prebuilt world | [docs/contributing/add-a-scenario.md](docs/contributing/add-a-scenario.md) |
| Add a capability / MCP tool | [docs/contributing/add-a-tool.md](docs/contributing/add-a-tool.md) |
| Teach the sentence model | [docs/contributing/teach-the-model.md](docs/contributing/teach-the-model.md) |
| Add a building, feature or dig | [docs/contributing/add-a-building.md](docs/contributing/add-a-building.md) |
| Find where something is configured | [docs/contributing/configuration.md](docs/contributing/configuration.md) |

Architecture: `docs/architecture/adr-0006-v2-engine-foundation.md`, and the index of
everything is `docs/README.md`.

## Commands

```bash
npm run dev          # dev server
npm test             # unit + component tests (Vitest)
npm run test:e2e     # browser tests (Playwright)
npm run lint         # the real typecheck (tsc -b)
npm run build        # typecheck + production build
npm run train:brain  # retrain the creature policy
npm run train:intent # retrain the sentence model
```

`npx tsc --noEmit` checks **nothing** here — the root `tsconfig.json` holds only
project references. Use `npm run lint`.

## Before you say you are done

- `npm test` and `npm run lint` pass.
- New behaviour has a test that fails without your change.
- Anything a character walks through has a **physics test** — rules are not proof.
- Docs that quote numbers still match the code (a test checks the model's).
- A push to `main` runs the tests; only a green run deploys. Fix the browser tests
  rather than working around them.
