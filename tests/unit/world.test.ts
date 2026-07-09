import { describe, expect, it } from 'vitest';
import { World, WORLD_SIZE, isInsideWorld } from '../../src/game/engine/world';
import { createStarterWorld, createToyLandWorld, SPAWN } from '../../src/game/engine/starterWorld';

describe('World', () => {
  it('places a block inside the world', () => {
    const world = new World();
    const block = world.placeBlock('grass', { x: 1, y: 2, z: 3 });
    expect(block).not.toBeNull();
    expect(world.getBlock({ x: 1, y: 2, z: 3 })?.type).toBe('grass');
  });

  it('refuses to place a block outside the world', () => {
    const world = new World();
    expect(world.placeBlock('grass', { x: -1, y: 0, z: 0 })).toBeNull();
    expect(world.placeBlock('grass', { x: 0, y: WORLD_SIZE.height, z: 0 })).toBeNull();
    expect(world.placeBlock('grass', { x: 0.5, y: 0, z: 0 })).toBeNull();
  });

  it('refuses to place a block on top of another block', () => {
    const world = new World();
    world.placeBlock('grass', { x: 1, y: 1, z: 1 });
    expect(world.placeBlock('stone', { x: 1, y: 1, z: 1 })).toBeNull();
  });

  it('removes a block', () => {
    const world = new World();
    world.placeBlock('brick', { x: 2, y: 1, z: 2 });
    const removed = world.removeBlock({ x: 2, y: 1, z: 2 });
    expect(removed?.type).toBe('brick');
    expect(world.hasBlock({ x: 2, y: 1, z: 2 })).toBe(false);
  });

  it('validates positions', () => {
    expect(isInsideWorld({ x: 0, y: 0, z: 0 })).toBe(true);
    expect(
      isInsideWorld({
        x: WORLD_SIZE.width - 1,
        y: WORLD_SIZE.height - 1,
        z: WORLD_SIZE.depth - 1,
      }),
    ).toBe(true);
    expect(isInsideWorld({ x: WORLD_SIZE.width, y: 0, z: 0 })).toBe(false);
    expect(isInsideWorld({ x: 0, y: WORLD_SIZE.height, z: 0 })).toBe(false);
  });
});

describe('starter world generation', () => {
  it('covers every column with terrain', () => {
    const { blocks } = createStarterWorld(42);
    const columns = new Set(blocks.map((b) => `${b.position.x},${b.position.z}`));
    expect(columns.size).toBe(WORLD_SIZE.width * WORLD_SIZE.depth);
    expect(blocks.length).toBeGreaterThan(WORLD_SIZE.width * WORLD_SIZE.depth);
  });

  it('has grass, water lakes, sandy shores, trees, and flowers', () => {
    const { blocks } = createStarterWorld(42);
    const types = new Set(blocks.map((b) => b.type));
    expect(types.has('grass')).toBe(true);
    expect(types.has('water')).toBe(true);
    expect(types.has('sand')).toBe(true);
    expect(types.has('wood')).toBe(true);
    expect(types.has('leaves')).toBe(true);
    expect(types.has('flower')).toBe(true);
  });

  it('places the Magic Delivery Box at the spawn plaza with starter items', () => {
    const { blocks, boxes } = createStarterWorld(42);
    expect(boxes).toHaveLength(1);
    expect(boxes[0].position).toEqual({ x: SPAWN.x, y: SPAWN.y, z: SPAWN.z });
    expect(
      blocks.some(
        (b) =>
          b.type === 'magic-box' &&
          b.position.x === SPAWN.x &&
          b.position.y === SPAWN.y &&
          b.position.z === SPAWN.z,
      ),
    ).toBe(true);
    expect(blocks.some((b) => b.type === 'rainbow')).toBe(true);
    expect(boxes[0].items.length).toBeGreaterThan(0);
  });

  it('never places two blocks in the same cell', () => {
    const { blocks } = createStarterWorld(42);
    const keys = new Set(blocks.map((b) => `${b.position.x},${b.position.y},${b.position.z}`));
    expect(keys.size).toBe(blocks.length);
  });

  it('is deterministic for a seed and different across seeds', () => {
    const worldA = createStarterWorld(7);
    const worldB = createStarterWorld(7);
    const worldC = createStarterWorld(8);
    const fingerprint = (blocks: typeof worldA.blocks) =>
      blocks
        .map((b) => `${b.type}@${b.position.x},${b.position.y},${b.position.z}`)
        .sort()
        .join('|');
    expect(fingerprint(worldA.blocks)).toBe(fingerprint(worldB.blocks));
    expect(fingerprint(worldA.blocks)).not.toBe(fingerprint(worldC.blocks));
  });

  it('keeps every block inside the world bounds', () => {
    const { blocks } = createStarterWorld(42);
    for (const block of blocks) {
      expect(isInsideWorld(block.position)).toBe(true);
    }
  });
});

describe('Toy Land world', () => {
  it('is a flat playroom with a toy chest, towers, and two toy statues', () => {
    const { blocks, boxes } = createToyLandWorld();
    const types = new Set(blocks.map((b) => b.type));
    // Statue materials: cowboy (wood hat/boots, brick shirt, ice jeans)
    // and astronaut (snow suit, glass visor, star chest).
    for (const type of ['wood', 'brick', 'ice', 'snow', 'glass', 'star', 'campfire', 'torch']) {
      expect(types.has(type as never)).toBe(true);
    }
    expect(boxes).toHaveLength(1);
    expect(boxes[0].name).toBe('Toy Chest');
    expect(boxes[0].items.length).toBeGreaterThan(0);
    // Flat floor covers the world.
    const floor = blocks.filter((b) => b.type === 'grass');
    expect(floor.length).toBeGreaterThan(WORLD_SIZE.width * WORLD_SIZE.depth * 0.8);
    // No two blocks share a cell.
    const keys = new Set(blocks.map((b) => `${b.position.x},${b.position.y},${b.position.z}`));
    expect(keys.size).toBe(blocks.length);
    for (const block of blocks) {
      expect(isInsideWorld(block.position)).toBe(true);
    }
  });
});
