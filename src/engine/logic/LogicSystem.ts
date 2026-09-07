import type { BlockRegistry } from '../blocks/registry';
import { BlockState } from '../blocks/BlockState';
import type { System } from '../core/System';
import type { Box } from '../physics/collision';
import type { Chunk } from '../world/Chunk';
import { CHUNK_SIZE, DIRECTIONS, WORLD_HEIGHT, localIndex, positionKey } from '../world/coords';
import type { BlockChange, VoxelWorld } from '../world/VoxelWorld';
import { extendPiston, pistonDirection, retractPiston } from './pistons';

export type LogicRole = 'source' | 'wire' | 'consumer';

const TICK = 0.1;
const BUTTON_SECONDS = 1.5;
const MAX_WIRE = 15;

export type LogicEvent = { kind: 'note'; x: number; y: number; z: number; pitch: number } | { kind: 'piston'; x: number; y: number; z: number; extended: boolean };

/**
 * Power flows from sources (a lever that is on, a pressed button, a
 * stepped-on plate) through wires, fading one per block, into anything
 * next to them. Consumers get `onPowerChanged` when their power flips.
 * Runs ten times a second over the logic blocks in loaded chunks only.
 */
export class LogicSystem implements System {
  readonly name = 'logic';
  private cells = new Map<string, { x: number; y: number; z: number }>();
  private powered = new Map<string, number>();
  private buttonTimers = new Map<string, number>();
  private accumulator = 0;
  private listeners = new Set<(event: LogicEvent) => void>();
  /** Boxes that press plates: the player (and later vehicles). */
  pressers: () => Box[] = () => [];

  constructor(
    private world: VoxelWorld,
    private registry: BlockRegistry,
  ) {
    world.subscribe({
      onChunkAdded: (chunk) => this.scanChunk(chunk),
      onChunkRemoved: (chunk) => this.forgetChunk(chunk),
      onBlockChanged: (change) => this.onBlockChanged(change),
    });
  }

  onEvent(listener: (event: LogicEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private role(id: number): LogicRole | null {
    return this.registry.get(id)?.logic?.role ?? null;
  }

  private scanChunk(chunk: Chunk): void {
    const baseX = chunk.cx * CHUNK_SIZE;
    const baseZ = chunk.cz * CHUNK_SIZE;
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const top = chunk.height(lx, lz);
        for (let y = 0; y <= top; y++) {
          const id = chunk.blocks[localIndex(lx, y, lz)];
          if (id !== 0 && this.role(id)) {
            const x = baseX + lx;
            const z = baseZ + lz;
            this.cells.set(positionKey(x, y, z), { x, y, z });
          }
        }
      }
    }
  }

  private forgetChunk(chunk: Chunk): void {
    for (const [key, c] of this.cells) {
      if (c.x >> 4 === chunk.cx && c.z >> 4 === chunk.cz) {
        this.cells.delete(key);
        this.powered.delete(key);
      }
    }
  }

  private onBlockChanged(change: BlockChange): void {
    const key = positionKey(change.x, change.y, change.z);
    if (this.role(change.id)) this.cells.set(key, { x: change.x, y: change.y, z: change.z });
    else {
      this.cells.delete(key);
      this.powered.delete(key);
      this.buttonTimers.delete(key);
    }
  }

  /** Power level (0..15) reaching a cell. */
  powerAt(x: number, y: number, z: number): number {
    return this.powered.get(positionKey(x, y, z)) ?? 0;
  }

  /** A button was pressed: it stays on for a moment. */
  pressButton(x: number, y: number, z: number): void {
    this.buttonTimers.set(positionKey(x, y, z), BUTTON_SECONDS);
  }

  private plateIsPressed(x: number, y: number, z: number): boolean {
    for (const box of this.pressers()) {
      if (box.maxX > x - 0.5 && box.minX < x + 0.5 && box.maxZ > z - 0.5 && box.minZ < z + 0.5 && box.minY <= y + 0.1 && box.maxY >= y - 0.5) return true;
    }
    return false;
  }

  /** Is this cell a source that is currently emitting? */
  private sourceLevel(x: number, y: number, z: number, id: number, state: number, key: string): number {
    const def = this.registry.get(id);
    if (!def?.logic || def.logic.role !== 'source') return 0;
    if (def.logic.kind === 'lever') return BlockState.isOpen(state) ? MAX_WIRE : 0;
    if (def.logic.kind === 'button') return (this.buttonTimers.get(key) ?? 0) > 0 ? MAX_WIRE : 0;
    if (def.logic.kind === 'plate') return this.plateIsPressed(x, y, z) ? MAX_WIRE : 0;
    return 0;
  }

