import { AIR_ID } from '../blocks/BlockDefinition';
import type { BlockStateByte } from '../blocks/BlockState';
import { CHUNK_SIZE, CHUNK_VOLUME, WORLD_HEIGHT, localIndex } from './coords';

/** Sparse per-block data: box contents, sign text, whatever a block needs. */
export type BlockEntity = {
  kind: string;
  data: Record<string, unknown>;
};

/**
 * A 16×128×16 column of blocks. Plain typed arrays so chunks are cheap to
 * create, transfer to workers, and serialize.
 */
export class Chunk {
  readonly blocks: Uint16Array;
  readonly states: Uint8Array;
  readonly skyLight: Uint8Array;
  readonly blockLight: Uint8Array;
  readonly entities = new Map<number, BlockEntity>();

  /** Edited since generation → must be persisted. */
  modified = false;
  /** Terrain has been written. */
  generated = false;
  /** Lighting has been computed at least once. */
  lit = false;
  /** Mesh needs rebuilding. */
  dirtyMesh = true;
  /** Highest non-air y per column, or -1. Kept in sync by set(). */
  readonly heightMap: Int16Array;

  constructor(
    readonly cx: number,
    readonly cz: number,
    buffers?: { blocks?: Uint16Array; states?: Uint8Array },
  ) {
    this.blocks = buffers?.blocks ?? new Uint16Array(CHUNK_VOLUME);
    this.states = buffers?.states ?? new Uint8Array(CHUNK_VOLUME);
    this.skyLight = new Uint8Array(CHUNK_VOLUME);
    this.blockLight = new Uint8Array(CHUNK_VOLUME);
    this.heightMap = new Int16Array(CHUNK_SIZE * CHUNK_SIZE).fill(-1);
    if (buffers?.blocks) this.rebuildHeightMap();
  }

  get(lx: number, y: number, lz: number): number {
    return this.blocks[localIndex(lx, y, lz)];
  }

  getState(lx: number, y: number, lz: number): BlockStateByte {
    return this.states[localIndex(lx, y, lz)];
  }

  set(lx: number, y: number, lz: number, id: number, state: BlockStateByte = 0): void {
    const index = localIndex(lx, y, lz);
    this.blocks[index] = id;
    this.states[index] = state;
    const column = lz * CHUNK_SIZE + lx;
    if (id !== AIR_ID) {
      if (y > this.heightMap[column]) this.heightMap[column] = y;
    } else if (this.heightMap[column] === y) {
      let top = y - 1;
      while (top >= 0 && this.blocks[localIndex(lx, top, lz)] === AIR_ID) top--;
      this.heightMap[column] = top;
    }
  }

  setDirty(): void {
    this.dirtyMesh = true;
  }

  height(lx: number, lz: number): number {
    return this.heightMap[lz * CHUNK_SIZE + lx];
  }

  rebuildHeightMap(): void {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        let top = WORLD_HEIGHT - 1;
        while (top >= 0 && this.blocks[localIndex(lx, top, lz)] === AIR_ID) top--;
        this.heightMap[lz * CHUNK_SIZE + lx] = top;
      }
    }
  }

  getEntity(lx: number, y: number, lz: number): BlockEntity | undefined {
    return this.entities.get(localIndex(lx, y, lz));
  }

  setEntity(lx: number, y: number, lz: number, entity: BlockEntity | null): void {
    const index = localIndex(lx, y, lz);
    if (entity) this.entities.set(index, entity);
    else this.entities.delete(index);
  }

  /** Number of non-air blocks. Used by tests and the "empty chunk" check. */
  countBlocks(): number {
    let count = 0;
    for (let i = 0; i < this.blocks.length; i++) if (this.blocks[i] !== AIR_ID) count++;
    return count;
  }
}
