import type { BlockRegistry } from '../blocks/registry';
import type { Chunk } from '../world/Chunk';
import {
  CHUNK_SIZE,
  DIRECTIONS,
  DIR_NY,
  WORLD_HEIGHT,
  chunkKey,
  localIndex,
  toChunkCoord,
  toLocal,
} from '../world/coords';
import type { BlockChange, VoxelWorld } from '../world/VoxelWorld';

/**
 * Minecraft-style voxel lighting, incremental and chunk-aware.
 *
 * Sky light: 15 straight down from the sky until an opaque block, then
 * flood-filled sideways at -1 per step (so a doorway lights a room, a
 * sealed room is dark). Block light: emitted by glowing blocks, -1 per
 * step. Both live on chunks as Uint8Arrays.
 *
 * Edits run the classic add/remove flood fills only around the change,
 * across chunk borders, and report which chunks need a remesh.
 */

const MAX_LIGHT = 15;

type Queue = number[]; // packed: (x, y, z) triples

export class LightEngine {
  constructor(
    private world: VoxelWorld,
    private registry: BlockRegistry,
  ) {}

  private opaque(x: number, y: number, z: number): boolean {
    return !this.registry.isTransparent(this.world.getBlock(x, y, z));
  }

  private cell(x: number, y: number, z: number): { chunk: Chunk; index: number } | null {
    if (y < 0 || y >= WORLD_HEIGHT) return null;
    const chunk = this.world.getChunk(toChunkCoord(x), toChunkCoord(z));
    if (!chunk) return null;
    return { chunk, index: localIndex(toLocal(x), y, toLocal(z)) };
  }

  // --- Whole-chunk initialization -----------------------------------------

