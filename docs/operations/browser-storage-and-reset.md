# Browser storage, autosave, worlds, and reset

## Where the world lives

Everything is stored in the browser's IndexedDB, in a database named `mindcraft`
(storage version 2):

| Table | Contents |
|---|---|
| `worlds` | one row per world: name, seed, generator, spawn, player position, settings (selected block, hotbar, visual mode, time, weather), block palette, pending template |
| `chunks` | one row per **edited** chunk: run-length-encoded block ids and states, plus block entities (box contents) |
| `meta` | the `storage` record: storage version, app version, when a v1 save was migrated |
| `blocks`, `boxes` | the v1 tables, emptied after migration and kept only so old databases open |

Unedited chunks are never stored: terrain is deterministic per seed and regenerates.
That is what keeps an infinite world's save small.

Nothing ever leaves the computer. There are no accounts and no network calls.

## Autosave

About half a second after any change, every edited chunk is written and the world
row is updated. The indicator in the top bar shows the truth:

- **Saving…** — a change is waiting to be written
- **Saved on this computer** — the latest change is in IndexedDB
- **Cannot save on this browser** — IndexedDB is blocked (see below)

A save that started before the newest change is not allowed to claim "Saved". Chunks
that scroll out of view are saved before they unload, and pending saves flush when the
tab hides or closes.

## Version 1 saves

MindCraft 1.0 stored one 64×64 world in the `blocks`/`boxes`/`meta` tables. On first
launch of 2.0 that world is converted into a **flat** world holding the old blocks
verbatim, with the old box contents and settings, and the old tables are emptied. A
toast says "Your old world moved into the new MindCraft!". The `storage` meta record
remembers when the migration happened.

## When storage is unavailable

Private windows and locked-down browsers can block IndexedDB. The game detects this,
keeps running in memory, and shows a warning. Export still works and reads the world
straight from memory.

## Worlds

**Menu → My worlds** lists every world. Open one, make a new meadow or Toy Land, or
delete one after confirming. Import adds a world; it never replaces one.

## Reset

**Reset World** and **Start as Toy Land** in the menu replace the *current* world with
a fresh one after a confirmation that offers **Export First**.

## What deletes a world

- Reset World / Start as Toy Land (after confirmation)
- Deleting it in My worlds (after confirmation)
- Clearing the browser's site data for the site

The defense against all of these is the same: **Export World** makes a JSON backup.
