# Exporting and importing worlds

Worlds are saved in the browser (see `browser-storage-and-reset.md`). Export and import
exist so a world can be backed up, moved to another computer or browser, or shared by
handing someone a file. Everything is local — no upload, no cloud.

## Exporting

Click **💾 Export World**. The browser downloads a JSON file named like:

```
mindcraft-world-my-world-2026-07-08.json
```

The file contains the schema version, when it was exported, the app version, the world
name and size, every placed block, the Magic Delivery Box contents, and the currently
selected block. It is plain, human-readable JSON — open it in a text editor if you're
curious. It contains no accounts, passwords, or online data.

The full format is typed in `src/importExport/exportTypes.ts` and specified in
`docs/architecture/adr-0004-world-export-import-format.md`.

## Importing

1. Click **📂 Import World** and choose a previously exported `.json` file
2. The file is read and validated locally in the browser
3. If it's valid, the game asks: *"Import this world? This will replace the world saved
   on this computer."* — with buttons **Import World**, **Cancel**, and
   **Export Current World First**
4. On confirm, the world, box contents, and selected block are restored and autosaved

Importing **replaces** the currently saved world. Export the current one first if you
want to keep it — the confirmation dialog has a button for exactly that.

## What import rejects, and what it forgives

Rejected with a friendly message:

- Files that aren't JSON or don't have the right shape — *"That file does not look like
  a MindCraft world."*
- Files written by a newer MindCraft (`schemaVersion` too high)
- Files over 10 MB
- Files with no usable blocks at all

Forgiven (skipped, with a note):

- Unknown block types — *"Some blocks could not be imported because they were unknown."*
- Blocks outside the world bounds, non-integer positions, duplicate positions
- Box items with negative, fractional, or unsafe quantities

The imported file is treated purely as data. Nothing in it is executed, and no URLs
inside it are ever fetched.
