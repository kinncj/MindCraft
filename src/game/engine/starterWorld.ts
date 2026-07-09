import type { BlockPosition, BlockTypeId, MagicDeliveryBox, PlacedBlock } from '../../types/game';
import { WORLD_SIZE, makeBlock, newBlockId } from './world';

export type StarterWorldData = {
  blocks: PlacedBlock[];
  boxes: MagicDeliveryBox[];
};

/** Lakes sit at and below this height; beaches hug them. */
export const SEA_LEVEL = 3;

/** The flattened plaza where every new world starts. */
export const SPAWN = { x: 32, y: 5, z: 32 } as const;
const PLAZA_HEIGHT = 4;
const PLAZA_RADIUS = 9;

// --- Deterministic noise. Same seed, same world, every time. -------------

function hash2(x: number, z: number, seed: number): number {
  let h = (x * 374761393 + z * 668265263 + seed * 974634721) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 2 ** 32;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, z: number, seed: number, scale: number): number {
  const gx = Math.floor(x / scale);
  const gz = Math.floor(z / scale);
  const fx = smooth((x - gx * scale) / scale);
  const fz = smooth((z - gz * scale) / scale);
  const a = hash2(gx, gz, seed);
  const b = hash2(gx + 1, gz, seed);
  const c = hash2(gx, gz + 1, seed);
  const d = hash2(gx + 1, gz + 1, seed);
  return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
}

/** Terrain height for a column, before plaza flattening. 1..10-ish. */
function rawHeight(x: number, z: number, seed: number): number {
  const rolling = valueNoise(x, z, seed, 18) * 6;
  const detail = valueNoise(x, z, seed + 101, 6) * 2.5;
  return Math.max(1, Math.round(1 + rolling + detail));
}

function plazaBlend(x: number, z: number, height: number): number {
  const d = Math.hypot(x - SPAWN.x, z - SPAWN.z);
  if (d <= PLAZA_RADIUS) return PLAZA_HEIGHT;
  if (d <= PLAZA_RADIUS + 4) {
    const t = (d - PLAZA_RADIUS) / 4;
    return Math.round(PLAZA_HEIGHT + (height - PLAZA_HEIGHT) * t);
  }
  return height;
}

export function terrainHeight(x: number, z: number, seed: number): number {
  return plazaBlend(x, z, rawHeight(x, z, seed));
}

// --- World generation -----------------------------------------------------

function topBlockType(height: number): BlockTypeId {
  if (height <= SEA_LEVEL) return 'sand';
  if (height >= 9) return 'snow';
  return 'grass';
}

function underBlockType(top: BlockTypeId): BlockTypeId {
  if (top === 'sand') return 'sand';
  if (top === 'snow') return 'stone';
  return 'dirt';
}

function addTree(
  place: (type: BlockTypeId, pos: BlockPosition) => void,
  x: number,
  baseY: number,
  z: number,
): void {
  const trunkTop = baseY + 2;
  place('wood', { x, y: baseY + 1, z });
  place('wood', { x, y: baseY + 2, z });
  const crown: BlockPosition[] = [
    { x, y: trunkTop + 1, z },
    { x: x - 1, y: trunkTop + 1, z },
    { x: x + 1, y: trunkTop + 1, z },
    { x, y: trunkTop + 1, z: z - 1 },
    { x, y: trunkTop + 1, z: z + 1 },
    { x, y: trunkTop + 2, z },
  ];
  for (const pos of crown) {
    if (pos.x >= 0 && pos.x < WORLD_SIZE.width && pos.z >= 0 && pos.z < WORLD_SIZE.depth) {
      place('leaves', pos);
    }
  }
}

/**
 * Generates a fresh world: rolling hills, lakes with sandy shores, snowy
 * peaks, scattered trees and flowers — and a flat plaza at the center
 * with the landmarks every new player should find: a rainbow arch, a
 * star, a light, and the Magic Delivery Box.
 *
 * Deterministic for a given seed; reset uses a new random seed, so every
 * fresh world is a new place to explore.
 */
