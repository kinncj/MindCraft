import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { BuildTools } from '../../src/engine/build/BuildTools';
import { ChatAgent } from '../../src/engine/chat/ChatAgent';
import { parseModelReply } from '../../src/engine/chat/BuiltInModelProvider';
import { RuleChatProvider, findBlock } from '../../src/engine/chat/RuleChatProvider';
import { CHAT_TOOL_ALLOWLIST, type ChatContext, type ChatProvider } from '../../src/engine/chat/types';
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
    world: { timeOfDay: 0.3, weather: 'sunny', biome: 'meadow', worldName: 'Castle Land' },
  };
}

describe('rule chat provider', () => {
  const rules = new RuleChatProvider();

  it('turns building requests into hands-on actions', async () => {
    const house = await rules.reply(ctx('please build me a house'));
    expect(house.actions[0]).toMatchObject({ tool: 'build_house', args: { x: 8, y: 3, z: 1, width: 7, floors: 1, wall: 'planks' } });
    const castle = await rules.reply(ctx('can you make a big castle'));
    expect(castle.actions[0]).toMatchObject({ tool: 'build_house', args: { castle: true, width: 9, floors: 2 } });
    const brick = await rules.reply(ctx('put a brick here'));
    expect(brick.actions[0]).toMatchObject({ tool: 'world_place_block', args: { block: 'brick' } });
    const wall = await rules.reply(ctx('make a wall of glass'));
    expect(wall.actions[0]).toMatchObject({ tool: 'build_shape', args: { shape: 'wall', block: 'glass' } });
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
  });

  it('answers questions about the world and builds shapes in colors', async () => {
    expect((await rules.reply(ctx('what colour is the sky'))).say).toContain('bright blue');
    const night = { ...ctx('what color is the sky?'), world: { timeOfDay: 0.8, weather: 'sunny', biome: 'forest', worldName: 'W' } };
    expect((await rules.reply(night)).say).toContain('stars');
    expect((await rules.reply(ctx("what's the weather"))).say).toContain('sunny');
    expect((await rules.reply(ctx('where are we'))).say).toContain('meadow');
    expect((await rules.reply(ctx('what is your favorite color'))).say).toContain('frosting');
    const pyramid = await rules.reply(ctx('build a pyramid'));
    expect(pyramid.actions[0]).toMatchObject({ tool: 'build_shape', args: { shape: 'pyramid', block: 'sandstone', size: 5 } });
    const bigGlass = await rules.reply(ctx('make a big glass pyramid'));
    expect(bigGlass.actions[0].args).toMatchObject({ shape: 'pyramid', block: 'glass', size: 9 });
    const pinkHouse = await rules.reply(ctx('build a pink house'));
    expect(pinkHouse.actions[0]).toMatchObject({ tool: 'build_house', args: { wall: 'color_pink', castle: false } });
    const trees = await rules.reply(ctx('plant a tree please'));
    expect(trees.actions[0].args).toMatchObject({ shape: 'tree' });
    expect(findBlock('put a wood stairs please', blocks.palette().map((d) => ({ id: d.id, label: d.label })))?.id).toBe('planks_stairs');
  });
});

