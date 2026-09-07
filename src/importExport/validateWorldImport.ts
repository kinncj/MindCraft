import { blocks as registry, resolveBlockId } from '../engine/blocks/blocks';
import { CHUNK_SIZE, WORLD_HEIGHT, localIndex, toChunkCoord, toLocal } from '../engine/world/coords';
import { rleEncode } from '../storage/chunkCodec';
import type { StoredChunk, StoredWorld } from '../storage/db';
import { LEGACY_SURFACE_Y } from '../storage/worldStore';
import { isTimeMode, isWeatherMode, normalizeSettings } from '../storage/settingsRepository';
import { isVisualModeId } from '../shaders/visualModes';
import { EXPORT_SCHEMA_VERSION } from './exportTypes';
import { isPresetName } from '../engine/world/generation/maps';

// 50 MB is far beyond any real MindCraft world (an edited chunk is a few KB).
export const MAX_IMPORT_FILE_BYTES = 50 * 1024 * 1024;
const MAX_CHUNKS = 20000;
const MAX_LEGACY_BLOCKS = 500000;

/** A validated world ready to be written to storage. */
export type ImportedWorld = {
  world: StoredWorld;
  chunks: StoredChunk[];
  warnings: string[];
};

export type ImportValidationResult = ({ ok: true } & ImportedWorld) | { ok: false; error: string };

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
  if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) return null;
  return { x, y, z };
}