export function createStarterWorld(seed: number = Math.floor(Math.random() * 2 ** 31)): StarterWorldData {
  const blocks: PlacedBlock[] = [];
  const occupied = new Set<string>();

  function place(type: BlockTypeId, pos: BlockPosition): void {
    const key = `${pos.x},${pos.y},${pos.z}`;
    if (occupied.has(key)) return;
    occupied.add(key);
    blocks.push(makeBlock(type, pos));
  }

  for (let x = 0; x < WORLD_SIZE.width; x++) {
    for (let z = 0; z < WORLD_SIZE.depth; z++) {
      const height = terrainHeight(x, z, seed);
      const top = topBlockType(height);
      place(top, { x, y: height, z });
      if (height >= 1) {
        place(underBlockType(top), { x, y: height - 1, z });
      }
      // Fill lake water up to sea level.
      for (let y = height + 1; y <= SEA_LEVEL; y++) {
        place('water', { x, y, z });
      }

      const inPlaza = Math.hypot(x - SPAWN.x, z - SPAWN.z) <= PLAZA_RADIUS + 4;
      if (top === 'grass' && !inPlaza) {
        const roll = hash2(x, z, seed + 777);
        if (roll < 0.012) {
          addTree(place, x, height, z);
        } else if (roll > 0.975) {
          place('flower', { x, y: height + 1, z });
        }
      }
    }
  }

  // Plaza landmarks. The plaza is flat grass at PLAZA_HEIGHT, so
  // everything sits at PLAZA_HEIGHT + 1 = SPAWN.y.
  const y = SPAWN.y;
  // Rainbow arch to the west of the box.
  place('rainbow', { x: SPAWN.x - 6, y, z: SPAWN.z - 3 });
  place('rainbow', { x: SPAWN.x - 6, y: y + 1, z: SPAWN.z - 3 });
  place('rainbow', { x: SPAWN.x - 5, y: y + 2, z: SPAWN.z - 3 });
  place('rainbow', { x: SPAWN.x - 4, y: y + 2, z: SPAWN.z - 3 });
  place('rainbow', { x: SPAWN.x - 3, y: y + 1, z: SPAWN.z - 3 });
  place('rainbow', { x: SPAWN.x - 3, y, z: SPAWN.z - 3 });
  place('star', { x: SPAWN.x - 5, y, z: SPAWN.z + 4 });
  place('light', { x: SPAWN.x + 5, y, z: SPAWN.z - 5 });
  place('flower', { x: SPAWN.x + 4, y, z: SPAWN.z + 4 });

  // The Magic Delivery Box, dead center where the camera starts.
  const boxPosition = { x: SPAWN.x, y, z: SPAWN.z };
  place('magic-box', boxPosition);

  const boxes: MagicDeliveryBox[] = [
    {
      id: newBlockId(),
      name: 'Magic Delivery Box',
      position: boxPosition,
      items: [
        { blockType: 'star', quantity: 3 },
        { blockType: 'rainbow', quantity: 2 },
      ],
    },
  ];

  return { blocks, boxes };
}

/**
 * Toy Land: a flat, cozy playroom world — our own take on a kid's
 * toy-corner. A toy chest in the middle, stacked play-block towers, a
 * checkered play mat, a friendly campfire circle, and two big toy
 * statues built from blocks: a cowboy doll and an astronaut toy.
 * Both are original designs made of MindCraft blocks.
 */
