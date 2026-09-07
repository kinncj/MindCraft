import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { BuildTools, type BuildingLayoutOut } from '../../src/engine/build/BuildTools';
import { earthworkOptions, houseOptions } from '../../src/engine/build/buildingKit';
import { BLUEPRINTS } from '../../src/engine/build/blueprints';
import { checkLivability } from '../../src/engine/build/livability';
import { parseEarthwork } from '../../src/engine/chat/buildRequest';
import { CommandHistory } from '../../src/engine/commands/CommandHistory';
import { PlayerController } from '../../src/engine/physics/PlayerController';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

function flat(): VoxelWorld {
  const world = new VoxelWorld(blocks);
  for (let cx = -3; cx <= 3; cx++) for (let cz = -3; cz <= 3; cz++) {
    const chunk = new Chunk(cx, cz);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= 12; y++) chunk.set(x, y, z, y < 10 ? B.dirt : B.grass);
    world.addChunk(chunk);
  }
  return world;
}

describe('every building is livable', () => {
  it('doors tall and clear on the ground, stairs that arrive, lit rooms with doorways, across many specs', () => {
    const world = flat();
    const build = new BuildTools(world, blocks, new CommandHistory(world));
    const types = ['house', 'hospital', 'school', 'shop', 'skyscraper', 'hotel', 'castle', 'library', 'restaurant', 'firestation'];
    const walls = ['planks', 'brick', 'stone_bricks', 'glass', 'color_pink'];
    let checked = 0;
    for (const type of types) {
      for (const [width, depth, floors] of [[7, 7, 1], [11, 9, 2], [15, 13, 3], [19, 13, 4]] as const) {
        for (const extras of [{}, { doorWidth: 2, automaticDoor: true }, { elevator: true, furnish: true }, { pistonDoor: true, furnish: true }]) {
          const wall = walls[checked % walls.length];
          const roomPlan = type === 'school' ? [{ purpose: 'classroom', count: 4 }, { purpose: 'computer room', count: 1 }] : undefined;
          const out: BuildingLayoutOut = {};
          const edits = build.planHouse(8, 13, 8, houseOptions(blocks, { type, width, depth, floors, wall, castle: type === 'castle', roomPlan, ...extras }), out);
          const passable = new Set([blocks.numericOf('pressure_plate'), blocks.numericOf('wire')]);
          const violations = checkLivability(edits, out.layout!, blocks.numericOf('door'), passable);
          expect(violations, `${type} ${width}x${depth}x${floors} ${JSON.stringify(extras)}: ${JSON.stringify(violations.slice(0, 3))}`).toEqual([]);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('the old blueprint cards have doors two blocks tall with nothing on top of them', () => {
    for (const bp of BLUEPRINTS) {
      const doors = bp.stamp.blocks.filter((b) => b.id === B.door);
      if (doors.length === 0) continue;
      const at = (x: number, y: number, z: number) => bp.stamp.blocks.find((b) => b.x === x && b.y === y && b.z === z)?.id ?? 0;
      const bottoms = doors.filter((d) => at(d.x, d.y - 1, d.z) !== B.door);
      for (const d of bottoms) {
        const above = at(d.x, d.y + 1, d.z);
        expect([B.door, 0], `${bp.id} door top`).toContain(above);
        expect(at(d.x, d.y - 1, d.z), `${bp.id} floor under door`).not.toBe(0);
      }
    }
  });
});

describe('villagers dig', () => {
  it('reads lakes, pools, bunkers, and sizes from the words', () => {
    expect(parseEarthwork('dig a 30x20 lake')).toMatchObject({ kind: 'lake', width: 30, length: 20 });
    expect(parseEarthwork('make me an in-ground pool')).toMatchObject({ kind: 'pool' });
    expect(parseEarthwork('an above ground pool please')).toMatchObject({ kind: 'raisedPool' });
    expect(parseEarthwork('build an underground bunker, very deep')).toMatchObject({ kind: 'bunker', depth: 8 });
    expect(parseEarthwork('a huge lake')).toMatchObject({ kind: 'lake', width: 30, length: 20 });
    expect(parseEarthwork('build a house')).toBeNull();
  });

  it('a 30 by 20 lake is water to the shore, a pool is tiled with a ladder, a bunker is a lit room with stairs down', () => {
    const world = flat();
    const build = new BuildTools(world, blocks, new CommandHistory(world));
    const lake = build.planEarthwork('lake', 20, 13, 20, earthworkOptions(blocks, { kind: 'lake', width: 30, length: 20, depth: 3 }));
    const water = lake.filter((e) => e.id === blocks.numericOf('water'));
    expect(water.length).toBeGreaterThan(400);
    expect(water.every((e) => e.y <= 12)).toBe(true); // never above the ground surface
    expect(lake.some((e) => e.id === blocks.numericOf('sand'))).toBe(true);
    const pool = build.planEarthwork('pool', 8, 13, 8, earthworkOptions(blocks, { kind: 'pool' }));
    expect(pool.filter((e) => e.id === blocks.numericOf('water')).length).toBeGreaterThan(30);
    expect(pool.some((e) => e.id === blocks.numericOf('ladder'))).toBe(true);
    expect(pool.some((e) => e.id === blocks.numericOf('color_white'))).toBe(true);
    const bunker = build.planEarthwork('bunker', 8, 13, 8, earthworkOptions(blocks, { kind: 'bunker' }));
    expect(bunker.some((e) => e.id === blocks.numericOf('stone_stairs'))).toBe(true);
    expect(bunker.some((e) => e.id === blocks.numericOf('lantern') || e.id === blocks.numericOf('glow_crystal'))).toBe(true);
    expect(bunker.some((e) => e.id === blocks.numericOf('bed'))).toBe(true);
    expect(bunker.filter((e) => e.id === 0 && e.y < 12).length).toBeGreaterThan(30); // the room is dug out below ground
  });
});

describe('the bunker entrance fits the character', () => {
  it('two wide, three high over every step, a doorway into the room, and a hatch on the surface', () => {
    const world = flat();
    const build = new BuildTools(world, blocks, new CommandHistory(world));
    const edits = build.planEarthwork('bunker', 8, 13, 8, earthworkOptions(blocks, { kind: 'bunker', width: 7, depth: 4 }));
    const cells = new Map(edits.map((e) => [`${e.x},${e.y},${e.z}`, e.id]));
    const at = (x: number, y: number, z: number) => cells.get(`${x},${y},${z}`);
    const stairs = edits.filter((e) => e.id === blocks.numericOf('stone_stairs'));
    expect(stairs.length).toBeGreaterThanOrEqual(8); // four steps, two wide
    for (const step of stairs) {
      for (let h = 1; h <= 3; h++) expect(at(step.x, step.y + h, step.z), `headroom over step ${step.x},${step.y},${step.z}`).toBe(0);
    }
    // Both stair columns exist side by side.
    const rows = new Set(stairs.map((s) => s.z));
    expect(rows.size).toBe(2);
    // The doorway into the room is open two wide and three high.
    const groundY = 12;
    const floorY = groundY - 4 - 1;
    const x0 = 8 - 3;
    for (const pz of [8, 9]) for (let h = 1; h <= 3; h++) expect(at(x0 - 1, floorY + h, pz)).toBe(0);
    // The hatch at the surface is open two wide and three high.
    const startX = x0 - (groundY - floorY - 1) - 1;
    for (const dx of [-1, 0]) for (const pz of [8, 9]) for (let h = 1; h <= 3; h++) expect(at(startX + dx, groundY + h, pz)).toBe(0);
  });
});

describe('the character really climbs', () => {
  function tallFlat(): VoxelWorld {
    const world = new VoxelWorld(blocks);
    for (let cx = -2; cx <= 2; cx++) for (let cz = -2; cz <= 2; cz++) {
      const chunk = new Chunk(cx, cz);
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= 4; y++) chunk.set(x, y, z, B.grass);
      world.addChunk(chunk);
    }
    return world;
  }
  const HOLD_FORWARD = { forward: true, back: false, left: false, right: false, jump: false, sprint: false, sneak: false } as Parameters<PlayerController['update']>[1];
  const HOLD_JUMP = { ...HOLD_FORWARD, forward: false, jump: true } as Parameters<PlayerController['update']>[1];

  it('walks up every flight of a three-floor house by holding forward, and lands on the floor above', () => {
    const world = tallFlat();
    const build = new BuildTools(world, blocks, new CommandHistory(world));
    const out: BuildingLayoutOut = {};
    build.run('house', build.planHouse(8, 5, 8, houseOptions(blocks, { type: 'house', width: 15, depth: 13, floors: 3, wall: 'brick', furnish: true }), out));
    expect(out.layout!.stairs.length).toBe(2);
    for (const flight of out.layout!.stairs) {
      const first = flight.steps[0];
      const player = new PlayerController(world, blocks, { x: first.x - flight.dir * 1.2, y: first.y, z: first.z + 0.5 });
      const yaw = flight.dir === 1 ? -Math.PI / 2 : Math.PI / 2; // forward = +x or -x
      for (let i = 0; i < 60 * 8; i++) player.update(1 / 60, HOLD_FORWARD, yaw);
      // Standing on the landing slab (block y) puts the feet at y + 0.5.
      expect(player.y, `flight from ${first.x},${first.y}: stuck at ${player.x.toFixed(2)},${player.y.toFixed(2)}`).toBeGreaterThanOrEqual(flight.landing.y + 0.4);
    }
  });

  it('climbs the ladder of a narrow house and steps off on the floor above', () => {
    const world = tallFlat();
    const build = new BuildTools(world, blocks, new CommandHistory(world));
    const out: BuildingLayoutOut = {};
    build.run('house', build.planHouse(8, 5, 8, houseOptions(blocks, { type: 'house', width: 7, depth: 7, floors: 2, wall: 'planks' }), out));
    expect(out.layout!.ladders.length).toBe(1);
    const ladder = out.layout!.ladders[0];
    const player = new PlayerController(world, blocks, { x: ladder.x + 0.2, y: ladder.bottom, z: ladder.z - 0.2 }); // inside the ladder's cell
    for (let i = 0; i < 60 * 6; i++) player.update(1 / 60, HOLD_JUMP, 0);
    expect(player.y, `ladder: at ${player.x.toFixed(2)},${player.y.toFixed(2)},${player.z.toFixed(2)}`).toBeGreaterThanOrEqual(ladder.top - 0.2);
  });
});
