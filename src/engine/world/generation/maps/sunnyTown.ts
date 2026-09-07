import { B } from '../../../blocks/blocks';
import { BlockState } from '../../../blocks/BlockState';
import { blueprintById } from '../../../build/blueprints';
import { MapBuilder, type PresetMap } from './MapBuilder';

/**
 * Sunny Town: a little roleplay town. A grid of streets with sidewalks,
 * lamps and crosswalks; eight painted houses; a school with a playground;
 * a bakery cafe; a fire station with its truck; a clinic; a shop; a farm;
 * a construction site; a park with a pool, a stage, and trees; a pond with
 * a boat. Every building has a villager with that job, plus pets and cars.
 * An original town, inspired by roleplay games, copying none.
 */
export function buildSunnyTown(floorY = 4): PresetMap {
  const m = new MapBuilder('town', floorY);
  const F = floorY;
  const y = F + 1;
  const R = (n: number): number => BlockState.withRotation(0, n);
  const SIZE = 160;
  const ROADS = [24, 72, 120];

  // --- Streets: asphalt with dashes, sidewalks, crosswalks, street lamps.
  for (const c of ROADS) {
    m.box(c - 2, F, 0, c + 2, F, SIZE - 1, B.color_black);
    m.box(0, F, c - 2, SIZE - 1, F, c + 2, B.color_black);
    m.box(c - 3, F, 0, c - 3, F, SIZE - 1, B.sandstone);
    m.box(c + 3, F, 0, c + 3, F, SIZE - 1, B.sandstone);
    m.box(0, F, c - 3, SIZE - 1, F, c - 3, B.sandstone);
    m.box(0, F, c + 3, SIZE - 1, F, c + 3, B.sandstone);
    for (let i = 0; i < SIZE; i += 4) {
      if (!ROADS.some((r) => Math.abs(i - r) <= 3)) {
        m.put(c, F, i, B.color_yellow);
        m.put(i, F, c, B.color_yellow);
      }
    }
  }
  for (const cx of ROADS) for (const cz of ROADS) {
    for (let i = -2; i <= 2; i++) {
      m.put(cx + i, F, cz - 3, B.color_white);
      m.put(cx + i, F, cz + 3, B.color_white);
      m.put(cx - 3, F, cz + i, B.color_white);
      m.put(cx + 3, F, cz + i, B.color_white);
    }
    m.lamp(cx - 4, cz - 4);
    m.lamp(cx + 4, cz + 4);
  }

  // --- Houses on the lots along the first street, each painted a color.
  const house = blueprintById('cozy_house')!.stamp;
  const paints = [B.color_blue, B.color_pink, B.color_yellow, B.color_green, B.color_purple, B.color_orange, B.color_white, B.color_red];
  const lots: Array<[number, number, number]> = [
    [6, 6, 0], [34, 6, 0], [50, 6, 0], [6, 34, 1], [34, 34, 2], [50, 34, 2], [130, 6, 0], [146, 34, 1],
  ];
  lots.forEach(([lx, lz, rot], i) => {
    const paint = paints[i % paints.length];
    m.stamp(house, lx, F, lz, rot, (id) => (id === B.planks ? paint : id));
    // Blueprint floors are planks; restore a warm floor under the paint.
    for (let x = lx; x < lx + 5; x++) for (let z = lz; z < lz + 5; z++) m.put(x, F, z, B.planks);
    m.checker(lx - 2, lz - 2, lx + 6, lz + 6, F, B.grass, B.grass);
    m.put(lx + 6, y, lz + 6, B.flower_pink);
    m.put(lx - 2, y, lz - 2, B.flower_yellow);
  });
  m.pet('cat', 'Pepper', 12, 12, 'wander');
  m.pet('dog', 'Rex', 40, 16);

  // --- School (north-east lot): brick, big windows, a flag, a playground.
  m.building(80, 6, 100, 18, 5, B.brick, B.stone_bricks, B.roof_tiles);
  m.windows(81, 6, 99, 6, y + 2, 0, 2);
  m.windows(81, 18, 99, 18, y + 2, 0, 2);
  m.put(90, y, 18, 0); m.put(90, y + 1, 18, 0); m.door(90, 18, 0);
  for (let x = 82; x <= 98; x += 4) for (let z = 8; z <= 16; z += 4) { m.put(x, y, z, B.table, BlockState.withTopHalf(0, true)); m.put(x, y, z + 1, B.chair, R(2)); }
  m.put(90, y, 8, B.bookshelf); m.put(91, y, 8, B.bookshelf); m.put(89, y, 8, B.tv, R(2));
  for (let h = 1; h <= 8; h++) m.put(103, F + h, 8, B.fence);
  m.put(104, F + 8, 8, B.color_red); m.put(105, F + 8, 8, B.color_red); m.put(104, F + 7, 8, B.color_red);
  // Playground: slide and a climbing frame.
  m.walls(104, y, 12, 118, y, 20, B.fence);
  for (let i = 0; i < 4; i++) m.put(108, y + i, 14 + i, B.planks_stairs, R(2));
  m.box(108, y, 18, 108, y + 3, 18, B.planks);
  for (let i = 0; i < 4; i++) m.put(108, y + 3 - i, 19 + i, B.ice);
  m.box(113, y, 14, 116, y + 3, 17, B.fence);
  for (let h = 0; h <= 3; h++) m.put(113, y + h, 14, B.ladder, R(1));
  m.box(113, y + 4, 14, 116, y + 4, 17, B.planks_slab);
  m.villager('teacher', 'Nia', 92, 12, { x: 92, z: 12 });

  // --- Bakery cafe (east lot): sandstone, counter, stove, fridge, tables.
  m.building(80, 30, 96, 42, 4, B.sandstone, B.planks, B.roof_tiles);
  m.windows(80, 31, 80, 41, y + 1, 1, 1);
  m.put(88, y, 42, 0); m.put(88, y + 1, 42, 0); m.door(88, 42, 0);
  m.box(82, y, 33, 90, y, 33, B.planks_slab, BlockState.withTopHalf(0, true));
  m.put(83, y, 32, B.stove, R(2)); m.put(85, y, 32, B.fridge, R(2)); m.put(87, y, 32, B.sink, BlockState.withTopHalf(0, true));
  m.put(84, y + 1, 33, B.cake);
  for (const [tx, tz] of [[83, 38], [88, 38], [93, 36]] as const) { m.put(tx, y, tz, B.table, BlockState.withTopHalf(0, true)); m.put(tx + 1, y, tz, B.chair, R(3)); m.put(tx - 1, y, tz, B.chair, R(1)); }
  m.put(92, y + 2, 42, B.painting, R(0));
  m.villager('baker', 'Mia', 86, 36, { x: 86, z: 36 });

  // --- Fire station (south-east): red with a big open bay and the truck.
  m.building(104, 30, 118, 44, 6, B.color_red, B.stone_bricks, B.color_white);
  m.box(107, y, 44, 114, y + 4, 44, 0); // open bay
  m.windows(104, 32, 104, 42, y + 3, 1, 2);
  m.box(110, y + 7, 36, 110, y + 9, 36, B.fence); m.put(110, y + 10, 36, B.color_red);
  m.put(106, y, 32, B.bed, R(1)); m.put(106, y, 34, B.bed, R(1));
  m.put(116, y, 32, B.button, R(2)); m.put(116, y, 33, B.logic_lamp);
  m.vehicle('car', 110, 38, '#e8574f');
  m.villager('firefighter', 'Kai', 112, 47, { x: 112, z: 47 });

  // --- Clinic (south lot): white with a red cross and beds.
  m.building(6, 80, 20, 92, 4, B.color_white, B.color_white, B.color_blue);
  m.put(13, y, 92, 0); m.put(13, y + 1, 92, 0); m.door(13, 92, 0);
  for (const [dx, dy] of [[0, 2], [0, 3], [0, 4], [-1, 3], [1, 3]] as const) m.put(13 + dx, y + dy, 80, B.color_red);
  for (const z of [83, 86, 89]) { m.put(8, y, z, B.bed, R(1)); m.put(17, y, z, B.bed, R(3)); }
  m.put(12, y, 82, B.flower_pot); m.put(14, y, 82, B.table, BlockState.withTopHalf(0, true));
  m.villager('doctor', 'Ava', 13, 87, { x: 13, z: 87 });

  // --- Shop (south lot): blue with a glass front and shelves.
  m.building(34, 80, 50, 92, 4, B.color_blue, B.planks, B.sandstone);
  for (let x = 35; x <= 49; x++) for (let h = 1; h <= 3; h++) m.put(x, F + h, 92, B.glass);
  m.put(42, y, 92, 0); m.put(42, y + 1, 92, 0); m.door(42, 92, 0);
  for (const x of [36, 40, 44, 48]) { m.box(x, y, 82, x, y + 2, 88, B.bookshelf); }
  m.put(38, y, 90, B.fridge, R(0)); m.put(46, y, 90, B.fridge, R(0));
  m.container(42, y, 84, 'Shop Shelf', [{ blockType: 'cake', quantity: 3 }, { blockType: 'rainbow', quantity: 3 }, { blockType: 'balloon' as string, quantity: 0 }].filter((i) => i.quantity > 0));
  m.villager('shopkeeper', 'Sam', 42, 86, { x: 42, z: 86 });

  // --- Farm (south-west): fence, hay, pumpkins, a barn.
  m.walls(6, y, 100, 40, y, 130, B.fence);
  m.floor(7, 101, 39, 129, F, B.dirt);
  for (let x = 9; x <= 37; x += 4) for (let z = 103; z <= 127; z += 3) m.put(x, y, z, (x + z) % 2 === 0 ? B.pumpkin : B.hay);
  for (let x = 11; x <= 35; x += 4) for (let z = 104; z <= 126; z += 3) m.put(x, y, z, B.tall_grass);
  m.building(28, 132, 40, 142, 5, B.color_red, B.planks, B.roof_tiles);
  m.put(34, y, 132, 0); m.put(34, y + 1, 132, 0); m.door(34, 132, 2);
  m.box(30, y, 136, 33, y, 139, B.hay);
  m.put(20, y, 100, 0); m.put(20, y, 100, B.fence);
  m.villager('farmer', 'Leo', 22, 115, { x: 22, z: 115 });
  m.pet('dog', 'Nugget', 24, 118);

  // --- Construction site (west-middle): half a house, scaffolding, a robot.
  m.building(6, 50, 18, 62, 3, B.cobblestone, B.stone_bricks, null);
  m.box(6, y + 4, 50, 18, y + 4, 50, 0);
  for (let x = 6; x <= 18; x += 3) { m.put(x, y + 4, 62, B.planks_slab); m.box(x, y, 64, x, y + 5, 64, B.fence); m.put(x, y + 6, 64, B.planks_slab); }
  m.box(20, y, 52, 22, y + 1, 54, B.brick); m.box(20, y, 56, 22, y, 58, B.planks);
  m.put(24, y, 52, B.crafting_table, R(1));
  m.villager('builder', 'Ben', 12, 66, { x: 12, z: 66 });
  m.robot('Bolt', 24, 56);

  // --- Park (center): lawn, paths, trees, flowers, pool, garden, stage, benches.
  m.floor(76, 76, 116, 116, F, B.grass);
  m.walls(76, y, 76, 116, y, 116, B.fence);
  for (const gate of [[96, 76], [96, 116], [76, 96], [116, 96]] as const) { m.put(gate[0], y, gate[1], 0); m.put(gate[0] === 96 ? 95 : gate[0], y, gate[0] === 96 ? gate[1] : 95, 0); }
  m.box(96, F, 77, 96, F, 115, B.sandstone); m.box(77, F, 96, 115, F, 96, B.sandstone);
  for (const [tx, tz, leaf] of [[80, 80, B.leaves], [112, 80, B.pink_leaves], [80, 112, B.leaves], [112, 112, B.birch_leaves], [86, 104, B.pink_leaves]] as const) m.tree(tx, tz, 5, leaf, leaf === B.birch_leaves ? B.birch_wood : B.wood);
  for (let x = 78; x <= 114; x += 5) for (let z = 78; z <= 114; z += 7) if (m.get(x, y, z) === -1 && m.get(x, F, z) === B.grass) m.put(x, y, z, [B.flower_pink, B.flower_yellow, B.flower_blue, B.flower_red][(x + z) % 4]);
  m.stamp(blueprintById('pool')!.stamp, 100, F, 100, 0);
  m.stamp(blueprintById('garden')!.stamp, 100, F, 80, 0);
  // Stage with note blocks for the musician.
  m.box(80, y, 98, 88, y, 104, B.planks_slab, BlockState.withTopHalf(0, true));
  for (let i = 0; i < 5; i++) m.put(81 + i * 2, y + 1, 99, B.note_block, BlockState.withVariant(0, [0, 2, 4, 7, 9][i]));
  m.put(84, y + 1, 103, B.button, R(0)); m.put(84, y + 1, 102, B.wire);
  for (const [bx, bz] of [[90, 90], [102, 90], [90, 108]] as const) { m.put(bx, y, bz, B.chair, R(0)); m.put(bx + 1, y, bz, B.chair, R(0)); }
  m.put(96, y, 96, B.campfire); m.put(95, y, 95, B.torch); m.put(97, y, 97, B.torch);
  m.villager('musician', 'Ruby', 84, 100, { x: 84, z: 100 });
  m.pet('dog', 'Waffles', 92, 92);

  // --- Pond (south-east) with a boat and a little dock.
  m.floor(128, 128, 150, 150, F, B.sand);
  m.floor(131, 131, 147, 147, F, B.water);
  m.box(128, F, 130, 130, F, 132, B.planks);
  m.box(131, F, 131, 133, F, 131, B.planks);
  m.vehicle('boat', 138, 138, '#c98d4b', F + 0.35);
  m.tree(152, 152, 4, B.leaves);
  m.tree(126, 152, 4, B.pink_leaves);

  // --- Cars parked on the streets.
  m.vehicle('car', 72, 60, '#4a7fd6');
  m.vehicle('car', 30, 24, '#ffd94a');

  // --- Town square spawn: a fountain by the central intersection.
  m.box(66, y, 66, 68, y, 68, B.stone_bricks);
  m.put(67, y, 67, B.water);
  m.put(67, y + 1, 67, B.stone_bricks);
  m.put(67, y + 2, 67, B.water);
  m.container(64, y, 66, 'Welcome Box', [{ blockType: 'cake', quantity: 2 }, { blockType: 'balloon', quantity: 0 }].filter((i) => i.quantity > 0));
  m.put(70, y, 64, B.painting, R(1));

  return m.finish({ x: 62, y, z: 68 });
}
