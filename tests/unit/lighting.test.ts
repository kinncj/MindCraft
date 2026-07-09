import { describe, expect, it } from 'vitest';
import { computeLight, lightIndex } from '../../src/game/engine/lighting';
import { makeBlock } from '../../src/game/engine/world';
import type { PlacedBlock } from '../../src/types/game';

function world(blocks: PlacedBlock[]): Record<string, PlacedBlock> {
  const record: Record<string, PlacedBlock> = {};
  for (const b of blocks) {
    record[`${b.position.x},${b.position.y},${b.position.z}`] = b;
  }
  return record;
}

/** A 5×5 sealed room: floor y=2, walls y=3..4, roof y=5, interior air at y=3..4. */
function sealedRoom(center = { x: 10, z: 10 }): PlacedBlock[] {
  const blocks: PlacedBlock[] = [];
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      blocks.push(makeBlock('planks', { x: center.x + dx, y: 2, z: center.z + dz }));
      blocks.push(makeBlock('planks', { x: center.x + dx, y: 5, z: center.z + dz }));
      const isWall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
      if (isWall) {
        blocks.push(makeBlock('planks', { x: center.x + dx, y: 3, z: center.z + dz }));
        blocks.push(makeBlock('planks', { x: center.x + dx, y: 4, z: center.z + dz }));
      }
    }
  }
  return blocks;
}

describe('voxel lighting', () => {
  it('open air gets full sky light', () => {
    const light = computeLight(world([makeBlock('grass', { x: 5, y: 0, z: 5 })]));
    expect(light.sky[lightIndex(5, 1, 5)]).toBe(15);
  });

  it('a sealed shelter is dark inside', () => {
    const light = computeLight(world(sealedRoom()));
    expect(light.sky[lightIndex(10, 3, 10)]).toBe(0);
    expect(light.block[lightIndex(10, 3, 10)]).toBe(0);
  });

  it('a doorway leaks sky light inside, fading with distance', () => {
    const blocks = sealedRoom().filter(
      // Remove one wall block: a doorway at (8, 3, 10).
      (b) => !(b.position.x === 8 && b.position.y === 3 && b.position.z === 10),
    );
    const light = computeLight(world(blocks));
    const atDoor = light.sky[lightIndex(8, 3, 10)];
    const inside = light.sky[lightIndex(9, 3, 10)];
    const deeper = light.sky[lightIndex(11, 3, 10)];
    expect(atDoor).toBeGreaterThan(inside);
    expect(inside).toBeGreaterThan(deeper);
    expect(deeper).toBeGreaterThan(0);
  });

  it('a torch lights up a sealed shelter', () => {
    const blocks = [...sealedRoom(), makeBlock('torch', { x: 10, y: 3, z: 10 })];
    const light = computeLight(world(blocks));
    expect(light.block[lightIndex(9, 3, 10)]).toBeGreaterThan(10);
    expect(light.block[lightIndex(11, 4, 11)]).toBeGreaterThan(5);
    // But the light stays inside: outside the room it is still torch-dark.
    expect(light.block[lightIndex(14, 3, 14)]).toBe(0);
  });

  it('light falls off by one per step', () => {
    const light = computeLight(world([makeBlock('light', { x: 10, y: 5, z: 10 })]));
    expect(light.block[lightIndex(11, 5, 10)]).toBe(13);
    expect(light.block[lightIndex(12, 5, 10)]).toBe(12);
  });
});
