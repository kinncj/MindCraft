import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { BuildTools } from '../../src/engine/build/BuildTools';
import { MONUMENTS, MONUMENT_KINDS, MONUMENT_LIST, monumentFootprint, monumentKit } from '../../src/engine/build/monuments/index';
import { CITY_NAMES, CITY_PACKS } from '../../src/engine/build/monuments/cities';
import { cleanText, textWidth } from '../../src/engine/build/monuments/font';
import { CommandHistory } from '../../src/engine/commands/CommandHistory';
import { PlayerController } from '../../src/engine/physics/PlayerController';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

function flat(): VoxelWorld {
  const world = new VoxelWorld(blocks);
  for (let cx = -5; cx <= 5; cx++) for (let cz = -5; cz <= 5; cz++) {
    const chunk = new Chunk(cx, cz);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= 12; y++) chunk.set(x, y, z, y < 10 ? B.dirt : B.grass);
    world.addChunk(chunk);
  }
  return world;
}

const GROUND = 12; // flat() tops out at y = 12, so a monument is built with y = 13
const kit = monumentKit(blocks);

function build(kind: (typeof MONUMENT_KINDS)[number], text?: string) {
  const world = flat();
  const tools = new BuildTools(world, blocks, new CommandHistory(world));
  const edits = tools.planMonument(kind, 24, GROUND + 1, 24, { kit, text });
  tools.run(MONUMENTS[kind].label, edits);
  return { world, edits };
}

describe('famous places', () => {
  it('every monument builds something solid, inside its own footprint', () => {
    for (const kind of MONUMENT_KINDS) {
      const spec = MONUMENTS[kind];
      const { edits } = build(kind, kind === 'sign' ? 'TORONTO' : undefined);
      const placed = edits.filter((e) => e.id !== 0);
      expect(placed.length, `${kind} placed almost nothing`).toBeGreaterThan(60);
      const size = monumentFootprint(kind, { text: kind === 'sign' ? 'TORONTO' : undefined });
      const halfW = Math.floor(size.width / 2) + 1;
      const halfD = Math.floor(size.depth / 2) + 1;
      for (const e of edits) {
        expect(Math.abs(e.x - 24), `${kind} spills out sideways at ${e.x},${e.y},${e.z}`).toBeLessThanOrEqual(halfW);
        expect(Math.abs(e.z - 24), `${kind} spills out front to back at ${e.x},${e.y},${e.z}`).toBeLessThanOrEqual(halfD);
        expect(e.y, `${kind} digs too deep`).toBeGreaterThanOrEqual(GROUND - 3);
        expect(e.y - GROUND, `${kind} is taller than it says`).toBeLessThanOrEqual(spec.height + 2);
      }
    }
  });

  it('the tall ones are tall, and nothing floats in the air by itself', () => {
    for (const kind of MONUMENT_KINDS) {
      const { world, edits } = build(kind, 'HI');
      const top = Math.max(...edits.filter((e) => e.id !== 0).map((e) => e.y));
      expect(top - GROUND, `${kind} is shorter than half its stated height`).toBeGreaterThanOrEqual(Math.floor(MONUMENTS[kind].height / 2) - 1);
      // Every column of blocks reaches down to something: no islands in the sky.
      const columns = new Map<string, number>();
      for (const e of edits) if (e.id !== 0) columns.set(`${e.x},${e.z}`, Math.min(columns.get(`${e.x},${e.z}`) ?? 99, e.y));
      const floating = [...columns.entries()].filter(([key, lowest]) => {
        const [x, z] = key.split(',').map(Number);
        return lowest > GROUND + 1 && world.getBlock(x, lowest - 1, z) === 0;
      });
      // A few overhangs are the point (the museum hangs, the pod sticks out);
      // most of the build should still rest on something.
      expect(floating.length / columns.size, `${kind}: too much of it floats`).toBeLessThan(0.5);
    }
  });

  it('the waterfalls really have falling water, and the canal has ice', () => {
    const water = blocks.numericOf('water');
    for (const kind of ['niagara', 'iguacu'] as const) {
      const { edits } = build(kind);
      const wet = edits.filter((e) => e.id === water);
      expect(wet.length, `${kind} has no water`).toBeGreaterThan(80);
      const heights = new Set(wet.map((e) => e.y));
      expect(heights.size, `${kind}'s water does not fall`).toBeGreaterThan(4);
    }
    const canal = build('rideau_canal');
    expect(canal.edits.some((e) => e.id === blocks.numericOf('ice'))).toBe(true);
  });

  it('a kid can walk right under the museum on the red beams', () => {
    const { world } = build('masp');
    const player = new PlayerController(world, blocks, { x: 24, y: GROUND + 1, z: 24 - 8 });
    for (let i = 0; i < 60 * 6; i++) {
      player.update(1 / 60, { forward: true, back: false, left: false, right: false, jump: false, sprint: false, sneak: false }, Math.PI);
    }
    expect(player.z, `stopped at ${player.x.toFixed(1)},${player.y.toFixed(1)},${player.z.toFixed(1)}`).toBeGreaterThan(24 + 4);
    expect(player.y, 'the plaza under it should stay at ground level').toBeCloseTo(GROUND + 1, 0);
  });

  it('a sign spells what it was asked to spell, and sizes itself to the word', () => {
    expect(cleanText('Kinn!')).toBe('KINN!');
    expect(cleanText('sao paulo')).toBe('SAO PAULO');
    expect(textWidth('HI')).toBe(11);
    const small = monumentFootprint('sign', { text: 'HI' });
    const big = monumentFootprint('sign', { text: 'SAO PAULO' });
    expect(big.width).toBeGreaterThan(small.width);
    const { edits } = build('sign', 'HI');
    const letters = edits.filter((e) => e.id !== 0 && e.y > GROUND);
    // Two letters, five rows tall, two blocks deep.
    expect(letters.length).toBeGreaterThan(30);
    expect(new Set(letters.map((e) => e.y)).size).toBe(5);
  });

  it('every city pack names monuments that exist, and a sign the font can spell', () => {
    for (const city of CITY_NAMES) {
      const pack = CITY_PACKS[city];
      expect(pack.monuments.length, `${city} has no landmarks`).toBeGreaterThan(0);
      for (const kind of pack.monuments) expect(MONUMENT_KINDS, `${city} names ${kind}`).toContain(kind);
      expect(cleanText(pack.sign), `${city}'s sign`).toBe(pack.sign.toUpperCase());
    }
  });

  it('the registry and the files agree', () => {
    expect(MONUMENT_LIST.length).toBe(MONUMENT_KINDS.length);
    expect(new Set(MONUMENT_KINDS).size, 'two monuments share an id').toBe(MONUMENT_KINDS.length);
    for (const monument of MONUMENT_LIST) {
      expect(monument.label.length, `${monument.id} needs a label`).toBeGreaterThan(2);
      expect(monument.blurb.length, `${monument.id} needs a line to say`).toBeGreaterThan(10);
      expect(monument.width).toBeGreaterThan(4);
    }
  });
});