function newWorldId(): string {
  return `world-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function validateImportSize(byteLength: number): string | null {
  return byteLength > MAX_IMPORT_FILE_BYTES ? TOO_LARGE : null;
}

/** Container items: only known blocks with sane quantities survive. */
function cleanEntity(raw: unknown): { kind: string; data: Record<string, unknown> } | null {
  if (!isRecord(raw) || typeof raw.kind !== 'string') return null;
  if (raw.kind !== 'container') return null;
  const data = isRecord(raw.data) ? raw.data : {};
  const items: Array<{ blockType: string; quantity: number }> = [];
  if (Array.isArray(data.items)) {
    for (const item of data.items) {
      if (!isRecord(item)) continue;
      const def = typeof item.blockType === 'string' ? resolveBlockId(item.blockType) : undefined;
      if (def && isSafeQuantity(item.quantity)) items.push({ blockType: def.id, quantity: item.quantity });
    }
  }
  const name = typeof data.name === 'string' && data.name.trim() ? data.name.slice(0, 60) : 'Magic Delivery Box';
  return { kind: 'container', data: { name, items } };
}

/** Validates an RLE array: pairs of non-negative integers, sane total. */
function cleanRle(raw: unknown, maxValue: number, expectedLength: number): number[] | null {
  if (!Array.isArray(raw) || raw.length % 2 !== 0 || raw.length > expectedLength * 2) return null;
  let total = 0;
  const out: number[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    const value = raw[i];
    const run = raw[i + 1];
    if (!Number.isInteger(value) || !Number.isInteger(run) || value < 0 || value > maxValue || run <= 0) return null;
    total += run;
    if (total > expectedLength) return null;
    out.push(value, run);
  }
  return out;
}

function validateV2(raw: Record<string, unknown>): ImportValidationResult {
  if (!isRecord(raw.world) || !Array.isArray(raw.chunks) || !isRecord(raw.palette)) {
    return { ok: false, error: NOT_A_WORLD };
  }
  if (raw.chunks.length > MAX_CHUNKS) return { ok: false, error: TOO_LARGE };
  const warnings: string[] = [];
  const w = raw.world;
  const name = typeof w.name === 'string' && w.name.trim() ? w.name.slice(0, 60) : 'Imported World';
  const seed = Number.isInteger(w.seed) ? (w.seed as number) : 1;
  const gen = isRecord(w.generator) ? w.generator : {};
  const generator: StoredWorld['generator'] =
    gen.kind === 'flat'
      ? {
          kind: 'flat',
          surfaceY: Number.isInteger(gen.surfaceY) ? Math.max(1, Math.min(WORLD_HEIGHT - 2, gen.surfaceY as number)) : LEGACY_SURFACE_Y,
          ...(isPresetName(gen.preset) ? { preset: gen.preset } : {}),
        }
      : { kind: 'infinite' };
  const spawn = parsePosition(w.spawn) ?? { x: 8, y: 50, z: 8 };
  const playerPos = isRecord(w.player) ? w.player : null;
  const player =
    playerPos && typeof playerPos.x === 'number' && typeof playerPos.y === 'number' && typeof playerPos.z === 'number'
      ? {
          x: playerPos.x,
          y: playerPos.y,
          z: playerPos.z,
          yaw: typeof playerPos.yaw === 'number' ? playerPos.yaw : 0,
          pitch: typeof playerPos.pitch === 'number' ? playerPos.pitch : 0.4,
        }
      : undefined;

  // Palette: only known block ids survive; unknown ids become air.
  const palette: Record<number, string> = {};
  let unknownBlocks = 0;
  for (const [key, value] of Object.entries(raw.palette)) {
    const numeric = Number(key);
    if (!Number.isInteger(numeric) || numeric <= 0 || numeric > 65535 || typeof value !== 'string') continue;
    const def = resolveBlockId(value);
    if (def) palette[numeric] = def.id;
    else unknownBlocks += 1;
  }
  if (unknownBlocks > 0) warnings.push('Some blocks could not be imported because they were unknown.');

  const worldId = newWorldId();
  const chunks: StoredChunk[] = [];
  const seen = new Set<string>();
  const volume = CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT;
  for (const entry of raw.chunks) {
    if (!isRecord(entry) || !Number.isInteger(entry.cx) || !Number.isInteger(entry.cz)) continue;
    const key = `${entry.cx},${entry.cz}`;
    if (seen.has(key)) continue;
    const blocks = cleanRle(entry.blocks, 65535, volume);
    const states = cleanRle(entry.states, 255, volume) ?? [0, volume];
    if (!blocks) continue;
    const entities: StoredChunk['entities'] = [];
    if (Array.isArray(entry.entities)) {
      for (const e of entry.entities) {
        if (!isRecord(e) || !Number.isInteger(e.index) || (e.index as number) < 0 || (e.index as number) >= volume) continue;
        const cleaned = cleanEntity(e);
        if (cleaned) entities.push({ index: e.index as number, ...cleaned });
      }
    }
    seen.add(key);
    chunks.push({ key: `${worldId}:${key}`, worldId, cx: entry.cx as number, cz: entry.cz as number, blocks, states, entities });
  }

  const settingsRaw = isRecord(raw.settings) ? raw.settings : {};
  const settings = normalizeSettings(
    {
      selectedBlockType: resolveBlockId(String(settingsRaw.selectedBlockType ?? ''))?.id,
      hotbar: Array.isArray(settingsRaw.hotbar) ? settingsRaw.hotbar.map((id) => resolveBlockId(String(id))?.id ?? '') : undefined,
      visualMode: isVisualModeId(settingsRaw.visualMode) ? settingsRaw.visualMode : undefined,
      timeMode: isTimeMode(settingsRaw.timeMode) ? settingsRaw.timeMode : undefined,
      weather: isWeatherMode(settingsRaw.weather) ? settingsRaw.weather : undefined,
    },
    (id) => registry.has(id),
  );

  const template: StoredWorld['template'] = [];
  if (Array.isArray(raw.template)) {
    for (const t of raw.template.slice(0, 5000)) {
      if (!isRecord(t)) continue;
      const pos = parsePosition(t);
      const def = typeof t.id === 'string' ? resolveBlockId(t.id) : undefined;
      if (!pos || !def || pos.y < 0 || pos.y >= WORLD_HEIGHT) continue;
      const entity = cleanEntity(t.entity) ?? undefined;
      template.push({ ...pos, id: def.id, state: Number.isInteger(t.state) ? (t.state as number) & 255 : 0, entity });
    }
  }

  const now = new Date().toISOString();
  return {
    ok: true,
    world: {
      id: worldId,
      name,
      seed,
      generator,
      createdAt: now,
      updatedAt: now,
      spawn,
      player,
      settings: { ...settings, timeOfDay: typeof settingsRaw.timeOfDay === 'number' ? settingsRaw.timeOfDay : undefined },
      palette,
      template: template.length > 0 ? template : undefined,
    },
    chunks,
    warnings,
  };
}

/** Converts a list of positioned blocks (v1 style) into flat-world chunks. */
export function chunksFromBlockList(
  worldId: string,
  blocks: Array<{ x: number; y: number; z: number; id: number }>,
  containers: Array<{ x: number; y: number; z: number; name: string; items: Array<{ blockType: string; quantity: number }> }>,
  footprint: { minX: number; maxX: number; minZ: number; maxZ: number },
): StoredChunk[] {
  const volume = CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT;
  const deep = registry.numericOf('deep_stone');
  const dirt = registry.numericOf('dirt');
  const grass = registry.numericOf('grass');
  const map = new Map<string, { blocks: Uint16Array; states: Uint8Array; entities: StoredChunk['entities'] }>();
  const chunkFor = (x: number, z: number, fresh: boolean) => {
    const key = `${toChunkCoord(x)},${toChunkCoord(z)}`;
    let c = map.get(key);
    if (!c) {
      c = { blocks: new Uint16Array(volume), states: new Uint8Array(volume), entities: [] };
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        for (let lx = 0; lx < CHUNK_SIZE; lx++) {
          c.blocks[localIndex(lx, 0, lz)] = deep;
          if (!fresh) {
            for (let y = 1; y < LEGACY_SURFACE_Y; y++) c.blocks[localIndex(lx, y, lz)] = dirt;
            c.blocks[localIndex(lx, LEGACY_SURFACE_Y, lz)] = grass;
          }
        }
      }
      map.set(key, c);
    }
    return c;
  };
  // Every chunk inside the old footprint holds exactly the old blocks.
  for (let cx = toChunkCoord(footprint.minX); cx <= toChunkCoord(footprint.maxX); cx++) {
    for (let cz = toChunkCoord(footprint.minZ); cz <= toChunkCoord(footprint.maxZ); cz++) {
      chunkFor(cx * CHUNK_SIZE, cz * CHUNK_SIZE, true);
    }
  }
  for (const b of blocks) {
    if (b.y < 0 || b.y >= WORLD_HEIGHT) continue;
    const c = chunkFor(b.x, b.z, false);
    c.blocks[localIndex(toLocal(b.x), b.y, toLocal(b.z))] = b.id;
  }
  for (const box of containers) {
    const c = chunkFor(box.x, box.z, false);
    c.entities.push({ index: localIndex(toLocal(box.x), box.y, toLocal(box.z)), kind: 'container', data: { name: box.name, items: box.items } });
  }
  return [...map.entries()].map(([key, c]) => {
    const [cx, cz] = key.split(',').map(Number);
    return { key: `${worldId}:${key}`, worldId, cx, cz, blocks: rleEncode(c.blocks), states: rleEncode(c.states), entities: c.entities };
  });
}

function validateV1(raw: Record<string, unknown>): ImportValidationResult {
  if (!isRecord(raw.world) || !Array.isArray(raw.world.blocks)) return { ok: false, error: NOT_A_WORLD };
  if (raw.world.blocks.length > MAX_LEGACY_BLOCKS) return { ok: false, error: TOO_LARGE };
  const warnings: string[] = [];
  const name = typeof raw.world.name === 'string' && raw.world.name.trim() ? raw.world.name.slice(0, 60) : 'Imported World';

  const blocks: Array<{ x: number; y: number; z: number; id: number }> = [];
  const used = new Set<string>();
  let skipped = 0;
  for (const entry of raw.world.blocks) {
    if (!isRecord(entry)) { skipped += 1; continue; }
    const position = parsePosition(entry.position);
    const def = typeof entry.type === 'string' ? resolveBlockId(entry.type) : undefined;
    if (!position || !def || position.y < 0 || position.y >= WORLD_HEIGHT || Math.abs(position.x) > 4096 || Math.abs(position.z) > 4096) {
      skipped += 1;
      continue;
    }
    const key = `${position.x},${position.y},${position.z}`;
    if (used.has(key)) { skipped += 1; continue; }
    used.add(key);
    blocks.push({ ...position, id: def.numericId });
  }
  if (blocks.length === 0) return { ok: false, error: NOT_A_WORLD };
  if (skipped > 0) warnings.push('Some blocks could not be imported because they were unknown.');

  const containers: Array<{ x: number; y: number; z: number; name: string; items: Array<{ blockType: string; quantity: number }> }> = [];
  const rawBoxes = Array.isArray(raw.magicDeliveryBoxes) ? raw.magicDeliveryBoxes : [];
  for (const entry of rawBoxes) {
    if (!isRecord(entry)) continue;
    const position = parsePosition(entry.position);
    if (!position || position.y < 0 || position.y >= WORLD_HEIGHT) continue;
    const cleaned = cleanEntity({ kind: 'container', data: { name: entry.name, items: entry.items } });
    if (!cleaned) continue;
    containers.push({ ...position, name: cleaned.data.name as string, items: cleaned.data.items as Array<{ blockType: string; quantity: number }> });
  }

  const inventory = isRecord(raw.inventory) ? raw.inventory : {};
  const rawVisual = isRecord(raw.visualMode) ? raw.visualMode : {};
  const rawSettings = isRecord(raw.settings) ? raw.settings : {};
  const settings = normalizeSettings(
    {
      selectedBlockType: resolveBlockId(String(inventory.selectedBlockType ?? ''))?.id,
      visualMode: isVisualModeId(rawVisual.selectedMode) ? rawVisual.selectedMode : undefined,
      timeMode: isTimeMode(rawSettings.timeMode) ? rawSettings.timeMode : undefined,
      weather: isWeatherMode(rawSettings.weather) ? rawSettings.weather : undefined,
    },
    (id) => registry.has(id),
  );

  const worldId = newWorldId();
  const xs = blocks.map((b) => b.x);
  const zs = blocks.map((b) => b.z);
  const footprint = { minX: Math.min(...xs), maxX: Math.max(...xs), minZ: Math.min(...zs), maxZ: Math.max(...zs) };
  const chunks = chunksFromBlockList(worldId, blocks, containers, footprint);
  const now = new Date().toISOString();
  return {
    ok: true,
    world: {
      id: worldId,
      name,
      seed: 1,
      generator: { kind: 'flat', surfaceY: LEGACY_SURFACE_Y },
      createdAt: now,
      updatedAt: now,
      spawn: { x: 32, y: LEGACY_SURFACE_Y + 1, z: 32 },
      settings,
      palette: registry.toPalette(),
    },
    chunks,
    warnings,
  };
}

/**
 * Validates raw parsed JSON as a MindCraft world file. The file is data
 * only: unknown blocks are dropped, positions are checked, quantities are
 * validated, nothing is executed or fetched.
 */
export function validateWorldImport(raw: unknown): ImportValidationResult {
  if (!isRecord(raw)) return { ok: false, error: NOT_A_WORLD };
  if (typeof raw.schemaVersion !== 'number') return { ok: false, error: NOT_A_WORLD };
  if (raw.schemaVersion > EXPORT_SCHEMA_VERSION) return { ok: false, error: NEWER_VERSION };
  if (raw.schemaVersion === 2) return validateV2(raw);
  if (raw.schemaVersion === 1) return validateV1(raw);
  return { ok: false, error: NOT_A_WORLD };
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
