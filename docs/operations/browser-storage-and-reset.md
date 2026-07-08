# Browser storage, autosave, and reset

## Where the world lives

Everything is stored in the browser's IndexedDB, in a database named `mindcraft`:

| Table | Contents |
|---|---|
| `blocks` | every placed block: id, type, x, y, z |
| `boxes` | each Magic Delivery Box: name, position, stored items |
| `meta` | settings (world name, selected block) and the last-saved timestamp |

Nothing ever leaves the computer. There are no accounts and no network calls.

## Autosave

The game saves automatically about half a second after any meaningful change (placing or
removing a block, changing box contents, renaming, picking a block). The indicator in the
top bar shows the truth:

- **Saving…** — a change is waiting to be written
- **Saved on this computer** — the latest change is in IndexedDB
- **Cannot save on this browser** — IndexedDB is blocked (see below)

The indicator is honest under races: a save that started before the newest change is not
allowed to claim "Saved" (there is a change counter guarding it — see `gameStore.ts`).

## When storage is unavailable

Private/incognito windows, strict privacy settings, or corporate policies can block
IndexedDB. The game detects this at startup (or on a failed write), keeps running with
the world in memory, and shows: *"This browser cannot save your world. You can still
build and export it to a file!"* Export still works, because export never touches
IndexedDB.

## Reset

**Reset World** in the top bar:

1. Asks: *"Reset World? This will clear your MindCraft world on this computer."*
2. Offers **Export First** so nothing is lost by accident
3. On confirm: clears all three tables and rebuilds the starter world, which then
   autosaves as the new current world

## What deletes a world

- Reset World (after confirmation)
- Importing another world (after confirmation — replacing is the point)
- Clearing the browser's site data / cookies for the site
- Uninstalling the browser or the OS profile

The defense against all of these is the same: **Export World** makes a JSON backup.

## Limitations

- One world per browser profile. Chrome and Firefox on the same machine hold different
  worlds; so do two OS users.
- Browsers may evict IndexedDB under disk pressure for rarely-visited sites. Realistic
  protection: export now and then.
