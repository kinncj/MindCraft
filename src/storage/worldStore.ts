import { blocks as registry, resolveBlockId } from '../engine/blocks/blocks';
import type { Chunk } from '../engine/world/Chunk';
import type { ChunkStorage, StoredChunkData } from '../engine/world/ChunkManager';
import { CHUNK_SIZE, WORLD_HEIGHT, localIndex, toChunkCoord, toLocal } from '../engine/world/coords';
import { remapIds, rleDecode16, rleDecode8, rleEncode } from './chunkCodec';
import { STORAGE_VERSION, type MindCraftDatabase, type StorageInfo, type StoredChunk, type StoredWorld } from './db';
import { APP_VERSION } from '../importExport/exportWorld';
import { DEFAULT_SETTINGS } from './settingsRepository';

export const LEGACY_SURFACE_Y = 4;

/**
 * World rows and chunk rows in IndexedDB. Also owns the v1 → v2
 * migration: the old single world becomes a flat world whose chunks hold
 * the old blocks verbatim.
 */
export class WorldStore {
  constructor(private db: MindCraftDatabase) {}

  /** Reads (and stamps) the storage version record. */
  async storageInfo(): Promise<StorageInfo> {
    const row = await this.db.meta.get('storage');
    const now = new Date().toISOString();
    const existing = (row?.value as Partial<StorageInfo> | undefined) ?? {};
    const info: StorageInfo = {
      storageVersion: STORAGE_VERSION,
      appVersion: APP_VERSION,
      migratedFromV1At: existing.migratedFromV1At,
      firstSeenAt: existing.firstSeenAt ?? now,
      lastOpenedAt: now,
    };
    await this.db.meta.put({ key: 'storage', value: info });
    return info;
  }

  async listWorlds(): Promise<StoredWorld[]> {
    return this.db.worlds.orderBy('updatedAt').reverse().toArray();
  }

  async getWorld(id: string): Promise<StoredWorld | undefined> {
    return this.db.worlds.get(id);
  }

  async putWorld(world: StoredWorld): Promise<void> {
    await this.db.worlds.put(world);
  }

  async touchWorld(id: string, patch: Partial<StoredWorld>): Promise<void> {
    await this.db.worlds.update(id, { ...patch, updatedAt: new Date().toISOString() });
  }

