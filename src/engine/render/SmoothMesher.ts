import type { SmoothKind } from '../blocks/BlockDefinition';
import type { BlockRegistry } from '../blocks/registry';
import { fluidHeight } from '../blocks/shapes';
import type { Chunk } from '../world/Chunk';
import { CHUNK_SIZE, WORLD_HEIGHT } from '../world/coords';
import type { MeshWorldView } from './meshRegion';
import type { TextureAtlas } from './TextureAtlas';

/**
 * Cinema mode's "round world": natural blocks (terrain, tree canopies,
 * water) become one smooth surface per chunk instead of cubes. Each block
 * is a density sample at its center; a soft blur rounds the field; naive
 * surface nets pull the 0.45 isosurface out of it. Every vertex carries
 * the atlas tiles of the block it came from, so the shader can texture
 * the surface triplanarly with the same original pixel art.
 *
 * Edges are owned by the chunk holding their first sample, so neighboring
 * chunks share vertices exactly and never draw the same surface twice.
 */

export type SmoothMeshData = {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  skylight: Float32Array;
  blocklight: Float32Array;
  /** Atlas rect (u0, v0, du, dv) of the top texture, per vertex. */
  tileTop: Float32Array;
  /** Atlas rect of the side texture, per vertex. */
  tileSide: Float32Array;
  indices: Uint32Array;
};

export type SmoothMeshes = Partial<Record<SmoothKind, SmoothMeshData>>;

export const SMOOTH_KINDS: SmoothKind[] = ['terrain', 'foliage', 'water', 'wood'];
const ISO = 0.45;
const BORDER = 1;
const SIZE = CHUNK_SIZE + 2 * BORDER; // samples per side, with a border for continuity

const FACE_NEIGHBORS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]] as const;
const EDGE_NEIGHBORS = [
  [1, 1, 0], [1, -1, 0], [-1, 1, 0], [-1, -1, 0],
  [1, 0, 1], [1, 0, -1], [-1, 0, 1], [-1, 0, -1],
  [0, 1, 1], [0, 1, -1], [0, -1, 1], [0, -1, -1],
] as const;
/** Cube edges as pairs of corner indices (corner bit 0 = x, 1 = y, 2 = z). */
const CUBE_EDGES: Array<[number, number]> = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

export class SmoothMesher {
  constructor(
    private world: MeshWorldView,
    private registry: BlockRegistry,
    private atlas: TextureAtlas,
  ) {}

  build(chunk: Chunk): SmoothMeshes {
    const baseX = chunk.cx * CHUNK_SIZE - BORDER;
    const baseZ = chunk.cz * CHUNK_SIZE - BORDER;
    const top = Math.min(WORLD_HEIGHT - 1, this.regionTop(chunk) + 2);
    const ny = top + 2; // samples 0..top+1
    const ids = new Uint16Array(SIZE * ny * SIZE);
    const heights = new Float32Array(SIZE * ny * SIZE);
    const at = (x: number, y: number, z: number): number => (z * ny + y) * SIZE + x;
    const present = new Set<SmoothKind>();
    for (let z = 0; z < SIZE; z++) {
      for (let x = 0; x < SIZE; x++) {
        for (let y = 0; y < ny; y++) {
          const id = this.world.getBlock(baseX + x, y, baseZ + z);
          if (id === 0) continue;
          const kind = this.registry.get(id)?.smooth;
          if (!kind) continue;
          ids[at(x, y, z)] = id;
          heights[at(x, y, z)] = kind === 'water' ? fluidHeight(this.world.getState(baseX + x, y, baseZ + z)) : 1;
          present.add(kind);
        }
      }
    }
    const out: SmoothMeshes = {};
    for (const kind of SMOOTH_KINDS) {
      if (!present.has(kind)) continue;
      const data = this.surface(kind, ids, heights, ny, baseX, baseZ, at);
      if (data) out[kind] = data;
    }
    return out;
  }