describe('asking for a famous place', () => {
  it('knows Tokyo and Vancouver too', async () => {
    const { parseMonument, parseCity } = await import('../../src/engine/chat/buildRequest');
    const cases: Array<[string, string]> = [
      ['build the tokyo tower', 'tokyo_tower'],
      ['build the skytree', 'skytree'],
      ['make a japanese temple with a pagoda', 'sensoji'],
      ['build canada place with the sails', 'canada_place'],
      ['build the big silver ball in vancouver', 'science_world'],
      ['build the lions gate bridge', 'lions_gate'],
    ];
    const wrong = cases.filter(([text, kind]) => parseMonument(text)?.kind !== kind).map(([text, kind]) => `${text} -> ${parseMonument(text)?.kind ?? 'nothing'} (wanted ${kind})`);
    expect(wrong, wrong.join('; ')).toEqual([]);
    expect(parseCity('build tokyo')?.city).toBe('tokyo');
    expect(parseCity('build me vancouver canada')?.city).toBe('vancouver');
  });

  it('reads the names, including the way a kid spells them', async () => {
    const { parseMonument, parseCity } = await import('../../src/engine/chat/buildRequest');
    const cases: Array<[string, string]> = [
      ['build the eiffel tower', 'eiffel'],
      ['build the iffel tower', 'eiffel'],
      ['make an eifel tower please', 'eiffel'],
      ['build the cn tower', 'cn_tower'],
      ['build the cn towr', 'cn_tower'],
      ['make niagra falls', 'niagara'],
      ['build iguacu falls', 'iguacu'],
      ['build the museum you can walk under', 'masp'],
      ['build the big eye museum', 'niemeyer_eye'],
      ['make the opera de arame', 'wire_opera'],
      ['build the peace tower', 'peace_tower'],
      ['build the skating canal in ottawa', 'rideau_canal'],
    ];
    const wrong = cases.filter(([text, kind]) => parseMonument(text)?.kind !== kind).map(([text, kind]) => `${text} -> ${parseMonument(text)?.kind ?? 'nothing'} (wanted ${kind})`);
    expect(wrong, wrong.join('; ')).toEqual([]);
    expect(parseCity('build curitiba')?.city).toBe('curitiba');
    expect(parseCity('build me sao paulo')?.city).toBe('saopaulo');
    expect(parseCity('build curitba brazil')?.city).toBe('curitiba');
    expect(parseCity('build a house')).toBeNull();
  });

  it('a sign spells the word the kid asked for', async () => {
    const { parseMonument } = await import('../../src/engine/chat/buildRequest');
    expect(parseMonument('build a sign that says kinn')).toMatchObject({ kind: 'sign', text: 'KINN' });
    expect(parseMonument('make big letters that say hello world')).toMatchObject({ kind: 'sign' });
  });

  it('the villager builds a whole city, each landmark on its own ground', async () => {
    const { RuleChatProvider } = await import('../../src/engine/chat/RuleChatProvider');
    const taken: Array<{ x: number; z: number }> = [];
    const ctx = {
      villager: { id: 'v1', name: 'Ben', job: 'builder', jobLabel: 'Builder', emoji: '🔨', x: 5, z: 5 },
      message: 'build curitiba',
      history: [],
      player: { x: 8, y: 3, z: 8, yaw: 0 },
      site: { x: 8, y: 3, z: 1 },
      // A pretend planner: every plot is somewhere new.
      plot: (w: number, d: number) => {
        const at = { x: taken.length * 40, y: 3, z: 0 };
        taken.push({ x: w, z: d });
        return at;
      },
      blueprints: [],
      blocks: blocks.palette().map((b) => ({ id: b.id, label: b.label })),
      tools: [],
      world: { timeOfDay: 0.3, weather: 'sunny', biome: 'meadow', worldName: 'W' },
    };
    const reply = await new RuleChatProvider().reply(ctx);
    const kinds = reply.actions.filter((a) => a.tool === 'build_monument').map((a) => a.args.kind);
    expect(kinds).toEqual(['niemeyer_eye', 'wire_opera', 'botanical_garden', 'sign']);
    expect(reply.actions[3].args.text).toBe('CURITIBA');
    expect(new Set(reply.actions.map((a) => a.args.x)).size, 'landmarks piled on each other').toBe(4);
    expect(reply.say).toContain('Curitiba');
  });

  it('the eiffel tower does not come out as a plain tower shape', async () => {
    const { RuleChatProvider } = await import('../../src/engine/chat/RuleChatProvider');
    const ctx = {
      villager: { id: 'v1', name: 'Ben', job: 'builder', jobLabel: 'Builder', emoji: '🔨', x: 5, z: 5 },
      message: 'build the eiffel tower',
      history: [], player: { x: 8, y: 3, z: 8, yaw: 0 }, site: { x: 8, y: 3, z: 1 },
      blueprints: [], blocks: blocks.palette().map((b) => ({ id: b.id, label: b.label })), tools: [],
      world: { timeOfDay: 0.3, weather: 'sunny', biome: 'meadow', worldName: 'W' },
    };
    const reply = await new RuleChatProvider().reply(ctx);
    expect(reply.actions).toEqual([{ tool: 'build_monument', args: { x: 8, y: 3, z: 1, kind: 'eiffel' } }]);
    expect(reply.say).toContain('Eiffel');
  });
});

