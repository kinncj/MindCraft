import type { BlockRegistry } from '../blocks/registry';
import { SHAPES, type AABB } from '../blocks/shapes';
import type { VoxelWorld } from '../world/VoxelWorld';

/** World-space box: min/max corners. */
export type Box = { minX: number; minY: number; minZ: number; maxX: number; maxY: number; maxZ: number };

export function boxOverlaps(a: Box, b: Box): boolean {
  return (
    a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY && a.minZ < b.maxZ && a.maxZ > b.minZ
  );
}

/** Block (x, y, z) occupies [x-0.5, x+0.5]; shapes are 0..1 within it. */
export function shapeBoxToWorld(local: AABB, x: number, y: number, z: number): Box {
  return {
    minX: x - 0.5 + local.minX,
    minY: y - 0.5 + local.minY,
    minZ: z - 0.5 + local.minZ,
    maxX: x - 0.5 + local.maxX,
    maxY: y - 0.5 + local.maxY,
    maxZ: z - 0.5 + local.maxZ,
  };
}

/** All solid collision boxes intersecting a region. */
export function solidBoxesIn(world: VoxelWorld, registry: BlockRegistry, region: Box): Box[] {
  const out: Box[] = [];
  const x0 = Math.floor(region.minX + 0.5);
  const x1 = Math.floor(region.maxX + 0.5);
  const y0 = Math.floor(region.minY + 0.5);
  const y1 = Math.floor(region.maxY + 0.5);
  const z0 = Math.floor(region.minZ + 0.5);
  const z1 = Math.floor(region.maxZ + 0.5);
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      for (let z = z0; z <= z1; z++) {
        const id = world.getBlock(x, y, z);
        if (id === 0) continue;
        const def = registry.get(id);
        if (!def || def.collision !== 'solid') continue;
        const state = world.getState(x, y, z);
        for (const local of SHAPES[def.shape].boxes(state)) {
          const box = shapeBoxToWorld(local, x, y, z);
          if (boxOverlaps(box, region)) out.push(box);
        }
      }
    }
  }
  return out;
}

/** Is the cell containing this point a fluid (water)? */
export function isFluidAt(world: VoxelWorld, registry: BlockRegistry, x: number, y: number, z: number): boolean {
  const id = world.getBlock(Math.round(x), Math.round(y), Math.round(z));
  return id !== 0 && registry.get(id)?.collision === 'fluid';
}

/**
 * Moves a box along one axis, stopping at the first solid box in the
 * way. Returns the distance actually moved.
 */
export function sweepAxis(
  box: Box,
  axis: 'x' | 'y' | 'z',
  delta: number,
  solids: Box[],
): number {
  if (delta === 0) return 0;
  let moved = delta;
  const [min, max] = axis === 'x' ? ['minX', 'maxX'] : axis === 'y' ? ['minY', 'maxY'] : ['minZ', 'maxZ'];
  const [oMinA, oMaxA, oMinB, oMaxB] =
    axis === 'x'
      ? ['minY', 'maxY', 'minZ', 'maxZ']
      : axis === 'y'
        ? ['minX', 'maxX', 'minZ', 'maxZ']
        : ['minX', 'maxX', 'minY', 'maxY'];
  const b = box as unknown as Record<string, number>;
  for (const s of solids) {
    const sb = s as unknown as Record<string, number>;
    // Must overlap on the other two axes to be in the way.
    if (b[oMaxA] <= sb[oMinA] || b[oMinA] >= sb[oMaxA]) continue;
    if (b[oMaxB] <= sb[oMinB] || b[oMinB] >= sb[oMaxB]) continue;
    if (moved > 0 && b[max] <= sb[min]) {
      moved = Math.min(moved, sb[min] - b[max]);
    } else if (moved < 0 && b[min] >= sb[max]) {
      moved = Math.max(moved, sb[max] - b[min]);
    }
  }
  const epsilon = 1e-5;
  if (moved !== delta) moved = moved > 0 ? Math.max(0, moved - epsilon) : Math.min(0, moved + epsilon);
  return moved;
}
