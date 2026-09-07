import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { Chunk } from '../../src/engine/world/Chunk';
import { localIndex } from '../../src/engine/world/coords';
import { createDatabase } from '../../src/storage/db';
import { LEGACY_SURFACE_Y, WorldStore } from '../../src/storage/worldStore';
import { normalizeSettings, DEFAULT_SETTINGS } from '../../src/storage/settingsRepository';

let counter = 0;
function fresh() {
  counter += 1;
  const db = createDatabase(`mindcraft-test-${counter}`);
  return { db, store: new WorldStore(db) };
}

describe('WorldStore', () => {
  it('saves and loads an edited chunk with its box contents', async () => {
    const { store } = fresh();
    await store.putWorld({
      id: 'w1', name: 'W', seed: 1, generator: { kind: 'infinite' }, createdAt: 'a', updatedAt: 'a',
      spawn: { x: 0, y: 0, z: 0 }, settings: { ...DEFAULT_SETTINGS }, palette: blocks.toPalette(),
    });
    const chunk = new Chunk(-2, 3);
    chunk.set(1, 2, 3, B.brick);
    chunk.set(0, 0, 0, B.planks_slab, 4);
    chunk.setEntity(1, 2, 3, { kind: 'container', data: { name: 'Box', items: [{ blockType: 'star', quantity: 1 }] } });
    await store.saveChunk('w1', chunk);
    const loaded = await store.loadChunk('w1', -2, 3);
    expect(loaded).not.toBeNull();
    expect(loaded!.blocks[localIndex(1, 2, 3)]).toBe(B.brick);
    expect(loaded!.states[localIndex(0, 0, 0)]).toBe(4);
    expect(loaded!.entities[0].data.name).toBe('Box');
    expect(await store.loadChunk('w1', 0, 0)).toBeNull();
    expect(await store.chunkCount('w1')).toBe(1);
  });

  it('lists worlds newest first and deletes a world with its chunks', async () => {
    const { store } = fresh();
    const base = { seed: 1, generator: { kind: 'infinite' as const }, spawn: { x: 0, y: 0, z: 0 }, settings: { ...DEFAULT_SETTINGS }, palette: {} };
    await store.putWorld({ id: 'old', name: 'Old', createdAt: '2026-01-01', updatedAt: '2026-01-01', ...base });
    await store.putWorld({ id: 'new', name: 'New', createdAt: '2026-02-01', updatedAt: '2026-02-01', ...base });
    await store.saveChunk('old', new Chunk(0, 0));
    expect((await store.listWorlds()).map((w) => w.id)).toEqual(['new', 'old']);
    await store.deleteWorld('old');
    expect((await store.listWorlds()).map((w) => w.id)).toEqual(['new']);
    expect(await store.chunkCount('old')).toBe(0);
  });

  it('migrates a v1 database into a flat world holding the old blocks verbatim', async () => {
    const { db, store } = fresh();
    await db.blocks.bulkAdd([
      { id: 'a', type: 'grass', x: 10, y: 4, z: 10 },
      { id: 'b', type: 'magic-box', x: 32, y: 5, z: 32 },
      { id: 'c', type: 'flower', x: 63, y: 6, z: 63 },
    ]);
    await db.boxes.add({ id: 'box', name: 'Old Box', x: 32, y: 5, z: 32, items: [{ blockType: 'star', quantity: 3 }] });
    await db.meta.put({ key: 'settings', value: { worldName: 'Kid World', selectedBlockType: 'brick', visualMode: 'claudeDream', timeMode: 'night', weather: 'snow' } });

    const world = await store.migrateLegacy();
    expect(world).not.toBeNull();
    expect(world!.name).toBe('Kid World');
    expect(world!.generator).toEqual({ kind: 'flat', surfaceY: LEGACY_SURFACE_Y });
    expect(world!.settings.selectedBlockType).toBe('brick');
    expect(world!.settings.visualMode).toBe('claudeDream');
    expect(world!.settings.weather).toBe('snow');

    const c0 = await store.loadChunk(world!.id, 0, 0);
    expect(c0!.blocks[localIndex(10, 4, 10)]).toBe(B.grass);
    // Inside the old footprint nothing else was filled in (no floating dirt).
    expect(c0!.blocks[localIndex(11, 4, 11)]).toBe(0);
    const c2 = await store.loadChunk(world!.id, 2, 2);
    expect(c2!.blocks[localIndex(0, 5, 0)]).toBe(B.magic_box);
    expect(c2!.entities[0].data.name).toBe('Old Box');
    const c3 = await store.loadChunk(world!.id, 3, 3);
    expect(c3!.blocks[localIndex(15, 6, 15)]).toBe(B.flower_pink);

    // Old tables are gone; running again is a no-op.
    expect(await db.blocks.count()).toBe(0);
    expect(await store.migrateLegacy()).toBeNull();
    expect((await store.listWorlds()).length).toBe(1);
  });
});

describe('settings normalization', () => {
  it('falls back to defaults for unknown values and short hotbars', () => {
    const isBlock = (id: unknown) => blocks.has(id);
    const out = normalizeSettings({ selectedBlockType: 'lava', hotbar: ['grass', 'nope'], visualMode: 'noir' as never, timeMode: 'spooky' as never, weather: 'meteor' as never }, isBlock);
    expect(out).toEqual(DEFAULT_SETTINGS);
    const good = normalizeSettings({ selectedBlockType: 'star', hotbar: ['grass', 'dirt', 'stone', 'sand', 'snow', 'ice', 'clay', 'moss', 'brick'], visualMode: 'ultraRealistic', timeMode: 'day', weather: 'rain' }, isBlock);
    expect(good.selectedBlockType).toBe('star');
    expect(good.hotbar[8]).toBe('brick');
    expect(good.visualMode).toBe('ultraRealistic');
  });
});

describe('storage versions', () => {
  it('stamps the storage version and remembers a v1 migration', async () => {
    const { db, store } = fresh();
    const first = await store.storageInfo();
    expect(first.storageVersion).toBe(2);
    expect(first.migratedFromV1At).toBeUndefined();
    await db.blocks.add({ id: 'a', type: 'grass', x: 1, y: 1, z: 1 });
    await store.migrateLegacy();
    const after = await store.storageInfo();
    expect(after.migratedFromV1At).toBeTruthy();
    expect(after.firstSeenAt).toBe(after.migratedFromV1At);
    expect(after.appVersion).toBe('2.0.0');
  });
});
