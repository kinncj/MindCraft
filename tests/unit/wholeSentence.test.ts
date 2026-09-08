import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { BuildTools } from '../../src/engine/build/BuildTools';
import { ChatAgent } from '../../src/engine/chat/ChatAgent';
import { WebLlmProvider } from '../../src/engine/chat/WebLlmProvider';
import { CommandHistory } from '../../src/engine/commands/CommandHistory';
import { EntitySystem } from '../../src/engine/entities/EntitySystem';
import { PlayerController } from '../../src/engine/physics/PlayerController';
import { ToolRegistry } from '../../src/engine/tools/ToolRegistry';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';
import { RuleChatProvider } from '../../src/engine/chat/RuleChatProvider';
import { splitClauses } from '../../src/engine/chat/intent';
import { actionsFor, describeRequest, parseRequests } from '../../src/engine/chat/requests';
import type { ChatContext } from '../../src/engine/chat/types';

const ctx = (message: string): ChatContext => ({
  villager: { id: 'v1', name: 'Ben', job: 'builder', jobLabel: 'Builder', emoji: '🔨', x: 5, z: 5 },
  message,
  history: [],
  player: { x: 8, y: 3, z: 8, yaw: 0 },
  site: { x: 8, y: 3, z: 1 },
  blueprints: [],
  blocks: blocks.palette().map((d) => ({ id: d.id, label: d.label })),
  tools: [],
  world: { timeOfDay: 0.3, weather: 'sunny', biome: 'meadow', worldName: 'W' },
});

/** What the villager would actually do, as a list of tool names. */
const toolsFor = async (message: string): Promise<string[]> => {
  const reply = await new RuleChatProvider().reply(ctx(message));
  return reply.actions.map((a) => a.tool);
};

describe('one sentence, everything in it', () => {
  it('cuts a sentence where one request ends and the next begins', () => {
    expect(splitClauses('build a school and dig a big lake')).toEqual(['build a school', 'dig a big lake']);
    expect(splitClauses('make a house, a treehouse and a bridge')).toEqual(['make a house', 'a treehouse', 'a bridge']);
    expect(splitClauses('build a castle then make it night')).toEqual(['build a castle', 'make it night']);
  });

  it('never cuts inside the description of one thing', () => {
    for (const sentence of [
      'build me a beautiful and colourful brick and mortar mansion, like a massive house',
      'a school with 6 classrooms and a computer room',
      'a house with a garden and a pool',
      'a big hospital with doctors and patients and the canadian flag',
      'dig a 30 by 20 lake',
    ]) {
      expect(splitClauses(sentence), sentence).toEqual([sentence]);
    }
  });

  it('turns each part into its own job, in the order the kid said them', () => {
    const requests = parseRequests('build a school and dig a big lake and make it night');
    expect(requests.map((r) => r.kind)).toEqual(['building', 'earthwork', 'action']);
    expect(requests.map(describeRequest)).toEqual(['a school', 'a lake', 'night time 🌙']);
    const actions = requests.flatMap((r) => actionsFor(r, ctx('')));
    expect(actions.map((a) => a.tool)).toEqual(['build_house', 'villager_spawn', 'build_dig', 'time_set']);
    expect(actions[0].args).toMatchObject({ type: 'school' });
    expect(actions[2].args).toMatchObject({ kind: 'lake' });
    expect(actions[3].args).toMatchObject({ mode: 'night' });
  });

  it('the villager really does all of it, and says so', async () => {
    const reply = await new RuleChatProvider().reply(ctx('build a house and a treehouse and dig a pond please'));
    expect(reply.actions.map((a) => a.tool)).toEqual(['build_house', 'build_feature', 'build_dig']);
    expect(reply.say).toContain('treehouse');
    expect(reply.say).toContain('pond');
  });

  it('still does the one thing when only one thing was asked', async () => {
    expect(await toolsFor('build me a pink house')).toEqual(['build_house']);
    expect(await toolsFor('dig a 30 by 20 lake')).toEqual(['build_dig']);
    expect(await toolsFor('make a big treehouse')).toEqual(['build_feature']);
    expect(await toolsFor('lets dance')).toEqual(['villager_dance', 'player_dance']);
  });

  it('reads the other things a villager can do, however they are asked', async () => {
    expect(await toolsFor('can you come with me')).toEqual(['villager_talk']);
    expect(await toolsFor('wait right here until i come back')).toEqual(['villager_stay']);
    expect(await toolsFor('i want to see the stars')).toEqual(['time_set']);
    expect(await toolsFor('can we have a storm')).toEqual(['weather_set']);
    expect(await toolsFor('do you have something for me')).toEqual(['villager_talk']);
    expect(await toolsFor('send me a butterfly')).toEqual(['entity_spawn']);
  });

  it('picks the right pet, ride and shape out of the words', () => {
    const args = (message: string): Record<string, unknown> => {
      const requests = parseRequests(message);
      return actionsFor(requests[0], ctx(message))[0].args;
    };
    expect(args('can i have a kitten')).toMatchObject({ kind: 'cat' });
    expect(args('i want a puppy')).toMatchObject({ kind: 'dog' });
    expect(args('go fly that helicopter')).toMatchObject({ kind: 'helicopter' });
    expect(args('i want a boat of my own')).toMatchObject({ kind: 'boat' });
    expect(args('build a huge pyramid')).toMatchObject({ shape: 'pyramid', size: 9 });
  });

  it('says nothing was understood rather than building the wrong thing', async () => {
    const reply = await new RuleChatProvider().reply(ctx('blah blah blah wibble'));
    expect(reply.actions).toEqual([]);
    expect(reply.say).toContain("not sure");
  });
});