  async deleteWorld(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.worlds, this.db.chunks, async () => {
      await this.db.chunks.where('worldId').equals(id).delete();
      await this.db.worlds.delete(id);
    });
  }

  /** The chunk storage adapter the ChunkManager talks to. */
  chunkStorage(worldId: string): ChunkStorage {
    return {
      load: (cx, cz) => this.loadChunk(worldId, cx, cz),
      save: (chunk) => this.saveChunk(worldId, chunk),
    };
  }

  async loadChunk(worldId: string, cx: number, cz: number): Promise<StoredChunkData | null> {
    const row = await this.db.chunks.get(`${worldId}:${cx},${cz}`);
    if (!row) return null;
    const world = await this.db.worlds.get(worldId);
    const palette = world?.palette ?? registry.toPalette();
    const raw = rleDecode16(row.blocks);
    const blocks = remapIds(raw, palette, (id) => resolveBlockId(id)?.numericId);
    return { blocks, states: rleDecode8(row.states), entities: row.entities };
  }

  async saveChunk(worldId: string, chunk: Chunk): Promise<void> {
    const row: StoredChunk = {
      key: `${worldId}:${chunk.cx},${chunk.cz}`,
      worldId,
      cx: chunk.cx,
      cz: chunk.cz,
      blocks: rleEncode(chunk.blocks),
      states: rleEncode(chunk.states),
      entities: [...chunk.entities.entries()].map(([index, e]) => ({ index, kind: e.kind, data: e.data })),
    };
    await this.db.chunks.put(row);
  }

  async chunkCount(worldId: string): Promise<number> {
    return this.db.chunks.where('worldId').equals(worldId).count();
  }

  /**
   * Converts a v1 database (blocks/boxes/meta tables) into a flat world.
   * Idempotent: returns null when there is nothing to migrate.
   */
  async migrateLegacy(): Promise<StoredWorld | null> {
    const legacyBlocks = await this.db.blocks.toArray();
    if (legacyBlocks.length === 0) return null;
    const legacyBoxes = await this.db.boxes.toArray();
    const settingsRow = await this.db.meta.get('settings');
    const settings = (settingsRow?.value ?? {}) as Partial<{
      worldName: string;
      selectedBlockType: string;
      visualMode: string;
      timeMode: string;
      weather: string;
    }>;

    const worldId = `world-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const world: StoredWorld = {
      id: worldId,
      name: settings.worldName ?? 'My World',
      seed: 1,
      generator: { kind: 'flat', surfaceY: LEGACY_SURFACE_Y },
      createdAt: now,
      updatedAt: now,
      spawn: { x: 32, y: 5, z: 32 },
      settings: {
        selectedBlockType: resolveBlockId(settings.selectedBlockType ?? '')?.id ?? DEFAULT_SETTINGS.selectedBlockType,
        hotbar: DEFAULT_SETTINGS.hotbar,
        visualMode: (settings.visualMode as StoredWorld['settings']['visualMode']) ?? DEFAULT_SETTINGS.visualMode,
        timeMode: (settings.timeMode as StoredWorld['settings']['timeMode']) ?? DEFAULT_SETTINGS.timeMode,
        weather: (settings.weather as StoredWorld['settings']['weather']) ?? DEFAULT_SETTINGS.weather,
      },
      palette: registry.toPalette(),
    };

    // Group the old blocks into chunks on top of the flat base layers.
    const chunks = new Map<string, { blocks: Uint16Array; states: Uint8Array; entities: StoredChunk['entities'] }>();
    const chunkFor = (x: number, z: number) => {
      const cx = toChunkCoord(x);
      const cz = toChunkCoord(z);
      const key = `${cx},${cz}`;
      let c = chunks.get(key);
      if (!c) {
        c = { blocks: new Uint16Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT), states: new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT), entities: [] };
        // Flat base so nothing floats.
        const deep = registry.numericOf('deep_stone');
        const dirt = registry.numericOf('dirt');
        const grass = registry.numericOf('grass');
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            c.blocks[localIndex(lx, 0, lz)] = deep;
            for (let y = 1; y < LEGACY_SURFACE_Y; y++) c.blocks[localIndex(lx, y, lz)] = dirt;
            c.blocks[localIndex(lx, LEGACY_SURFACE_Y, lz)] = grass;
          }
        }
        chunks.set(key, c);
      }
      return c;
    };
    // Inside the old 64×64 footprint the old blocks replace the base entirely.
    for (let cx = 0; cx < 4; cx++) for (let cz = 0; cz < 4; cz++) {
      const c = chunkFor(cx * CHUNK_SIZE, cz * CHUNK_SIZE);
      c.blocks.fill(0);
      const deep = registry.numericOf('deep_stone');
      for (let lz = 0; lz < CHUNK_SIZE; lz++) for (let lx = 0; lx < CHUNK_SIZE; lx++) c.blocks[localIndex(lx, 0, lz)] = deep;
    }
    for (const b of legacyBlocks) {
      if (b.y < 0 || b.y >= WORLD_HEIGHT) continue;
      const def = resolveBlockId(b.type);
      if (!def) continue;
      const c = chunkFor(b.x, b.z);
      c.blocks[localIndex(toLocal(b.x), b.y, toLocal(b.z))] = def.numericId;
    }
    for (const box of legacyBoxes) {
      const c = chunkFor(box.x, box.z);
      c.entities.push({
        index: localIndex(toLocal(box.x), box.y, toLocal(box.z)),
        kind: 'container',
        data: { name: box.name, items: box.items },
      });
    }

    await this.db.transaction('rw', this.db.worlds, this.db.chunks, this.db.blocks, this.db.boxes, this.db.meta, async () => {
      await this.db.worlds.put(world);
      for (const [key, c] of chunks) {
        const [cx, cz] = key.split(',').map(Number);
        await this.db.chunks.put({
          key: `${worldId}:${key}`,
          worldId,
          cx,
          cz,
          blocks: rleEncode(c.blocks),
          states: rleEncode(c.states),
          entities: c.entities,
        });
      }
      await this.db.blocks.clear();
      await this.db.boxes.clear();
      await this.db.meta.clear();
      await this.db.meta.put({
        key: 'storage',
        value: { storageVersion: STORAGE_VERSION, appVersion: APP_VERSION, migratedFromV1At: now, firstSeenAt: now, lastOpenedAt: now } satisfies StorageInfo,
      });
    });
    return world;
  }
}
