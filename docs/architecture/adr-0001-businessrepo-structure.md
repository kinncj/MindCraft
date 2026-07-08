# ADR-0001: Structure the project as a BusinessRepo

**Status:** accepted

## Context

A project like this could be split the usual ways: a `frontend` repo, a `game-engine`
package, a `storage` library, a separate `e2e-tests` repo, deployment config somewhere
else. Every seam would need versioning, publishing, and coordination — for a game that
one person maintains and one kid plays.

## Decision

One repository owns the complete MindCraft capability: SPA, game engine, persistence,
export/import format, UI, unit/component/e2e tests, GitHub Pages deployment, product
docs, and these ADRs. Folders are organized by what they do for the product
(`game/`, `storage/`, `importExport/`, `components/`), not by technical genus.

## Consequences

- Any change — a new block type, a schema bump, a UI tweak — is one PR in one repo,
  tested end to end by the same CI run that deploys it
- There is nothing to publish or version internally; the export file schema is the only
  versioned contract, and it is versioned explicitly (`schemaVersion`)
- The repo is not reusable as a library. That's fine; nothing here is meant to be shared.
- If the project ever grows real seams (say, a level editor as a separate product), the
  split can happen then, along the boundaries this layout already makes visible
