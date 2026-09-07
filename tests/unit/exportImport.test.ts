import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { Chunk } from '../../src/engine/world/Chunk';
import { localIndex } from '../../src/engine/world/coords';
import { buildWorldExport, exportFileName } from '../../src/importExport/exportWorld';
import { EXPORT_SCHEMA_VERSION } from '../../src/importExport/exportTypes';
import { MAX_IMPORT_FILE_BYTES, parseWorldImportFile, validateWorldImport } from '../../src/importExport/validateWorldImport';
import { rleDecode16, rleEncode } from '../../src/storage/chunkCodec';
import type { StoredChunk, StoredWorld } from '../../src/storage/db';
import { DEFAULT_SETTINGS } from '../../src/storage/settingsRepository';

function sampleWorld(): { world: StoredWorld; chunks: StoredChunk[] } {
  const world: StoredWorld = {
    id: 'w1', name: 'Castle Land', seed: 99, generator: { kind: 'infinite' }, createdAt: 'a', updatedAt: 'a',
    spawn: { x: 8, y: 50, z: 8 }, player: { x: 9, y: 50, z: 9, yaw: 1, pitch: 0.2 },
    settings: { ...DEFAULT_SETTINGS, selectedBlockType: 'brick', visualMode: 'claudeDream', timeMode: 'night', weather: 'snow' },
    palette: blocks.toPalette(),
    template: [{ x: 1, y: 2, z: 3, id: 'star' }],
  };
  const chunk = new Chunk(0, 0);
  chunk.set(1, 1, 1, B.brick);
  chunk.set(2, 2, 2, B.magic_box);
  const chunks: StoredChunk[] = [{
    key: 'w1:0,0', worldId: 'w1', cx: 0, cz: 0, blocks: rleEncode(chunk.blocks), states: rleEncode(chunk.states),
    entities: [{ index: localIndex(2, 2, 2), kind: 'container', data: { name: 'Treasure', items: [{ blockType: 'star', quantity: 2 }] } }],
  }];
  return { world, chunks };
}

function v1File() {
  return {
    schemaVersion: 1,
    appVersion: '1.0.0',
    exportedAt: '2026-07-08T12:00:00.000Z',
    world: {
      id: 'w1', name: 'Test World', size: { width: 64, depth: 64, height: 32 },
      blocks: [
        { id: 'a', type: 'grass', position: { x: 0, y: 0, z: 0 } },
        { id: 'b', type: 'star', position: { x: 3, y: 2, z: 3 } },
        { id: 'c', type: 'magic-box', position: { x: 5, y: 1, z: 5 } },
      ],
    },
    inventory: { selectedBlockType: 'star' },
    visualMode: { selectedMode: 'ultraRealistic' },
    settings: { timeMode: 'night', weather: 'rain' },
    magicDeliveryBoxes: [{ id: 'box-1', name: 'My Box', position: { x: 5, y: 1, z: 5 }, items: [{ blockType: 'rainbow', quantity: 3 }, { blockType: 'sword', quantity: 1 }, { blockType: 'rainbow', quantity: -2 }] }],
  };
}

