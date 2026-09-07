import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { BlockState } from '../../src/engine/blocks/BlockState';
import { FLUID_FALLING, FLUID_SOURCE, SHAPES, fluidHeight } from '../../src/engine/blocks/shapes';
import { PlayerController } from '../../src/engine/physics/PlayerController';
import { Chunk } from '../../src/engine/world/Chunk';
import { FluidSystem } from '../../src/engine/world/FluidSystem';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

function flat(top = 4): VoxelWorld {
  const world = new VoxelWorld(blocks);
  for (let cx = -1; cx <= 1; cx++) for (let cz = -1; cz <= 1; cz++) {
    const chunk = new Chunk(cx, cz);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= top; y++) chunk.set(x, y, z, B.stone);
    world.addChunk(chunk);
  }
  return world;
}

const level = (world: VoxelWorld, x: number, y: number, z: number): number | null =>
  world.getBlock(x, y, z) === B.water ? BlockState.variant(world.getState(x, y, z)) : null;

describe('flowing water', () => {
  it('spreads seven blocks from a source on flat ground, one level weaker per block', () => {
    const world = flat();
    const fluids = new FluidSystem(world, blocks);
    world.setBlock(8, 5, 8, B.water, 0);
    fluids.settle();
    expect(level(world, 8, 5, 8)).toBe(FLUID_SOURCE);
    expect(level(world, 9, 5, 8)).toBe(1);
    expect(level(world, 15, 5, 8)).toBe(7);
    expect(level(world, 16, 5, 8)).toBeNull();
    expect(level(world, 12, 5, 11)).toBe(7); // diamond: |dx| + |dz| = 7
    expect(level(world, 12, 5, 12)).toBeNull();
    expect(fluids.pendingCount).toBe(0);
    expect(fluidHeight(world.getState(15, 5, 8))).toBeCloseTo(1 / 8);
    expect(SHAPES.fluid.quads(world.getState(15, 5, 8)).some((q) => q.normal === 2 && q.cull === null)).toBe(true);
  });

  it('drains away when the source is removed', () => {
    const world = flat();
    const fluids = new FluidSystem(world, blocks);
    world.setBlock(8, 5, 8, B.water, 0);
    fluids.settle();
    world.setBlock(8, 5, 8, 0, 0);
    fluids.settle();
    for (let x = 0; x < 16; x++) expect(level(world, x, 5, 8)).toBeNull();
  });

  it('pours over an edge, falls, and spreads again where it lands', () => {
    const world = flat();
    for (let x = 10; x < 16; x++) for (let z = 0; z < 16; z++) world.setBlock(x, 4, z, 0, 0); // a lower shelf
    const fluids = new FluidSystem(world, blocks);
    world.setBlock(8, 5, 8, B.water, 0);
    fluids.settle();
    expect(level(world, 10, 4, 8)).toBe(FLUID_FALLING);
    expect(level(world, 11, 4, 8)).toBe(1);
    expect(level(world, 12, 5, 8)).toBeNull(); // nothing hangs in the air past the edge
  });

  it('makes a source between two sources on firm ground', () => {
    const world = flat();
    const fluids = new FluidSystem(world, blocks);
    world.setBlock(8, 5, 8, B.water, 0);
    world.setBlock(10, 5, 8, B.water, 0);
    fluids.settle();
    expect(level(world, 9, 5, 8)).toBe(FLUID_SOURCE);
  });

  it('flows in when a wall next to still water is removed, and pushes the player along', () => {
    const world = flat();
    const fluids = new FluidSystem(world, blocks);
    world.setBlock(8, 5, 8, B.water, 0);
    world.setBlock(9, 5, 8, B.brick, 0);
    world.setBlock(7, 5, 8, B.brick, 0);
    world.setBlock(8, 5, 9, B.brick, 0);
    world.setBlock(8, 5, 7, B.brick, 0);
    fluids.settle();
    expect(level(world, 10, 5, 8)).toBeNull();
    world.setBlock(9, 5, 8, 0, 0);
    fluids.settle();
    expect(level(world, 10, 5, 8)).toBe(2);
    const push = fluids.current(10, 5, 8);
    expect(push.x).toBeGreaterThan(0.5);
    expect(fluids.current(8, 5, 8).z).toBe(0); // the pond only pulls toward its outflow

    const player = new PlayerController(world, blocks, { x: 10, y: 5, z: 8 });
    player.current = (x, y, z) => fluids.current(x, y, z);
    const idle = { forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false } as Parameters<PlayerController['update']>[1];
    for (let i = 0; i < 30; i++) player.update(1 / 60, idle, 0);
    expect(player.x).toBeGreaterThan(10.05);
  });
});

describe('creatures and water', () => {
  it('swim through water instead of walking on top of it', async () => {
    const THREE = await import('three');
    const { EntitySystem } = await import('../../src/engine/entities/EntitySystem');
    const { StayBrain } = await import('../../src/engine/entities/Brain');
    const world = flat();
    for (let x = 4; x < 12; x++) for (let z = 4; z < 12; z++) { world.setBlock(x, 4, z, B.water, 0); world.setBlock(x, 5, z, B.water, 0); }
    const player = new PlayerController(world, blocks, { x: 0, y: 5, z: 0 });
    const entities = new EntitySystem(new THREE.Scene(), world, blocks, player);
    const bunny = entities.spawn('bunny', 8, 8, new StayBrain());
    for (let i = 0; i < 120; i++) entities.update(1 / 60, i / 60);
    expect(bunny.swimming).toBe(true);
    expect(bunny.y).toBeLessThan(5.3); // body in the water (surface top is 5.5)
    expect(bunny.y).toBeGreaterThan(4.8);
    const walker = entities.spawn('bunny', 1, 1, new StayBrain());
    for (let i = 0; i < 60; i++) entities.update(1 / 60, i / 60);
    expect(walker.swimming).toBe(false);
    expect(walker.y).toBeCloseTo(4.5, 1);
  });
});
