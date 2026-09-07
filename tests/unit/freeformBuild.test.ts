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
import { houseOptions } from '../../src/engine/build/buildingKit';
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
    expect(mansion).toMatchObject({ kind: 'house', width: 15, depth: 13, floors: 3, wall: 'brick', colorful: true });
    expect(parseBuildRequest('a tiny wooden cottage')).toMatchObject({ width: 5, floors: 1, wall: 'planks', colorful: false });
    expect(parseBuildRequest('make a big pink house with two floors')).toMatchObject({ width: 9, floors: 2, wall: 'color_pink' });
    expect(parseBuildRequest('a stone castle please')).toMatchObject({ kind: 'castle', wall: 'stone_bricks' });
    expect(parseBuildRequest('a 15 by 9 glass hotel with 4 storeys')).toMatchObject({ type: 'hotel', width: 15, depth: 9, floors: 4, wall: 'glass', furnish: true });
    expect(parseBuildRequest('make it rain')).toBeNull();
    const hospital = parseBuildRequest('build a huge hospital fully furnished with doctors and patients, and the canadian flag')!;
    expect(hospital).toMatchObject({ type: 'hospital', width: 15, depth: 13, floors: 3, wall: 'color_white', trim: 'color_red', furnish: true, sign: 'cross', flag: 'canada' });
    expect(hospital.people.map((p) => p.job)).toEqual(['doctor', 'random']);
    expect(parseBuildRequest('build a massive pink mansion')).toMatchObject({ type: 'house', width: 15, floors: 3, wall: 'color_pink' });
    expect(parseBuildRequest('build a skyscraper')).toMatchObject({ type: 'skyscraper', floors: 6, wall: 'glass' });
  });

  it('plans a real building: door on the ground, stairs to every floor, lamps, windows, furniture, flag', () => {
    const world = flat();
    const build = new BuildTools(world, blocks, new CommandHistory(world));
    const edits = build.planHouse(8, 3, 8, houseOptions(blocks, { type: 'hospital', width: 15, depth: 13, floors: 3, wall: 'color_white', trim: 'color_red', furnish: true, sign: 'cross', flag: 'canada' }));
    expect(edits.length).toBeGreaterThan(1500);
    const at = (x: number, y: number, z: number) => edits.find((e) => e.x === x && e.y === y && e.z === z)?.id;
    // The door block sits on the ground (y = site - 1 is the floor) at the front wall's middle.
    expect(at(8, 3, 2)).toBe(blocks.numericOf('door'));
    expect(at(8, 4, 2)).toBe(0);
    const ids = new Set(edits.map((e) => e.id));
    expect(ids.has(blocks.numericOf('planks_stairs'))).toBe(true); // staircases
    expect(ids.has(blocks.numericOf('lamp'))).toBe(true);
    expect(ids.has(blocks.numericOf('lantern'))).toBe(true);
    expect(ids.has(blocks.numericOf('bed'))).toBe(true); // hospital furniture
    expect(ids.has(blocks.numericOf('glass'))).toBe(true);
    expect(ids.has(blocks.numericOf('color_red'))).toBe(true); // cross and trim and flag
    expect(ids.has(blocks.numericOf('fence'))).toBe(true); // the flag pole
    // A hole above each staircase leads to the next floor.
    const stairs = edits.filter((e) => e.id === blocks.numericOf('planks_stairs'));
    expect(stairs.length).toBeGreaterThanOrEqual(8);
    const top = Math.max(...edits.map((e) => e.y));
    expect(top).toBeGreaterThanOrEqual(2 + 12 + 1);
    // Different requests give different buildings.
    const tower = build.planHouse(8, 3, 8, houseOptions(blocks, { type: 'skyscraper', width: 9, depth: 9, floors: 6, wall: 'glass', trim: 'stone_bricks' }));
    const pink = build.planHouse(8, 3, 8, houseOptions(blocks, { type: 'house', width: 15, depth: 13, floors: 3, wall: 'color_pink' }));
    expect(Math.max(...tower.map((e) => e.y))).toBeGreaterThan(Math.max(...pink.map((e) => e.y)));
    expect(pink.filter((e) => e.id === blocks.numericOf('color_pink')).length).toBeGreaterThan(200);
    expect(tower.filter((e) => e.id === blocks.numericOf('glass')).length).toBeGreaterThan(200);
    const castle = build.planHouse(8, 3, 8, houseOptions(blocks, { castle: true, width: 9, depth: 9, floors: 2 }));
    expect(castle.some((e) => e.y >= 3 + 10 + 4)).toBe(true); // corner towers rise above the deck
  });

  it('the rules turn the mansion sentence into a build_house action', async () => {
    const reply = await new RuleChatProvider().reply(ctx('build me a beautiful and colourful brick and mortar mansion, like a massive house'));
    expect(reply.actions[0]).toMatchObject({ tool: 'build_house', args: { width: 15, depth: 13, floors: 3, wall: 'brick', colorful: true, castle: false } });
    expect(reply.say).toContain('mansion');
    const hospital = await new RuleChatProvider().reply(ctx('build a huge hospital fully furnished with doctors and patients, and the canadian flag'));
    expect(hospital.actions[0]).toMatchObject({ tool: 'build_house', args: { type: 'hospital', furnish: true, sign: 'cross', flag: 'canada' } });
    expect(hospital.actions.filter((a) => a.tool === 'villager_spawn')).toHaveLength(4);
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
    expect(world.getBlock(8, 3, 1 - 6)).toBe(blocks.numericOf('door')); // the door on the ground at the front (site z=1, depth 13)
  });
});