describe('every provider ends up doing the whole sentence', () => {
  function world(): VoxelWorld {
    const w = new VoxelWorld(blocks);
    for (let cx = -2; cx <= 2; cx++) for (let cz = -2; cz <= 2; cz++) {
      const chunk = new Chunk(cx, cz);
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= 2; y++) chunk.set(x, y, z, B.grass);
      w.addChunk(chunk);
    }
    return w;
  }

  it('a helper that answers with one wrong call still gets the school, the lake, and the night', async () => {
    const w = world();
    const player = new PlayerController(w, blocks, { x: 8, y: 3, z: 8 });
    const entities = new EntitySystem(new THREE.Scene(), w, blocks, player);
    const helper = new WebLlmProvider('t', async () => ({
      chat: { completions: { create: async () => ({ choices: [{ message: { content: '{"say":"On it!","actions":[{"tool":"build_house","args":{"type":"house"}}]}' } }] }) } },
      unload: async () => undefined,
    }));
    await helper.load();
    helper.enabled = true;
    const agent = new ChatAgent({
      tools: new ToolRegistry(), entities, build: new BuildTools(w, blocks, new CommandHistory(w)), registry: blocks,
      player: () => ({ x: 8, y: 3, z: 8, yaw: 0 }), surface: (x, z) => w.height(x, z), say: () => undefined, helper,
    });
    const ben = entities.spawnVillager('builder', 5, 5, 'Ben');
    const result = await agent.send(ben.id, 'build a school and dig a big lake and make it night');
    expect(result?.provider).toBe('helper');
    expect(result?.actions.map((a) => a.tool)).toEqual(['build_house', 'villager_spawn', 'build_dig', 'time_set']);
    expect(result?.actions[0].args).toMatchObject({ type: 'school' });
  });
});

describe('the airport sentence a kid actually typed', () => {
  const SENTENCE = 'build a school with 6 classrooms and a computer room, and dig a big lake and then an airport with an airstrip for airplanes.';

  it('finds all three things in it, and keeps the classrooms with the school', () => {
    const requests = parseRequests(SENTENCE);
    expect(requests.map((r) => r.kind)).toEqual(['building', 'earthwork', 'building']);
    expect(requests.map(describeRequest)).toEqual(['a school', 'a lake', 'an airport']);
    const school = requests[0];
    expect(school.kind === 'building' && school.spec.rooms).toEqual([{ purpose: 'classroom', count: 6 }, { purpose: 'computer room', count: 1 }]);
    const airport = requests[2];
    expect(airport.kind === 'building' && airport.spec.features).toContain('runway');
    expect(airport.kind === 'building' && airport.spec.vehicles).toEqual(['plane']);
  });

  it('the villager builds the school, digs the lake, raises the airport and parks a plane on it', async () => {
    const reply = await new RuleChatProvider().reply(ctx(SENTENCE));
    expect(reply.actions.map((a) => a.tool)).toEqual(['build_house', 'villager_spawn', 'build_dig', 'build_house', 'vehicle_spawn', 'villager_spawn', 'villager_spawn']);
    expect(reply.actions[0].args).toMatchObject({ type: 'school' });
    expect(reply.actions[2].args).toMatchObject({ kind: 'lake' });
    expect(reply.actions[3].args).toMatchObject({ type: 'airport', features: ['runway'] });
    expect(reply.actions[4].args).toMatchObject({ kind: 'plane' });
    expect(reply.say).toContain('airport');
  });
});
