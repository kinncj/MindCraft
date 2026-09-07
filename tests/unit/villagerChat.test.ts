import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { BuildTools } from '../../src/engine/build/BuildTools';
import { ChatAgent } from '../../src/engine/chat/ChatAgent';
import { parseModelReply } from '../../src/engine/chat/BuiltInModelProvider';
import { RuleChatProvider, findBlock } from '../../src/engine/chat/RuleChatProvider';
import type { ChatContext, ChatProvider } from '../../src/engine/chat/types';
import { CommandHistory } from '../../src/engine/commands/CommandHistory';
import { EntitySystem } from '../../src/engine/entities/EntitySystem';
import { PlayerController } from '../../src/engine/physics/PlayerController';
import { ToolRegistry } from '../../src/engine/tools/ToolRegistry';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

function flatWorld(): VoxelWorld {
  const world = new VoxelWorld(blocks);
  for (let cx = -1; cx <= 2; cx++) for (let cz = -1; cz <= 2; cz++) {
    const chunk = new Chunk(cx, cz);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= 2; y++) chunk.set(x, y, z, B.grass);
    world.addChunk(chunk);
  }
  return world;
}

function ctx(message: string): ChatContext {
  return {
    villager: { id: 'v1', name: 'Mia', job: 'baker', jobLabel: 'Baker', emoji: '🥖', x: 5, z: 5 },
    message,
    history: [],
    player: { x: 8, y: 3, z: 8, yaw: 0 },
    site: { x: 8, y: 3, z: 1 },
    blueprints: [{ id: 'cozy_house', label: 'Cozy House' }],
    blocks: blocks.palette().map((d) => ({ id: d.id, label: d.label })),
    tools: [],
  };
}

describe('rule chat provider', () => {
  const rules = new RuleChatProvider();

  it('turns building requests into hands-on actions', async () => {
    const house = await rules.reply(ctx('please build me a house'));
    expect(house.actions[0]).toMatchObject({ tool: 'build_stamp_blueprint', args: { blueprint: 'cozy_house', x: 8, y: 3, z: 1 } });
    const castle = await rules.reply(ctx('can you make a big castle'));
    expect(castle.actions[0].args.blueprint).toBe('castle_tower');
    const brick = await rules.reply(ctx('put a brick here'));
    expect(brick.actions[0]).toMatchObject({ tool: 'world_place_block', args: { block: 'brick' } });
    const wall = await rules.reply(ctx('make a wall of glass'));
    expect(wall.actions[0]).toMatchObject({ tool: 'world_fill', args: { block: 'glass' } });
    expect(house.say.startsWith('🥖')).toBe(true);
  });

  it('understands company, weather, pets, and small talk', async () => {
    expect((await rules.reply(ctx('follow me!'))).actions[0]).toMatchObject({ tool: 'villager_talk', args: { choice: 'play' } });
    expect((await rules.reply(ctx('stay here'))).actions[0].tool).toBe('villager_stay');
    expect((await rules.reply(ctx('make it night'))).actions[0]).toMatchObject({ tool: 'time_set', args: { mode: 'night' } });
    expect((await rules.reply(ctx('I want snow'))).actions[0]).toMatchObject({ tool: 'weather_set', args: { weather: 'snow' } });
    expect((await rules.reply(ctx('can I have a puppy'))).actions[0]).toMatchObject({ tool: 'pet_adopt', args: { kind: 'dog' } });
    expect((await rules.reply(ctx('hello'))).actions).toEqual([]);
    expect((await rules.reply(ctx('what is your job'))).say).toContain('Baker');
    expect((await rules.reply(ctx('zzzz qqq'))).say).toContain('Try');
    expect(findBlock('put a wood stairs please', blocks.palette().map((d) => ({ id: d.id, label: d.label })))?.id).toBe('planks_stairs');
  });
});

describe('built-in model reply parsing', () => {
  it('accepts clean JSON, drops unknown tools, rejects unsafe or empty text', () => {
    const reply = parseModelReply('Sure! {"say":"Let\'s build! 🏠","actions":[{"tool":"build_stamp_blueprint","args":{"blueprint":"cozy_house"}},{"tool":"world_delete_everything","args":{}}]}');
    expect(reply.say).toBe("Let's build! 🏠");
    expect(reply.actions).toHaveLength(1);
    expect(() => parseModelReply('no json here')).toThrow();
    expect(() => parseModelReply('{"say":"I will shoot the monster"}')).toThrow();
    expect(parseModelReply('{"say":"Visit https://example.com now!"}').say).toBe('Visit  now!');
  });
});

