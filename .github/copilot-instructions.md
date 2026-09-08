# Copilot instructions for MindCraft

MindCraft is a 100% kid-friendly creative voxel game that runs entirely in the browser:
no backend, no accounts, no ads, no tracking, no network at runtime (the one exception
is an optional helper model a grown-up downloads on purpose). All art is generated in
code. TypeScript strict, React only for the HUD, Three.js for rendering, zustand store.

**Read `AGENTS.md` at the repo root** — it holds the full rules and links a playbook for
every common job (`docs/contributing/`).

Rules that override anything else:

- Kid-safe forever: no damage, hunger, death, monsters, weapons, or failure states.
- No network calls, no analytics, no external assets.
- Blocks are data (`src/engine/blocks/blocks.ts`); never compare a block id to a string;
  numeric ids are permanent — add at the end of a range, never renumber.
- Every world edit goes through a `Command` so Undo works.
- Every capability is a tool named `domain_verb` in the one registry, shared by the UI,
  the villagers, and outside agents over WebMCP.
- Keyboard and mouse, touch, and gamepad must all work for every feature.
- Old saves and export files must keep loading.
- Anything a kid can ask for in words must work with no model downloaded.

Verify with `npm test` and `npm run lint` (a bare `npx tsc --noEmit` checks nothing
here — the root tsconfig holds only project references). New behaviour needs a test that
fails without the change; anything a character walks through needs a physics test.