describe('export v2', () => {
  it('produces a versioned export its own importer accepts, exactly', () => {
    const { world, chunks } = sampleWorld();
    const data = buildWorldExport(world, chunks, new Date('2026-09-06T12:00:00Z'));
    expect(data.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(data.exportedAt).toBe('2026-09-06T12:00:00.000Z');
    expect(data.chunks).toHaveLength(1);
    expect(data.template).toHaveLength(1);
    const result = validateWorldImport(JSON.parse(JSON.stringify(data)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.world.name).toBe('Castle Land');
    expect(result.world.seed).toBe(99);
    expect(result.world.generator.kind).toBe('infinite');
    expect(result.world.settings.selectedBlockType).toBe('brick');
    expect(result.world.settings.visualMode).toBe('claudeDream');
    expect(result.world.settings.weather).toBe('snow');
    expect(result.world.player?.yaw).toBe(1);
    expect(result.world.template?.[0].id).toBe('star');
    expect(result.chunks).toHaveLength(1);
    const decoded = rleDecode16(result.chunks[0].blocks);
    expect(decoded[localIndex(1, 1, 1)]).toBe(B.brick);
    expect(result.chunks[0].entities[0].data).toEqual({ name: 'Treasure', items: [{ blockType: 'star', quantity: 2 }] });
    expect(result.chunks[0].worldId).toBe(result.world.id);
    expect(result.world.id).not.toBe('w1'); // imported worlds get a fresh id
  });

  it('names files from the world name', () => {
    expect(exportFileName('Castle Land!', new Date('2026-07-08T12:00:00Z'))).toBe('mindcraft-world-castle-land-2026-07-08.json');
    expect(exportFileName('***', new Date('2026-07-08T12:00:00Z'))).toBe('mindcraft-world-2026-07-08.json');
  });
});

describe('import validation', () => {
  it('rejects things that are not worlds, and newer schemas', () => {
    for (const junk of [null, 42, 'hello', [], {}, { schemaVersion: 'x' }, { schemaVersion: 2, world: {} }]) {
      const result = validateWorldImport(junk);
      expect(result.ok).toBe(false);
    }
    const newer = validateWorldImport({ schemaVersion: 99 });
    expect(newer.ok).toBe(false);
    if (!newer.ok) expect(newer.error).toBe('This world was made with a newer version of MindCraft.');
  });

  it('drops unknown palette entries and malformed chunks, keeping the rest', () => {
    const { world, chunks } = sampleWorld();
    const data = JSON.parse(JSON.stringify(buildWorldExport(world, chunks)));
    data.palette['999'] = 'tnt';
    data.chunks.push({ cx: 'x', cz: 1 });
    data.chunks.push({ cx: 1, cz: 1, blocks: [1, -5] });
    data.chunks.push({ cx: 1, cz: 1, blocks: [1, 999999999] });
    data.chunks[0].entities.push({ index: -1, kind: 'container', data: {} });
    data.chunks[0].entities.push({ index: 5, kind: 'evil', data: { script: 'alert(1)' } });
    const result = validateWorldImport(data);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings[0]).toMatch(/unknown/);
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].entities).toHaveLength(1);
    expect(result.world.palette[999]).toBeUndefined();
  });

  it('imports a v1 world as a flat world with the old blocks and boxes', () => {
    const result = validateWorldImport(v1File());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.world.generator.kind).toBe('flat');
    expect(result.world.name).toBe('Test World');
    expect(result.world.settings.selectedBlockType).toBe('star');
    expect(result.world.settings.visualMode).toBe('ultraRealistic');
    expect(result.world.settings.timeMode).toBe('night');
    expect(result.world.settings.weather).toBe('rain');
    const chunk = result.chunks.find((c) => c.cx === 0 && c.cz === 0)!;
    const decoded = rleDecode16(chunk.blocks);
    expect(decoded[localIndex(0, 0, 0)]).toBe(B.grass);
    expect(decoded[localIndex(3, 2, 3)]).toBe(B.star);
    expect(decoded[localIndex(5, 1, 5)]).toBe(B.magic_box);
    expect(chunk.entities[0].data).toEqual({ name: 'My Box', items: [{ blockType: 'rainbow', quantity: 3 }] });
  });

  it('skips unknown, out-of-range, and duplicate v1 blocks with a warning, rejects empty worlds', () => {
    const file = v1File();
    file.world.blocks.push({ id: 'x', type: 'tnt', position: { x: 1, y: 1, z: 1 } });
    file.world.blocks.push({ id: 'y', type: 'grass', position: { x: 1.5, y: 1, z: 1 } });
    file.world.blocks.push({ id: 'z', type: 'grass', position: { x: 0, y: 0, z: 0 } });
    file.world.blocks.push({ id: 'w', type: 'grass', position: { x: 0, y: 999, z: 0 } });
    const result = validateWorldImport(file);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.warnings[0]).toBe('Some blocks could not be imported because they were unknown.');
    const empty = v1File();
    empty.world.blocks = [{ id: 'x', type: 'tnt', position: { x: 1, y: 1, z: 1 } }];
    expect(validateWorldImport(empty).ok).toBe(false);
  });

  it('handles malformed JSON and huge files gracefully', () => {
    const bad = parseWorldImportFile('{not json');
    expect(bad.ok).toBe(false);
    const huge = parseWorldImportFile('x'.repeat(MAX_IMPORT_FILE_BYTES + 1));
    expect(huge.ok).toBe(false);
    if (!huge.ok) expect(huge.error).toBe('That file is too large to import safely.');
    expect(parseWorldImportFile(JSON.stringify(v1File())).ok).toBe(true);
  });
});