  /** Highest column in this chunk and its one-block border. */
  private regionTop(chunk: Chunk): number {
    let top = 0;
    const baseX = chunk.cx * CHUNK_SIZE - BORDER;
    const baseZ = chunk.cz * CHUNK_SIZE - BORDER;
    for (let z = 0; z < SIZE; z++) for (let x = 0; x < SIZE; x++) top = Math.max(top, this.world.height(baseX + x, baseZ + z));
    return top;
  }

  private surface(kind: SmoothKind, ids: Uint16Array, heights: Float32Array, ny: number, baseX: number, baseZ: number, at: (x: number, y: number, z: number) => number): SmoothMeshData | null {
    const count = SIZE * ny * SIZE;
    const raw = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const id = ids[i];
      if (id !== 0 && this.registry.get(id)?.smooth === kind) raw[i] = heights[i];
    }
    // Soft blur: self 0.5, face neighbors 0.3, edge neighbors 0.2 (out of range = self).
    const field = new Float32Array(count);
    const sample = (x: number, y: number, z: number, self: number): number =>
      x < 0 || x >= SIZE || y < 0 || y >= ny || z < 0 || z >= SIZE ? self : raw[at(x, y, z)];
    for (let z = 0; z < SIZE; z++) {
      for (let y = 0; y < ny; y++) {
        for (let x = 0; x < SIZE; x++) {
          const self = raw[at(x, y, z)];
          let faces = 0;
          for (const [dx, dy, dz] of FACE_NEIGHBORS) faces += sample(x + dx, y + dy, z + dz, self);
          let edges = 0;
          for (const [dx, dy, dz] of EDGE_NEIGHBORS) edges += sample(x + dx, y + dy, z + dz, self);
          field[at(x, y, z)] = self * 0.5 + (faces / 6) * 0.3 + (edges / 12) * 0.2;
        }
      }
    }

    const positions: number[] = [];
    const normals: number[] = [];
    const sky: number[] = [];
    const block: number[] = [];
    const tileTop: number[] = [];
    const tileSide: number[] = [];
    const indices: number[] = [];
    const cells = new Int32Array((SIZE - 1) * (ny - 1) * (SIZE - 1)).fill(-1);
    const cellAt = (x: number, y: number, z: number): number => (z * (ny - 1) + y) * (SIZE - 1) + x;
    const corners = new Float32Array(8);

