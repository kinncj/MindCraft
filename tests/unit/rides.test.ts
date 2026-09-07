import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { RuleChatProvider } from '../../src/engine/chat/RuleChatProvider';
import { WebLlmProvider } from '../../src/engine/chat/WebLlmProvider';
import type { ChatContext } from '../../src/engine/chat/types';
import { EntitySystem } from '../../src/engine/entities/EntitySystem';
import { PlayerController } from '../../src/engine/physics/PlayerController';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

function flat(): VoxelWorld {
  const world = new VoxelWorld(blocks);
  for (let cx = -3; cx <= 3; cx++) for (let cz = -3; cz <= 3; cz++) {
    const chunk = new Chunk(cx, cz);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= 3; y++) chunk.set(x, y, z, B.stone);
    world.addChunk(chunk);
  }
  return world;
}

describe('friends take rides', () => {
  it('a villager drives a car around and sits in the seat; hopping off puts them beside it', () => {
    const world = flat();
    const entities = new EntitySystem(new THREE.Scene(), world, blocks, new PlayerController(world, blocks, { x: 0, y: 4, z: 0 }));
    const ben = entities.spawnVillager('builder', 5, 5, 'Ben');
    const car = entities.spawnVehicle('car', 8, 3.5, 8);
    expect(entities.ride(ben.id, car.id)).toBe(true);
    expect(entities.driverOf(car.id)?.id).toBe(ben.id);
    for (let i = 0; i < 240; i++) entities.update(1 / 60, i / 60);
    expect(Math.hypot(car.x - 8, car.z - 8)).toBeGreaterThan(3);
    expect(Math.hypot(ben.x - car.x, ben.z - car.z)).toBeLessThan(0.1);
    entities.stopRiding(ben.id);
    expect(ben.riding).toBeUndefined();
    expect(car.driver).toBeUndefined();
    expect(Math.hypot(ben.x - car.x, ben.z - car.z)).toBeGreaterThan(1);
  });

  it('a villager flies a plane up into the sky, and the player taking over makes them hop off', () => {
    const world = flat();
    const player = new PlayerController(world, blocks, { x: 0, y: 4, z: 0 });
    const entities = new EntitySystem(new THREE.Scene(), world, blocks, player);
    const mia = entities.spawnVillager('baker', 5, 5, 'Mia');
    const plane = entities.spawnVehicle('plane', -20, 3.5, 8);
    expect(entities.nearestVehicle('plane', 5, 5)?.id).toBe(plane.id);
    entities.ride(mia.id, plane.id);
    for (let i = 0; i < 60 * 8; i++) entities.update(1 / 60, i / 60);
    expect(plane.y).toBeGreaterThan(8);
    expect(mia.y).toBeGreaterThan(8);
    expect(entities.mount(plane)).toBe(true);
    expect(plane.driver).toBeUndefined();
    expect(mia.riding).toBeUndefined();
  });
});

describe('ride requests in chat', () => {
  const ctx = (message: string): ChatContext => ({
    villager: { id: 'v1', name: 'Mia', job: 'baker', jobLabel: 'Baker', emoji: '🥖', x: 5, z: 5 },
    message,
    history: [],
    player: { x: 8, y: 3, z: 8, yaw: 0 },
    site: { x: 8, y: 3, z: 1 },
    blueprints: [],
    blocks: blocks.palette().map((d) => ({ id: d.id, label: d.label })),
    tools: [],
    world: { timeOfDay: 0.3, weather: 'sunny', biome: 'meadow', worldName: 'W' },
  });
  it('understands "fly that airplane", "drive the car", and "hop off"', async () => {
    const rules = new RuleChatProvider();
    expect((await rules.reply(ctx('fly that airplane!'))).actions[0]).toMatchObject({ tool: 'vehicle_ride', args: { kind: 'plane' } });
    expect((await rules.reply(ctx('can you drive the car'))).actions[0]).toMatchObject({ tool: 'vehicle_ride', args: { kind: 'car' } });
    expect((await rules.reply(ctx('hop off please'))).actions[0]).toMatchObject({ tool: 'vehicle_stop' });
    expect((await rules.reply(ctx('I want a car'))).actions[0]).toMatchObject({ tool: 'vehicle_spawn', args: { kind: 'car' } });
  });

  it('a helper that never answers falls back within the time limit', async () => {
    const helper = new WebLlmProvider('t', async () => ({ chat: { completions: { create: () => new Promise(() => undefined) } }, unload: async () => undefined }));
    await helper.load();
    helper.enabled = true;
    helper.timeoutMs = 30;
    await expect(helper.reply(ctx('hello'))).rejects.toThrow(/took longer/);
  });
});
