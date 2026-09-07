import type { BlockDefinition } from '../blocks/BlockDefinition';
import type { BlockRegistry } from '../blocks/registry';
import { SHAPES, type AABB } from '../blocks/shapes';
import {
  DIR_NX,
  DIR_NY,
  DIR_NZ,
  DIR_PX,
  DIR_PY,
  DIR_PZ,
  WORLD_HEIGHT,
  type Direction,
} from '../world/coords';
import type { VoxelWorld } from '../world/VoxelWorld';

export type Ray = { ox: number; oy: number; oz: number; dx: number; dy: number; dz: number };

export type BlockHit = {
  x: number;
  y: number;
  z: number;
  id: number;
  /** The face that was hit (its outward direction). */
  face: Direction;
  /** Hit point in world space. */
  px: number;
  py: number;
  pz: number;
  distance: number;
};

const PICK_FULL: AABB = { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 };

/** Ray vs one local box inside block (x, y, z). Returns distance and face. */
function hitBox(ray: Ray, box: AABB, x: number, y: number, z: number): { t: number; face: Direction } | null {
  const min = [x - 0.5 + box.minX, y - 0.5 + box.minY, z - 0.5 + box.minZ];
  const max = [x - 0.5 + box.maxX, y - 0.5 + box.maxY, z - 0.5 + box.maxZ];
  const o = [ray.ox, ray.oy, ray.oz];
  const d = [ray.dx, ray.dy, ray.dz];
  let tmin = -Infinity;
  let tmax = Infinity;
  let face: Direction = DIR_PY;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < min[i] || o[i] > max[i]) return null;
      continue;
    }
    let t1 = (min[i] - o[i]) / d[i];
    let t2 = (max[i] - o[i]) / d[i];
    let f1: Direction = i === 0 ? DIR_NX : i === 1 ? DIR_NY : DIR_NZ;
    let f2: Direction = i === 0 ? DIR_PX : i === 1 ? DIR_PY : DIR_PZ;
    if (t1 > t2) {
      [t1, t2] = [t2, t1];
      [f1, f2] = [f2, f1];
    }
    if (t1 > tmin) {
      tmin = t1;
      face = f1;
    }
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  if (tmax < 0) return null;
  return { t: Math.max(tmin, 0), face };
}

/**
 * Walks the voxel grid along a ray (Amanatides & Woo) and tests each
 * non-air block's shape boxes, so slabs, stairs, and flowers are picked
 * where they actually are. Flowers and torches (no collision boxes) use
 * their full cell so they stay easy to tap.
 */
export function raycastBlocks(world: VoxelWorld, registry: BlockRegistry, ray: Ray, maxDistance: number, filter?: (def: BlockDefinition) => boolean): BlockHit | null {
  let x = Math.floor(ray.ox + 0.5);
  let y = Math.floor(ray.oy + 0.5);
  let z = Math.floor(ray.oz + 0.5);
  const stepX = Math.sign(ray.dx);
  const stepY = Math.sign(ray.dy);
  const stepZ = Math.sign(ray.dz);
  const tDeltaX = stepX === 0 ? Infinity : Math.abs(1 / ray.dx);
  const tDeltaY = stepY === 0 ? Infinity : Math.abs(1 / ray.dy);
  const tDeltaZ = stepZ === 0 ? Infinity : Math.abs(1 / ray.dz);
  const bound = (o: number, cell: number, step: number, delta: number): number => {
    if (step === 0) return Infinity;
    const edge = step > 0 ? cell + 0.5 : cell - 0.5;
    return Math.abs(edge - o) * delta;
  };
  let tMaxX = bound(ray.ox, x, stepX, tDeltaX);
  let tMaxY = bound(ray.oy, y, stepY, tDeltaY);
  let tMaxZ = bound(ray.oz, z, stepZ, tDeltaZ);
  let t = 0;

  for (let i = 0; i < 512 && t <= maxDistance; i++) {
    if (y >= 0 && y < WORLD_HEIGHT) {
      const id = world.getBlock(x, y, z);
      if (id !== 0) {
        const def = registry.get(id);
        if (def && (!filter || filter(def))) {
          const state = world.getState(x, y, z);
          const boxes = SHAPES[def.shape].boxes(state);
          const candidates = boxes.length > 0 ? boxes : [PICK_FULL];
          let best: { t: number; face: Direction } | null = null;
          for (const box of candidates) {
            const h = hitBox(ray, box, x, y, z);
            if (h && (!best || h.t < best.t)) best = h;
          }
          if (best && best.t <= maxDistance) {
            return {
              x, y, z, id,
              face: best.face,
              px: ray.ox + ray.dx * best.t,
              py: ray.oy + ray.dy * best.t,
              pz: ray.oz + ray.dz * best.t,
              distance: best.t,
            };
          }
        }
      }
    }
    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      x += stepX;
      t = tMaxX;
      tMaxX += tDeltaX;
    } else if (tMaxY < tMaxZ) {
      y += stepY;
      t = tMaxY;
      tMaxY += tDeltaY;
    } else {
      z += stepZ;
      t = tMaxZ;
      tMaxZ += tDeltaZ;
    }
    if (y < 0 && stepY <= 0) break;
    if (y >= WORLD_HEIGHT && stepY >= 0) break;
  }
  return null;
}
