import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { BuildTools } from '../../src/engine/build/BuildTools';
import { ChatAgent } from '../../src/engine/chat/ChatAgent';
import { RuleChatProvider } from '../../src/engine/chat/RuleChatProvider';
import { WebLlmProvider } from '../../src/engine/chat/WebLlmProvider';
import { parseBuildRequest } from '../../src/engine/chat/buildRequest';
import type { ChatContext } from '../../src/engine/chat/types';
import { CommandHistory } from '../../src/engine/commands/CommandHistory';
import { EntitySystem } from '../../src/engine/entities/EntitySystem';
import { PlayerController } from '../../src/engine/physics/PlayerController';
import { ToolRegistry } from '../../src/engine/tools/ToolRegistry';
import { houseOptions } from '../../src/engine/tools/buildTools';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

function flat(): VoxelWorld {
  const world = new VoxelWorld(blocks);
  for (let cx = -2; cx <= 2; cx++) for (let cz = -2; cz <= 2; cz++) {
    const chunk = new Chunk(cx, cz);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= 2; y++) chunk.set(x, y, z, B.grass);
    world.addChunk(chunk);
  }
  return world;
}
const ctx = (message: string): ChatContext => ({
  villager: { id: 'v1', name: 'Ben', job: 'builder', jobLabel: 'Builder', emoji: '🔨', x: 5, z: 5 },
  message,
  history: [],
  player: { x: 8, y: 3, z: 8, yaw: 0 },
  site: { x: 8, y: 3, z: 1 },
  blueprints: [{ id: 'cozy_house', label: 'Cozy House' }],
  blocks: blocks.palette().map((d) => ({ id: d.id, label: d.label })),
  tools: [],
  world: { timeOfDay: 0.3, weather: 'sunny', biome: 'meadow', worldName: 'W' },
});

describe('free-form building', () => {
  it('reads size, floors, material, and colour out of whatever a kid types', () => {
    const mansion = parseBuildRequest('build me a beautiful and colourful brick and mortar mansion, like a massive house')!;
    expect(mansion).toMatchObject({ kind: 'house', width: 13, depth: 11, floors: 3, wall: 'brick', colorful: true });
    expect(parseBuildRequest('a tiny wooden cottage')).toMatchObject({ width: 5, floors: 1, wall: 'planks', colorful: false });
    expect(parseBuildRequest('make a big pink house with two floors')).toMatchObject({ width: 9, floors: 2, wall: 'color_pink' });
    expect(parseBuildRequest('a stone castle please')).toMatchObject({ kind: 'castle', wall: 'stone_bricks' });
    expect(parseBuildRequest('a 15 by 9 glass hotel with 4 storeys')).toMatchObject({ width: 15, depth: 9, floors: 4, wall: 'glass' });
    expect(parseBuildRequest('make it rain')).toBeNull();
  });

  it('plans a real house: floors, glass windows, a door, a roof, colourful pillars', () => {
    const world = flat();
    const build = new BuildTools(world, blocks, new CommandHistory(world));
    const edits = build.planHouse(8, 3, 8, houseOptions(blocks, { width: 13, depth: 11, floors: 3, wall: 'brick', colorful: true }));
    expect(edits.length).toBeGreaterThan(800);
    const ids = new Set(edits.map((e) => e.id));
    expect(ids.has(blocks.numericOf('brick'))).toBe(true);
    expect(ids.has(blocks.numericOf('glass'))).toBe(true);
    expect(ids.has(blocks.numericOf('color_red'))).toBe(true);
    expect(edits.some((e) => e.id === 0)).toBe(true); // the doorway
    const top = Math.max(...edits.map((e) => e.y));
    expect(top).toBeGreaterThanOrEqual(3 + 12 + 1);
    const castle = build.planHouse(8, 3, 8, houseOptions(blocks, { castle: true, width: 9, depth: 9, floors: 2 }));
    expect(castle.some((e) => e.y >= 3 + 10 + 4)).toBe(true); // corner towers rise above the deck
  });

  it('the rules turn the mansion sentence into a build_house action', async () => {
    const reply = await new RuleChatProvider().reply(ctx('build me a beautiful and colourful brick and mortar mansion, like a massive house'));
    expect(reply.actions[0]).toMatchObject({ tool: 'build_house', args: { width: 13, depth: 11, floors: 3, wall: 'brick', colorful: true, castle: false } });
    expect(reply.say).toContain('mansion');
  });

  it('a model that asks for a blueprint that does not exist still gets the mansion built, quickly', async () => {
    const world = flat();
    const player = new PlayerController(world, blocks, { x: 8, y: 3, z: 8 });
    const entities = new EntitySystem(new THREE.Scene(), world, blocks, player);
    const helper = new WebLlmProvider('t', async () => ({
      chat: { completions: { create: async () => ({ choices: [{ message: { content: '{"say":"On it!","actions":[{"tool":"build_stamp_blueprint","args":{"blueprint":"mansion"}}]}' } }] }) } },
      unload: async () => undefined,
    }));
    await helper.load();
    helper.enabled = true;
    const history = new CommandHistory(world);
    const agent = new ChatAgent({ tools: new ToolRegistry(), entities, build: new BuildTools(world, blocks, history), registry: blocks, player: () => ({ x: 8, y: 3, z: 8, yaw: 0 }), surface: (x, z) => world.height(x, z), say: () => undefined, helper });
    const ben = entities.spawnVillager('builder', 5, 5, 'Ben');
    const result = await agent.send(ben.id, 'build me a beautiful and colourful brick and mortar mansion, like a massive house');
    expect(result?.provider).toBe('helper');
    expect(result?.performed[0]).toMatch(/^build_house:\d+/);
    const total = ben.work!.edits.length;
    for (let i = 0; i < 60 * 25 && ben.work; i++) entities.update(1 / 60, i / 60);
    expect(ben.work).toBeUndefined(); // done within 25 seconds even for ~1000 blocks
    expect(total).toBeGreaterThan(800);
    expect(world.getBlock(7, 4, 1 - 5)).not.toBe(0); // the front wall beside the door (site z=1, depth 11)
  });
});
