import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { CommandHistory } from '../../src/engine/commands/CommandHistory';
import { BuildTools } from '../../src/engine/build/BuildTools';
import { InteractionSystem } from '../../src/engine/input/InteractionSystem';
import { PlayerController, type PlayerInput } from '../../src/engine/physics/PlayerController';
import { ParticleSystem } from '../../src/engine/render/ParticleSystem';
import { Chunk } from '../../src/engine/world/Chunk';
import { DIR_PY } from '../../src/engine/world/coords';
import { placeTree } from '../../src/engine/world/generation/structures';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';
import type { CameraSystem } from '../../src/engine/input/CameraSystem';
import type { InputFrame } from '../../src/engine/input/InputSystem';

const IDLE: PlayerInput = { forward: false, back: false, left: false, right: false, jump: false, sneak: false, sprint: false };

function flatWorld(): VoxelWorld {
  const world = new VoxelWorld(blocks);
  const chunk = new Chunk(0, 0);
  for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= 2; y++) chunk.set(x, y, z, B.grass);
  world.addChunk(chunk);
  return world;
}

function interaction(world: VoxelWorld, player: PlayerController, selected: () => number) {
  const frame = { taps: [], hover: null } as unknown as InputFrame;
  const camera = { viewMode: 'third', rotationQuarter: () => 0 } as unknown as CameraSystem;
  const history = new CommandHistory(world);
  return new InteractionSystem(world, blocks, frame, camera, player, {
    getSelectedBlockId: selected,
    getMode: () => 'place',
    openPanel: () => undefined,
  }, new BuildTools(world, blocks, history));
}

describe('replaceable plants', () => {
  it('placing into tall grass replaces it instead of stacking on top', () => {
    const world = flatWorld();
    world.setBlock(5, 3, 5, B.tall_grass);
    const player = new PlayerController(world, blocks, { x: 12, y: 2.5, z: 12 });
    const sys = interaction(world, player, () => B.brick);
    expect(sys.placeBlock(5, 3, 5, B.brick, DIR_PY)).toBe(true);
    expect(world.getBlock(5, 3, 5)).toBe(B.brick);
    expect(world.getBlock(5, 4, 5)).toBe(0);
  });

  it('refuses to build inside the player or on a solid block', () => {
    const world = flatWorld();
    const player = new PlayerController(world, blocks, { x: 8, y: 2.5, z: 8 });
    const sys = interaction(world, player, () => B.brick);
    expect(sys.placeBlock(8, 3, 8, B.brick)).toBe(false);
    expect(sys.placeBlock(5, 2, 5, B.brick)).toBe(false);
    expect(sys.placeBlock(5, 3, 5, B.flower_pink)).toBe(true);
  });
});

describe('ladders', () => {
  it('climb up while holding jump and do not fall while resting', () => {
    const world = flatWorld();
    for (let y = 3; y <= 8; y++) {
      world.setBlock(8, y, 6, B.stone);
      world.setBlock(8, y, 7, B.ladder);
    }
    const player = new PlayerController(world, blocks, { x: 8, y: 2.5, z: 7 });
    for (let i = 0; i < 50; i++) player.update(1 / 60, { ...IDLE, jump: true }, 0);
    expect(player.onLadder).toBe(true);
    expect(player.y).toBeGreaterThan(4.5);
    const held = player.y;
    for (let i = 0; i < 30; i++) player.update(1 / 60, IDLE, 0);
    expect(player.y).toBeGreaterThan(held - 0.5); // only a slow slide
    for (let i = 0; i < 120; i++) player.update(1 / 60, { ...IDLE, sneak: true }, 0);
    expect(player.y).toBeLessThan(3.5);
  });

  it('ladders have no collision box and are see-through for light', () => {
    expect(blocks.byId('ladder')?.collision).toBe('none');
    expect(blocks.byId('ladder')?.climbable).toBe(true);
    expect(blocks.byId('ladder')?.transparent).toBe(true);
  });
});

describe('particles', () => {
  it('bursts live briefly then die', () => {
    const scene = new THREE.Scene();
    const particles = new ParticleSystem(scene);
    particles.burst(0, 0, 0, '#ff0000', 20);
    expect(particles.alive).toBe(20);
    for (let i = 0; i < 80; i++) particles.update(1 / 60);
    expect(particles.alive).toBe(0);
  });
});

describe('big oaks', () => {
  it('grow a 2x2 trunk and a wide crown', () => {
    const written = new Map<string, number>();
    placeTree('big_oak', 10, 5, 10, 0.5, (x, y, z, id) => written.set(`${x},${y},${z}`, id));
    expect(written.get('10,6,10')).toBe(B.wood);
    expect(written.get('11,6,11')).toBe(B.wood);
    const leaves = [...written.values()].filter((id) => id === B.leaves).length;
    expect(leaves).toBeGreaterThan(80);
  });
});
