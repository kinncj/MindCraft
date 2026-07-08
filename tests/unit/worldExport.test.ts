import { describe, expect, it } from 'vitest';
import { buildWorldExport, exportFileName } from '../../src/importExport/exportWorld';
import { EXPORT_SCHEMA_VERSION } from '../../src/importExport/exportTypes';
import { WORLD_SIZE } from '../../src/game/engine/world';
import { validateWorldImport } from '../../src/importExport/validateWorldImport';

const input = {
  worldId: 'w1',
  worldName: 'Castle Land',
  size: WORLD_SIZE,
  blocks: [
    { id: 'a', type: 'grass' as const, position: { x: 0, y: 0, z: 0 } },
    { id: 'b', type: 'brick' as const, position: { x: 1, y: 1, z: 1 } },
  ],
  boxes: [
    {
      id: 'box-1',
      name: 'Magic Delivery Box',
      position: { x: 2, y: 1, z: 2 },
      items: [{ blockType: 'star' as const, quantity: 2 }],
    },
  ],
  selectedBlockType: 'brick',
  exportedAt: new Date('2026-07-08T12:00:00Z'),
};

describe('buildWorldExport', () => {
  it('produces a versioned, complete export', () => {
    const data = buildWorldExport(input);
    expect(data.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(data.exportedAt).toBe('2026-07-08T12:00:00.000Z');
    expect(data.world.name).toBe('Castle Land');
    expect(data.world.blocks).toHaveLength(2);
    expect(data.magicDeliveryBoxes[0].items[0]).toEqual({ blockType: 'star', quantity: 2 });
    expect(data.inventory.selectedBlockType).toBe('brick');
  });

  it('survives a JSON round trip', () => {
    const data = buildWorldExport(input);
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });

  it('exports something its own importer accepts', () => {
    const data = buildWorldExport(input);
    const result = validateWorldImport(JSON.parse(JSON.stringify(data)));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blocks).toHaveLength(2);
      expect(result.boxes).toHaveLength(1);
      expect(result.worldName).toBe('Castle Land');
    }
  });
});

describe('exportFileName', () => {
  it('slugs the world name and stamps the date', () => {
    expect(exportFileName('Castle Land!', new Date('2026-07-08T12:00:00Z'))).toBe(
      'mindcraft-world-castle-land-2026-07-08.json',
    );
  });

  it('falls back to a plain name for unusable world names', () => {
    expect(exportFileName('***', new Date('2026-07-08T12:00:00Z'))).toBe(
      'mindcraft-world-2026-07-08.json',
    );
  });
});