  update(dt: number): void {
    this.accumulator += dt;
    while (this.accumulator >= TICK) {
      this.accumulator -= TICK;
      this.tick();
    }
  }

  /** One logic step. Public so tests can drive it. */
  tick(): void {
    for (const [key, t] of this.buttonTimers) {
      const next = t - TICK;
      if (next <= 0) this.buttonTimers.delete(key);
      else this.buttonTimers.set(key, next);
    }

    // Seed from sources.
    const next = new Map<string, number>();
    const queue: Array<[number, number, number, number]> = [];
    for (const [key, c] of this.cells) {
      const id = this.world.getBlock(c.x, c.y, c.z);
      const level = this.sourceLevel(c.x, c.y, c.z, id, this.world.getState(c.x, c.y, c.z), key);
      if (level > 0) {
        next.set(key, level);
        queue.push([c.x, c.y, c.z, level]);
      }
    }
    // Flow through wires; anything adjacent to power is powered.
    let head = 0;
    while (head < queue.length) {
      const [x, y, z, level] = queue[head++];
      for (const d of DIRECTIONS) {
        const nx = x + d.x;
        const ny = y + d.y;
        const nz = z + d.z;
        if (ny < 0 || ny >= WORLD_HEIGHT) continue;
        const nid = this.world.getBlock(nx, ny, nz);
        if (nid === 0) continue;
        const role = this.role(nid);
        if (!role) continue;
        const nkey = positionKey(nx, ny, nz);
        const nlevel = role === 'wire' ? level - 1 : level;
        if (nlevel <= 0) continue;
        if ((next.get(nkey) ?? 0) >= nlevel) continue;
        next.set(nkey, nlevel);
        if (role === 'wire') queue.push([nx, ny, nz, nlevel]);
      }
      // Wire climbs: dust on a step connects to dust one block up or down next to it.
      if (this.role(this.world.getBlock(x, y, z)) !== 'wire') continue;
      for (const d of DIRECTIONS) {
        if (d.y !== 0) continue;
        for (const dy of [1, -1]) {
          const nx = x + d.x;
          const ny = y + dy;
          const nz = z + d.z;
          if (ny < 0 || ny >= WORLD_HEIGHT) continue;
          const nid = this.world.getBlock(nx, ny, nz);
          if (nid === 0 || this.role(nid) !== 'wire') continue;
          const nkey = positionKey(nx, ny, nz);
          const nlevel = level - 1;
          if (nlevel <= 0 || (next.get(nkey) ?? 0) >= nlevel) continue;
          next.set(nkey, nlevel);
          queue.push([nx, ny, nz, nlevel]);
        }
      }
    }

    // Notify changes.
    const keys = new Set([...this.powered.keys(), ...next.keys()]);
    for (const key of keys) {
      const was = (this.powered.get(key) ?? 0) > 0;
      const now = (next.get(key) ?? 0) > 0;
      const cell = this.cells.get(key);
      if (!cell) continue;
      const id = this.world.getBlock(cell.x, cell.y, cell.z);
      const def = this.registry.get(id);
      if (!def) continue;
      if (def.logic?.role === 'wire') {
        const state = this.world.getState(cell.x, cell.y, cell.z);
        const lit = BlockState.variant(state) === 1;
        if (lit !== now) this.world.setBlock(cell.x, cell.y, cell.z, id, BlockState.withVariant(state, now ? 1 : 0));
      }
      if (was !== now) {
        const state = this.world.getState(cell.x, cell.y, cell.z);
        def.behavior?.onPowerChanged?.({ world: this.world, position: cell, blockId: id, state, powered: now });
        if (def.logic?.kind === 'piston' || def.logic?.kind === 'sticky_piston') {
          const dir = pistonDirection(state);
          const ok = now ? extendPiston(this.world, this.registry, cell.x, cell.y, cell.z, dir) : retractPiston(this.world, this.registry, cell.x, cell.y, cell.z, dir, def.logic.kind === 'sticky_piston');
          if (ok) for (const l of this.listeners) l({ kind: 'piston', ...cell, extended: now });
        }
        if (def.logic?.kind === 'note' && now) {
          for (const l of this.listeners) l({ kind: 'note', ...cell, pitch: BlockState.variant(state) });
        }
      }
    }
    this.powered = next;
  }

  get logicCellCount(): number {
    return this.cells.size;
  }
}
