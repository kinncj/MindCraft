---
inclusion: always
---

# MindCraft

A 100% kid-friendly creative voxel game in the browser. No backend, no accounts, no
ads, no tracking, no network at runtime (one exception: an optional helper model a
grown-up downloads on purpose). All art generated in code.

Full brief and playbooks: `AGENTS.md` and `docs/contributing/`.

Non-negotiable: kid-safe forever (no damage, monsters, weapons, failure); blocks are
data and their numeric ids are permanent; every world edit goes through a `Command`;
every capability is a `domain_verb` tool in one registry; keyboard, touch and gamepad
all work; old saves keep loading; anything a kid asks for in words works with no model
downloaded.

Verify with `npm test` and `npm run lint`. `npx tsc --noEmit` checks nothing here.
