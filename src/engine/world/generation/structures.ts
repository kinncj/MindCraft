import { B } from '../../blocks/blocks';
import type { BlockEntity } from '../Chunk';

export type TreeKind = 'oak' | 'birch' | 'cherry' | 'pine' | 'big_oak';

type Writer = (x: number, y: number, z: number, id: number, onlyAir?: boolean) => void;

/** Grows a tree with its base on the block at (x, baseY, z). */
export function placeTree(kind: TreeKind, x: number, baseY: number, z: number, roll: number, write: Writer): void {
  const trunkHeight = kind === 'pine' ? 6 + Math.floor(roll * 3) : kind === 'big_oak' ? 7 + Math.floor(roll * 3) : 4 + Math.floor(roll * 3);
  const log = kind === 'birch' ? B.birch_wood : B.wood;
  if (kind === 'big_oak') {
    // A 2×2 trunk with a wide, layered crown — a climbing tree.
    for (let i = 1; i <= trunkHeight; i++) {
      write(x, baseY + i, z, log, false);
      write(x + 1, baseY + i, z, log, false);
      write(x, baseY + i, z + 1, log, false);
      write(x + 1, baseY + i, z + 1, log, false);
    }
    const top = baseY + trunkHeight;
    const crown: Array<[number, number]> = [[top - 3, 3], [top - 2, 4], [top - 1, 4], [top, 3], [top + 1, 2], [top + 2, 1]];
    for (const [y, radius] of crown) {
      for (let dx = -radius; dx <= radius + 1; dx++) {
        for (let dz = -radius; dz <= radius + 1; dz++) {
          const ex = dx > 0 ? dx - 1 : dx;
          const ez = dz > 0 ? dz - 1 : dz;
          if (ex * ex + ez * ez > radius * radius + 1) continue;
          write(x + dx, y, z + dz, B.leaves);
        }
      }
    }
    return;
  }
  const leaf = kind === 'cherry' ? B.pink_leaves : kind === 'birch' ? B.birch_leaves : B.leaves;
  for (let i = 1; i <= trunkHeight; i++) write(x, baseY + i, z, log, false);
  const top = baseY + trunkHeight;

  if (kind === 'pine') {
    // Layered cone.
    let radius = 1;
    for (let y = top + 1; y >= baseY + 3; y -= 2) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dz = -radius; dz <= radius; dz++) {
          if (Math.abs(dx) + Math.abs(dz) > radius + (radius > 1 ? 1 : 0)) continue;
          write(x + dx, y, z + dz, leaf);
          if (y - 1 > baseY + 2) write(x + dx, y - 1, z + dz, leaf);
        }
      }
      radius = Math.min(radius + 1, 3);
    }
    write(x, top + 2, z, leaf);
    return;
  }

  // Round crown: two wide layers, one medium, one cap.
  const layers: Array<[number, number]> = [
    [top - 1, 2],
    [top, 2],
    [top + 1, 1],
    [top + 2, kind === 'cherry' ? 1 : 0],
  ];
  for (const [y, radius] of layers) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const corner = Math.abs(dx) === radius && Math.abs(dz) === radius && radius > 0;
        if (corner && roll > 0.5) continue;
        write(x + dx, y, z + dz, leaf);
      }
    }
  }
}

export type TemplateBlock = {
  x: number;
  y: number;
  z: number;
  id: number;
  state?: number;
  entity?: BlockEntity;
};

export function containerEntity(name: string, items: Array<{ blockType: string; quantity: number }>): BlockEntity {
  return { kind: 'container', data: { name, items } };
}

/** The landmarks every new world starts with, around the spawn point. */
export function starterPlazaTemplate(spawn: { x: number; y: number; z: number }): TemplateBlock[] {
  const y = spawn.y;
  const out: TemplateBlock[] = [];
  const put = (dx: number, dy: number, dz: number, id: number): void => {
    out.push({ x: spawn.x + dx, y: y + dy, z: spawn.z + dz, id });
  };
  // Rainbow arch.
  put(-6, 0, -3, B.rainbow);
  put(-6, 1, -3, B.rainbow);
  put(-5, 2, -3, B.rainbow);
  put(-4, 2, -3, B.rainbow);
  put(-3, 1, -3, B.rainbow);
  put(-3, 0, -3, B.rainbow);
  put(-5, 0, 4, B.star);
  put(5, 0, -5, B.light);
  put(4, 0, 4, B.flower_pink);
  put(3, 0, -4, B.campfire);
  out.push({
    x: spawn.x + 2,
    y,
    z: spawn.z - 2,
    id: B.magic_box,
    entity: containerEntity('Magic Delivery Box', [
      { blockType: 'star', quantity: 3 },
      { blockType: 'rainbow', quantity: 2 },
    ]),
  });
  return out;
}