    for (let z = 0; z < SIZE - 1; z++) {
      for (let y = 0; y < ny - 1; y++) {
        for (let x = 0; x < SIZE - 1; x++) {
          let mask = 0;
          for (let c = 0; c < 8; c++) {
            const v = field[at(x + (c & 1), y + ((c >> 1) & 1), z + ((c >> 2) & 1))];
            corners[c] = v;
            if (v >= ISO) mask |= 1 << c;
          }
          if (mask === 0 || mask === 255) continue;

          // Vertex: average of the edge crossings.
          let px = 0;
          let py = 0;
          let pz = 0;
          let n = 0;
          for (const [a, b] of CUBE_EDGES) {
            const va = corners[a];
            const vb = corners[b];
            if (va >= ISO === vb >= ISO) continue;
            const t = (ISO - va) / (vb - va);
            px += (a & 1) + ((b & 1) - (a & 1)) * t;
            py += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t;
            pz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t;
            n++;
          }
          px /= n;
          py /= n;
          pz /= n;
          // Normal: negative density gradient across the cell.
          let gx = 0;
          let gy = 0;
          let gz = 0;
          for (let c = 0; c < 8; c++) {
            const v = corners[c];
            gx += c & 1 ? v : -v;
            gy += (c >> 1) & 1 ? v : -v;
            gz += (c >> 2) & 1 ? v : -v;
          }
          const gl = Math.hypot(gx, gy, gz) || 1;

          // Which block does this bit of surface belong to, and how bright is the air beside it?
          let bestId = 0;
          let bestScore = -1;
          let skyLight = 0;
          let blockLight = 0;
          let airSeen = false;
          for (let c = 0; c < 8; c++) {
            const sx = x + (c & 1);
            const sy = y + ((c >> 1) & 1);
            const sz = z + ((c >> 2) & 1);
            const id = ids[at(sx, sy, sz)];
            if (raw[at(sx, sy, sz)] > 0) {
              // Prefer the highest solid block (grass over dirt on a hill top).
              const score = sy;
              if (score > bestScore) {
                bestScore = score;
                bestId = id;
              }
            } else {
              airSeen = true;
              skyLight = Math.max(skyLight, this.world.getSkyLight(baseX + sx, sy, baseZ + sz));
              blockLight = Math.max(blockLight, this.world.getBlockLight(baseX + sx, sy, baseZ + sz));
            }
          }
          if (!airSeen) {
            skyLight = this.world.getSkyLight(baseX + x, y + 1, baseZ + z);
            blockLight = this.world.getBlockLight(baseX + x, y + 1, baseZ + z);
          }
          const def = this.registry.get(bestId);
          const topRect = this.atlas.rect(def?.textures.top ?? 'dirt');
          const sideRect = this.atlas.rect(def?.textures.side ?? 'dirt');

          cells[cellAt(x, y, z)] = positions.length / 3;
          positions.push(baseX + x + px, y + py, baseZ + z + pz);
          normals.push(-gx / gl, -gy / gl, -gz / gl);
          sky.push(skyLight / 15);
          block.push(Math.max(blockLight, def?.lightLevel ?? 0) / 15);
          tileTop.push(topRect.u0, topRect.v0, topRect.u1 - topRect.u0, topRect.v1 - topRect.v0);
          tileSide.push(sideRect.u0, sideRect.v0, sideRect.u1 - sideRect.u0, sideRect.v1 - sideRect.v0);

          // Quads: one per crossing edge leaving corner 0, shared with the three lower cells.
          if (x === 0 || y === 0 || z === 0) continue;
          // Own only edges whose first sample lies inside this chunk (region index 1..16).
          const owned = x >= BORDER && x < BORDER + CHUNK_SIZE && z >= BORDER && z < BORDER + CHUNK_SIZE;
          if (!owned) continue;
          for (let axis = 0; axis < 3; axis++) {
            // Corner 0 and the corner one step along this axis must differ.
            if (((mask >> (1 << axis)) & 1) === (mask & 1)) continue;
            const u: number = axis === 0 ? 1 : 0; // the other two axes
            const v: number = axis === 2 ? 1 : 2;
            const du = [u === 0 ? 1 : 0, u === 1 ? 1 : 0, u === 2 ? 1 : 0];
            const dv = [v === 0 ? 1 : 0, v === 1 ? 1 : 0, v === 2 ? 1 : 0];
            const i0 = cells[cellAt(x, y, z)];
            const i1 = cells[cellAt(x - du[0], y - du[1], z - du[2])];
            const i2 = cells[cellAt(x - du[0] - dv[0], y - du[1] - dv[1], z - du[2] - dv[2])];
            const i3 = cells[cellAt(x - dv[0], y - dv[1], z - dv[2])];
            if (i1 < 0 || i2 < 0 || i3 < 0) continue;
            // Wind the quad so its face agrees with the vertex normal.
            const ax = positions[i1 * 3] - positions[i0 * 3];
            const ay = positions[i1 * 3 + 1] - positions[i0 * 3 + 1];
            const az = positions[i1 * 3 + 2] - positions[i0 * 3 + 2];
            const bx = positions[i2 * 3] - positions[i0 * 3];
            const by = positions[i2 * 3 + 1] - positions[i0 * 3 + 1];
            const bz = positions[i2 * 3 + 2] - positions[i0 * 3 + 2];
            const fx = ay * bz - az * by;
            const fy = az * bx - ax * bz;
            const fz = ax * by - ay * bx;
            const facing = fx * normals[i0 * 3] + fy * normals[i0 * 3 + 1] + fz * normals[i0 * 3 + 2];
            if (facing >= 0) indices.push(i0, i1, i2, i0, i2, i3);
            else indices.push(i0, i3, i2, i0, i2, i1);
          }
        }
      }
    }
    if (indices.length === 0) return null;
    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      uvs: new Float32Array((positions.length / 3) * 2),
      skylight: new Float32Array(sky),
      blocklight: new Float32Array(block),
      tileTop: new Float32Array(tileTop),
      tileSide: new Float32Array(tileSide),
      indices: new Uint32Array(indices),
    };
  }
}
