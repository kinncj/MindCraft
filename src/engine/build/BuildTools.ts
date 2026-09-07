import type { BlockRegistry } from '../blocks/registry';
import { SetBlocksCommand, type BlockEdit } from '../commands/Command';
import type { CommandHistory } from '../commands/CommandHistory';
import type { BlockHit } from '../physics/raycast';
import { DIRECTIONS, WORLD_HEIGHT } from '../world/coords';
import type { VoxelWorld } from '../world/VoxelWorld';
import { centeredOrigin, mirrorState, rotateStamp, stampToEdits, type Stamp } from './Clipboard';

export type BuildTool = 'room' | 'fill' | 'paint' | 'copy' | 'paste';

export type Vec3 = { x: number; y: number; z: number };

const MAX_EDITS = 20000;

/**
 * The Sims-style build tools: two-tap boxes (room, fill, copy), one-tap
 * paint and paste, a mirror plane, and a clipboard that blueprints load
 * into. Every result is one undo step.
 */
export class BuildTools {
  clipboard: Stamp | null = null;
  rotation = 0;
  /** First corner of a two-tap tool, or null. */
  corner: Vec3 | null = null;
  /** When set, every edit also happens mirrored across x = mirrorX. */
  mirrorX: number | null = null;
  /** Short kid-facing hints the UI shows as toasts. */
  onHint: ((message: string) => void) | null = null;

  constructor(
    private world: VoxelWorld,
    private registry: BlockRegistry,
    private history: CommandHistory,
  ) {}

  cancel(): void {
    this.corner = null;
  }

  setMirror(x: number | null): void {
    this.mirrorX = x;
  }

  setClipboard(stamp: Stamp | null): void {
    this.clipboard = stamp;
    this.rotation = 0;
  }

  rotateClipboard(): void {
    if (!this.clipboard) return;
    this.rotation = (this.rotation + 1) % 4;
  }

  /** The clipboard as it will be pasted (rotation applied). */
  pasteStamp(): Stamp | null {
    return this.clipboard ? rotateStamp(this.clipboard, this.rotation, this.registry) : null;
  }

  /** Runs edits through history, adding the mirrored copies if mirroring. */
  run(label: string, edits: BlockEdit[]): number {
    let all = edits;
    if (this.mirrorX !== null) {
      const mx = this.mirrorX;
      all = [...edits, ...edits.map((e) => ({ ...e, x: 2 * mx - e.x, state: mirrorState(e.state) }))];
    }
    const seen = new Set<string>();
    const unique = all.filter((e) => {
      const key = `${e.x},${e.y},${e.z}`;
      if (seen.has(key) || e.y < 0 || e.y >= WORLD_HEIGHT || !this.world.isLoaded(e.x, e.z)) return false;
      seen.add(key);
      return true;
    });
    if (unique.length === 0) return 0;
    if (unique.length > MAX_EDITS) throw new Error(`that is too big (max ${MAX_EDITS} blocks)`);
    this.history.run(new SetBlocksCommand(label, unique));
    return unique.length;
  }

  /** The cell a tap on `hit` refers to for box tools: the block itself. */
  private cellOf(hit: BlockHit): Vec3 {
    return { x: hit.x, y: hit.y, z: hit.z };
  }

  /** The cell next to the tapped face (where you would place). */
  private aboveOf(hit: BlockHit): Vec3 {
    const d = DIRECTIONS[hit.face];
    return { x: hit.x + d.x, y: hit.y + d.y, z: hit.z + d.z };
  }

  /** Handles a tap for the active tool. Returns a short description. */
  handleTap(tool: BuildTool, hit: BlockHit, selectedId: number): string {
    switch (tool) {
      case 'paint':
        return this.paint(hit, selectedId) ? 'painted' : 'paint-failed';
      case 'paste':
        return this.paste(this.aboveOf(hit)) > 0 ? 'pasted' : 'paste-failed';
      case 'room':
      case 'fill':
      case 'copy': {
        const cell = tool === 'copy' ? this.cellOf(hit) : this.aboveOf(hit);
        if (!this.corner) {
          this.corner = cell;
          this.onHint?.('Now tap the other corner! 📐');
          return 'corner';
        }
        const a = this.corner;
        this.corner = null;
        if (tool === 'room') return this.room(a, cell, selectedId) > 0 ? 'room' : 'room-failed';
        if (tool === 'fill') return this.fill(a, cell, selectedId) > 0 ? 'filled' : 'fill-failed';
        return this.copy(a, cell) ? 'copied' : 'copy-failed';
      }
    }
  }

