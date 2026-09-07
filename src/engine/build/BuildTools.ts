import type { BlockRegistry } from '../blocks/registry';
import { SetBlocksCommand, type BlockEdit } from '../commands/Command';

export type FurnitureItem = { id: number; state?: number };

export type HouseOptions = {
  width: number;
  depth: number;
  floors: number;
  wall: number;
  roof: number;
  floor: number;
  glass: number;
  chimney: number;
  door: number;
  doorState: number;
  stairs: number;
  stairRotation: number;
  lamp: number | null;
  lantern: number | null;
  pole: number;
  signBlock: number;
  trim: number | null;
  colorful: boolean;
  /** Castle: taller storeys, battlements, corner towers. */
  castle: boolean;
  /** Parapet instead of a pitched roof (skyscrapers, hospitals). */
  flatRoof: boolean;
  /** Corridor and rooms on big floors. */
  rooms: boolean;
  furnish: boolean;
  /** Items cycled along the inside walls of every floor. */
  furniture: FurnitureItem[];
  sign: 'cross' | null;
  /** Flag bitmap rows (block ids, 0 = gap), top row first; null for no flag. */
  flag: number[][] | null;
  /** Colour blocks for pillars and roof when colourful. */
  palette: number[];
}
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
  /**
   * A building generator, not a blueprint: any footprint, any number of
   * floors, walls of any block, a real door at ground level, glass
   * windows, a staircase between every floor with a hole above it, lamps
   * on the walls and lanterns by the door, corridors and rooms on big
   * floors, furniture that fits the kind of building, a sign, a stepped
   * or flat roof, a chimney, castle towers, and a flag on a pole. The
   * foundation replaces the ground layer so the floor is walkable and the
   * door opens onto the grass.
   */
  planHouse(x: number, y: number, z: number, opts: HouseOptions): BlockEdit[] {
    const width = Math.max(5, Math.min(25, opts.width | 1));
    const depth = Math.max(5, Math.min(25, opts.depth | 1));
    const floors = Math.max(1, Math.min(10, opts.floors));
    const palette = opts.palette.length > 0 ? opts.palette : [opts.roof];
    const storey = opts.castle ? 5 : 4;
    const groundY = y - 1; // the block the door sits on
    const x0 = x - Math.floor(width / 2);
    const z0 = z - Math.floor(depth / 2);
    const x1 = x0 + width - 1;
    const z1 = z0 + depth - 1;
    const cells = new Map<string, BlockEdit>();
    const put = (px: number, py: number, pz: number, id: number, state = 0): void => {
      if (py < 0 || py >= WORLD_HEIGHT) return;
      cells.set(`${px},${py},${pz}`, { x: px, y: py, z: pz, id, state, entity: null });
    };
    const paint = (i: number): number => palette[((i % palette.length) + palette.length) % palette.length];
    const trimOrWall = (i: number): number => (opts.colorful ? paint(i) : (opts.trim ?? opts.wall));
    const doorX = Math.floor((x0 + x1) / 2);
    const air = 0;

    // Foundation at ground level, then a slab per floor; the last slab is the roof deck.
    for (let f = 0; f <= floors; f++) {
      const py = groundY + f * storey;
      const last = f === floors;
      for (let px = x0; px <= x1; px++) for (let pz = z0; pz <= z1; pz++) put(px, py, pz, last ? opts.roof : f === 0 ? opts.floor : opts.floor);
    }
    // Clear the inside so a hill never pokes through, then walls with windows.
    for (let f = 0; f < floors; f++) {
      const base = groundY + f * storey;
      for (let px = x0; px <= x1; px++) {
        for (let pz = z0; pz <= z1; pz++) {
          const onX = px === x0 || px === x1;
          const onZ = pz === z0 || pz === z1;
          for (let h = 1; h < storey; h++) {
            const py = base + h;
            if (!onX && !onZ) {
              put(px, py, pz, air);
              continue;
            }
            const corner = onX && onZ;
            const along = onZ ? px - x0 : pz - z0;
            const window = !corner && (h === 2 || h === 3) && along % 2 === 0 && along > 0 && !(f === 0 && pz === z0 && Math.abs(px - doorX) <= 1);
            let id = opts.wall;
            if (corner) id = trimOrWall(f);
            if (window) id = opts.glass;
            put(px, py, pz, id);
          }
        }
      }
    }
    // The front door: a real door block on the ground, headroom above, lanterns either side.
    put(doorX, groundY + 1, z0, opts.door, opts.doorState);
    put(doorX, groundY + 2, z0, air);
    if (opts.lantern) {
      put(doorX - 1, groundY + 3, z0 - 1, opts.lantern);
      put(doorX + 1, groundY + 3, z0 - 1, opts.lantern);
    }
    // Lamps along the inside walls of every floor.
    if (opts.lamp) {
      for (let f = 0; f < floors; f++) {
        const py = groundY + f * storey + 2;
        for (let px = x0 + 2; px < x1; px += 4) {
          put(px, py, z0 + 1, opts.lamp);
          put(px, py, z1 - 1, opts.lamp);
        }
      }
    }
    // Rooms: big floors get a corridor down the middle with rooms on both sides.
    const roomy = opts.rooms && width >= 11 && depth >= 9;
    if (roomy) {
      for (let f = 0; f < floors; f++) {
        const base = groundY + f * storey;
        const corridorZ0 = z - 1;
        const corridorZ1 = z + 1;
        for (let px = x0 + 4; px < x1 - 1; px += 4) {
          for (let pz = z0 + 1; pz < z1; pz++) {
            if (pz >= corridorZ0 && pz <= corridorZ1) continue;
            for (let h = 1; h < storey; h++) put(px, base + h, pz, opts.wall);
            // A doorway from the corridor into each room.
            if (pz === corridorZ0 - 1 || pz === corridorZ1 + 1) {
              put(px, base + 1, pz, air);
              put(px, base + 2, pz, air);
            }
          }
        }
        // Room doors face the corridor: openings in the corridor walls are the whole corridor side.
      }
    }
    // Staircases: one flight per floor along the back wall, rising toward +x, with a hole above.
    const stairRotation = opts.stairRotation;
    for (let f = 0; f < floors - 1; f++) {
      const base = groundY + f * storey;
      const sz = z1 - 2;
      const sx = x0 + 2;
      for (let i = 0; i < storey; i++) {
        const px = sx + i;
        const py = base + 1 + i;
        put(px, py, sz, opts.stairs, stairRotation);
        for (let below = base + 1; below < py; below++) put(px, below, sz, opts.floor);
        // Headroom over each step.
        put(px, py + 1, sz, air);
        put(px, py + 2, sz, air);
      }
      // The top step sits in the slab; the headroom cuts carve the way up onto the next floor.
    }
    // Furniture that fits the building.
    if (opts.furnish) {
      const perFloor = opts.furniture;
      for (let f = 0; f < floors; f++) {
        const base = groundY + f * storey;
        let n = 0;
        for (let px = x0 + 2; px <= x1 - 2; px += 2) {
          for (const pz of [z0 + 2, z1 - 3]) {
            if (f < floors - 1 && Math.abs(pz - (z1 - 2)) <= 1 && px >= x0 + 1 && px <= x0 + 2 + storey) continue; // keep the stairs clear
            const item = perFloor[n++ % perFloor.length];
            if (item === undefined) continue;
            put(px, base + 1, pz, item.id, item.state ?? 0);
          }
        }
      }
    }
    const top = groundY + floors * storey;
    if (opts.castle) {
      // Battlements around the roof deck and a tower on every corner.
      for (let px = x0; px <= x1; px++) for (const pz of [z0, z1]) if ((px - x0) % 2 === 0) put(px, top + 1, pz, opts.wall);
      for (let pz = z0; pz <= z1; pz++) for (const px of [x0, x1]) if ((pz - z0) % 2 === 0) put(px, top + 1, pz, opts.wall);
      for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]] as const) {
        for (let h = 1; h <= 4; h++) {
          for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) put(cx + dx, top + h, cz + dz, opts.colorful ? paint(h) : opts.wall);
        }
        put(cx, top + 5, cz, opts.colorful ? paint(0) : opts.roof);
      }
    } else if (opts.flatRoof) {
      // A parapet and a roof-top lamp: skyscrapers and hospitals.
      for (let px = x0; px <= x1; px++) for (const pz of [z0, z1]) put(px, top + 1, pz, trimOrWall(floors));
      for (let pz = z0; pz <= z1; pz++) for (const px of [x0, x1]) put(px, top + 1, pz, trimOrWall(floors));
      if (opts.lamp) put(x, top + 1, z, opts.lamp);
    } else {
      // Stepped roof and a chimney on the big ones.
      let k = 1;
      while (x0 + k <= x1 - k && z0 + k <= z1 - k && k <= 5) {
        const id = opts.colorful ? paint(k + floors) : opts.roof;
        for (let px = x0 + k; px <= x1 - k; px++) for (let pz = z0 + k; pz <= z1 - k; pz++) put(px, top + k, pz, id);
        k++;
      }
      if (width >= 9) for (let h = 1; h <= k + 1; h++) put(x1 - 1, top + h, z1 - 1, opts.chimney);
    }
    // A sign on the front: a red cross for hospitals.
    if (opts.sign === 'cross' && floors >= 1) {
      const sy = groundY + storey + 1;
      const cross = opts.signBlock;
      for (let d = -1; d <= 1; d++) {
        put(doorX + d, sy, z0, cross);
        put(doorX, sy + d, z0, cross);
      }
    }
    // A flag on a pole to the right of the door.
    if (opts.flag) {
      const fx = x1 + 2;
      const fz = z0;
      const poleTop = groundY + 9;
      for (let py = groundY + 1; py <= poleTop; py++) put(fx, py, fz, opts.pole);
      const rows = opts.flag;
      const h = rows.length;
      for (let r = 0; r < h; r++) {
        const row = rows[r];
        for (let c = 0; c < row.length; c++) {
          const id = row[c];
          if (id > 0) put(fx + 1 + c, poleTop - r, fz, id);
        }
      }
    }
    return [...cells.values()];
  }

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
