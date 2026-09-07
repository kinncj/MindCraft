import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { BlockState } from '../../src/engine/blocks/BlockState';
import { EntitySystem } from '../../src/engine/entities/EntitySystem';
import { JOBS, TALK_CHOICES, jobById } from '../../src/engine/entities/villagers';
import { PlayerController, type PlayerInput } from '../../src/engine/physics/PlayerController';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

const IDLE: PlayerInput = { forward: false, back: false, left: false, right: false, jump: false, sneak: false, sprint: false };

function flatWorld(): VoxelWorld {
  const world = new VoxelWorld(blocks);
  for (let cx = -1; cx <= 1; cx++) for (let cz = -1; cz <= 1; cz++) {
    const chunk = new Chunk(cx, cz);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= 2; y++) chunk.set(x, y, z, B.grass);
    world.addChunk(chunk);
  }
  return world;
}

function setup() {
  const world = flatWorld();
  const player = new PlayerController(world, blocks, { x: 8, y: 2.5, z: 8 });
  const entities = new EntitySystem(new THREE.Scene(), world, blocks, player);
  return { world, player, entities };
}

describe('furniture', () => {
  it('the TV toggles its variant and the lamp swaps to a lit block', () => {
    const world = flatWorld();
    world.setBlock(3, 3, 3, B.tv);
    const perform: string[] = [];
    const ctx = (x: number, y: number, z: number) => ({
      world, position: { x, y, z }, blockId: world.getBlock(x, y, z), state: world.getState(x, y, z), face: 2 as const,
      openPanel: () => undefined, perform: (a: string) => perform.push(a),
    });
    blocks.byId('tv')!.behavior!.onInteract!(ctx(3, 3, 3));
    expect(BlockState.variant(world.getState(3, 3, 3))).toBe(1);
    blocks.byId('tv')!.behavior!.onInteract!(ctx(3, 3, 3));
    expect(BlockState.variant(world.getState(3, 3, 3))).toBe(0);
    expect(perform).toEqual(['switch_on', 'switch_off']);
    world.setBlock(4, 3, 3, B.lamp);
    blocks.byId('lamp')!.behavior!.onInteract!(ctx(4, 3, 3));
    expect(world.getBlock(4, 3, 3)).toBe(B.lamp_on);
    expect(blocks.lightLevel(B.lamp_on)).toBeGreaterThan(0);
    blocks.byId('lamp_on')!.behavior!.onInteract!(ctx(4, 3, 3));
    expect(world.getBlock(4, 3, 3)).toBe(B.lamp);
  });

  it('sitting freezes the player until they move', () => {
    const { player } = setup();
    player.sitAt(5, 3, 5);
    for (let i = 0; i < 30; i++) player.update(1 / 60, IDLE, 0);
    expect(player.x).toBe(5);
    expect(player.seated).not.toBeNull();
    for (let i = 0; i < 30; i++) player.update(1 / 60, { ...IDLE, forward: true }, 0);
    expect(player.seated).toBeNull();
    expect(player.z).toBeLessThan(5);
  });
});

describe('pets and villagers', () => {
  it('a pet follows the player and can be told to stay', () => {
    const { player, entities } = setup();
    const dog = entities.spawnPet('dog', 2, 2, 'Rex');
    expect(dog.persistent).toBe(true);
    player.teleport(12, 2.5, 12);
    for (let i = 0; i < 480; i++) entities.update(1 / 60, i / 60);
    expect(Math.hypot(dog.x - 12, dog.z - 12)).toBeLessThan(6);
    entities.setPetBrain(dog, 'stay');
    const { x, z } = dog;
    player.teleport(-10, 2.5, -10);
    for (let i = 0; i < 120; i++) entities.update(1 / 60, 5 + i / 60);
    expect(dog.x).toBe(x);
    expect(dog.z).toBe(z);
  });

  it('villagers greet, gift a block, and follow when asked to play', () => {
    const { entities } = setup();
    const v = entities.spawnVillager('baker', 4, 4, 'Mia');
    expect(v.variant).toBe('baker');
    expect(entities.talk(v, 'hi').line).toBe(jobById('baker')!.greeting);
    const gift = entities.talk(v, 'gift');
    expect(gift.gift).toBe(B.cake);
    entities.talk(v, 'play');
    expect(v.brain.kind).toBe('follow');
    entities.update(1 / 60, 100); // well past the play timer
    expect(v.brain.kind).toBe('home');
    expect(TALK_CHOICES).toHaveLength(4);
    for (const job of JOBS) expect(blocks.get(job.gift())).toBeDefined();
  });

  it('round-trips pets, villagers, and vehicles through the world record', () => {
    const { entities } = setup();
    entities.spawnPet('cat', 1, 1, 'Mochi', 'stay');
    entities.spawnVillager('farmer', 3, 3, 'Leo');
    entities.spawnVehicle('car', 5, 3, 5, '#123456');
    entities.spawn('bunny', 6, 6); // animals are not saved
    const stored = entities.serialize();
    expect(stored).toHaveLength(3);
    const again = setup().entities;
    again.restore(stored);
    expect(again.entities.map((e) => e.kind).sort()).toEqual(['pet', 'vehicle', 'villager']);
    const cat = again.entities.find((e) => e.kind === 'pet')!;
    expect(cat.name).toBe('Mochi');
    expect(cat.brain.kind).toBe('stay');
    expect(again.entities.find((e) => e.kind === 'vehicle')!.vehicle!.color).toBe('#123456');
    expect(again.entities.find((e) => e.kind === 'villager')!.variant).toBe('farmer');
  });
});

describe('vehicles', () => {
  it('a car drives forward when ridden and stops at a wall', () => {
    const { player, entities, world } = setup();
    const car = entities.spawnVehicle('car', 4, 2.5, 8);
    expect(entities.mount(car)).toBe(true);
    expect(player.mounted).toBe(true);
    entities.driveInput = { forward: true, back: false, left: false, right: false };
    for (let i = 0; i < 90; i++) entities.update(1 / 60, i / 60);
    expect(car.x).toBeGreaterThan(6);
    expect(player.x).toBeCloseTo(car.x, 1); // rider moves with it
    for (let y = 3; y <= 5; y++) for (let z = 4; z <= 12; z++) world.setBlock(14, y, z, B.stone);
    for (let i = 0; i < 300; i++) entities.update(1 / 60, 2 + i / 60);
    expect(car.x).toBeLessThan(14);
    entities.dismount();
    expect(player.mounted).toBe(false);
    expect(Math.hypot(player.x - car.x, player.z - car.z)).toBeGreaterThan(1);
  });

  it('a boat only moves on water', () => {
    const { entities, world } = setup();
    for (let x = 0; x <= 8; x++) world.setBlock(x, 3, 5, B.water);
    const boat = entities.spawnVehicle('boat', 2, 3.35, 5);
    entities.mount(boat);
    entities.driveInput = { forward: true, back: false, left: false, right: false };
    for (let i = 0; i < 240; i++) entities.update(1 / 60, i / 60);
    expect(boat.x).toBeGreaterThan(4);
    expect(boat.x).toBeLessThanOrEqual(9); // stops at the shore
  });
});
