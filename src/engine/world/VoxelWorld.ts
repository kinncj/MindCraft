import { AIR_ID, type BlockAccess } from '../blocks/BlockDefinition';
import type { BlockStateByte } from '../blocks/BlockState';
import type { BlockRegistry } from '../blocks/registry';
import { Chunk, type BlockEntity } from './Chunk';
import { chunkKey, isValidY, toChunkCoord, toLocal, type ChunkCoord } from './coords';

export type BlockChange = {
  x: number;
  y: number;
  z: number;
  previousId: number;
  previousState: BlockStateByte;
  id: number;
  state: BlockStateByte;
};

export type WorldListener = {
  onBlockChanged?(change: BlockChange): void;
  onChunkAdded?(chunk: Chunk): void;
  onChunkRemoved?(chunk: Chunk): void;
};

/**
 * The block store: a map of loaded chunks with world-coordinate access.
 * Knows nothing about generation, rendering, or saving — other systems
 * subscribe to changes and do that.
 */
export class VoxelWorld implements BlockAccess {
  private chunks = new Map<string, Chunk>();
  private listeners = new Set<WorldListener>();

  constructor(readonly registry: BlockRegistry) {}

  subscribe(listener: WorldListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(chunkKey(cx, cz));
  }

  hasChunk(cx: number, cz: number): boolean {
    return this.chunks.has(chunkKey(cx, cz));
  }

  chunkAt(x: number, z: number): Chunk | undefined {
    return this.chunks.get(chunkKey(toChunkCoord(x), toChunkCoord(z)));
  }

  addChunk(chunk: Chunk): void {
    this.chunks.set(chunkKey(chunk.cx, chunk.cz), chunk);
    for (const l of this.listeners) l.onChunkAdded?.(chunk);
  }

  removeChunk(cx: number, cz: number): Chunk | undefined {
    const key = chunkKey(cx, cz);
    const chunk = this.chunks.get(key);
    if (!chunk) return undefined;
    this.chunks.delete(key);
    for (const l of this.listeners) l.onChunkRemoved?.(chunk);
    return chunk;
  }

  allChunks(): Chunk[] {
    return [...this.chunks.values()];
  }

  chunkCoords(): ChunkCoord[] {
    return this.allChunks().map((c) => ({ cx: c.cx, cz: c.cz }));
  }

  get chunkCount(): number {
    return this.chunks.size;
  }

  getBlock(x: number, y: number, z: number): number {
    if (!isValidY(y)) return AIR_ID;
    const chunk = this.chunkAt(x, z);
    return chunk ? chunk.get(toLocal(x), y, toLocal(z)) : AIR_ID;
  }

  getState(x: number, y: number, z: number): BlockStateByte {
    if (!isValidY(y)) return 0;
    const chunk = this.chunkAt(x, z);
    return chunk ? chunk.getState(toLocal(x), y, toLocal(z)) : 0;
  }

  /** Is this cell loaded at all? Unloaded cells read as air but are unknown. */
  isLoaded(x: number, z: number): boolean {
    return this.chunkAt(x, z) !== undefined;
  }

  /**
   * Writes a block. Returns the change, or null when nothing changed or the
   * chunk is not loaded. Marks the chunk modified and dirty; listeners
   * (lighting, meshing, persistence) react.
   */
  setBlock(x: number, y: number, z: number, id: number, state: BlockStateByte = 0): BlockChange | null {
    if (!isValidY(y)) return null;
    const chunk = this.chunkAt(x, z);
    if (!chunk) return null;
    const lx = toLocal(x);
    const lz = toLocal(z);
    const previousId = chunk.get(lx, y, lz);
    const previousState = chunk.getState(lx, y, lz);
    if (previousId === id && previousState === state) return null;
    chunk.set(lx, y, lz, id, state);
    if (previousId !== id) chunk.setEntity(lx, y, lz, null);
    chunk.modified = true;
    chunk.dirtyMesh = true;
    const change: BlockChange = { x, y, z, previousId, previousState, id, state };
    for (const l of this.listeners) l.onBlockChanged?.(change);
    return change;
  }

  getEntity(x: number, y: number, z: number): BlockEntity | undefined {
    return this.chunkAt(x, z)?.getEntity(toLocal(x), y, toLocal(z));
  }

  setEntity(x: number, y: number, z: number, entity: BlockEntity | null): void {
    const chunk = this.chunkAt(x, z);
    if (!chunk) return;
    chunk.setEntity(toLocal(x), y, toLocal(z), entity);
    chunk.modified = true;
  }

  getSkyLight(x: number, y: number, z: number): number {
    if (y >= 128) return 15;
    if (y < 0) return 0;
    const chunk = this.chunkAt(x, z);
    return chunk ? chunk.skyLight[localIndexOf(x, y, z)] : 15;
  }

  getBlockLight(x: number, y: number, z: number): number {
    if (!isValidY(y)) return 0;
    const chunk = this.chunkAt(x, z);
    return chunk ? chunk.blockLight[localIndexOf(x, y, z)] : 0;
  }

  /** Highest non-air block in a column, or -1. Unloaded → -1. */
  height(x: number, z: number): number {
    const chunk = this.chunkAt(x, z);
    return chunk ? chunk.height(toLocal(x), toLocal(z)) : -1;
  }

  /** Marks the chunk and any neighbor sharing this cell's border for remesh. */
  markDirtyAround(x: number, y: number, z: number): void {
    void y;
    const lx = toLocal(x);
    const lz = toLocal(z);
    const cx = toChunkCoord(x);
    const cz = toChunkCoord(z);
    this.getChunk(cx, cz)?.setDirty();
    if (lx === 0) this.getChunk(cx - 1, cz)?.setDirty();
    if (lx === 15) this.getChunk(cx + 1, cz)?.setDirty();
    if (lz === 0) this.getChunk(cx, cz - 1)?.setDirty();
    if (lz === 15) this.getChunk(cx, cz + 1)?.setDirty();
  }
}

function localIndexOf(x: number, y: number, z: number): number {
  return (y << 8) | (toLocal(z) << 4) | toLocal(x);
}