describe('built-in model reply parsing', () => {
  it('accepts clean JSON, drops unknown tools, rejects unsafe or empty text', () => {
    const reply = parseModelReply('Sure! {"say":"Let\'s build! 🏠","actions":[{"tool":"build_stamp_blueprint","args":{"blueprint":"cozy_house"}},{"tool":"world_delete_everything","args":{}}]}');
    expect(reply.say).toBe("Let's build! 🏠");
    expect(reply.actions).toHaveLength(1);
    expect(parseModelReply('"Hello, let\'s build a cozy house together!"')).toEqual({ say: "Hello, let's build a cozy house together!", actions: [] });
    expect(() => parseModelReply('   ')).toThrow();
    expect(() => parseModelReply('{"say":"I will shoot the monster"}')).toThrow();
    expect(parseModelReply('{"say":"Visit https://example.com now!"}').say).toBe('Visit  now!');
    expect(parseModelReply('{"say":"Hello!","actions":["player_dance","world_save"],"voice":"x"}').actions).toEqual([{ tool: 'player_dance', args: {} }]);
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
    expect(result?.performed[0]).toMatch(/^build_house:\d+/);
    expect(villager.work).toBeDefined();
    expect(villager.mood).toBe('busy');
    // The villager walks over and lays the blocks; nothing is placed yet.
    const first = villager.work!.edits[0];
    const total = villager.work!.edits.length;
    expect(total).toBeGreaterThan(50);
    expect(world.getBlock(first.x, first.y, first.z)).not.toBe(first.id);
    for (let i = 0; i < 60 * 40 && villager.work; i++) entities.update(1 / 60, i / 60);
    expect(villager.work).toBeUndefined();
    expect(done).toEqual(['Build a house']);
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

describe('helper robustness', () => {
  it('keeps the prompt small enough for a 0.5B model and answers "what can we do"', async () => {
    const { WebLlmProvider, pickHelperModel } = await import('../../src/engine/chat/WebLlmProvider');
    const helper = new WebLlmProvider('t', async () => ({ chat: { completions: { create: async () => ({ choices: [] }) } }, unload: async () => undefined }));
    const prompt = helper.systemPrompt(ctx('hi'));
    expect(prompt.length).toBeLessThan(4000); // about a thousand tokens, inside the 2048 window with examples and history
    for (const tool of CHAT_TOOL_ALLOWLIST) expect(prompt).toContain(`"tool":"${tool}"`);
    expect(prompt).toContain('"kind":"plane"');
    expect(pickHelperModel('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', false)).toBe('Qwen2.5-0.5B-Instruct-q4f32_1-MLC');
    expect(pickHelperModel('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', true)).toBe('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
    const rules = new RuleChatProvider();
    expect((await rules.reply(ctx('what can we do?'))).say).toContain('castle');
    expect((await rules.reply(ctx("I'm bored"))).say).toContain('castle');
  });

  it('retries without JSON mode and remembers why a provider fell back', async () => {
    const { WebLlmProvider } = await import('../../src/engine/chat/WebLlmProvider');
    let calls = 0;
    const helper = new WebLlmProvider('t', async () => ({
      chat: { completions: { create: async (req: { response_format?: unknown }) => { calls += 1; if (req.response_format) throw new Error('grammar unsupported'); return { choices: [{ message: { content: 'Sure {"say":"Plain works 🌼","actions":[]}' } }] }; } } },
      unload: async () => undefined,
    }));
    await helper.load();
    helper.enabled = true;
    const reply = await helper.reply(ctx('hello'));
    expect(reply.say).toBe('Plain works 🌼');
    expect(calls).toBe(2);

    const world = flatWorld();
    const player = new PlayerController(world, blocks, { x: 8, y: 2.5, z: 8 });
    const entities = new EntitySystem(new THREE.Scene(), world, blocks, player);
    const history = new CommandHistory(world);
    const broken = new WebLlmProvider('t', async () => ({ chat: { completions: { create: async () => { throw new Error('ContextWindowSizeExceededError'); } } }, unload: async () => undefined }));
    await broken.load();
    broken.enabled = true;
    const agent = new ChatAgent({ tools: new ToolRegistry(), entities, build: new BuildTools(world, blocks, history), registry: blocks, player: () => ({ x: 8, y: 2.5, z: 8, yaw: 0 }), surface: (x, z) => world.height(x, z), say: () => undefined, helper: broken });
    const villager = entities.spawnVillager('baker', 5, 5, 'Mia');
    const result = await agent.send(villager.id, 'hello');
    expect(result?.provider).toBe('rules');
    expect(agent.lastError).toContain('helper: ContextWindowSizeExceededError');
  });
});
