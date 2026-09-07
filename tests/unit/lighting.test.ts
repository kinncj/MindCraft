import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { LightEngine } from '../../src/engine/lighting/LightEngine';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

/** A world of flat ground at y=10 across the given chunks, fully lit. */
function litWorld(coords: Array<[number, number]> = [[0, 0]]): { world: VoxelWorld; light: LightEngine } {
  const world = new VoxelWorld(blocks);
  const light = new LightEngine(world, blocks);
  for (const [cx, cz] of coords) {
    const chunk = new Chunk(cx, cz);
    for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) for (let y = 0; y <= 10; y++) chunk.set(lx, y, lz, B.stone);
    world.addChunk(chunk);
  }
  for (const [cx, cz] of coords) light.initChunk(world.getChunk(cx, cz)!);
  // Edits relight incrementally, as the engine does.
  world.subscribe({ onBlockChanged: (c) => light.onBlockChanged(c) });
  return { world, light };
}

function sealedRoom(world: VoxelWorld, cx = 8, cz = 8): void {
  // Floor at y=10 exists. Walls y=11..12 around a 3×3 interior, roof y=13.
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      const wall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
      if (wall) {
        world.setBlock(cx + dx, 11, cz + dz, B.planks);
        world.setBlock(cx + dx, 12, cz + dz, B.planks);
      }
      world.setBlock(cx + dx, 13, cz + dz, B.planks);
    }
  }
}

describe('light engine', () => {
  it('open air gets full sky light and stone gets none', () => {
    const { world } = litWorld();
    expect(world.getSkyLight(5, 11, 5)).toBe(15);
    expect(world.getSkyLight(5, 50, 5)).toBe(15);
    expect(world.getSkyLight(5, 5, 5)).toBe(0);
  });

  it('a sealed shelter goes dark when built, and lights up when a wall opens', () => {
    const { world } = litWorld();
    sealedRoom(world);
    expect(world.getSkyLight(8, 11, 8)).toBe(0);
    expect(world.getSkyLight(8, 12, 8)).toBe(0);
    // Open a doorway.
    world.setBlock(6, 11, 8, 0);
    const atDoor = world.getSkyLight(6, 11, 8);
    const inside = world.getSkyLight(7, 11, 8);
    const deeper = world.getSkyLight(9, 11, 8);
    expect(atDoor).toBeGreaterThan(inside);
    expect(inside).toBeGreaterThan(deeper);
    expect(deeper).toBeGreaterThan(0);
    // Close it again: dark again.
    world.setBlock(6, 11, 8, B.planks);
    expect(world.getSkyLight(8, 11, 8)).toBe(0);
  });

  it('a torch lights a sealed room and goes out when removed', () => {
    const { world } = litWorld();
    sealedRoom(world);
    world.setBlock(8, 11, 8, B.torch);
    expect(world.getBlockLight(8, 11, 8)).toBe(13);
    expect(world.getBlockLight(9, 11, 8)).toBe(12);
    expect(world.getBlockLight(9, 12, 9)).toBeGreaterThan(8);
    // Light stays inside the walls.
    expect(world.getBlockLight(12, 11, 12)).toBe(0);
    world.setBlock(8, 11, 8, 0);
    expect(world.getBlockLight(9, 11, 8)).toBe(0);
    expect(world.getBlockLight(8, 11, 8)).toBe(0);
  });

  it('light falls off by one per step and crosses chunk borders', () => {
    const { world } = litWorld([[0, 0], [1, 0]]);
    world.setBlock(14, 11, 8, B.light); // level 14, two blocks from the border
    expect(world.getBlockLight(15, 11, 8)).toBe(13);
    expect(world.getBlockLight(16, 11, 8)).toBe(12);
    expect(world.getBlockLight(18, 11, 8)).toBe(10);
    expect(world.getChunk(1, 0)!.dirtyMesh).toBe(true);
    world.setBlock(14, 11, 8, 0);
    expect(world.getBlockLight(16, 11, 8)).toBe(0);
  });

  it('sky light re-enters a column when the roof is removed', () => {
    const { world } = litWorld();
    world.setBlock(3, 20, 3, B.stone);
    expect(world.getSkyLight(3, 19, 3)).toBeLessThan(15);
    world.setBlock(3, 20, 3, 0);
    expect(world.getSkyLight(3, 19, 3)).toBe(15);
    expect(world.getSkyLight(3, 11, 3)).toBe(15);
  });

  it('a chunk loaded next to a lit chunk pulls light across the border', () => {
    const world = new VoxelWorld(blocks);
    const light = new LightEngine(world, blocks);
    const a = new Chunk(0, 0);
    for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) for (let y = 0; y <= 10; y++) a.set(lx, y, lz, B.stone);
    a.set(15, 11, 8, B.light);
    world.addChunk(a);
    light.initChunk(a);
    const b = new Chunk(1, 0);
    // A roof over the neighbor so sky light cannot explain the brightness.
    for (let lx = 0; lx < 16; lx++) for (let lz = 0; lz < 16; lz++) {
      for (let y = 0; y <= 10; y++) b.set(lx, y, lz, B.stone);
      b.set(lx, 14, lz, B.stone);
    }
    world.addChunk(b);
    const touched = light.initChunk(b);
    expect(world.getBlockLight(16, 11, 8)).toBe(13);
    expect(touched.has('1,0')).toBe(true);
  });
});
