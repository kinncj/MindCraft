import { describe, expect, it } from 'vitest';
import {
  MAX_IMPORT_FILE_BYTES,
  parseWorldImportFile,
  validateWorldImport,
} from '../../src/importExport/validateWorldImport';

function validFile() {
  return {
    schemaVersion: 1,
    appVersion: '1.0.0',
    exportedAt: '2026-07-08T12:00:00.000Z',
    world: {
      id: 'w1',
      name: 'Test World',
      size: { width: 32, depth: 32, height: 16 },
      blocks: [
        { id: 'a', type: 'grass', position: { x: 0, y: 0, z: 0 } },
        { id: 'b', type: 'star', position: { x: 3, y: 2, z: 3 } },
      ],
    },
    inventory: { selectedBlockType: 'star' },
    magicDeliveryBoxes: [
      {
        id: 'box-1',
        name: 'My Box',
        position: { x: 5, y: 1, z: 5 },
        items: [{ blockType: 'rainbow', quantity: 3 }],
      },
    ],
  };
}

describe('validateWorldImport', () => {
  it('accepts a valid world file', () => {
    const result = validateWorldImport(validFile());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blocks).toHaveLength(2);
      expect(result.boxes).toHaveLength(1);
      expect(result.selectedBlockType).toBe('star');
      expect(result.skippedBlocks).toBe(0);
    }
  });

  it('rejects things that are not world files', () => {
    for (const junk of [null, 42, 'hello', [], {}, { schemaVersion: 'x' }]) {
      const result = validateWorldImport(junk);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('That file does not look like a MindCraft world.');
      }
    }
  });

  it('rejects files from a newer MindCraft', () => {
    const file = { ...validFile(), schemaVersion: 99 };
    const result = validateWorldImport(file);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('This world was made with a newer version of MindCraft.');
    }
  });

  it('skips unknown block types and warns', () => {
    const file = validFile();
    file.world.blocks.push({ id: 'x', type: 'tnt', position: { x: 1, y: 1, z: 1 } });
    const result = validateWorldImport(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blocks).toHaveLength(2);
      expect(result.skippedBlocks).toBe(1);
      expect(result.warnings[0]).toBe(
        'Some blocks could not be imported because they were unknown.',
      );
    }
  });

  it('skips blocks outside the world boundaries', () => {
    const file = validFile();
    file.world.blocks.push({ id: 'x', type: 'grass', position: { x: 999, y: 0, z: 0 } });
    file.world.blocks.push({ id: 'y', type: 'grass', position: { x: -1, y: 0, z: 0 } });
    file.world.blocks.push({ id: 'z', type: 'grass', position: { x: 1.5, y: 0, z: 0 } });
    const result = validateWorldImport(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blocks).toHaveLength(2);
      expect(result.skippedBlocks).toBe(3);
    }
  });

  it('drops duplicate positions instead of stacking blocks', () => {
    const file = validFile();
    file.world.blocks.push({ id: 'dup', type: 'stone', position: { x: 0, y: 0, z: 0 } });
    const result = validateWorldImport(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.blocks).toHaveLength(2);
    }
  });

  it('drops box items with bad quantities or unknown types', () => {
    const file = validFile();
    file.magicDeliveryBoxes[0].items = [
      { blockType: 'rainbow', quantity: 3 },
      { blockType: 'rainbow', quantity: -5 },
      { blockType: 'rainbow', quantity: 1.5 },
      { blockType: 'sword', quantity: 1 },
    ] as never;
    const result = validateWorldImport(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.boxes[0].items).toEqual([{ blockType: 'rainbow', quantity: 3 }]);
    }
  });

  it('rejects a world with zero usable blocks', () => {
    const file = validFile();
    file.world.blocks = [{ id: 'x', type: 'tnt', position: { x: 1, y: 1, z: 1 } }];
    expect(validateWorldImport(file).ok).toBe(false);
  });
});

describe('parseWorldImportFile', () => {
  it('handles malformed JSON gracefully', () => {
    const result = parseWorldImportFile('{not json');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('That file does not look like a MindCraft world.');
    }
  });

  it('rejects huge files before parsing', () => {
    const huge = 'x'.repeat(MAX_IMPORT_FILE_BYTES + 1);
    const result = parseWorldImportFile(huge);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('That file is too large to import safely.');
    }
  });

  it('parses and validates a good file end to end', () => {
    const result = parseWorldImportFile(JSON.stringify(validFile()));
    expect(result.ok).toBe(true);
  });
});
