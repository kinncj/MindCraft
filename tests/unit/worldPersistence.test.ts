import { describe, expect, it } from 'vitest';
import { createDatabase } from '../../src/storage/db';
import { WorldRepository } from '../../src/storage/worldRepository';
import { SettingsRepository, DEFAULT_SETTINGS } from '../../src/storage/settingsRepository';
import type { MagicDeliveryBox, PlacedBlock } from '../../src/types/game';

let dbCounter = 0;

function freshRepo() {
  dbCounter += 1;
  const db = createDatabase(`mindcraft-test-${dbCounter}`);
  return { world: new WorldRepository(db), settings: new SettingsRepository(db) };
}

const sampleBlocks: PlacedBlock[] = [
  { id: 'a', type: 'grass', position: { x: 0, y: 0, z: 0 } },
  { id: 'b', type: 'star', position: { x: 5, y: 1, z: 5 } },
];

const sampleBoxes: MagicDeliveryBox[] = [
  {
    id: 'box-1',
    name: 'Magic Delivery Box',
    position: { x: 3, y: 1, z: 3 },
    items: [{ blockType: 'rainbow', quantity: 4 }],
  },
];

describe('WorldRepository', () => {
  it('saves and reloads blocks and boxes', async () => {
    const { world } = freshRepo();
    await world.saveWorld(sampleBlocks, sampleBoxes);
    const loaded = await world.loadWorld();
    expect(loaded).not.toBeNull();
    expect(loaded!.blocks).toHaveLength(2);
    expect(loaded!.blocks.find((b) => b.id === 'b')?.type).toBe('star');
    expect(loaded!.boxes[0].items[0]).toEqual({ blockType: 'rainbow', quantity: 4 });
  });

  it('returns null when nothing was ever saved', async () => {
    const { world } = freshRepo();
    expect(await world.loadWorld()).toBeNull();
  });

  it('records a last-saved timestamp', async () => {
    const { world } = freshRepo();
    await world.saveWorld(sampleBlocks, []);
    const stamp = await world.getLastSavedAt();
    expect(stamp).toBeTruthy();
    expect(Number.isNaN(Date.parse(stamp!))).toBe(false);
  });

  it('clears the world so the next load starts fresh', async () => {
    const { world } = freshRepo();
    await world.saveWorld(sampleBlocks, sampleBoxes);
    await world.clearWorld();
    expect(await world.loadWorld()).toBeNull();
    expect(await world.getLastSavedAt()).toBeNull();
  });

  it('overwrites the previous save instead of appending', async () => {
    const { world } = freshRepo();
    await world.saveWorld(sampleBlocks, sampleBoxes);
    await world.saveWorld([sampleBlocks[0]], []);
    const loaded = await world.loadWorld();
    expect(loaded!.blocks).toHaveLength(1);
    expect(loaded!.boxes).toHaveLength(0);
  });
});

describe('SettingsRepository', () => {
  it('returns defaults when nothing is saved', async () => {
    const { settings } = freshRepo();
    expect(await settings.loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips settings', async () => {
    const { settings } = freshRepo();
    await settings.saveSettings({
      ...DEFAULT_SETTINGS,
      worldName: 'Rainbow Land',
      selectedBlockType: 'star',
      visualMode: 'claudeDream',
      timeMode: 'night',
      weather: 'snow',
    });
    const loaded = await settings.loadSettings();
    expect(loaded.worldName).toBe('Rainbow Land');
    expect(loaded.selectedBlockType).toBe('star');
    expect(loaded.visualMode).toBe('claudeDream');
    expect(loaded.timeMode).toBe('night');
    expect(loaded.weather).toBe('snow');
  });

  it('falls back to defaults for unknown values', async () => {
    const { settings } = freshRepo();
    await settings.saveSettings({
      ...DEFAULT_SETTINGS,
      worldName: 'X',
      // Simulates an old or hand-edited save.
      selectedBlockType: 'lava' as never,
      visualMode: 'noir' as never,
      timeMode: 'spooky' as never,
      weather: 'hurricane' as never,
    });
    const loaded = await settings.loadSettings();
    expect(loaded.selectedBlockType).toBe(DEFAULT_SETTINGS.selectedBlockType);
    expect(loaded.visualMode).toBe(DEFAULT_SETTINGS.visualMode);
    expect(loaded.timeMode).toBe(DEFAULT_SETTINGS.timeMode);
    expect(loaded.weather).toBe(DEFAULT_SETTINGS.weather);
  });
});
