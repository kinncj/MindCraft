import { isKnownBlockType } from '../game/engine/blockRegistry';
import { WORLD_SIZE, isInsideWorld } from '../game/engine/world';
import type { MagicDeliveryBox, PlacedBlock } from '../types/game';
import { EXPORT_SCHEMA_VERSION } from './exportTypes';

// 10 MB is far beyond any real MindCraft world (a full 32x32x16 world with
// generous ids is under 2 MB). Anything bigger is not one of our files.
export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024;

export type ImportValidationResult =
  | {
      ok: true;
      worldName: string;
      blocks: PlacedBlock[];
      boxes: MagicDeliveryBox[];
      selectedBlockType: string | null;
      skippedBlocks: number;
      warnings: string[];
    }
  | {
      ok: false;
      error: string;
    };

const NOT_A_WORLD = 'That file does not look like a MindCraft world.';
const NEWER_VERSION = 'This world was made with a newer version of MindCraft.';
const TOO_LARGE = 'That file is too large to import safely.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeQuantity(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parsePosition(value: unknown): { x: number; y: number; z: number } | null {
  if (!isRecord(value)) return null;
  const { x, y, z } = value;
  if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return null;
  return { x, y, z };
}

export function validateImportSize(byteLength: number): string | null {
  return byteLength > MAX_IMPORT_FILE_BYTES ? TOO_LARGE : null;
}

/**
 * Validates raw parsed JSON as a MindCraft world file.
 *
 * The file is treated as data only: unknown block types are skipped,
 * out-of-bounds positions are skipped, bad quantities are skipped,
 * and nothing in the file is executed or fetched.
 */
export function validateWorldImport(raw: unknown): ImportValidationResult {
  if (!isRecord(raw)) return { ok: false, error: NOT_A_WORLD };

  if (typeof raw.schemaVersion !== 'number') return { ok: false, error: NOT_A_WORLD };
  if (raw.schemaVersion > EXPORT_SCHEMA_VERSION) return { ok: false, error: NEWER_VERSION };
  if (raw.schemaVersion < 1) return { ok: false, error: NOT_A_WORLD };

  if (!isRecord(raw.world) || !Array.isArray(raw.world.blocks)) {
    return { ok: false, error: NOT_A_WORLD };
  }

  const warnings: string[] = [];
  const worldName =
    typeof raw.world.name === 'string' && raw.world.name.trim().length > 0
      ? raw.world.name.slice(0, 60)
      : 'Imported World';

  const blocks: PlacedBlock[] = [];
  const usedPositions = new Set<string>();
  let skippedBlocks = 0;

  for (const entry of raw.world.blocks) {
    if (!isRecord(entry)) {
      skippedBlocks += 1;
      continue;
    }
    const position = parsePosition(entry.position);
    if (
      !isKnownBlockType(entry.type) ||
      position === null ||
      !isInsideWorld(position, WORLD_SIZE)
    ) {
      skippedBlocks += 1;
      continue;
    }
    const key = `${position.x},${position.y},${position.z}`;
    if (usedPositions.has(key)) {
      skippedBlocks += 1;
      continue;
    }
    usedPositions.add(key);
    blocks.push({
      id: typeof entry.id === 'string' && entry.id.length > 0 ? entry.id.slice(0, 64) : key,
      type: entry.type,
      position,
    });
  }

  if (blocks.length === 0) {
    return { ok: false, error: NOT_A_WORLD };
  }

  if (skippedBlocks > 0) {
    warnings.push('Some blocks could not be imported because they were unknown.');
  }

  const boxes: MagicDeliveryBox[] = [];
  const rawBoxes = Array.isArray(raw.magicDeliveryBoxes) ? raw.magicDeliveryBoxes : [];
  for (const entry of rawBoxes) {
    if (!isRecord(entry)) continue;
    const position = parsePosition(entry.position);
    if (position === null || !isInsideWorld(position, WORLD_SIZE)) continue;
    const items: MagicDeliveryBox['items'] = [];
    if (Array.isArray(entry.items)) {
      for (const item of entry.items) {
        if (isRecord(item) && isKnownBlockType(item.blockType) && isSafeQuantity(item.quantity)) {
          items.push({ blockType: item.blockType, quantity: item.quantity });
        }
      }
    }
    boxes.push({
      id:
        typeof entry.id === 'string' && entry.id.length > 0
          ? entry.id.slice(0, 64)
          : `box-${position.x}-${position.y}-${position.z}`,
      name:
        typeof entry.name === 'string' && entry.name.trim().length > 0
          ? entry.name.slice(0, 60)
          : 'Magic Delivery Box',
      position,
      items,
    });
  }

  const inventory = isRecord(raw.inventory) ? raw.inventory : {};
  const selectedBlockType = isKnownBlockType(inventory.selectedBlockType)
    ? inventory.selectedBlockType
    : null;

  return { ok: true, worldName, blocks, boxes, selectedBlockType, skippedBlocks, warnings };
}

/** Parses text into a validated world, with friendly errors for bad JSON. */
export function parseWorldImportFile(text: string): ImportValidationResult {
  const sizeError = validateImportSize(new Blob([text]).size);
  if (sizeError) return { ok: false, error: sizeError };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: NOT_A_WORLD };
  }
  return validateWorldImport(parsed);
}
