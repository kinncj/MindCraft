# Exporting and importing worlds

Worlds are saved in the browser (see `browser-storage-and-reset.md`). Export and import
exist so a world can be backed up, moved to another computer or browser, or shared by
handing someone a file. Everything is local — no upload, no cloud.

## Exporting

**Menu → Export World** downloads a JSON file named like
`mindcraft-world-my-world-2026-09-06.json`. It is a **version 2** file: the world's
name, seed, generator, spawn and player position, settings, the block palette, and
every edited chunk (run-length encoded). Unedited terrain is not in the file because
the seed regenerates it. Any pending starter template is included too.

The format is typed in `src/importExport/exportTypes.ts` and specified in ADR-0004
(as amended by ADR-0006).

## Importing

1. **Menu → Import World**, choose a `.json` file
2. The file is validated locally
3. The game asks "Import this world?" — the imported world is **added** to your worlds
   and opened; nothing is deleted
4. Version 1 files (from MindCraft 1.0) import as a flat world holding the old blocks

## What import rejects, and what it forgives

Rejected with a friendly message: files that aren't JSON or don't have the right
shape, files from a newer MindCraft, files over 50 MB, and v1 files with no usable
blocks.

Forgiven (skipped, with a note): unknown block ids, malformed chunks, out-of-range
positions, box items with bad quantities, unknown block entities.

The file is data only. Nothing in it is executed and no URLs inside it are fetched.
