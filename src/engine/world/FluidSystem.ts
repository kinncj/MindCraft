import { BlockState } from '../blocks/BlockState';
import type { BlockRegistry } from '../blocks/registry';
import { FLUID_FALLING, FLUID_MAX_LEVEL, FLUID_SOURCE, fluidHeight } from '../blocks/shapes';
import type { System } from '../core/System';
import { WORLD_HEIGHT, positionKey } from './coords';
import type { BlockChange, VoxelWorld } from './VoxelWorld';

const TICK = 0.2;
const BUDGET = 3000;
const SIDES: ReadonlyArray<readonly [number, number]> = [[1, 0], [-1, 0], [0, 1], [0, -1]];

/**
 * Water that flows. A placed water block is a source; it pours straight
 * down when it can, otherwise it spreads sideways, one level weaker per
 * block, up to seven blocks. Flowing water that loses its feed drains
 * away again, so undoing the source empties the stream. Two sources on
 * solid ground turn the water between them into a source (a pond never
 * runs dry). Nothing moves until something changes next to it, so the
 * world's lakes stay still until a kid digs a channel.
 *
 * Runs five times a second over only the cells that were touched.
 */
export class FluidSystem implements System {
  readonly name = 'fluids';
  private pending = new Map<string, { x: number; y: number; z: number }>();
  private accumulator = 0;

