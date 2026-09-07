import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { BuildTools, type BuildingLayoutOut } from '../../src/engine/build/BuildTools';
import { earthworkOptions, houseOptions } from '../../src/engine/build/buildingKit';
import { BLUEPRINTS } from '../../src/engine/build/blueprints';
import { checkLivability } from '../../src/engine/build/livability';
import { parseEarthwork } from '../../src/engine/chat/buildRequest';
import { CommandHistory } from '../../src/engine/commands/CommandHistory';
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
