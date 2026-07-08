import { describe, expect, it } from 'vitest';
import { World, WORLD_SIZE, isInsideWorld } from '../../src/game/engine/world';
import { createStarterWorld } from '../../src/game/engine/starterWorld';

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
    expect(isInsideWorld({ x: 31, y: 15, z: 31 })).toBe(true);
    expect(isInsideWorld({ x: 32, y: 0, z: 0 })).toBe(false);
  });
});

describe('starter world', () => {
  it('has a full grass floor, a magic box, and some fun blocks', () => {
    const { blocks, boxes } = createStarterWorld();
    const grassCount = blocks.filter((b) => b.type === 'grass').length;
    expect(grassCount).toBe(WORLD_SIZE.width * WORLD_SIZE.depth);
    expect(blocks.some((b) => b.type === 'magic-box')).toBe(true);
    expect(blocks.some((b) => b.type === 'rainbow')).toBe(true);
    expect(boxes).toHaveLength(1);
    expect(boxes[0].items.length).toBeGreaterThan(0);
  });
});
