# ADR-0002: Browser-only storage with IndexedDB (via Dexie)

**Status:** accepted

## Context

The game must persist worlds with no backend, no accounts, and no cloud. The options in
a browser are localStorage, IndexedDB, and the Origin Private File System.

A full world is ~1,000+ block records plus box contents. localStorage is synchronous,
string-only, and capped around 5 MB — workable but ugly and blocking. OPFS is powerful
but young and awkward to query. IndexedDB fits: asynchronous, structured records,
hundreds of MB of headroom.

## Decision

IndexedDB through Dexie. Dexie removes the IndexedDB ceremony (versioned schema
migrations, transactions, typed tables) for ~25 kB. Three tables:

- `blocks` — one row per placed block (`id`, `type`, `x`, `y`, `z`)
- `boxes` — Magic Delivery Box contents
- `meta` — settings, last-saved timestamp

Saves are debounced full-world writes (clear + bulkAdd in one transaction). At this world
size a full write is a few milliseconds; incremental diffing would be complexity with no
payoff. A change counter guards the save indicator: a save that finished while newer
changes were pending may not report "saved" (see `gameStore.ts`).

## Consequences

- Worlds are per-browser, per-device. Moving them is what export/import is for
  (ADR-0004). The README and in-game copy say this plainly.
- Private windows and locked-down browsers can block IndexedDB. The game catches this,
  keeps running in memory, and shows a friendly warning instead of breaking.
- Clearing site data deletes the world. Again: export exists and reset dialogs offer it.
- Tests use `fake-indexeddb` in jsdom and real IndexedDB in Playwright.
