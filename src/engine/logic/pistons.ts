import { B } from '../blocks/blocks';
import { BlockState } from '../blocks/BlockState';
import type { BlockRegistry } from '../blocks/registry';
import { DIRECTIONS, DIR_NY, DIR_PY, WORLD_HEIGHT, rotationToDirection, type Direction } from '../world/coords';
import type { VoxelWorld } from '../world/VoxelWorld';

/** Like the real thing: up to twelve blocks move; a thirteenth stops the piston. */
export const MAX_PUSH = 12;

/** Pistons face the four sides by rotation, or up (variant 1) and down (variant 2). */
export const PISTON_UP = 1;
export const PISTON_DOWN = 2;

export function pistonDirection(state: number): Direction {
  const v = BlockState.variant(state);
  if (v === PISTON_UP) return DIR_PY;
  if (v === PISTON_DOWN) return DIR_NY;
  return rotationToDirection(BlockState.rotation(state));
}

function movable(world: VoxelWorld, registry: BlockRegistry, x: number, y: number, z: number): 'air' | 'push' | 'break' | 'stuck' {
  const id = world.getBlock(x, y, z);
  if (id === 0) return 'air';
  const def = registry.get(id);
  if (!def) return 'stuck';
  if (def.immovable || world.getEntity(x, y, z)) return 'stuck';
  if (def.collision === 'none' || def.replaceable) return 'break';
  return 'push';
}

/** Pushes the row of blocks in front of a piston and places its head. */
export function extendPiston(world: VoxelWorld, registry: BlockRegistry, x: number, y: number, z: number, dir: Direction): boolean {
  const state = world.getState(x, y, z);
  if (BlockState.isOpen(state)) return false;
  const d = DIRECTIONS[dir];
  const row: Array<{ x: number; y: number; z: number; id: number; state: number }> = [];
  let cx = x + d.x;
  let cy = y + d.y;
  let cz = z + d.z;
  for (let i = 0; i <= MAX_PUSH; i++) {
    if (cy < 0 || cy >= WORLD_HEIGHT || !world.isLoaded(cx, cz)) return false;
    const kind = movable(world, registry, cx, cy, cz);
    if (kind === 'air' || kind === 'break') break;
    if (kind === 'stuck' || i === MAX_PUSH) return false;
    row.push({ x: cx, y: cy, z: cz, id: world.getBlock(cx, cy, cz), state: world.getState(cx, cy, cz) });
    cx += d.x;
    cy += d.y;
    cz += d.z;
  }
  // Move from the far end back so nothing overwrites.
  for (let i = row.length - 1; i >= 0; i--) {
    const b = row[i];
    world.setBlock(b.x + d.x, b.y + d.y, b.z + d.z, b.id, b.state);
  }
  world.setBlock(x + d.x, y + d.y, z + d.z, B.piston_head, BlockState.withVariant(BlockState.withRotation(0, BlockState.rotation(state)), BlockState.variant(state)));
  world.setBlock(x, y, z, world.getBlock(x, y, z), BlockState.withOpen(state, true));
  return true;
}

/** Removes the head; a sticky piston pulls the block beyond it back. */
export function retractPiston(world: VoxelWorld, registry: BlockRegistry, x: number, y: number, z: number, dir: Direction, sticky: boolean): boolean {
  const state = world.getState(x, y, z);
  if (!BlockState.isOpen(state)) return false;
  const d = DIRECTIONS[dir];
  const hx = x + d.x;
  const hy = y + d.y;
  const hz = z + d.z;
  if (world.getBlock(hx, hy, hz) === B.piston_head) world.setBlock(hx, hy, hz, 0, 0);
  if (sticky) {
    const bx = hx + d.x;
    const by = hy + d.y;
    const bz = hz + d.z;
    if (movable(world, registry, bx, by, bz) === 'push') {
      world.setBlock(hx, hy, hz, world.getBlock(bx, by, bz), world.getState(bx, by, bz));
      world.setBlock(bx, by, bz, 0, 0);
    }
  }
  world.setBlock(x, y, z, world.getBlock(x, y, z), BlockState.withOpen(state, false));
  return true;
}