  paint(hit: BlockHit, id: number): boolean {
    const def = this.registry.get(id);
    const old = this.registry.get(hit.id);
    if (!def || !old) return false;
    if (hit.id === id) return false;
    // Same shape keeps its rotation/half; a different shape starts fresh.
    const state = def.shape === old.shape ? this.world.getState(hit.x, hit.y, hit.z) : 0;
    return this.run(`Paint ${def.label}`, [{ x: hit.x, y: hit.y, z: hit.z, id, state }]) > 0;
  }

  /** Floor plus hollow walls three high, with a doorway on the near side. */
  room(a: Vec3, b: Vec3, id: number): number {
    const def = this.registry.get(id);
    if (!def) return 0;
    return this.run(`Room of ${def.label}`, this.planRoom(a, b, id));
  }

  planRoom(a: Vec3, b: Vec3, id: number): BlockEdit[] {
    const x0 = Math.min(a.x, b.x);
    const x1 = Math.max(a.x, b.x);
    const z0 = Math.min(a.z, b.z);
    const z1 = Math.max(a.z, b.z);
    const y = Math.min(a.y, b.y);
    const edits: BlockEdit[] = [];
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        edits.push({ x, y, z, id, state: 0, entity: null });
        const wall = x === x0 || x === x1 || z === z0 || z === z1;
        if (!wall) continue;
        for (let h = 1; h <= 3; h++) edits.push({ x, y: y + h, z, id, state: 0, entity: null });
      }
    }
    // Doorway: two air cells in the middle of the z0 wall.
    const dx = Math.floor((x0 + x1) / 2);
    if (x1 - x0 >= 2 && z1 - z0 >= 2) {
      for (const e of edits) if (e.x === dx && e.z === z0 && (e.y === y + 1 || e.y === y + 2)) e.id = 0;
    }
    return edits;
  }

  fill(a: Vec3, b: Vec3, id: number): number {
    const def = id === 0 ? { label: 'air' } : this.registry.get(id);
    if (!def) return 0;
    return this.run(`Fill ${def.label}`, this.planFill(a, b, id));
  }

  planFill(a: Vec3, b: Vec3, id: number): BlockEdit[] {
    const edits: BlockEdit[] = [];
    for (let x = Math.min(a.x, b.x); x <= Math.max(a.x, b.x); x++) {
      for (let y = Math.min(a.y, b.y); y <= Math.max(a.y, b.y); y++) {
        for (let z = Math.min(a.z, b.z); z <= Math.max(a.z, b.z); z++) edits.push({ x, y, z, id, state: 0, entity: null });
      }
    }
    return edits;
  }

  /**
   * Simple shapes a kid asks for by name: pyramid, tower, cube, platform,
   * wall, ring, tree, line. Centered on (x, z), bottom at y.
   */
  planShape(shape: string, x: number, y: number, z: number, id: number, size = 5): BlockEdit[] {
    const edits: BlockEdit[] = [];
    const put = (px: number, py: number, pz: number, bid = id, state = 0): void => {
      edits.push({ x: px, y: py, z: pz, id: bid, state, entity: null });
    };
    const s = Math.max(2, Math.min(16, Math.round(size)));
    const half = Math.floor(s / 2);
    switch (shape) {
      case 'pyramid':
        for (let level = 0; level <= half; level++) {
          for (let dx = -half + level; dx <= half - level; dx++) for (let dz = -half + level; dz <= half - level; dz++) put(x + dx, y + level, z + dz);
        }
        break;
      case 'tower':
        for (let h = 0; h < s * 2; h++) {
          for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if (Math.abs(dx) === 2 || Math.abs(dz) === 2) put(x + dx, y + h, z + dz);
        }
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) if ((dx + dz) % 2 === 0 && (Math.abs(dx) === 2 || Math.abs(dz) === 2)) put(x + dx, y + s * 2, z + dz);
        for (let h = 0; h < s * 2; h++) put(x, y + h, z, this.registry.byId('ladder')?.numericId ?? id, 0);
        break;
      case 'cube':
      case 'box':
        for (let dx = -half; dx <= half; dx++) for (let dy = 0; dy < s; dy++) for (let dz = -half; dz <= half; dz++) put(x + dx, y + dy, z + dz);
        break;
      case 'platform':
      case 'floor':
        for (let dx = -half; dx <= half; dx++) for (let dz = -half; dz <= half; dz++) put(x + dx, y, z + dz);
        break;
      case 'wall':
        for (let dx = -half; dx <= half; dx++) for (let dy = 0; dy < Math.max(3, Math.ceil(s / 2)); dy++) put(x + dx, y + dy, z);
        break;
      case 'ring':
      case 'circle':
        for (let dx = -half; dx <= half; dx++) for (let dz = -half; dz <= half; dz++) {
          const d = Math.hypot(dx, dz);
          if (d <= half + 0.4 && d >= half - 0.6) put(x + dx, y, z + dz);
        }
        break;
      case 'line':
      case 'road':
      case 'path':
        for (let dz = -s; dz <= s; dz++) put(x, y, z + dz);
        break;
      case 'tree': {
        const wood = this.registry.byId('wood')?.numericId ?? id;
        const leaves = this.registry.byId('leaves')?.numericId ?? id;
        for (let h = 0; h < 4; h++) put(x, y + h, z, wood);
        for (let dy = 2; dy <= 5; dy++) {
          const r = dy === 5 ? 0 : dy === 4 ? 1 : 2;
          for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) if (!(dx === 0 && dz === 0 && dy < 4)) put(x + dx, y + dy, z + dz, leaves);
        }
        break;
      }
      case 'arch':
        for (let h = 0; h < s; h++) {
          put(x - half, y + h, z);
          put(x + half, y + h, z);
        }
        for (let dx = -half; dx <= half; dx++) put(x + dx, y + s, z);
        break;
      default:
        return [];
    }
    return edits;
  }

  /** Edits for a stamp centered on (x, z) with its bottom at y, rotated. */
  planStamp(stamp: Stamp, x: number, y: number, z: number, rotation: number, remap?: (id: number) => number): BlockEdit[] {
    const rotated = rotateStamp(stamp, rotation, this.registry);
    const origin = centeredOrigin(rotated, x, y, z);
    const edits = stampToEdits(rotated, origin.x, origin.y, origin.z);
    return remap ? edits.map((e) => ({ ...e, id: remap(e.id) })) : edits;
  }

  copy(a: Vec3, b: Vec3): boolean {
    const x0 = Math.min(a.x, b.x);
    const y0 = Math.min(a.y, b.y);
    const z0 = Math.min(a.z, b.z);
    const stamp: Stamp = { width: Math.abs(a.x - b.x) + 1, height: Math.abs(a.y - b.y) + 1, depth: Math.abs(a.z - b.z) + 1, blocks: [] };
    if (stamp.width * stamp.height * stamp.depth > MAX_EDITS) return false;
    for (let x = 0; x < stamp.width; x++) {
      for (let y = 0; y < stamp.height; y++) {
        for (let z = 0; z < stamp.depth; z++) {
          const id = this.world.getBlock(x0 + x, y0 + y, z0 + z);
          if (id === 0) continue;
          const entity = this.world.getEntity(x0 + x, y0 + y, z0 + z);
          stamp.blocks.push({ x, y, z, id, state: this.world.getState(x0 + x, y0 + y, z0 + z), entity: entity ? { kind: entity.kind, data: JSON.parse(JSON.stringify(entity.data)) } : undefined });
        }
      }
    }
    if (stamp.blocks.length === 0) return false;
    this.setClipboard(stamp);
    this.onHint?.('Copied! Now tap where to put it. 📋');
    return true;
  }

  /** Pastes the clipboard centered on a target cell (its bottom). */
  paste(target: Vec3): number {
    const stamp = this.pasteStamp();
    if (!stamp) return 0;
    const origin = centeredOrigin(stamp, target.x, target.y, target.z);
    return this.run('Paste', stampToEdits(stamp, origin.x, origin.y, origin.z));
  }

  /** Where the paste would land, for the ghost: min and max corners. */
  pasteBounds(target: Vec3): { min: Vec3; max: Vec3 } | null {
    const stamp = this.pasteStamp();
    if (!stamp) return null;
    const o = centeredOrigin(stamp, target.x, target.y, target.z);
    return { min: o, max: { x: o.x + stamp.width - 1, y: o.y + stamp.height - 1, z: o.z + stamp.depth - 1 } };
  }
}
