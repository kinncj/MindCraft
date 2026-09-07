import { describe, expect, it, beforeEach } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { BlockState } from '../../src/engine/blocks/BlockState';
import { PlayerController, type PlayerInput } from '../../src/engine/physics/PlayerController';
import { raycastBlocks } from '../../src/engine/physics/raycast';
import { Chunk } from '../../src/engine/world/Chunk';
import { DIR_PY, DIR_NX } from '../../src/engine/world/coords';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

const IDLE: PlayerInput = { forward: false, back: false, left: false, right: false, jump: false, sneak: false, sprint: false };

let world: VoxelWorld;

function floorAt(y: number): void {
  const chunk = new Chunk(0, 0);
  for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let yy = 0; yy <= y; yy++) chunk.set(x, yy, z, B.grass);
  world.addChunk(chunk);
}

function makePlayer(x = 8, z = 10, y = 3.5): PlayerController {
  return new PlayerController(world, blocks, { x, y, z });
}

/** Runs physics at 60fps. Camera yaw 0 means forward = -z. */
function simulate(player: PlayerController, frames: number, input: Partial<PlayerInput> = {}): void {
  for (let i = 0; i < frames; i++) player.update(1 / 60, { ...IDLE, ...input }, 0);
}

describe('player physics', () => {
  beforeEach(() => {
    world = new VoxelWorld(blocks);
    floorAt(2); // ground top at y=2 → feet rest at 2.5
  });

  it('stands on the ground', () => {
    const player = makePlayer();
    simulate(player, 60);
    expect(player.y).toBeCloseTo(2.5, 1);
    expect(player.onGround).toBe(true);
  });

  it('walks forward', () => {
    const player = makePlayer();
    const startZ = player.z;
    simulate(player, 60, { forward: true });
    expect(player.z).toBeLessThan(startZ - 2);
  });

  it('steps up a single block without jumping', () => {
    world.setBlock(8, 3, 8, B.stone);
    world.setBlock(8, 3, 7, B.stone);
    const player = makePlayer(8, 10);
    simulate(player, 40, { forward: true });
    expect(player.y).toBeGreaterThan(3.4);
  });

  it('is stopped by a two-block wall', () => {
    for (let y = 3; y <= 4; y++) for (let x = 6; x <= 10; x++) world.setBlock(x, y, 8, B.stone);
    const player = makePlayer(8, 10);
    simulate(player, 90, { forward: true });
    expect(player.z).toBeGreaterThan(8.4);
    expect(player.y).toBeCloseTo(2.5, 1);
  });

  it('walks under a roof three blocks up', () => {
    for (let x = 6; x <= 10; x++) for (let z = 4; z <= 8; z++) world.setBlock(x, 5, z, B.planks);
    const player = makePlayer(8, 10);
    simulate(player, 120, { forward: true });
    expect(player.z).toBeLessThan(8);
    expect(player.y).toBeCloseTo(2.5, 1);
  });

  it('cannot squeeze into a one-block gap', () => {
    for (let x = 6; x <= 10; x++) for (let z = 4; z <= 8; z++) world.setBlock(x, 4, z, B.planks);
    const player = makePlayer(8, 10);
    simulate(player, 90, { forward: true });
    expect(player.z).toBeGreaterThan(8.4);
  });

  it('jumping under a ceiling stops at the ceiling', () => {
    for (let x = 6; x <= 10; x++) for (let z = 8; z <= 12; z++) world.setBlock(x, 5, z, B.planks);
    const player = makePlayer(8, 10);
    simulate(player, 30); // land first
    let peak = 0;
    for (let i = 0; i < 60; i++) {
      player.update(1 / 60, { ...IDLE, jump: i < 5 }, 0);
      peak = Math.max(peak, player.y);
    }
    // Ceiling bottom face at 4.5, player height 1.8 → 2.7 max.
    expect(peak).toBeLessThanOrEqual(2.71);
  });

  it('jumps about one block high in the open', () => {
    const player = makePlayer();
    simulate(player, 30); // land first
    let peak = 0;
    for (let i = 0; i < 90; i++) {
      player.update(1 / 60, { ...IDLE, jump: i < 5 }, 0);
      peak = Math.max(peak, player.y);
    }
    expect(peak).toBeGreaterThan(3.5);
    expect(peak).toBeLessThan(4.6);
  });

  it('walks over a slab and up stairs', () => {
    world.setBlock(8, 3, 8, B.planks_slab);
    world.setBlock(8, 3, 6, B.planks_stairs, BlockState.withRotation(0, 0));
    const player = makePlayer(8, 10);
    simulate(player, 30);
    const heights: Array<[number, number]> = [];
    for (let i = 0; i < 90; i++) {
      player.update(1 / 60, { ...IDLE, forward: true }, 0);
      heights.push([player.z, player.y]);
    }
    const onSlab = heights.filter(([z]) => z > 7.7 && z < 8.3).map(([, y]) => y);
    const onHighStep = heights.filter(([z]) => z > 5.55 && z < 5.95).map(([, y]) => y);
    expect(Math.max(...onSlab)).toBeCloseTo(3.0, 1);
    expect(Math.max(...onHighStep)).toBeCloseTo(3.5, 1);
    expect(player.z).toBeLessThan(5.5); // walked all the way over
  });

  it('does not collide with flowers or torches', () => {
    world.setBlock(8, 3, 8, B.flower_pink);
    world.setBlock(8, 3, 7, B.torch);
    const player = makePlayer(8, 10);
    simulate(player, 60, { forward: true });
    expect(player.z).toBeLessThan(7);
    expect(player.y).toBeCloseTo(2.5, 1);
  });

  it('floats and swims upward in water, and can jump out at the surface', () => {
    for (let x = 6; x <= 10; x++) for (let z = 8; z <= 12; z++) for (let y = 3; y <= 8; y++) world.setBlock(x, y, z, B.water);
    const player = makePlayer(8, 10, 3);
    simulate(player, 5);
    expect(player.inWater).toBe(true);
    simulate(player, 120, { jump: true });
    expect(player.y).toBeGreaterThan(5);
    // Shallow pool: feet in water, torso in air.
    world = new VoxelWorld(blocks);
    floorAt(2);
    for (let x = 6; x <= 10; x++) for (let z = 8; z <= 12; z++) world.setBlock(x, 3, z, B.water);
    const swimmer = makePlayer(8, 10, 2.5);
    let peak = 0;
    for (let i = 0; i < 90; i++) {
      swimmer.update(1 / 60, { ...IDLE, jump: true }, 0);
      peak = Math.max(peak, swimmer.y);
    }
    expect(peak).toBeGreaterThan(3.4);
  });

  it('freezes on unloaded ground instead of falling forever', () => {
    const player = new PlayerController(world, blocks, { x: 200, y: 50, z: 200 });
    simulate(player, 60);
    expect(player.y).toBe(50);
  });
});

