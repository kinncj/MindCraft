import type { PlacedBlock } from '../../types/game';
import { BLOCK_DEFINITIONS } from './blockRegistry';
import { WORLD_SIZE } from './world';

/**
 * Minecraft-style voxel lighting: two 0–15 light grids over the world.
 *
 * - Sky light: 15 pouring straight down from the sky, stopped by opaque
 *   blocks, then flood-filled sideways (so light leaks in through doors
 *   and windows, but a sealed shelter is dark).
 * - Block light: emitted by glowing blocks (light, torch, campfire,
 *   star), flood-filled with falloff 1 per step.
 *
 * The renderer bakes these into vertex attributes and combines them in
 * the shader with the time-of-day factor, so night dims the sky light
 * but a torch stays bright.
 */

export type LightGrids = {
  sky: Uint8Array;
  block: Uint8Array;
};

const { width: W, height: H, depth: D } = WORLD_SIZE;
const CELLS = W * H * D;

export function lightIndex(x: number, y: number, z: number): number {
  return (y * D + z) * W + x;
}

function inBounds(x: number, y: number, z: number): boolean {
  return x >= 0 && x < W && y >= 0 && y < H && z >= 0 && z < D;
}

const NEIGHBORS: Array<[number, number, number]> = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

/** BFS flood fill: spread each queued cell's light to neighbors at -1. */
function floodFill(levels: Uint8Array, opaque: Uint8Array, queue: number[]): void {
  let head = 0;
  while (head < queue.length) {
    const index = queue[head++];
    const level = levels[index];
    if (level <= 1) continue;
    const x = index % W;
    const z = Math.floor(index / W) % D;
    const y = Math.floor(index / (W * D));
    for (const [dx, dy, dz] of NEIGHBORS) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (!inBounds(nx, ny, nz)) continue;
      const ni = lightIndex(nx, ny, nz);
      if (opaque[ni]) continue;
      const next = level - 1;
      if (levels[ni] < next) {
        levels[ni] = next;
        queue.push(ni);
      }
    }
  }
}

export function computeLight(blocks: Record<string, PlacedBlock>): LightGrids {
  const opaque = new Uint8Array(CELLS);
  const sky = new Uint8Array(CELLS);
  const blockLight = new Uint8Array(CELLS);
  const emitters: number[] = [];

  for (const block of Object.values(blocks)) {
    const { x, y, z } = block.position;
    if (!inBounds(x, y, z)) continue;
    const def = BLOCK_DEFINITIONS[block.type];
    const index = lightIndex(x, y, z);
    if (!def.transparent) opaque[index] = 1;
    const emission = def.lightLevel ?? 0;
    if (emission > 0) {
      blockLight[index] = emission;
      emitters.push(index);
    }
  }

  // Sky light: straight down until something opaque blocks it…
  const skyQueue: number[] = [];
  for (let x = 0; x < W; x++) {
    for (let z = 0; z < D; z++) {
      for (let y = H - 1; y >= 0; y--) {
        const index = lightIndex(x, y, z);
        if (opaque[index]) break;
        sky[index] = 15;
        skyQueue.push(index);
      }
    }
  }
  // …then sideways through openings.
  floodFill(sky, opaque, skyQueue);

  // Block light from all glowing blocks. Emitter cells may be "opaque"
  // (a torch cube), so seed their transparent neighbors too.
  floodFill(blockLight, opaque, [...emitters]);

  return { sky, block: blockLight };
}