  /**
   * Lights a freshly generated chunk: sky columns, then flood in from its
   * own cells and from any loaded neighbor's border. Returns chunk keys
   * whose meshes are now stale (the chunk plus lit neighbors).
   */
  initChunk(chunk: Chunk): Set<string> {
    const touched = new Set<string>();
    const baseX = chunk.cx * CHUNK_SIZE;
    const baseZ = chunk.cz * CHUNK_SIZE;
    const skyQueue: Queue = [];
    const blockQueue: Queue = [];

    chunk.skyLight.fill(0);
    chunk.blockLight.fill(0);

    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        // Sunlight pours down until the first opaque block.
        for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
          const index = localIndex(lx, y, lz);
          const id = chunk.blocks[index];
          if (!this.registry.isTransparent(id)) break;
          chunk.skyLight[index] = MAX_LIGHT;
          skyQueue.push(baseX + lx, y, baseZ + lz);
        }
        // Emitters anywhere in the column.
        for (let y = 0; y < WORLD_HEIGHT; y++) {
          const index = localIndex(lx, y, lz);
          const emission = this.registry.lightLevel(chunk.blocks[index]);
          if (emission > 0) {
            chunk.blockLight[index] = emission;
            blockQueue.push(baseX + lx, y, baseZ + lz);
          }
        }
      }
    }

    // Pull light in from loaded neighbors' border columns.
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      const neighbor = this.world.getChunk(chunk.cx + dx, chunk.cz + dz);
      if (!neighbor || !neighbor.lit) continue;
      const nBaseX = neighbor.cx * CHUNK_SIZE;
      const nBaseZ = neighbor.cz * CHUNK_SIZE;
      for (let i = 0; i < CHUNK_SIZE; i++) {
        const lx = dx === 1 ? 0 : dx === -1 ? CHUNK_SIZE - 1 : i;
        const lz = dz === 1 ? 0 : dz === -1 ? CHUNK_SIZE - 1 : i;
        for (let y = 0; y < WORLD_HEIGHT; y++) {
          const index = localIndex(lx, y, lz);
          if (neighbor.skyLight[index] > 1) skyQueue.push(nBaseX + lx, y, nBaseZ + lz);
          if (neighbor.blockLight[index] > 1) blockQueue.push(nBaseX + lx, y, nBaseZ + lz);
        }
      }
    }

    this.propagate(skyQueue, 'sky', touched);
    this.propagate(blockQueue, 'block', touched);
    chunk.lit = true;
    touched.add(chunkKey(chunk.cx, chunk.cz));
    return touched;
  }

  // --- Incremental updates ------------------------------------------------

  /** Re-lights around one block change. Returns stale chunk keys. */
  onBlockChanged(change: BlockChange): Set<string> {
    const touched = new Set<string>();
    const { x, y, z } = change;
    const wasOpaque = !this.registry.isTransparent(change.previousId);
    const isOpaque = !this.registry.isTransparent(change.id);
    const oldEmission = this.registry.lightLevel(change.previousId);
    const newEmission = this.registry.lightLevel(change.id);
    const ref = this.cell(x, y, z);
    if (!ref) return touched;

    // Block light: clear what the old block gave, add what the new one gives.
    if (oldEmission > 0 || isOpaque) {
      const old = ref.chunk.blockLight[ref.index];
      if (old > 0) {
        ref.chunk.blockLight[ref.index] = 0;
        this.remove([x, y, z, old], 'block', touched);
      }
    }
    if (newEmission > 0) {
      ref.chunk.blockLight[ref.index] = newEmission;
      this.propagate([x, y, z], 'block', touched);
    } else if (wasOpaque && !isOpaque) {
      this.propagate(this.neighborsOf(x, y, z), 'block', touched);
    }

    // Sky light.
    if (isOpaque && !wasOpaque) {
      const old = ref.chunk.skyLight[ref.index];
      if (old > 0) {
        ref.chunk.skyLight[ref.index] = 0;
        this.remove([x, y, z, old], 'sky', touched);
      }
    } else if (wasOpaque && !isOpaque) {
      // The cell just opened: if the sky is straight above, it is fully lit.
      if (this.skyAbove(x, y, z)) {
        ref.chunk.skyLight[ref.index] = MAX_LIGHT;
        this.propagate([x, y, z], 'sky', touched);
      } else {
        this.propagate(this.neighborsOf(x, y, z), 'sky', touched);
      }
    }
    touched.add(chunkKey(toChunkCoord(x), toChunkCoord(z)));
    return touched;
  }

  private skyAbove(x: number, y: number, z: number): boolean {
    for (let yy = y + 1; yy < WORLD_HEIGHT; yy++) {
      if (this.opaque(x, yy, z)) return false;
    }
    return true;
  }

  private neighborsOf(x: number, y: number, z: number): Queue {
    const out: Queue = [];
    for (const d of DIRECTIONS) out.push(x + d.x, y + d.y, z + d.z);
    return out;
  }

  private levelAt(kind: 'sky' | 'block', x: number, y: number, z: number): number {
    const ref = this.cell(x, y, z);
    if (!ref) return kind === 'sky' && y >= WORLD_HEIGHT ? MAX_LIGHT : 0;
    return kind === 'sky' ? ref.chunk.skyLight[ref.index] : ref.chunk.blockLight[ref.index];
  }

  private setLevel(kind: 'sky' | 'block', x: number, y: number, z: number, level: number, touched: Set<string>): boolean {
    const ref = this.cell(x, y, z);
    if (!ref) return false;
    const arr = kind === 'sky' ? ref.chunk.skyLight : ref.chunk.blockLight;
    arr[ref.index] = level;
    touched.add(chunkKey(ref.chunk.cx, ref.chunk.cz));
    ref.chunk.dirtyMesh = true;
    return true;
  }

  /** Spreads light outward from every queued cell (BFS). */
  private propagate(queue: Queue, kind: 'sky' | 'block', touched: Set<string>): void {
    let head = 0;
    while (head < queue.length) {
      const x = queue[head++];
      const y = queue[head++];
      const z = queue[head++];
      const level = this.levelAt(kind, x, y, z);
      if (level <= 1) continue;
      for (let d = 0; d < 6; d++) {
        const dir = DIRECTIONS[d];
        const nx = x + dir.x;
        const ny = y + dir.y;
        const nz = z + dir.z;
        if (ny < 0 || ny >= WORLD_HEIGHT) continue;
        if (this.opaque(nx, ny, nz)) continue;
        // Sunlight going straight down does not fade.
        const next = kind === 'sky' && d === DIR_NY && level === MAX_LIGHT ? MAX_LIGHT : level - 1;
        if (this.levelAt(kind, nx, ny, nz) < next) {
          if (this.setLevel(kind, nx, ny, nz, next, touched)) queue.push(nx, ny, nz);
        }
      }
    }
  }

  /**
   * Removes light that was flowing from the queued cells (each with the
   * level it had), then re-propagates from any brighter cells found at
   * the edge of the removed region.
   */
  private remove(queue: Queue, kind: 'sky' | 'block', touched: Set<string>): void {
    const reprop: Queue = [];
    let head = 0;
    while (head < queue.length) {
      const x = queue[head++];
      const y = queue[head++];
      const z = queue[head++];
      const oldLevel = queue[head++];
      for (let d = 0; d < 6; d++) {
        const dir = DIRECTIONS[d];
        const nx = x + dir.x;
        const ny = y + dir.y;
        const nz = z + dir.z;
        if (ny < 0 || ny >= WORLD_HEIGHT) continue;
        const nLevel = this.levelAt(kind, nx, ny, nz);
        if (nLevel === 0) continue;
        const fedByUs =
          nLevel < oldLevel || (kind === 'sky' && d === DIR_NY && oldLevel === MAX_LIGHT && nLevel === MAX_LIGHT);
        if (fedByUs) {
          this.setLevel(kind, nx, ny, nz, 0, touched);
          queue.push(nx, ny, nz, nLevel);
        } else {
          reprop.push(nx, ny, nz);
        }
      }
    }
    this.propagate(reprop, kind, touched);
  }
}