describe('voxel raycast', () => {
  beforeEach(() => {
    world = new VoxelWorld(blocks);
    floorAt(2);
  });

  it('hits the top face of the ground when looking down', () => {
    const hit = raycastBlocks(world, blocks, { ox: 5, oy: 10, oz: 5, dx: 0, dy: -1, dz: 0 }, 20)!;
    expect(hit).not.toBeNull();
    expect(hit.y).toBe(2);
    expect(hit.face).toBe(DIR_PY);
    expect(hit.py).toBeCloseTo(2.5, 5);
  });

  it('hits the near face of a wall from the side', () => {
    world.setBlock(8, 3, 5, B.stone);
    const hit = raycastBlocks(world, blocks, { ox: 2, oy: 3, oz: 5, dx: 1, dy: 0, dz: 0 }, 20)!;
    expect(hit.x).toBe(8);
    expect(hit.face).toBe(DIR_NX);
  });

  it('misses the empty top half of a bottom slab', () => {
    world.setBlock(8, 3, 5, B.planks_slab);
    const above = raycastBlocks(world, blocks, { ox: 2, oy: 3.3, oz: 5, dx: 1, dy: 0, dz: 0 }, 20);
    expect(above?.x).not.toBe(8); // passes over the slab, hits the far wall? there is none → null
    const low = raycastBlocks(world, blocks, { ox: 2, oy: 2.7, oz: 5, dx: 1, dy: 0, dz: 0 }, 20)!;
    expect(low.x).toBe(8);
  });

  it('respects max distance', () => {
    expect(raycastBlocks(world, blocks, { ox: 5, oy: 30, oz: 5, dx: 0, dy: -1, dz: 0 }, 5)).toBeNull();
  });
});