  constructor(
    private world: VoxelWorld,
    private registry: BlockRegistry,
  ) {
    world.subscribe({ onBlockChanged: (change) => this.onBlockChanged(change) });
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  private isFluid(id: number): boolean {
    return id !== 0 && this.registry.get(id)?.collision === 'fluid';
  }

  /** Air, or something soft like grass and flowers. Never other water. */
  private canFlowInto(id: number): boolean {
    if (id === 0) return true;
    const def = this.registry.get(id);
    return def?.replaceable === true && def.collision !== 'fluid';
  }

  private level(x: number, y: number, z: number): number {
    const v = BlockState.variant(this.world.getState(x, y, z));
    return v >= FLUID_FALLING ? FLUID_FALLING : v;
  }

  private wake(x: number, y: number, z: number): void {
    if (y < 0 || y >= WORLD_HEIGHT) return;
    this.pending.set(positionKey(x, y, z), { x, y, z });
  }

  private wakeNeighbors(x: number, y: number, z: number): void {
    for (const [dx, dz] of SIDES) if (this.isFluid(this.world.getBlock(x + dx, y, z + dz))) this.wake(x + dx, y, z + dz);
    if (this.isFluid(this.world.getBlock(x, y + 1, z))) this.wake(x, y + 1, z);
    if (this.isFluid(this.world.getBlock(x, y - 1, z))) this.wake(x, y - 1, z);
  }

  private onBlockChanged(change: BlockChange): void {
    const { x, y, z } = change;
    if (this.isFluid(this.world.getBlock(x, y, z))) this.wake(x, y, z);
    this.wakeNeighbors(x, y, z);
  }

  update(dt: number): void {
    this.accumulator += dt;
    while (this.accumulator >= TICK) {
      this.accumulator -= TICK;
      this.tick();
    }
  }

  /** One flow step over the woken cells. Public so tests can drive it. */
  tick(): number {
    const batch = [...this.pending.values()].slice(0, BUDGET);
    for (const cell of batch) this.pending.delete(positionKey(cell.x, cell.y, cell.z));
    for (const cell of batch) this.flow(cell.x, cell.y, cell.z);
    return batch.length;
  }

  /** Runs ticks until the water settles (or the cap is hit). For tools and tests. */
  settle(maxTicks = 200): void {
    for (let i = 0; i < maxTicks && this.pending.size > 0; i++) this.tick();
  }

  private flow(x: number, y: number, z: number): void {
    const id = this.world.getBlock(x, y, z);
    if (!this.isFluid(id)) return;
    let level = this.level(x, y, z);

    if (level !== FLUID_SOURCE) {
      // Is this water still fed from above or from a stronger neighbor?
      const fedAbove = y + 1 < WORLD_HEIGHT && this.isFluid(this.world.getBlock(x, y + 1, z));
      let expected = Infinity;
      if (fedAbove) expected = FLUID_FALLING;
      else {
        for (const [dx, dz] of SIDES) {
          if (!this.isFluid(this.world.getBlock(x + dx, y, z + dz))) continue;
          const nl = this.level(x + dx, y, z + dz);
          expected = Math.min(expected, (nl === FLUID_FALLING ? 0 : nl) + 1);
        }
      }
      if (!fedAbove && expected > FLUID_MAX_LEVEL) {
        this.world.setBlock(x, y, z, 0, 0);
        this.wakeNeighbors(x, y, z);
        return;
      }
      // Between two sources on firm ground, water becomes a source itself.
      let sources = 0;
      for (const [dx, dz] of SIDES) {
        if (this.isFluid(this.world.getBlock(x + dx, y, z + dz)) && this.level(x + dx, y, z + dz) === FLUID_SOURCE) sources++;
      }
      const below = y > 0 ? this.world.getBlock(x, y - 1, z) : 0;
      const firm = y === 0 || (below !== 0 && (!this.isFluid(below) || this.level(x, y - 1, z) === FLUID_SOURCE));
      if (sources >= 2 && firm) {
        this.world.setBlock(x, y, z, id, BlockState.withVariant(0, FLUID_SOURCE));
        level = FLUID_SOURCE;
        this.wakeNeighbors(x, y, z);
      } else if (expected !== level) {
        this.world.setBlock(x, y, z, id, BlockState.withVariant(0, expected));
        level = expected;
        this.wakeNeighbors(x, y, z);
      }
    }

    // Down first.
    if (y > 0) {
      const bid = this.world.getBlock(x, y - 1, z);
      if (this.canFlowInto(bid)) {
        if (!this.world.isLoaded(x, z)) return;
        this.world.setBlock(x, y - 1, z, id, BlockState.withVariant(0, FLUID_FALLING));
        this.wake(x, y - 1, z);
        return;
      }
      if (this.isFluid(bid)) {
        const bl = this.level(x, y - 1, z);
        if (bl !== FLUID_SOURCE && bl !== FLUID_FALLING) {
          this.world.setBlock(x, y - 1, z, id, BlockState.withVariant(0, FLUID_FALLING));
          this.wake(x, y - 1, z);
        }
        return;
      }
    }

    // Then sideways, one level weaker.
    const next = level === FLUID_SOURCE || level === FLUID_FALLING ? 1 : level + 1;
    if (next > FLUID_MAX_LEVEL) return;
    for (const [dx, dz] of SIDES) {
      const nx = x + dx;
      const nz = z + dz;
      if (!this.world.isLoaded(nx, nz)) continue;
      const nid = this.world.getBlock(nx, y, nz);
      if (this.canFlowInto(nid)) {
        this.world.setBlock(nx, y, nz, id, BlockState.withVariant(0, next));
        this.wake(nx, y, nz);
      } else if (this.isFluid(nid)) {
        const nl = this.level(nx, y, nz);
        if (nl !== FLUID_SOURCE && nl !== FLUID_FALLING && nl > next) {
          this.world.setBlock(nx, y, nz, id, BlockState.withVariant(0, next));
          this.wake(nx, y, nz);
        }
      }
    }
  }

  /**
   * Which way the water at a cell pushes, as a unit-ish vector (zero in
   * still water). Downhill means toward weaker levels and toward edges
   * it is about to pour over.
   */
  current(x: number, y: number, z: number): { x: number; z: number } {
    const id = this.world.getBlock(x, y, z);
    if (!this.isFluid(id)) return { x: 0, z: 0 };
    const h = fluidHeight(this.world.getState(x, y, z));
    const level = this.level(x, y, z);
    let fx = 0;
    let fz = 0;
    for (const [dx, dz] of SIDES) {
      const nid = this.world.getBlock(x + dx, y, z + dz);
      let d = 0;
      if (this.isFluid(nid)) d = h - fluidHeight(this.world.getState(x + dx, y, z + dz));
      else if (level !== FLUID_SOURCE && this.canFlowInto(nid)) d = h;
      fx += dx * d;
      fz += dz * d;
    }
    const len = Math.hypot(fx, fz);
    if (len < 0.01) return { x: 0, z: 0 };
    const strength = Math.min(1, len * 4);
    return { x: (fx / len) * strength, z: (fz / len) * strength };
  }
}