export function createToyLandWorld(): StarterWorldData {
  const blocks: PlacedBlock[] = [];
  const occupied = new Set<string>();

  function place(type: BlockTypeId, pos: BlockPosition): void {
    if (
      pos.x < 0 ||
      pos.x >= WORLD_SIZE.width ||
      pos.z < 0 ||
      pos.z >= WORLD_SIZE.depth ||
      pos.y < 0 ||
      pos.y >= WORLD_SIZE.height
    ) {
      return;
    }
    const key = `${pos.x},${pos.y},${pos.z}`;
    if (occupied.has(key)) return;
    occupied.add(key);
    blocks.push(makeBlock(type, pos));
  }

  // Flat, friendly floor at the plaza height.
  for (let x = 0; x < WORLD_SIZE.width; x++) {
    for (let z = 0; z < WORLD_SIZE.depth; z++) {
      place('grass', { x, y: PLAZA_HEIGHT, z });
      place('dirt', { x, y: PLAZA_HEIGHT - 1, z });
    }
  }

  const y = SPAWN.y;

  // Checkered play mat around the toy chest.
  for (let dx = -5; dx <= 5; dx++) {
    for (let dz = -5; dz <= 5; dz++) {
      if ((dx + dz) % 2 === 0) continue;
      place('planks', { x: SPAWN.x + dx, y: PLAZA_HEIGHT, z: SPAWN.z + dz });
    }
  }

  // The toy chest.
  const boxPosition = { x: SPAWN.x, y, z: SPAWN.z };
  place('magic-box', boxPosition);

  // Stacked play-block towers, like giant alphabet blocks.
  const towerTypes: BlockTypeId[] = ['rainbow', 'brick', 'star', 'light', 'glass'];
  const towers: Array<[number, number, number]> = [
    [SPAWN.x - 8, SPAWN.z - 8, 4],
    [SPAWN.x + 8, SPAWN.z - 7, 3],
    [SPAWN.x + 9, SPAWN.z + 8, 5],
    [SPAWN.x - 9, SPAWN.z + 7, 3],
  ];
  for (const [tx, tz, height] of towers) {
    for (let i = 0; i < height; i++) {
      place(towerTypes[i % towerTypes.length], { x: tx, y: y + i, z: tz });
    }
  }

  // Cozy campfire circle with torches.
  place('campfire', { x: SPAWN.x - 4, y, z: SPAWN.z + 9 });
  place('torch', { x: SPAWN.x - 6, y, z: SPAWN.z + 9 });
  place('torch', { x: SPAWN.x - 2, y, z: SPAWN.z + 9 });

  // Statue helper: column layers described bottom-up.
  function statue(baseX: number, baseZ: number, layers: Array<Array<[number, number, BlockTypeId]>>): void {
    layers.forEach((layer, dy) => {
      for (const [dx, dz, type] of layer) {
        place(type, { x: baseX + dx, y: y + dy, z: baseZ + dz });
      }
    });
  }

  // A big cowboy doll: brown boots, denim-blue legs (ice), red shirt,
  // sandy face, wide wooden hat.
  statue(SPAWN.x - 10, SPAWN.z, [
    [[0, 0, 'wood'], [1, 0, 'wood']],
    [[0, 0, 'ice'], [1, 0, 'ice']],
    [[0, 0, 'ice'], [1, 0, 'ice']],
    [[-1, 0, 'brick'], [0, 0, 'brick'], [1, 0, 'brick'], [2, 0, 'brick']],
    [[0, 0, 'brick'], [1, 0, 'brick']],
    [[0, 0, 'sand'], [1, 0, 'sand']],
    [[-1, 0, 'wood'], [0, 0, 'wood'], [1, 0, 'wood'], [2, 0, 'wood']],
    [[0, 0, 'wood'], [1, 0, 'wood']],
  ]);

  // A big astronaut toy: snowy-white suit, star chest panel, glass
  // visor, glowing jetpack lights.
  statue(SPAWN.x + 9, SPAWN.z, [
    [[0, 0, 'snow'], [1, 0, 'snow']],
    [[0, 0, 'snow'], [1, 0, 'snow']],
    [[0, 0, 'snow'], [1, 0, 'snow']],
    [[-1, 0, 'snow'], [0, 0, 'star'], [1, 0, 'star'], [2, 0, 'snow'], [0, 1, 'light'], [1, 1, 'light']],
    [[-1, 0, 'snow'], [0, 0, 'snow'], [1, 0, 'snow'], [2, 0, 'snow']],
    [[0, 0, 'glass'], [1, 0, 'glass']],
    [[0, 0, 'snow'], [1, 0, 'snow']],
  ]);

  // A sprinkle of flowers to keep it a garden playroom.
  for (const [fx, fz] of [
    [SPAWN.x - 13, SPAWN.z - 4],
    [SPAWN.x + 13, SPAWN.z + 4],
    [SPAWN.x + 3, SPAWN.z - 12],
    [SPAWN.x - 3, SPAWN.z + 13],
  ] as const) {
    place('flower', { x: fx, y, z: fz });
  }

  const boxes: MagicDeliveryBox[] = [
    {
      id: newBlockId(),
      name: 'Toy Chest',
      position: boxPosition,
      items: [
        { blockType: 'star', quantity: 5 },
        { blockType: 'rainbow', quantity: 5 },
        { blockType: 'brick', quantity: 5 },
      ],
    },
  ];

  return { blocks, boxes };
}
