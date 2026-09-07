import { B, blocks } from '../../../blocks/blocks';
import { BlockState } from '../../../blocks/BlockState';
import { rotateStamp, type Stamp } from '../../../build/Clipboard';
import type { BlockEntity } from '../../Chunk';
import type { StoredEntity } from '../../../entities/Entity';
import { CHUNK_SIZE, WORLD_HEIGHT, chunkKey, toChunkCoord } from '../../coords';

export type MapBlock = { x: number; y: number; z: number; id: number; state: number; entity?: BlockEntity };

/** A prebuilt map: blocks grouped by chunk, a spawn, and living things. */
export type PresetMap = {
  name: string;
  byChunk: Map<string, MapBlock[]>;
  spawn: { x: number; y: number; z: number };
  entities: StoredEntity[];
  /** Highest block per column, for surface queries. */
  heights: Map<string, number>;
  blockCount: number;
};

/**
 * Tiny drawing API for prebuilt maps. Coordinates are world blocks; the
 * floor of a flat world is at `floorY` (the grass), so most furniture
 * starts at floorY + 1.
 */
export class MapBuilder {
  private cells = new Map<string, MapBlock>();
  entities: StoredEntity[] = [];
  private nextEntity = 1;

  constructor(
    readonly name: string,
    readonly floorY: number,
  ) {}

  put(x: number, y: number, z: number, id: number, state = 0, entity?: BlockEntity): void {
    if (y < 0 || y >= WORLD_HEIGHT) return;
    this.cells.set(`${x},${y},${z}`, { x, y, z, id, state, entity });
  }

  get(x: number, y: number, z: number): number {
    return this.cells.get(`${x},${y},${z}`)?.id ?? -1;
  }

  /** Solid box, inclusive corners. */
  box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number, state = 0): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) this.put(x, y, z, id, state);
  }

  /** Walls only (hollow box without floor/ceiling). */
  walls(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number): void {
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++) if (x === x0 || x === x1 || z === z0 || z === z1) this.put(x, y, z, id);
  }

  /** A flat rectangle at one height. */
  floor(x0: number, z0: number, x1: number, z1: number, y: number, id: number, state = 0): void {
    this.box(x0, y, z0, x1, y, z1, id, state);
  }

  /** Checkerboard floor of two blocks. */
  checker(x0: number, z0: number, x1: number, z1: number, y: number, a: number, b: number, size = 1): void {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) this.put(x, y, z, (Math.floor(x / size) + Math.floor(z / size)) % 2 === 0 ? a : b);
  }

  /** A hollow building: floor, walls, optional flat roof. */
  building(x0: number, z0: number, x1: number, z1: number, height: number, wall: number, floor: number, roof: number | null): void {
    const y = this.floorY;
    this.floor(x0, z0, x1, z1, y, floor);
    this.walls(x0, y + 1, z0, x1, y + height, z1, wall);
    if (roof !== null) this.floor(x0, z0, x1, z1, y + height + 1, roof);
  }

  /** Punch a doorway (two tall) and put a door in it, facing -z or +z. */
  door(x: number, z: number, rotation = 0): void {
    const y = this.floorY + 1;
    this.put(x, y, z, B.door, BlockState.withRotation(0, rotation));
    this.put(x, y + 1, z, B.door, BlockState.withTopHalf(BlockState.withRotation(0, rotation), true));
  }

  /** Window panes along a wall segment at a height. */
  windows(x0: number, z0: number, x1: number, z1: number, y: number, rotation: number, every = 2): void {
    let i = 0;
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) if (i++ % every === 0) this.put(x, y, z, B.glass, BlockState.withRotation(0, rotation));
  }

  /** Stamp a clipboard-style stamp with its min corner at (x, y, z). */
  stamp(stamp: Stamp, x: number, y: number, z: number, rotation = 0, remap?: (id: number) => number): void {
    const s = rotation ? rotateStamp(stamp, rotation, blocks) : stamp;
    for (const b of s.blocks) this.put(x + b.x, y + b.y, z + b.z, remap ? remap(b.id) : b.id, b.state, b.entity);
  }

  /** A simple column-and-sphere tree. */
  tree(x: number, z: number, height = 5, leaf = B.leaves, log = B.wood): void {
    const base = this.floorY;
    for (let i = 1; i <= height; i++) this.put(x, base + i, z, log);
    const top = base + height;
    for (const [dy, r] of [[-1, 2], [0, 2], [1, 1], [2, 1]] as const) {
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(dx) === r && Math.abs(dz) === r && r > 1) continue;
        if (this.get(x + dx, top + dy, z + dz) === -1) this.put(x + dx, top + dy, z + dz, leaf);
      }
    }
    this.put(x, top + 3, z, leaf);
  }

  /** A street lamp: a post with a lantern on top. */
  lamp(x: number, z: number, height = 3): void {
    for (let i = 1; i <= height; i++) this.put(x, this.floorY + i, z, B.fence);
    this.put(x, this.floorY + height + 1, z, B.lantern);
  }

  container(x: number, y: number, z: number, name: string, items: Array<{ blockType: string; quantity: number }>): void {
    this.put(x, y, z, B.magic_box, 0, { kind: 'container', data: { name, items } });
  }

  villager(job: string, name: string, x: number, z: number, home?: { x: number; z: number }): void {
    this.entities.push({ id: `m${this.nextEntity++}`, kind: 'villager', variant: job, name, x, y: this.floorY + 1, z, brain: 'neural', home: home ?? { x, z }, data: { job } });
  }

  pet(kind: 'dog' | 'cat', name: string, x: number, z: number, brain = 'neural'): void {
    this.entities.push({ id: `m${this.nextEntity++}`, kind: 'pet', variant: kind, name, x, y: this.floorY + 1, z, brain, data: { brain } });
  }

  vehicle(kind: 'car' | 'boat', x: number, z: number, color?: string, y?: number): void {
    this.entities.push({ id: `m${this.nextEntity++}`, kind: 'vehicle', variant: kind, x, y: y ?? this.floorY + 0.5, z, brain: 'wander', data: color ? { color } : {} });
  }

  robot(name: string, x: number, z: number): void {
    this.entities.push({ id: `m${this.nextEntity++}`, kind: 'robot', variant: 'robot', name, x, y: this.floorY + 1, z, brain: 'wander', data: { program: [], blockId: 0 } });
  }

  finish(spawn: { x: number; y: number; z: number }): PresetMap {
    const byChunk = new Map<string, MapBlock[]>();
    const heights = new Map<string, number>();
    for (const b of this.cells.values()) {
      const key = chunkKey(toChunkCoord(b.x), toChunkCoord(b.z));
      let list = byChunk.get(key);
      if (!list) {
        list = [];
        byChunk.set(key, list);
      }
      list.push(b);
      if (b.id !== 0) {
        const hk = `${b.x},${b.z}`;
        heights.set(hk, Math.max(heights.get(hk) ?? -1, b.y));
      }
    }
    return { name: this.name, byChunk, spawn, entities: this.entities, heights, blockCount: this.cells.size };
  }
}

export { CHUNK_SIZE };
