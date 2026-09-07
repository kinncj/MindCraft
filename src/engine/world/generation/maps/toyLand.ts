import { B } from '../../../blocks/blocks';
import { BlockState } from '../../../blocks/BlockState';
import { MapBuilder, type PresetMap } from './MapBuilder';

/**
 * Toy Land: a kid's bedroom seen from toy size. A giant bed, a nightstand
 * with a lamp, a bookshelf mountain to climb, giant crayons, a toy train on
 * its track, a race track with a real car, a block tower, a row of toy
 * soldiers, a friendly dinosaur, a rocket, a piggy bank, balloons, a slide,
 * the toy chest, and the cowboy doll and astronaut toy. All original toys.
 */
export function buildToyLand(floorY = 4): PresetMap {
  const m = new MapBuilder('toyland', floorY);
  const F = floorY;
  const y = F + 1;
  const R = (n: number): number => BlockState.withRotation(0, n);

  // --- The room: wooden floor with a rug, striped walls, a big window, a door.
  m.checker(4, 4, 91, 91, F, B.planks, B.birch_planks, 4);
  m.floor(30, 30, 66, 66, F, B.color_blue);
  m.floor(34, 34, 62, 62, F, B.color_white);
  m.floor(38, 38, 58, 58, F, B.color_blue);
  for (let x = 4; x <= 91; x++) for (let z = 4; z <= 91; z++) {
    if (x !== 4 && x !== 91 && z !== 4 && z !== 91) continue;
    const stripe = ((x + z) % 8 === 0) ? B.color_pink : B.color_yellow;
    for (let h = 1; h <= 24; h++) m.put(x, F + h, z, stripe);
  }
  m.walls(4, F + 25, 4, 91, F + 25, 91, B.color_white); // picture rail
  for (let x = 28; x <= 68; x++) for (let h = 8; h <= 20; h++) m.put(x, F + h, 4, B.glass);
  for (let x = 28; x <= 68; x += 8) for (let h = 8; h <= 20; h++) m.put(x, F + h, 4, B.birch_planks); // window frame
  m.put(47, y, 91, 0);
  m.put(47, y + 1, 91, 0);
  m.put(48, y, 91, 0);
  m.put(48, y + 1, 91, 0);
  m.door(47, 91, 0);
  m.door(48, 91, 0);

  // --- Giant bed (north-west): frame, mattress, blanket, pillows, headboard.
  m.box(8, y, 8, 25, y, 35, B.planks);
  m.box(8, y + 1, 8, 25, y + 1, 35, B.color_white);
  m.box(8, y + 2, 14, 25, y + 2, 35, B.color_red);
  for (let x = 8; x <= 25; x += 3) for (let z = 14; z <= 35; z += 3) m.put(x, y + 2, z, B.color_pink);
  m.box(9, y + 2, 9, 16, y + 3, 12, B.color_white);
  m.box(17, y + 2, 9, 24, y + 3, 12, B.color_white);
  m.box(8, y + 1, 8, 25, y + 6, 8, B.planks);
  m.box(10, y + 5, 8, 23, y + 6, 8, B.birch_planks);
  // Nightstand with a lamp and a book.
  m.box(28, y, 8, 31, y + 2, 11, B.planks);
  m.put(29, y + 3, 9, B.lamp_on);
  m.put(31, y + 3, 11, B.bookshelf);

  // --- Bookshelf mountain (north-east): stepped shelves you can climb.
  const shelfHeights = [10, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < shelfHeights.length; i++) {
    const x0 = 70 + i * 2;
    m.box(x0, y, 8, x0 + 1, y + shelfHeights[i] - 1, 16, B.bookshelf);
    m.box(x0, y + shelfHeights[i], 8, x0 + 1, y + shelfHeights[i], 16, B.planks);
  }
  m.put(70, y + 11, 12, B.lantern);

  // --- Giant crayons (south): eight colors, paper wrapper, pointed tip.
  const crayons = [B.color_red, B.color_orange, B.color_yellow, B.color_green, B.color_blue, B.color_purple, B.color_pink, B.color_brown];
  crayons.forEach((color, i) => {
    const x = 10 + i * 9;
    m.box(x, y, 80, x + 2, y + 11, 82, color);
    m.box(x, y + 4, 80, x + 2, y + 6, 82, B.color_white);
    m.box(x + 1, y + 12, 81, x + 1, y + 13, 81, color);
    m.put(x + 1, y + 14, 81, B.color_black);
  });

  // --- Toy train and track (center ring around the rug).
  const rail = (x: number, z: number): void => {
    m.put(x, F, z, B.color_black);
  };
  for (let x = 32; x <= 64; x++) {
    rail(x, 31);
    rail(x, 33);
    rail(x, 63);
    rail(x, 65);
  }
  for (let z = 31; z <= 65; z++) {
    rail(31, z);
    rail(33, z);
    rail(63, z);
    rail(65, z);
  }
  for (let x = 32; x <= 64; x += 3) {
    m.put(x, F, 32, B.planks);
    m.put(x, F, 64, B.planks);
  }
  for (let z = 32; z <= 64; z += 3) {
    m.put(32, F, z, B.planks);
    m.put(64, F, z, B.planks);
  }
  // Engine on the west rail, two cars behind it.
  m.box(31, y, 40, 33, y + 1, 43, B.color_red);
  m.box(31, y + 2, 42, 33, y + 3, 43, B.color_red);
  m.put(32, y + 3, 42, B.glass);
  m.put(32, y + 2, 40, B.color_black);
  m.put(32, y + 3, 40, B.color_black);
  m.put(32, y + 4, 40, B.color_yellow);
  m.box(31, y, 45, 33, y + 1, 48, B.color_blue);
  m.box(31, y, 50, 33, y + 1, 53, B.color_green);
  for (const z of [44, 49]) m.put(32, y, z, B.fence);

  // --- Race track (south-east) with a real car.
  m.floor(62, 62, 88, 88, F, B.color_black);
  m.floor(67, 67, 83, 83, F, B.grass);
  for (let x = 62; x <= 88; x += 4) {
    m.put(x, F, 64, B.color_yellow);
    m.put(x, F, 86, B.color_yellow);
  }
  for (let z = 62; z <= 88; z += 4) {
    m.put(64, F, z, B.color_yellow);
    m.put(86, F, z, B.color_yellow);
  }
  m.box(70, y, 72, 80, y, 72, B.color_white); // finish line
  m.vehicle('car', 75, 64, '#4a7fd6');

  // --- Block tower (west): stacked giant blocks, each turned a little.
  const towerColors = [B.color_red, B.color_blue, B.color_yellow, B.color_green];
  towerColors.forEach((color, i) => {
    const ox = 12 + (i % 2 === 0 ? 0 : 1);
    const oz = 50 + (i % 2 === 0 ? 0 : 1);
    m.box(ox, y + i * 4, oz, ox + 3, y + i * 4 + 3, oz + 3, color);
    m.put(ox + 1, y + i * 4 + 1, oz - 1 + (i % 2), B.color_white); // a "letter" dot
  });
  m.put(13, y + 16, 51, B.star);

  // --- Toy soldiers (east): five green figures in a row.
  for (let i = 0; i < 5; i++) {
    const x = 60 + i * 4;
    const z = 20;
    m.box(x, y, z, x + 1, y, z, B.color_green);
    m.box(x, y + 1, z, x + 1, y + 3, z, B.color_green);
    m.box(x, y + 4, z, x + 1, y + 5, z, B.color_green);
    m.put(x, y + 6, z, B.color_green);
    m.put(x + 1, y + 6, z, B.color_green);
    m.put(x + 1, y + 3, z + 1, B.color_green); // rifle arm → a flag instead: friendly
  }
  m.box(60, F, 18, 78, F, 22, B.color_green); // their base plate

  // --- Friendly dinosaur (north-center): a green long-neck, kid-sized.
  m.box(40, y, 12, 51, y + 5, 16, B.color_green);
  for (const [lx, lz] of [[41, 12], [41, 16], [50, 12], [50, 16]] as const) m.box(lx, y, lz, lx + 1, y + 1, lz, B.color_green);
  m.box(52, y + 4, 13, 55, y + 9, 15, B.color_green); // neck
  m.box(54, y + 10, 12, 58, y + 12, 16, B.color_green); // head
  m.put(58, y + 11, 13, B.color_black);
  m.put(58, y + 11, 15, B.color_black);
  m.put(59, y + 10, 14, B.color_pink); // smile spot
  for (let i = 0; i < 4; i++) m.box(39 - i, y + 4 - i, 14, 39 - i, y + 4 - i, 14, B.color_green); // tail
  for (let x = 41; x <= 50; x += 2) m.put(x, y + 6, 14, B.color_yellow); // spikes

  // --- Rocket (south-west): white body, red fins, round window, star on top.
  m.box(28, y, 66, 30, y + 11, 68, B.color_white);
  for (const [dx, dz] of [[-1, 0], [3, 0], [0, -1], [0, 3]] as const) m.box(28 + dx, y, 66 + dz, 28 + dx + (dz === 0 ? 0 : 2), y + 2, 66 + dz + (dx === 0 ? 0 : 2), B.color_red);
  m.put(29, y + 6, 66, B.glass);
  m.box(29, y + 12, 67, 29, y + 13, 67, B.color_red);
  m.put(29, y + 14, 67, B.star);
  m.put(29, y + 3, 67, B.light);

  // --- Piggy bank (east-center), pink and round-ish.
  m.box(72, y + 1, 44, 79, y + 5, 48, B.color_pink);
  m.box(73, y + 2, 43, 78, y + 4, 49, B.color_pink);
  for (const [lx, lz] of [[73, 44], [73, 48], [78, 44], [78, 48]] as const) m.put(lx, y, lz, B.color_pink);
  m.box(80, y + 2, 45, 80, y + 3, 47, B.color_pink); // snout
  m.put(80, y + 3, 46, B.color_black);
  m.put(75, y + 6, 46, B.color_black); // coin slot
  m.put(76, y + 6, 46, B.color_black);
  m.put(73, y + 4, 42, B.color_black);
  m.put(78, y + 4, 42, B.color_black); // eyes

  // --- Balloons on strings (near the door).
  const balloons = [[40, 84, B.color_pink], [44, 86, B.color_blue], [52, 86, B.color_yellow], [56, 84, B.color_green]] as const;
  for (const [x, z, color] of balloons) {
    for (let h = 1; h <= 6; h++) m.put(x, y + h - 1, z, B.fence);
    m.box(x - 1, y + 6, z - 1, x + 1, y + 8, z + 1, color);
    m.put(x, y + 9, z, color);
  }

  // --- Slide: stairs up, an icy slide down.
  for (let i = 0; i < 6; i++) m.put(20, y + i, 60 + i, B.planks_stairs, R(2));
  m.box(20, y, 66, 20, y + 5, 66, B.planks);
  for (let i = 0; i < 6; i++) m.put(20, y + 5 - i, 67 + i, B.ice);
  for (let i = 0; i < 6; i++) {
    m.put(19, y + 5 - i, 67 + i, B.fence);
    m.put(21, y + 5 - i, 67 + i, B.fence);
  }

  // --- Toy chest at the center of the rug, with treasures.
  m.box(46, y, 46, 49, y, 49, B.planks);
  m.container(47, y + 1, 47, 'Toy Chest', [
    { blockType: 'star', quantity: 5 },
    { blockType: 'rainbow', quantity: 5 },
    { blockType: 'brick', quantity: 5 },
    { blockType: 'cake', quantity: 1 },
  ]);
  m.put(48, y + 1, 48, B.cake);

  // --- Cowboy doll and astronaut toy (original block sculptures).
  const statue = (bx: number, bz: number, layers: Array<Array<[number, number, number]>>): void => {
    layers.forEach((layer, dy) => {
      for (const [dx, dz, id] of layer) m.put(bx + dx, y + dy, bz + dz, id);
    });
  };
  statue(60, 34, [
    [[0, 0, B.wood], [1, 0, B.wood]],
    [[0, 0, B.color_blue], [1, 0, B.color_blue]],
    [[0, 0, B.color_blue], [1, 0, B.color_blue]],
    [[-1, 0, B.brick], [0, 0, B.brick], [1, 0, B.brick], [2, 0, B.brick]],
    [[0, 0, B.brick], [1, 0, B.brick]],
    [[0, 0, B.sand], [1, 0, B.sand]],
    [[-1, 0, B.wood], [0, 0, B.wood], [1, 0, B.wood], [2, 0, B.wood]],
    [[0, 0, B.wood], [1, 0, B.wood]],
  ]);
  statue(36, 34, [
    [[0, 0, B.snow], [1, 0, B.snow]],
    [[0, 0, B.snow], [1, 0, B.snow]],
    [[0, 0, B.snow], [1, 0, B.snow]],
    [[-1, 0, B.snow], [0, 0, B.star], [1, 0, B.star], [2, 0, B.snow], [0, 1, B.light], [1, 1, B.light]],
    [[-1, 0, B.snow], [0, 0, B.snow], [1, 0, B.snow], [2, 0, B.snow]],
    [[0, 0, B.glass], [1, 0, B.glass]],
    [[0, 0, B.snow], [1, 0, B.snow]],
  ]);

  // --- Friends who live here.
  m.villager('musician', 'Luna', 44, 56, { x: 44, z: 56 });
  m.villager('teacher', 'Theo', 52, 40, { x: 52, z: 40 });
  m.pet('dog', 'Biscuit', 50, 52);
  m.pet('cat', 'Mochi', 30, 14, 'wander');
  m.robot('Beep', 40, 44);

  return m.finish({ x: 47, y: y, z: 54 });
}