describe('a dog house, built to the kid\'s specs', () => {
  it('reads the size, the colour, the name and the extras out of the words', async () => {
    const { parseFeature } = await import('../../src/engine/chat/buildRequest');
    const plain = parseFeature('build a dog house');
    expect(plain?.kind).toBe('doghouse');
    const fancy = parseFeature('make a big red dog house for Rex with a fence and a light');
    expect(fancy).toMatchObject({ kind: 'doghouse', color: 'color_red', text: 'Rex' });
    expect(fancy?.width).toBeGreaterThan(9);
    expect(fancy?.extras).toMatchObject({ fence: true, light: true, bowl: true });
    expect(parseFeature('a tiny kennel for my puppy called Bolt')).toMatchObject({ kind: 'doghouse', text: 'Bolt' });
    // A house for people is still a house for people.
    const { parseBuildRequest } = await import('../../src/engine/chat/buildRequest');
    expect(parseBuildRequest('build a dog house'), 'a kennel is not a bungalow').toBeNull();
    expect(parseBuildRequest('build a house')?.type).toBe('house');
  });

  it('builds a kennel a puppy can walk into, with its initial over the door', async () => {
    const { featureOptions } = await import('../../src/engine/build/buildingKit');
    const world = flat();
    const tools = new BuildTools(world, blocks, new CommandHistory(world));
    const opts = featureOptions(blocks, { kind: 'doghouse', color: 'color_red', text: 'Rex', extras: { fence: true, bowl: true, light: true, bed: true } });
    tools.run('dog house', tools.planFeature('doghouse', 24, GROUND + 1, 24, opts));
    // A doorway two blocks tall at the front of the kennel, open to the yard.
    const front = 24 + Math.floor(opts.depth / 2) - 2;
    expect(world.getBlock(24, GROUND + 1, front), 'the doorway is blocked').toBe(0);
    expect(world.getBlock(24, GROUND + 2, front), 'the doorway is only one tall').toBe(0);
    // Walls and a roof around it.
    expect(world.getBlock(24, GROUND + 1, front - 1), 'no room inside').toBe(0);
    expect(world.getBlock(24, GROUND + 4, 24), 'no roof').not.toBe(0);
    // The extras the child asked for.
    expect(world.getBlock(24 - 4, GROUND + 1, 24 - 4), 'no fence around the yard').toBe(blocks.numericOf('fence'));
    const around: number[] = [];
    for (let x = 20; x <= 28; x++) for (let y = GROUND; y <= GROUND + 8; y++) for (let z = 20; z <= 28; z++) around.push(world.getBlock(x, y, z));
    expect(around, 'no water bowl').toContain(blocks.numericOf('water'));
    expect(around, 'no lamp').toContain(blocks.numericOf('lantern'));
    // The R of Rex, up on the front.
    const letters = around.filter((id) => id !== 0);
    expect(letters.length).toBeGreaterThan(80);
  });

  it('a bigger kennel really is bigger', async () => {
    const { featureOptions } = await import('../../src/engine/build/buildingKit');
    const world = flat();
    const tools = new BuildTools(world, blocks, new CommandHistory(world));
    const small = tools.planFeature('doghouse', 24, GROUND + 1, 24, featureOptions(blocks, { kind: 'doghouse', width: 7, length: 7 }));
    const big = tools.planFeature('doghouse', 24, GROUND + 1, 24, featureOptions(blocks, { kind: 'doghouse', width: 13, length: 13 }));
    const solid = (edits: typeof small) => edits.filter((e) => e.id !== 0).length;
    expect(solid(big)).toBeGreaterThan(solid(small));
    const tallest = (edits: typeof small) => Math.max(...edits.filter((e) => e.id !== 0).map((e) => e.y));
    expect(tallest(big), 'a big kennel should stand taller too').toBeGreaterThan(tallest(small));
  });

  it('the villager builds one when asked, with the name in its reply', async () => {
    const { RuleChatProvider } = await import('../../src/engine/chat/RuleChatProvider');
    const ctx = {
      villager: { id: 'v1', name: 'Ben', job: 'builder', jobLabel: 'Builder', emoji: '🔨', x: 5, z: 5 },
      message: 'build a big blue dog house for Rex with a fence',
      history: [], player: { x: 8, y: 3, z: 8, yaw: 0 }, site: { x: 8, y: 3, z: 1 },
      blueprints: [], blocks: blocks.palette().map((b) => ({ id: b.id, label: b.label })), tools: [],
      world: { timeOfDay: 0.3, weather: 'sunny', biome: 'meadow', worldName: 'W' },
    };
    const reply = await new RuleChatProvider().reply(ctx);
    expect(reply.actions[0].tool).toBe('build_feature');
    expect(reply.actions[0].args).toMatchObject({ kind: 'doghouse', color: 'color_blue', text: 'Rex' });
    expect((reply.actions[0].args.extras as { fence: boolean }).fence).toBe(true);
  });
})
