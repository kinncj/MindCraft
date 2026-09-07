import { AIR_ID } from '../blocks/BlockDefinition';
import type { BlockStateByte } from '../blocks/BlockState';
import { Chunk } from '../world/Chunk';
import { CHUNK_SIZE, WORLD_HEIGHT, localIndex } from '../world/coords';
import type { VoxelWorld } from '../world/VoxelWorld';

/**
 * The slice of the world a mesher reads: a chunk plus a one-block border,
 * with light and column heights. VoxelWorld implements it directly; a
 * worker gets a packed copy (`MeshRegion`) and reads it through
 * `RegionWorld`, so meshing can run off the main thread.
 */
export interface MeshWorldView {
  getBlock(x: number, y: number, z: number): number;
  getState(x: number, y: number, z: number): BlockStateByte;
  getSkyLight(x: number, y: number, z: number): number;
  getBlockLight(x: number, y: number, z: number): number;
  /** Highest non-air y in a column, or -1. */
  height(x: number, z: number): number;
}

export const REGION_PAD = 1;
export const REGION_SIZE = CHUNK_SIZE + REGION_PAD * 2; // 18

/** Packed, transferable copy of a chunk with its one-block border. */
export type MeshRegion = {
  cx: number;
  cz: number;
  blocks: ArrayBuffer; // Uint16 [z][y][x] over REGION_SIZE × WORLD_HEIGHT × REGION_SIZE
  states: ArrayBuffer; // Uint8
  sky: ArrayBuffer; // Uint8
  light: ArrayBuffer; // Uint8
  heights: ArrayBuffer; // Int16 [z][x] over REGION_SIZE²
};

export function regionIndex(rx: number, y: number, rz: number): number {
  return (rz * WORLD_HEIGHT + y) * REGION_SIZE + rx;
}

/** Copies the chunk and its border out of the world. About a millisecond. */
export function packRegion(world: VoxelWorld, cx: number, cz: number): MeshRegion {
  const cells = REGION_SIZE * WORLD_HEIGHT * REGION_SIZE;
  const blocks = new Uint16Array(cells);
  const states = new Uint8Array(cells);
  const sky = new Uint8Array(cells);
  const light = new Uint8Array(cells);
  const heights = new Int16Array(REGION_SIZE * REGION_SIZE);
  const baseX = cx * CHUNK_SIZE - REGION_PAD;
  const baseZ = cz * CHUNK_SIZE - REGION_PAD;
  for (let rz = 0; rz < REGION_SIZE; rz++) {
    for (let rx = 0; rx < REGION_SIZE; rx++) {
      const x = baseX + rx;
      const z = baseZ + rz;
      const top = world.height(x, z);
      heights[rz * REGION_SIZE + rx] = top;
      // Only the occupied part of each column matters; above it is air and sky.
      const limit = Math.min(WORLD_HEIGHT - 1, Math.max(top, 0) + 2);
      for (let y = 0; y <= limit; y++) {
        const i = regionIndex(rx, y, rz);
        blocks[i] = world.getBlock(x, y, z);
        states[i] = world.getState(x, y, z);
        sky[i] = world.getSkyLight(x, y, z);
        light[i] = world.getBlockLight(x, y, z);
      }
      for (let y = limit + 1; y < WORLD_HEIGHT; y++) sky[regionIndex(rx, y, rz)] = 15;
    }
  }
  return { cx, cz, blocks: blocks.buffer, states: states.buffer, sky: sky.buffer, light: light.buffer, heights: heights.buffer };
}

/** Reads a packed region as if it were the world. Outside the region: air, full sky. */
export class RegionWorld implements MeshWorldView {
  private blocks: Uint16Array;
  private states: Uint8Array;
  private sky: Uint8Array;
  private light: Uint8Array;
  private heights: Int16Array;
  private baseX: number;
  private baseZ: number;

  constructor(private region: MeshRegion) {
    this.blocks = new Uint16Array(region.blocks);
    this.states = new Uint8Array(region.states);
    this.sky = new Uint8Array(region.sky);
    this.light = new Uint8Array(region.light);
    this.heights = new Int16Array(region.heights);
    this.baseX = region.cx * CHUNK_SIZE - REGION_PAD;
    this.baseZ = region.cz * CHUNK_SIZE - REGION_PAD;
  }

  private index(x: number, y: number, z: number): number {
    const rx = x - this.baseX;
    const rz = z - this.baseZ;
    if (rx < 0 || rx >= REGION_SIZE || rz < 0 || rz >= REGION_SIZE || y < 0 || y >= WORLD_HEIGHT) return -1;
    return regionIndex(rx, y, rz);
  }

  getBlock(x: number, y: number, z: number): number {
    const i = this.index(x, y, z);
    return i < 0 ? AIR_ID : this.blocks[i];
  }

  getState(x: number, y: number, z: number): BlockStateByte {
    const i = this.index(x, y, z);
    return i < 0 ? 0 : this.states[i];
  }

  getSkyLight(x: number, y: number, z: number): number {
    const i = this.index(x, y, z);
    return i < 0 ? 15 : this.sky[i];
  }

  getBlockLight(x: number, y: number, z: number): number {
    const i = this.index(x, y, z);
    return i < 0 ? 0 : this.light[i];
  }

  height(x: number, z: number): number {
    const rx = x - this.baseX;
    const rz = z - this.baseZ;
    if (rx < 0 || rx >= REGION_SIZE || rz < 0 || rz >= REGION_SIZE) return -1;
    return this.heights[rz * REGION_SIZE + rx];
  }

  /** The chunk at the region's center, rebuilt for the cube mesher. */
  chunk(): Chunk {
    const chunk = new Chunk(this.region.cx, this.region.cz);
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const top = this.heights[(lz + REGION_PAD) * REGION_SIZE + lx + REGION_PAD];
        for (let y = 0; y <= top; y++) {
          const i = regionIndex(lx + REGION_PAD, y, lz + REGION_PAD);
          const li = localIndex(lx, y, lz);
          chunk.blocks[li] = this.blocks[i];
          chunk.states[li] = this.states[i];
        }
      }
    }
    chunk.rebuildHeightMap();
    chunk.lit = true;
    return chunk;
  }
}