describe('the words win over a model that copies its example', () => {
  it('a skyscraper request answered with the mansion example still builds a skyscraper', async () => {
    const world = flat();
    const player = new PlayerController(world, blocks, { x: 8, y: 3, z: 8 });
    const entities = new EntitySystem(new THREE.Scene(), world, blocks, player);
    const copied = '{"say":"Watch me build it!","actions":[{"tool":"build_house","args":{"type":"house","width":15,"depth":13,"floors":3,"wall":"color_pink","furnish":true}}]}';
    const helper = new WebLlmProvider('t', async () => ({ chat: { completions: { create: async () => ({ choices: [{ message: { content: copied } }] }) } }, unload: async () => undefined }));
    await helper.load();
    helper.enabled = true;
    const agent = new ChatAgent({ tools: new ToolRegistry(), entities, build: new BuildTools(world, blocks, new CommandHistory(world)), registry: blocks, player: () => ({ x: 8, y: 3, z: 8, yaw: 0 }), surface: (x, z) => world.height(x, z), say: () => undefined, helper });
    const ben = entities.spawnVillager('builder', 5, 5, 'Ben');
    const result = await agent.send(ben.id, 'build a skyscraper');
    expect(result?.provider).toBe('helper');
    expect(result?.say).toBe('Watch me build it!');
    expect(ben.work?.label).toBe('Build a skyscraper');
    expect(ben.work!.edits.some((e) => e.id === blocks.numericOf('glass'))).toBe(true);
    expect(ben.work!.edits.some((e) => e.id === blocks.numericOf('color_pink'))).toBe(false);
  });
});

describe('a whole campus from one sentence', () => {
  const sentence = 'build me a school with 6 classrooms, a computer room, a sports court, and students and teachers, and a playground with playstructure';
  it('reads rooms with counts, outdoor features, and people, and sizes the school to fit', () => {
    const spec = parseBuildRequest(sentence)!;
    expect(spec.type).toBe('school');
    expect(spec.rooms).toEqual([{ purpose: 'classroom', count: 6 }, { purpose: 'computer room', count: 1 }]);
    expect(spec.features).toEqual(['court', 'playground']);
    expect(spec.people.map((p) => p.job).sort()).toEqual(['random', 'teacher']);
    const capacity = 2 * Math.floor((spec.width - 3) / 4) * spec.floors;
    expect(capacity).toBeGreaterThanOrEqual(7);
    expect(spec.furnish).toBe(true);
  });

  it('builds seven rooms with the right furniture, a court with goals, and a playground with a slide and swings', () => {
    const world = flat();
    const build = new BuildTools(world, blocks, new CommandHistory(world));
    const spec = parseBuildRequest(sentence)!;
    const edits = build.planHouse(8, 3, 8, houseOptions(blocks, { type: spec.type, width: spec.width, depth: spec.depth, floors: spec.floors, wall: spec.wall, trim: spec.trim, furnish: true, roomPlan: spec.rooms, features: spec.features }));
    const count = (name: string) => edits.filter((e) => e.id === blocks.numericOf(name)).length;
    expect(count('tv')).toBeGreaterThanOrEqual(3); // the computer room's screens
    expect(count('table')).toBeGreaterThan(20); // desks in six classrooms
    expect(count('color_green')).toBeGreaterThan(60); // the court, minus its lines
    expect(count('ladder')).toBeGreaterThanOrEqual(4); // the climbing frame
    expect(count('sand')).toBeGreaterThan(60); // the playground sandpit
    expect(count('fence')).toBeGreaterThan(20); // goals, swings, rims
    expect(count('planks_stairs')).toBeGreaterThanOrEqual(4 + 4); // the slide and the staircase
  });
});
