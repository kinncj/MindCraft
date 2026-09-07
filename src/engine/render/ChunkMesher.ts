import type { RenderBucket } from '../blocks/BlockDefinition';
import type { BlockRegistry } from '../blocks/registry';
import { SHAPES } from '../blocks/shapes';
import type { Chunk } from '../world/Chunk';
import { CHUNK_SIZE, DIRECTIONS, WORLD_HEIGHT, localIndex, oppositeDirection } from '../world/coords';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { TextureAtlas } from './TextureAtlas';

/** Raw geometry for one bucket, ready to become a BufferGeometry. */
export type MeshData = {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  skylight: Float32Array;
  blocklight: Float32Array;
  indices: Uint32Array;
};

export type ChunkMeshes = Record<RenderBucket, MeshData | null>;

type Buffers = {
  positions: number[];
  normals: number[];
  uvs: number[];
  skylight: number[];
  blocklight: number[];
  indices: number[];
};

const BUCKETS: RenderBucket[] = ['opaque', 'water', 'alpha', 'glow'];

/**
 * Turns one chunk into per-bucket geometry. Shapes decide which quads a
 * block has; neighbors decide which quads are hidden; light grids decide
 * how bright each quad is. No Three.js objects are created here, so the
 * mesher runs (and is tested) without WebGL.
 */
export class ChunkMesher {
  constructor(
    private world: VoxelWorld,
    private registry: BlockRegistry,
    private atlas: TextureAtlas,
  ) {}

  build(chunk: Chunk): ChunkMeshes {
    const buffers: Record<RenderBucket, Buffers> = {
      opaque: empty(),
      water: empty(),
      alpha: empty(),
      glow: empty(),
    };
    const baseX = chunk.cx * CHUNK_SIZE;
    const baseZ = chunk.cz * CHUNK_SIZE;

    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const top = chunk.height(lx, lz);
        for (let y = 0; y <= top; y++) {
          const index = localIndex(lx, y, lz);
          const id = chunk.blocks[index];
          if (id === 0) continue;
          const def = this.registry.get(id);
          if (!def) continue;
          const state = chunk.states[index];
          const shape = SHAPES[def.shape];
          const x = baseX + lx;
          const z = baseZ + lz;
          const selfGlow = def.lightLevel / 15;
          const target = buffers[def.bucket];

          for (const quad of shape.quads(state)) {
            let lightX = x;
            let lightY = y;
            let lightZ = z;
            if (quad.cull !== null) {
              const dir = DIRECTIONS[quad.cull];
              const nx = x + dir.x;
              const ny = y + dir.y;
              const nz = z + dir.z;
              if (ny >= 0 && ny < WORLD_HEIGHT) {
                const nid = this.world.getBlock(nx, ny, nz);
                if (nid !== 0) {
                  const ndef = this.registry.get(nid);
                  if (ndef) {
                    const nstate = this.world.getState(nx, ny, nz);
                    const covers = SHAPES[ndef.shape].occludes(oppositeDirection(quad.cull), nstate);
                    if (covers && (!ndef.seeThrough || nid === id)) continue;
                  }
                }
                // Lit by the cell the face looks into.
                lightX = nx;
                lightY = ny;
                lightZ = nz;
              } else if (ny >= WORLD_HEIGHT) {
                lightY = WORLD_HEIGHT; // open sky
              }
            }
            const sky = this.world.getSkyLight(lightX, lightY, lightZ) / 15;
            const block = Math.max(selfGlow, this.world.getBlockLight(lightX, lightY, lightZ) / 15);
            const rect = this.atlas.rect(def.textures[quad.slot]);
            emit(target, x, y, z, quad.corners, quad.normal, rect, quad.uv, sky, block);
            if (quad.doubleSided) {
              emit(target, x, y, z, [...quad.corners].reverse(), oppositeDirection(quad.normal), rect, quad.uv, sky, block);
            }
          }
        }
      }
    }

    const out = {} as ChunkMeshes;
    for (const bucket of BUCKETS) {
      const b = buffers[bucket];
      out[bucket] =
        b.indices.length === 0
          ? null
          : {
              positions: new Float32Array(b.positions),
              normals: new Float32Array(b.normals),
              uvs: new Float32Array(b.uvs),
              skylight: new Float32Array(b.skylight),
              blocklight: new Float32Array(b.blocklight),
              indices: new Uint32Array(b.indices),
            };
    }
    return out;
  }
}

function empty(): Buffers {
  return { positions: [], normals: [], uvs: [], skylight: [], blocklight: [], indices: [] };
}

function emit(
  b: Buffers,
  x: number,
  y: number,
  z: number,
  corners: [number, number, number][],
  normal: number,
  rect: { u0: number; v0: number; u1: number; v1: number },
  uv: [number, number, number, number],
  sky: number,
  block: number,
): void {
  const base = b.positions.length / 3;
  const n = DIRECTIONS[normal];
  const du = rect.u1 - rect.u0;
  const dv = rect.v1 - rect.v0;
  const u0 = rect.u0 + du * uv[0];
  const v0 = rect.v0 + dv * uv[1];
  const u1 = rect.u0 + du * uv[2];
  const v1 = rect.v0 + dv * uv[3];
  for (const [cx, cy, cz] of corners) {
    // Block (x, y, z) occupies [x-0.5, x+0.5]; shapes are 0..1 local.
    b.positions.push(x - 0.5 + cx, y - 0.5 + cy, z - 0.5 + cz);
    b.normals.push(n.x, n.y, n.z);
    b.skylight.push(sky);
    b.blocklight.push(block);
  }
  b.uvs.push(u0, v0, u1, v0, u1, v1, u0, v1);
  b.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
}
