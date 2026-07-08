# ADR-0004: World export/import format and versioning

**Status:** accepted

## Context

Worlds live in one browser's IndexedDB (ADR-0002). Kids switch computers, browsers get
reset, parents want backups. With no backend, the escape hatch is a local file.

## Decision

Export is a single human-readable JSON file, `mindcraft-world-<name>-<YYYY-MM-DD>.json`,
typed as `MindCraftWorldExport` in `src/importExport/exportTypes.ts`:

```
schemaVersion        1 (bumped on breaking shape changes)
appVersion           app version that wrote the file
exportedAt           ISO timestamp
world                id, name, size, blocks[{id, type, position}]
inventory            selectedBlockType
magicDeliveryBoxes   [{id, name, position, items[{blockType, quantity}]}]
player? settings?    reserved, optional
```

### Versioning rules

- Readers accept `schemaVersion <= 1` and reject newer files with "This world was made
  with a newer version of MindCraft."
- Additive optional fields do not bump the version; shape changes do
- A future version 2 reader must keep a version 1 migration path

### Import safety rules (implemented in `validateWorldImport.ts`)

The file is data, never code. Concretely:

- Files over 10 MB are rejected before parsing
- Malformed JSON gets a friendly rejection
- Block types are checked against the block registry; unknown types are skipped and the
  player is told some blocks could not be imported
- Positions are bounds-checked against the world size; out-of-bounds and non-integer
  positions are skipped; duplicate positions keep the first block
- Quantities must be non-negative safe integers
- Nothing is fetched: no URLs, images, or scripts are honored from the file
- A world with zero usable blocks is rejected rather than imported empty
- Importing always asks first and offers to export the current world

## Consequences

- Round trip is exact for valid data: `export → import` restores blocks, box contents,
  and the selected block (there is a test asserting the importer accepts the exporter's
  output)
- Skipping instead of rejecting unknown data means old app versions can open newer files
  in a degraded way only when the schema version still matches; a real shape change must
  bump the version
- The format is documented for humans in `docs/operations/world-export-import.md`