describe('chat agent and villager work', () => {
  function rig() {
    const world = flatWorld();
    const player = new PlayerController(world, blocks, { x: 8, y: 2.5, z: 8 });
    const entities = new EntitySystem(new THREE.Scene(), world, blocks, player);
    const history = new CommandHistory(world);
    const build = new BuildTools(world, blocks, history);
    const tools = new ToolRegistry();
    const said: string[] = [];
    const calls: string[] = [];
    tools.register({ name: 'time_set', description: 't', inputSchema: { type: 'object' }, execute: (a: Record<string, unknown>) => { calls.push(`time_set:${a.mode}`); return 1; } });
    tools.register({ name: 'villager_talk', description: 't', inputSchema: { type: 'object' }, execute: (a: Record<string, unknown>) => { calls.push(`talk:${a.id}:${a.choice}`); return 1; } });
    const villager = entities.spawnVillager('builder', 5, 5, 'Ben');
    const done: string[] = [];
    entities.onWorkDone = (_e, cmd) => { history.record(cmd); done.push(cmd.label); };
    const agent = new ChatAgent({ tools, entities, build, registry: blocks, player: () => ({ x: 8, y: 2.5, z: 8, yaw: 0 }), surface: (x, z) => world.height(x, z), say: (_id, text) => said.push(text) });
    return { world, entities, history, agent, villager, said, calls, done };
  }

  it('sends a message, performs tool actions, and hands builds to the villager', async () => {
    const { world, entities, history, agent, villager, said, calls, done } = rig();
    const night = await agent.send(villager.id, 'make it night');
    expect(night?.provider).toBe('rules');
    expect(calls).toEqual(['time_set:night']);
    expect(said[0]).toContain('🌙');

    const result = await agent.send(villager.id, 'build a house');
    expect(result?.performed[0]).toMatch(/^build_stamp_blueprint:\d+/);
    expect(villager.work).toBeDefined();
    expect(villager.mood).toBe('busy');
    // The villager walks over and lays the blocks; nothing is placed yet.
    const first = villager.work!.edits[0];
    const total = villager.work!.edits.length;
    expect(total).toBeGreaterThan(50);
    expect(world.getBlock(first.x, first.y, first.z)).not.toBe(first.id);
    for (let i = 0; i < 60 * 40 && villager.work; i++) entities.update(1 / 60, i / 60);
    expect(villager.work).toBeUndefined();
    expect(done).toEqual(['Build Cozy House']);
    expect(history.canUndo).toBe(true);
    expect(world.getBlock(first.x, first.y, first.z)).toBe(first.id);
    history.undo();
    expect(world.getBlock(first.x, first.y, first.z)).not.toBe(first.id);
    expect(agent.history(villager.id)).toHaveLength(4);
  });

  it('prefers an outside provider and ignores tools outside the allowlist', async () => {
    const { agent, villager, calls } = rig();
    const external: ChatProvider = {
      name: 'my-agent',
      available: async () => true,
      reply: async () => ({ say: 'Beep! From outside.', actions: [{ tool: 'time_set', args: { mode: 'day' } }, { tool: 'world_save', args: {} }] }),
    };
    agent.registerProvider(external);
    const result = await agent.send(villager.id, 'hi');
    expect(result?.provider).toBe('my-agent');
    expect(result?.say).toBe('Beep! From outside.');
    expect(calls).toEqual(['time_set:day']);
    agent.registerProvider(null);
    expect(agent.providerName).toBe('rules');
  });
});

describe('provider order with the helper', () => {
  it('uses the helper before the rules once it is loaded and enabled', async () => {
    const { WebLlmProvider } = await import('../../src/engine/chat/WebLlmProvider');
    const world = flatWorld();
    const player = new PlayerController(world, blocks, { x: 8, y: 2.5, z: 8 });
    const entities = new EntitySystem(new THREE.Scene(), world, blocks, player);
    const history = new CommandHistory(world);
    const helper = new WebLlmProvider('t', async () => ({
      chat: { completions: { create: async () => ({ choices: [{ message: { content: '{"say":"Helper here! 🌟","actions":[]}' } }] }) } },
      unload: async () => undefined,
    }));
    const agent = new ChatAgent({ tools: new ToolRegistry(), entities, build: new BuildTools(world, blocks, history), registry: blocks, player: () => ({ x: 8, y: 2.5, z: 8, yaw: 0 }), surface: (x, z) => world.height(x, z), say: () => undefined, helper });
    const villager = entities.spawnVillager('baker', 5, 5, 'Mia');
    expect((await agent.send(villager.id, 'hello'))?.provider).toBe('rules');
    await helper.load();
    helper.enabled = true;
    const result = await agent.send(villager.id, 'hello');
    expect(result?.provider).toBe('helper');
    expect(result?.say).toBe('Helper here! 🌟');
    expect(agent.providerName).toBe('helper');
  });
});