/**
 * Toy Land: a playroom on a flat world. Toy chest, giant play-block
 * towers, a checkered mat, a campfire circle, and two original toy
 * statues (a cowboy doll and an astronaut toy).
 */
export function toyLandTemplate(spawn: { x: number; y: number; z: number }): TemplateBlock[] {
  const out: TemplateBlock[] = [];
  const floorY = spawn.y - 1;
  const y = spawn.y;
  const put = (x: number, py: number, z: number, id: number): void => {
    out.push({ x, y: py, z, id });
  };

  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      if ((dx + dz) % 2 === 0) continue;
      put(spawn.x + dx, floorY, spawn.z + dz, B.planks);
    }
  }
  out.push({
    x: spawn.x,
    y,
    z: spawn.z,
    id: B.magic_box,
    entity: containerEntity('Toy Chest', [
      { blockType: 'star', quantity: 5 },
      { blockType: 'rainbow', quantity: 5 },
      { blockType: 'brick', quantity: 5 },
    ]),
  });

  const towerTypes = [B.rainbow, B.brick, B.star, B.light, B.glass];
  const towers: Array<[number, number, number]> = [
    [spawn.x - 8, spawn.z - 8, 4],
    [spawn.x + 8, spawn.z - 7, 3],
    [spawn.x + 9, spawn.z + 8, 5],
    [spawn.x - 9, spawn.z + 7, 3],
  ];
  for (const [tx, tz, height] of towers) {
    for (let i = 0; i < height; i++) put(tx, y + i, tz, towerTypes[i % towerTypes.length]);
  }

  put(spawn.x - 4, y, spawn.z + 9, B.campfire);
  put(spawn.x - 6, y, spawn.z + 9, B.torch);
  put(spawn.x - 2, y, spawn.z + 9, B.torch);

  const statue = (baseX: number, baseZ: number, layers: Array<Array<[number, number, number]>>): void => {
    layers.forEach((layer, dy) => {
      for (const [dx, dz, id] of layer) put(baseX + dx, y + dy, baseZ + dz, id);
    });
  };
  // Cowboy doll: boots, jeans, red shirt, face, wide hat.
  statue(spawn.x - 10, spawn.z, [
    [[0, 0, B.wood], [1, 0, B.wood]],
    [[0, 0, B.color_blue], [1, 0, B.color_blue]],
    [[0, 0, B.color_blue], [1, 0, B.color_blue]],
    [[-1, 0, B.brick], [0, 0, B.brick], [1, 0, B.brick], [2, 0, B.brick]],
    [[0, 0, B.brick], [1, 0, B.brick]],
    [[0, 0, B.sand], [1, 0, B.sand]],
    [[-1, 0, B.wood], [0, 0, B.wood], [1, 0, B.wood], [2, 0, B.wood]],
    [[0, 0, B.wood], [1, 0, B.wood]],
  ]);
  // Astronaut toy: white suit, star chest, glass visor, glowing jetpack.
  statue(spawn.x + 9, spawn.z, [
    [[0, 0, B.snow], [1, 0, B.snow]],
    [[0, 0, B.snow], [1, 0, B.snow]],
    [[0, 0, B.snow], [1, 0, B.snow]],
    [[-1, 0, B.snow], [0, 0, B.star], [1, 0, B.star], [2, 0, B.snow], [0, 1, B.light], [1, 1, B.light]],
    [[-1, 0, B.snow], [0, 0, B.snow], [1, 0, B.snow], [2, 0, B.snow]],
    [[0, 0, B.glass], [1, 0, B.glass]],
    [[0, 0, B.snow], [1, 0, B.snow]],
  ]);

  for (const [fx, fz] of [[-13, -4], [13, 4], [3, -12], [-3, 13]]) {
    put(spawn.x + fx, y, spawn.z + fz, B.flower_pink);
  }
  return out;
}
