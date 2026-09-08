import type { BlockRegistry } from '../blocks/registry';
import { SetBlocksCommand, type BlockEdit } from '../commands/Command';
import { ensureLivable, type BuildingLayout } from './livability';
import type { Ground } from './siteFinder';

/** Where the generator reports its layout for callers and tests. */
export type BuildingLayoutOut = { layout?: BuildingLayout };
import { BlockState } from '../blocks/BlockState';
import { DIR_NX, DIR_PX, rotationToDirection } from '../world/coords';

/** Quarter turns that make a piston face +x and -x. */
const PISTON_FACING_PX = [0, 1, 2, 3].find((r) => rotationToDirection(r) === DIR_PX) ?? 1;
const PISTON_FACING_NX = [0, 1, 2, 3].find((r) => rotationToDirection(r) === DIR_NX) ?? 3;

export type EarthworkKind = 'pool' | 'raisedPool' | 'lake' | 'pond' | 'pit' | 'bunker' | 'tunnel' | 'well' | 'moat';

export type EarthworkKit = {
  water: number;
  sand: number;
  stone: number;
  tile: number;
  ladder: number;
  stairs: number;
  fence: number;
  roof: number;
  bed: number;
  table: number;
  box: number;
  glow: number;
  lamp: number | null;
  lantern: number | null;
};

export type EarthworkOptions = {
  width: number;
  length: number;
  depth: number;
  /** Natural, rounded outline (lakes, ponds). */
  round: boolean;
  stairRotationDown: number;
  kit: EarthworkKit;
};

export type FurnitureItem = { id: number; state?: number; /** Something on top (a TV on a table). */ on?: number };

export type FeatureKind = 'court' | 'playground' | 'pool' | 'garden' | 'parking' | 'fountain' | 'fence' | 'bridge' | 'treehouse' | 'runway';

/** Footprints of the outdoor features. */
export const FEATURE_SIZE: Record<FeatureKind, { w: number; d: number }> = {
  court: { w: 13, d: 9 },
  playground: { w: 11, d: 9 },
  pool: { w: 9, d: 7 },
  garden: { w: 9, d: 7 },
  parking: { w: 11, d: 7 },
  fountain: { w: 7, d: 7 },
  fence: { w: 1, d: 1 },
  bridge: { w: 11, d: 5 },
  treehouse: { w: 5, d: 5 },
  runway: { w: 41, d: 9 },
};

/** Blocks the features are made of. */
export type FeatureKit = {
  courtFloor: number;
  courtLine: number;
  fence: number;
  sand: number;
  planks: number;
  ladder: number;
  stairs: number;
  slab: number;
  poolRim: number;
  water: number;
  grass: number;
  flowers: number[];
  parkingFloor: number;
  lamp: number | null;
  /** Logs for bridge posts and treehouse stilts. */
  wood: number;
  roof: number;
};

/** What a feature drawn on its own needs from the generator. */
export type FeatureContext = { kit: FeatureKit; palette: number[]; stairRotation: number; ladderState: number };

export type FeatureOptions = FeatureContext & { width: number; depth: number };

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
  ladder: number;
  ladderState: number;
  lamp: number | null;
  lantern: number | null;
  /** Railing for stairs and the lift shaft (a fence), if the block exists. */
  rail: number | null;
  pole: number;
  signBlock: number;
  trim: number | null;
  colorful: boolean;
  /** Castle: taller storeys, battlements, corner towers. */
  castle: boolean;
  /** Parapet instead of a pitched roof (skyscrapers, hospitals). */
  flatRoof: boolean;
  /** A glass control tower on the roof (airports). */
  controlTower: boolean;
  /** Corridor and rooms on big floors. */
  rooms: boolean;
  furnish: boolean;
  /** Items cycled along the inside walls of every floor. */
  furniture: FurnitureItem[];
  sign: 'cross' | null;
  /** Flag bitmap rows (block ids, 0 = gap), top row first; null for no flag. */
  flag: number[][] | null;
  /** Rooms in order (classroom ×6, computer room ×1...). */
  roomPlan: Array<{ purpose: string; count: number }>;
  /** Furniture per room purpose. */
  purposeFurniture: Record<string, FurnitureItem[]>;
  /** Outdoor features placed around the building. */
  features: FeatureKind[];
  kit: FeatureKit;
  /** Doorway width in blocks (1 = one door, 2 = double doors) and height (2 or 3). */
  doorWidth: number;
  doorHeight: number;
  /** Pressure plates on both sides open the door on the power system. */
  automaticDoor: boolean;
  plate: number | null;
  /** An elevator shaft through every floor, with a lift entity spawned by the caller. */
  elevator: boolean;
  /** A two-wide sliding door of sticky pistons, wired to one lever. */
  pistonDoor: boolean;
  stickyPiston: number | null;
  wire: number | null;
  lever: number | null;
  /** Colour blocks for pillars and roof when colourful. */
  palette: number[];
}

/** Where the lift goes and which floor heights it stops at, so callers can spawn it. */
export function houseLayout(x: number, y: number, z: number, opts: Pick<HouseOptions, 'width' | 'depth' | 'floors' | 'castle' | 'elevator'>): { shaft: { x: number; z: number } | null; stops: number[] } {
  const width = Math.max(5, Math.min(25, opts.width | 1));
  const depth = Math.max(5, Math.min(25, opts.depth | 1));
  const floors = Math.max(1, Math.min(10, opts.floors));
  const storey = opts.castle ? 5 : 4;
  const groundY = y - 1;
  const x1 = x - Math.floor(width / 2) + width - 1;
  const stops: number[] = [];
  for (let f = 0; f < floors; f++) stops.push(groundY + f * storey + 1);
  const z0 = z - Math.floor(depth / 2);
  return { shaft: opts.elevator && floors > 1 ? { x: x1 - 2, z: z0 + 2 } : null, stops };
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

  /** What the site planner needs: how high the ground is, and what is standing on it. */
  get ground(): Ground {
    return {
      height: (x, z) => this.world.height(x, z),
      blocked: (x, y, z) => {
        const id = this.world.getBlock(x, y, z);
        if (id === 0) return false;
        const def = this.registry.get(id);
        return def ? def.collision !== 'none' : true;
      },
      // The terrain generator lays only 'ground' blocks on the surface, so anything
      // else on top — planks, bricks, paint, a road — was put there by somebody.
      natural: (x, y, z) => this.registry.get(this.world.getBlock(x, y, z))?.category === 'ground',
    };
  }

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
  planHouse(x: number, y: number, z: number, opts: HouseOptions, out?: BuildingLayoutOut): BlockEdit[] {
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
            const window = !corner && (h === 2 || h === 3) && along % 2 === 0 && along > 0 && !(f === 0 && pz === z0 && (opts.pistonDoor ? px >= doorX - 5 && px <= doorX + 4 : Math.abs(px - doorX) <= 2));
            let id = opts.wall;
            if (corner) id = trimOrWall(f);
            if (window) id = opts.glass;
            put(px, py, pz, id);
          }
        }
      }
    }
    // The front door: real door blocks on the ground (one or two wide), headroom above, lanterns either side.
    const doorW = Math.max(1, Math.min(3, opts.doorWidth));
    const doorH = Math.max(2, Math.min(3, opts.doorHeight));
    const doorCells: number[] = [];
    for (let i = 0; i < doorW; i++) doorCells.push(doorX - Math.floor((doorW - 1) / 2) + i);
    // Piston door: four sticky pistons slide two door blocks per row out of the way. Unpowered
    // means open; the lever closes it. One ground wire feeds the lower row, a wire on top of the
    // pistons feeds the upper row, and a two-step wire staircase joins them, redstone style.
    if (opts.pistonDoor && opts.stickyPiston && opts.wire && opts.lever) {
      const dl = doorX; // doorway cells doorX, doorX+1
      const dr = doorX + 1;
      const slab = opts.trim ?? opts.roof;
      for (let h = 1; h <= 2; h++) {
        const py = groundY + h;
        put(dl, py, z0, air);
        put(dr, py, z0, air);
        put(dl - 2, py, z0, opts.stickyPiston, BlockState.withRotation(0, PISTON_FACING_PX));
        put(dl - 1, py, z0, slab); // the door block, pulled back
        put(dr + 2, py, z0, opts.stickyPiston, BlockState.withRotation(0, PISTON_FACING_NX));
        put(dr + 1, py, z0, slab);
      }
      // Ground wire outside, in front of the lower row.
      for (let px = dl - 3; px <= dr + 2; px++) put(px, groundY + 1, z0 - 1, opts.wire);
      // Wire on top of the upper row, across the lintel.
      for (let px = dl - 5; px <= dr + 2; px++) put(px, groundY + 3, z0, opts.wire);
      // The staircase that lets the wire climb: two step blocks with wire on top.
      put(dl - 4, groundY + 1, z0 - 1, slab);
      put(dl - 4, groundY + 2, z0 - 1, opts.wire);
      put(dl - 5, groundY + 2, z0 - 1, slab);
      put(dl - 5, groundY + 3, z0 - 1, opts.wire);
      // The lever, next to the ground wire.
      put(dl - 3, groundY + 2, z0 - 1, opts.lever);
      if (opts.lantern) put(dr + 3, groundY + 3, z0 - 1, opts.lantern);
    } else {
      doorCells.forEach((dx, i) => {
        // Double doors hinge on opposite sides so both leaves swing to the edges, not the middle.
        const mirrored = doorCells.length > 1 && i === doorCells.length - 1;
        put(dx, groundY + 1, z0, opts.door, mirrored ? BlockState.withRotation(opts.doorState, (BlockState.rotation(opts.doorState) + 2) % 4) : opts.doorState);
        for (let h = 2; h <= doorH; h++) put(dx, groundY + h, z0, air);
      });
      if (opts.lantern) {
        put(doorCells[0] - 1, groundY + 3, z0 - 1, opts.lantern);
        put(doorCells[doorCells.length - 1] + 1, groundY + 3, z0 - 1, opts.lantern);
      }
    }
    // Automatic door: pressure plates on both sides power the door blocks next to them.
    if (opts.automaticDoor && opts.plate && !opts.pistonDoor) {
      for (const dx of doorCells) {
        put(dx, groundY + 1, z0 - 1, opts.plate);
        put(dx, groundY + 1, z0 + 1, opts.plate);
      }
    }
    // Lamps along the inside walls of every floor.
    if (opts.lamp) {
      for (let f = 0; f < floors; f++) {
        const py = groundY + f * storey + 2;
        for (let px = x0 + 2; px < x1; px += 4) {
          put(px, py, z0 + 1, opts.lamp);
          if (!(floors > 1 && px >= x0 + 1 && px <= x0 + storey + 6)) put(px, py, z1 - 1, opts.lamp);
        }
      }
    }
    // Rooms: big floors get a corridor down the middle with rooms on both sides.
    // Each room gets a purpose from the plan (classroom, computer room, ward...) and its furniture.
    const roomy = opts.rooms && width >= 11 && depth >= 9;
    const roomRects: Array<{ x0: number; x1: number; z0: number; z1: number; base: number }> = [];
    if (roomy) {
      const corridorZ0 = z - 1;
      const corridorZ1 = z + 1;
      for (let f = 0; f < floors; f++) {
        const base = groundY + f * storey;
        const walls: number[] = [];
        for (let px = x0 + 4; px < x1 - 1; px += 4) {
          walls.push(px);
          for (let pz = z0 + 1; pz < z1; pz++) {
            if (pz >= corridorZ0 && pz <= corridorZ1) continue;
            if (floors > 1 && pz >= z1 - 3 && px >= x0 + 1 && px <= x0 + storey + 5) continue; // the stairwell strip
            for (let h = 1; h < storey; h++) put(px, base + h, pz, opts.wall);
          }
        }
        // The front door opens onto a lobby passage straight through to the corridor.
        if (f === 0) {
          for (let pz = z0 + 1; pz < corridorZ0; pz++) {
            for (const px of [doorX, doorX + 1]) {
              for (let h = 1; h < storey; h++) {
                const here = cells.get(`${px},${base + h},${pz}`);
                if (here && (here.id === opts.plate || here.id === opts.wire)) continue; // keep the door's plate
                put(px, base + h, pz, air);
              }
            }
          }
        }
        // Corridor walls with a doorway into every room.
        const edges = [x0, ...walls, x1];
        for (let i = 0; i + 1 < edges.length; i++) {
          const rx0 = edges[i] + 1;
          const rx1 = edges[i + 1] - 1;
          if (rx1 - rx0 < 1) continue;
          const doorAt = Math.floor((rx0 + rx1) / 2);
          for (const [rz0, rz1, wallZ] of [[z0 + 1, corridorZ0 - 2, corridorZ0 - 1], [corridorZ1 + 2, z1 - 1, corridorZ1 + 1]] as const) {
            if (rz1 - rz0 < 1) continue;
            for (let px = rx0; px <= rx1; px++) {
              const lobby = f === 0 && (px === doorX || px === doorX + 1) && wallZ < z; // the way in stays open
              for (let h = 1; h < storey; h++) put(px, base + h, wallZ, (px === doorAt && h <= 2) || lobby ? air : opts.wall);
            }
            // Keep the staircase corner free of a room on the back side.
            const stairsHere = floors > 1 && rz1 >= z1 - 3 && rx0 <= x0 + storey + 6;
            if (stairsHere && rz1 - 3 < rz0) continue; // this room is the stairwell
            roomRects.push({ x0: rx0, x1: rx1, z0: rz0, z1: stairsHere ? rz1 - 3 : rz1, base });
          }
        }
      }
    }
    // The stairwell: a 2-wide strip along the back wall. Flights zig-zag with a two-block landing
    // between them, nothing is ever filled in underneath, the slab above each flight is opened
    // where a head would hit, and the whole strip stays clear of walls, furniture, and lamps on
    // every floor. Buildings too narrow for a flight get a ladder shaft instead.
    const stairRotation = opts.stairRotation;
    const stairFlights: Array<{ steps: Array<{ x: number; y: number; z: number }>; landing: { x: number; y: number; z: number }; dir: number }> = [];
    const ladders: Array<{ x: number; z: number; bottom: number; top: number }> = [];
    const sz = z1 - 2;
    const sx = x0 + 2;
    const wellLen = storey + 4; // steps + two landing cells + the next flight's first step clear
    const useStairs = floors > 1 && sx + wellLen - 1 <= x1 - 2;
    const stairwell = floors > 1 ? { x0: sx, x1: useStairs ? sx + wellLen - 1 : sx + 1, z0: sz, z1: sz + 1 } : null;
    const inStairwell = (px: number, pz: number): boolean => stairwell !== null && px >= stairwell.x0 - 1 && px <= stairwell.x1 + 1 && pz >= stairwell.z0 - 1 && pz <= stairwell.z1 + 1;
    if (stairwell) {
      // Clear the strip on every floor first (room walls may have crossed it).
      for (let f = 0; f < floors; f++) {
        const base = groundY + f * storey;
        for (let px = stairwell.x0; px <= stairwell.x1; px++) for (let pz = stairwell.z0; pz <= stairwell.z1; pz++) for (let h = 1; h < storey; h++) put(px, base + h, pz, air);
      }
    }
    for (let f = 0; f < floors - 1 && useStairs; f++) {
      const base = groundY + f * storey;
      const top = base + storey;
      const dir = f % 2 === 0 ? 1 : -1;
      const start = dir === 1 ? sx : sx + wellLen - 1;
      const steps: Array<{ x: number; y: number; z: number }> = [];
      for (let i = 0; i < storey; i++) {
        const px = start + dir * i;
        const py = base + 1 + i;
        steps.push({ x: px, y: py, z: sz });
        for (const pz of [sz, sz + 1]) {
          put(px, py, pz, opts.stairs, dir === 1 ? stairRotation : (stairRotation + 2) % 4);
          // Three blocks of clearance: the character lifts its whole body a block to climb a step.
          for (let h = 1; h <= 3; h++) {
            if (py + h > top + 1 || py + h !== top) put(px, py + h, pz, air);
            if (py + h === top) put(px, top, pz, air); // the slab opening
          }
        }
        if (opts.rail && py + 1 < top) put(px, py + 1, sz - 1, opts.rail);
      }
      const landing = { x: start + dir * storey, y: top, z: sz };
      for (const pz of [sz, sz + 1]) {
        put(landing.x, top, pz, opts.floor);
        put(landing.x + dir, top, pz, opts.floor);
        for (let h = 1; h <= 3; h++) {
          put(landing.x, top + h, pz, air);
          put(landing.x + dir, top + h, pz, air);
        }
      }
      stairFlights.push({ steps, landing, dir });
    }
    if (stairwell && !useStairs) {
      // A ladder up the back wall through a two-cell opening in every slab.
      const lx = sx;
      const lz = z1 - 1;
      ladders.push({ x: lx, z: lz, bottom: groundY + 1, top: groundY + (floors - 1) * storey + 1 });
      for (let py = groundY + 1; py <= groundY + (floors - 1) * storey + 1; py++) {
        put(lx, py, lz, opts.ladder, opts.ladderState);
        put(lx, py, lz - 1, air);
        put(lx + 1, py, lz, air);
        put(lx + 1, py, lz - 1, air);
      }
      for (let f = 1; f < floors; f++) {
        const top = groundY + f * storey;
        put(lx, top, lz - 1, air);
        put(lx + 1, top, lz, air);
        put(lx + 1, top, lz - 1, air);
        if (opts.rail) {
          put(lx + 2, top + 1, lz, opts.rail);
          put(lx + 2, top + 1, lz - 1, opts.rail);
          put(lx, top + 1, lz - 2, opts.rail);
          put(lx + 1, top + 1, lz - 2, opts.rail);
        }
      }
    }
    // Elevator shaft: a 2×2 opening through every floor slab at the back-right corner, railed.
    const layout = houseLayout(x, y, z, opts);
    if (layout.shaft) {
      const { x: lx, z: lz } = layout.shaft;
      for (let f = 1; f < floors; f++) {
        const py = groundY + f * storey;
        for (let dx = 0; dx <= 1; dx++) for (let dz = 0; dz <= 1; dz++) put(lx + dx, py, lz + dz, air);
        if (opts.rail) {
          for (let dx = -1; dx <= 2; dx++) put(lx + dx, py + 1, lz + 2, opts.rail);
          for (let dz = -1; dz <= 1; dz++) put(lx - 1, py + 1, lz + dz, opts.rail);
        }
      }
      for (let f = 0; f < floors; f++) {
        const base = groundY + f * storey;
        for (let h = 1; h < storey; h++) for (let dx = 0; dx <= 1; dx++) for (let dz = 0; dz <= 1; dz++) put(lx + dx, base + h, lz + dz, air);
      }
    }
    // Furniture: each room by its purpose when there is a plan, otherwise along the walls.
    if (opts.furnish && roomRects.length > 0) {
      const plan: string[] = [];
      for (const r of opts.roomPlan) for (let n = 0; n < r.count; n++) plan.push(r.purpose);
      roomRects.forEach((room, i) => {
        const purpose = plan[i];
        const set = purpose ? (opts.purposeFurniture[purpose] ?? opts.furniture) : opts.furniture;
        if (set.length === 0) return;
        let n = 0;
        for (let pz = room.z0; pz <= room.z1; pz += 2) {
          for (let px = room.x0; px <= room.x1; px += 2) {
            if (px === Math.floor((room.x0 + room.x1) / 2) && (pz === room.z0 || pz === room.z1)) continue; // leave the doorway free
            if (room.base === groundY && pz < z && (px === doorX || px === doorX + 1 || px === doorX - 1)) continue; // and the lobby
            if (layout.shaft && Math.abs(px - layout.shaft.x - 0.5) < 2 && Math.abs(pz - layout.shaft.z - 0.5) < 2) continue; // and the lift
            if (inStairwell(px, pz)) continue;
            const item = set[n++ % set.length];
            put(px, room.base + 1, pz, item.id, item.state ?? 0);
            if (item.on !== undefined) put(px, room.base + 2, pz, item.on);
          }
        }
      });
    } else if (opts.furnish) {
      const perFloor = opts.furniture;
      for (let f = 0; f < floors; f++) {
        const base = groundY + f * storey;
        let n = 0;
        for (let px = x0 + 2; px <= x1 - 2; px += 2) {
          for (const pz of [z0 + 2, z1 - 3]) {
            if (inStairwell(px, pz)) continue; // keep the stairwell clear
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
    // A glass control tower over the roof, so the airport looks like one from the ground.
    if (opts.controlTower) {
      const cx = x1 - 3;
      const cz = z0 + 3;
      const base = groundY + storey * floors + 1;
      for (let h = 0; h < 5; h++) {
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
          const wall = dx !== 0 || dz !== 0;
          put(cx + dx, base + h, cz + dz, wall ? (h >= 3 ? opts.glass : opts.wall) : 0);
        }
      }
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) put(cx + dx, base + 5, cz + dz, opts.trim ?? opts.roof);
      if (opts.lantern !== null) put(cx, base + 4, cz, opts.lantern);
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
    // The rules every building must pass: a clear, tall door on the ground; stairs that arrive; lit rooms with doorways.
    const livability: BuildingLayout = {
      groundY,
      storey,
      floors,
      doorCells: opts.pistonDoor ? [doorX, doorX + 1] : doorCells,
      doorZ: z0,
      doorHeight: opts.pistonDoor ? 2 : doorH,
      outward: -1,
      rooms: roomRects,
      stairs: stairFlights,
      ladders,
      air,
      lamp: opts.lamp,
      wall: opts.wall,
    };
    ensureLivable(cells, livability, opts.door, new Set([opts.plate ?? -1, opts.wire ?? -1].filter((id) => id >= 0)));
    if (out) out.layout = livability;
    // Outdoor features, laid out around the building: right, then left, then behind.
    const slots = [
      { x: x1 + 4, z: z0, dir: 1 },
      { x: x0 - 4, z: z0, dir: -1 },
      { x: x0, z: z1 + 4, dir: 0 },
      { x: x1 + 4, z: z1 + 4, dir: 1 },
    ];
    let slot = 0;
    for (const feature of opts.features) {
      const at = slots[slot++ % slots.length];
      const size = FEATURE_SIZE[feature];
      const fx0 = at.dir === 1 ? at.x : at.dir === -1 ? at.x - size.w + 1 : at.x;
      const fz0 = at.z;
      this.drawFeature(feature, fx0, groundY, fz0, size.w, size.d, opts, put);
      if (at.dir === 0) at.x += size.w + 3;
      else at.z += size.d + 3;
    }
    return [...cells.values()];
  }

  /**
   * A feature on its own, centred on (x, z) with the ground surface at y:
   * court, playground, pool, garden, car park, fountain, fence, bridge,
   * or treehouse. Bridges and treehouses are checked like buildings: the
   * deck is walkable end to end and the ladder reaches a clear platform.
   */
  planFeature(kind: FeatureKind, x: number, y: number, z: number, opts: FeatureOptions, out?: BuildingLayoutOut): BlockEdit[] {
    const w = Math.max(3, Math.min(48, opts.width | 0));
    const d = Math.max(3, Math.min(48, opts.depth | 0));
    const groundY = y - 1;
    const fx0 = x - Math.floor(w / 2);
    const fz0 = z - Math.floor(d / 2);
    const cells = new Map<string, BlockEdit>();
    const put = (px: number, py: number, pz: number, id: number, state = 0): void => {
      if (py < 0 || py >= WORLD_HEIGHT) return;
      cells.set(`${px},${py},${pz}`, { x: px, y: py, z: pz, id, state, entity: null });
    };
    const layout: BuildingLayout = { groundY, storey: 4, floors: 1, doorCells: [], doorZ: fz0, doorHeight: 2, outward: -1, rooms: [], stairs: [], ladders: [], air: 0, lamp: opts.kit.lamp, wall: opts.kit.planks };
    this.drawFeature(kind, fx0, groundY, fz0, w, d, opts, put, layout);
    ensureLivable(cells, layout, -1, new Set());
    if (out) out.layout = layout;
    return [...cells.values()];
  }

  /** A sports court, playground, pool, garden, car park, fountain, fence, bridge, or treehouse, at ground level. */
  private drawFeature(feature: FeatureKind, fx0: number, groundY: number, fz0: number, w: number, d: number, opts: FeatureContext, put: (x: number, y: number, z: number, id: number, state?: number) => void, layout?: BuildingLayout): void {
    const fx1 = fx0 + w - 1;
    const fz1 = fz0 + d - 1;
    const k = opts.kit;
    const clear = (x: number, z: number, height: number): void => {
      for (let h = 1; h <= height; h++) put(x, groundY + h, z, 0);
    };
    const flat = (id: number): void => {
      for (let x = fx0; x <= fx1; x++) for (let z = fz0; z <= fz1; z++) {
        put(x, groundY, z, id);
        clear(x, z, 3);
      }
    };
    switch (feature) {
      case 'court': {
        flat(k.courtFloor);
        const midX = Math.floor((fx0 + fx1) / 2);
        for (let z = fz0; z <= fz1; z++) put(midX, groundY, z, k.courtLine);
        for (let x = fx0; x <= fx1; x++) for (const z of [fz0, fz1]) put(x, groundY, z, k.courtLine);
        for (let z = fz0; z <= fz1; z++) for (const x of [fx0, fx1]) put(x, groundY, z, k.courtLine);
        // Goals at both ends and a low fence around.
        for (const x of [fx0, fx1]) for (let dz = -1; dz <= 1; dz++) for (let h = 1; h <= 2; h++) put(x, groundY + h, Math.floor((fz0 + fz1) / 2) + dz, k.fence);
        for (let x = fx0 - 1; x <= fx1 + 1; x++) for (const z of [fz0 - 1, fz1 + 1]) put(x, groundY + 1, z, k.fence);
        for (let z = fz0 - 1; z <= fz1 + 1; z++) for (const x of [fx0 - 1, fx1 + 1]) put(x, groundY + 1, z, k.fence);
        break;
      }
      case 'playground': {
        flat(k.sand);
        // A climbing frame: a small tower with a ladder and a slide of stairs down one side.
        const tx = fx0 + 2;
        const tz = fz0 + 2;
        for (let h = 1; h <= 3; h++) for (let dx = 0; dx <= 2; dx++) for (let dz = 0; dz <= 2; dz++) {
          const edge = dx === 0 || dx === 2 || dz === 0 || dz === 2;
          if (edge && (dx + dz) % 2 === 0) put(tx + dx, groundY + h, tz + dz, opts.palette[(dx + dz + h) % opts.palette.length]);
        }
        for (let dx = 0; dx <= 2; dx++) for (let dz = 0; dz <= 2; dz++) put(tx + dx, groundY + 4, tz + dz, k.planks);
        for (let h = 1; h <= 4; h++) put(tx - 1, groundY + h, tz + 1, k.ladder);
        for (let i = 0; i < 4; i++) put(tx + 3 + i, groundY + 4 - i, tz + 1, k.stairs, opts.stairRotation);
        for (let dx = 0; dx <= 2; dx++) for (let dz = 0; dz <= 2; dz++) put(tx + dx, groundY + 5, tz + dz, 0);
        // Swings: a frame with two seats.
        const sx = fx0 + 2;
        const sz = fz1 - 2;
        for (const x of [sx, sx + 5]) for (let h = 1; h <= 3; h++) put(x, groundY + h, sz, k.fence);
        for (let x = sx; x <= sx + 5; x++) put(x, groundY + 4, sz, k.planks);
        for (const x of [sx + 2, sx + 3]) {
          put(x, groundY + 3, sz, k.fence);
          put(x, groundY + 2, sz, k.slab);
        }
        // A sandpit rim and a flower or two.
        for (let x = fx0; x <= fx1; x++) for (const z of [fz0 - 1, fz1 + 1]) put(x, groundY + 1, z, k.fence);
        for (let z = fz0; z <= fz1; z++) for (const x of [fx0 - 1, fx1 + 1]) put(x, groundY + 1, z, k.fence);
        break;
      }
      case 'pool': {
        for (let x = fx0; x <= fx1; x++) for (let z = fz0; z <= fz1; z++) {
          const rim = x === fx0 || x === fx1 || z === fz0 || z === fz1;
          put(x, groundY, z, rim ? k.poolRim : k.water);
          put(x, groundY - 1, z, rim ? k.poolRim : k.water);
          put(x, groundY - 2, z, k.poolRim);
          clear(x, z, 3);
        }
        break;
      }
      case 'garden': {
        flat(k.grass);
        let i = 0;
        for (let x = fx0; x <= fx1; x++) for (let z = fz0; z <= fz1; z++) {
          if ((x + z) % 2 === 0) put(x, groundY + 1, z, k.flowers[i++ % k.flowers.length]);
        }
        for (let x = fx0 - 1; x <= fx1 + 1; x++) for (const z of [fz0 - 1, fz1 + 1]) put(x, groundY + 1, z, k.fence);
        for (let z = fz0 - 1; z <= fz1 + 1; z++) for (const x of [fx0 - 1, fx1 + 1]) put(x, groundY + 1, z, k.fence);
        break;
      }
      case 'parking': {
        flat(k.parkingFloor);
        for (let x = fx0 + 1; x < fx1; x += 3) for (let z = fz0; z <= fz1; z++) put(x, groundY, z, k.courtLine);
        for (let x = fx0; x <= fx1; x++) put(x, groundY + 1, fz1 + 1, k.lamp ?? k.fence);
        break;
      }
      case 'fountain': {
        flat(k.poolRim);
        const cx = Math.floor((fx0 + fx1) / 2);
        const cz = Math.floor((fz0 + fz1) / 2);
        for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) {
          const ring = Math.max(Math.abs(dx), Math.abs(dz)) === 2;
          put(cx + dx, groundY + 1, cz + dz, ring ? k.poolRim : k.water);
        }
        for (let h = 1; h <= 3; h++) put(cx, groundY + h, cz, k.poolRim);
        put(cx, groundY + 4, cz, k.water);
        break;
      }
      case 'runway': {
        // A long flat strip along x: dark tarmac, a dashed white centre line, edge markings,
        // lights down both sides, and clear air above so a plane can climb away.
        const midZ = Math.floor((fz0 + fz1) / 2);
        for (let x = fx0; x <= fx1; x++) {
          for (let z = fz0; z <= fz1; z++) {
            const edge = z === fz0 || z === fz1;
            const centre = z === midZ && (x - fx0) % 4 < 2;
            put(x, groundY, z, edge || centre ? k.courtLine : k.parkingFloor);
            for (let h = 1; h <= 8; h++) put(x, groundY + h, z, 0); // nothing in the way of the wings
          }
          // Threshold bars at both ends, and lights every six blocks.
          if (x <= fx0 + 2 || x >= fx1 - 2) for (let z = fz0 + 1; z < fz1; z += 2) put(x, groundY, z, k.courtLine);
          if (k.lamp !== null && (x - fx0) % 6 === 0) {
            put(x, groundY + 1, fz0 - 1, k.lamp);
            put(x, groundY + 1, fz1 + 1, k.lamp);
          }
        }
        break;
      }
      case 'bridge': {
        // A deck one block up, running along x, with a step at each end, railings on the
        // outer columns, and log posts under the ends and every fourth span.
        const deck = groundY + 1;
        const walk = Math.max(1, d - 2);
        const wz0 = fz0 + Math.floor((d - walk) / 2);
        const wz1 = wz0 + walk - 1;
        for (let z = wz0 - 1; z <= wz1 + 1; z++) {
          for (let x = fx0 + 1; x <= fx1 - 1; x++) {
            put(x, deck, z, k.planks);
            for (let h = 1; h <= 3; h++) put(x, deck + h, z, 0);
            if (z === wz0 - 1 || z === wz1 + 1) put(x, deck + 1, z, k.fence);
            if (z >= wz0 && z <= wz1 && (x === fx0 + 1 || x === fx1 - 1 || (x - fx0) % 4 === 0)) put(x, groundY, z, k.wood);
          }
          if (z >= wz0 && z <= wz1) {
            put(fx0, deck, z, k.stairs, opts.stairRotation);
            put(fx1, deck, z, k.stairs, (opts.stairRotation + 2) % 4);
            for (let h = 1; h <= 3; h++) {
              put(fx0, deck + h, z, 0);
              put(fx1, deck + h, z, 0);
            }
          }
        }
        for (const x of [fx0 + 1, fx1 - 1]) for (const z of [wz0 - 1, wz1 + 1]) if (k.lamp !== null) put(x, deck + 2, z, k.lamp);
        if (layout) {
          const mid = wz0 + Math.floor(walk / 2);
          layout.stairs.push({ steps: [{ x: fx0, y: deck, z: mid }], landing: { x: fx0 + 1, y: deck, z: mid }, dir: 1 });
          layout.stairs.push({ steps: [{ x: fx1, y: deck, z: mid }], landing: { x: fx1 - 1, y: deck, z: mid }, dir: -1 });
        }
        break;
      }
      case 'treehouse': {
        // Log stilts, a platform four blocks up with a ladder through a hatch in the middle,
        // a railing with a gap at the front, corner posts, a roof, and a lantern.
        const top = groundY + 5;
        const cx = fx0 + Math.floor(w / 2);
        const cz = fz0 + Math.floor(d / 2);
        for (const x of [fx0, fx1]) for (const z of [fz0, fz1]) for (let py = groundY + 1; py < top; py++) put(x, py, z, k.wood);
        for (let x = fx0; x <= fx1; x++) for (let z = fz0; z <= fz1; z++) {
          put(x, top, z, k.planks);
          const edge = x === fx0 || x === fx1 || z === fz0 || z === fz1;
          const corner = (x === fx0 || x === fx1) && (z === fz0 || z === fz1);
          for (let h = 1; h <= 3; h++) put(x, top + h, z, corner ? k.wood : edge && h === 1 ? k.fence : 0);
          if (!corner) put(x, top + 4, z, k.roof);
        }
        put(cx, top + 1, fz0, 0); // the gap in the railing at the front
        for (let py = groundY + 1; py <= top; py++) put(cx, py, cz, k.ladder, opts.ladderState);
        for (let h = 1; h <= 3; h++) put(cx, top + h, cz, 0);
        if (k.lamp !== null) put(cx + 1, top + 3, cz, k.lamp);
        if (layout) layout.ladders.push({ x: cx, z: cz, bottom: groundY + 1, top });
        break;
      }
      case 'fence': {
        for (let x = fx0; x <= fx1; x++) for (const z of [fz0, fz1]) put(x, groundY + 1, z, k.fence);
        for (let z = fz0; z <= fz1; z++) for (const x of [fx0, fx1]) put(x, groundY + 1, z, k.fence);
        break;
      }
    }
  }

  /**
   * Digging jobs: villagers remove blocks as readily as they place them.
   * In-ground pools, lakes, ponds, pits, bunkers with stairs down, tunnels,
   * wells, moats. `y` is the ground surface (first air block); depth is how
   * many blocks down.
   */
  planEarthwork(kind: EarthworkKind, x: number, y: number, z: number, opts: EarthworkOptions): BlockEdit[] {
    const width = Math.max(3, Math.min(48, opts.width | 0));
    const length = Math.max(3, Math.min(48, opts.length | 0));
    const groundY = y - 1;
    // Never dig below the world: keep at least two blocks of floor under the deepest point.
    const depth = Math.max(1, Math.min(12, opts.depth | 0, Math.max(1, groundY - 3)));
    const x0 = x - Math.floor(width / 2);
    const z0 = z - Math.floor(length / 2);
    const x1 = x0 + width - 1;
    const z1 = z0 + length - 1;
    const cells = new Map<string, BlockEdit>();
    const put = (px: number, py: number, pz: number, id: number, state = 0): void => {
      if (py < 0 || py >= WORLD_HEIGHT) return;
      cells.set(`${px},${py},${pz}`, { x: px, y: py, z: pz, id, state, entity: null });
    };
    const k = opts.kit;
    const inside = (px: number, pz: number): boolean => {
      if (!opts.round) return px >= x0 && px <= x1 && pz >= z0 && pz <= z1;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      const nx = (px - cx) / (width / 2);
      const nz = (pz - cz) / (length / 2);
      // A wobbly ellipse so lakes look natural.
      const wobble = 1 + 0.12 * Math.sin(px * 0.9 + pz * 0.4) + 0.1 * Math.cos(pz * 0.7 - px * 0.3);
      return nx * nx + nz * nz <= wobble;
    };
    const clearAbove = (px: number, pz: number): void => {
      for (let h = 1; h <= 3; h++) put(px, groundY + h, pz, 0);
    };
    switch (kind) {
      case 'pool': {
        // A tiled in-ground pool: rim, lined walls and floor, water to the brim.
        for (let px = x0 - 1; px <= x1 + 1; px++) for (let pz = z0 - 1; pz <= z1 + 1; pz++) {
          const rim = px < x0 || px > x1 || pz < z0 || pz > z1;
          clearAbove(px, pz);
          if (rim) {
            put(px, groundY, pz, k.tile);
            for (let d = 1; d <= depth; d++) put(px, groundY - d, pz, k.tile);
            continue;
          }
          for (let d = 0; d < depth; d++) put(px, groundY - d, pz, k.water);
          put(px, groundY - depth, pz, k.tile);
        }
        // A ladder into the water and a lantern at the corner.
        for (let d = 0; d < depth; d++) put(x0, groundY - d, z0 - 1, k.ladder);
        if (k.lantern) put(x1 + 1, groundY + 1, z1 + 1, k.lantern);
        break;
      }
      case 'raisedPool': {
        // An above-ground pool: walls two high on the ground, water inside, a ladder.
        for (let px = x0 - 1; px <= x1 + 1; px++) for (let pz = z0 - 1; pz <= z1 + 1; pz++) {
          const rim = px < x0 || px > x1 || pz < z0 || pz > z1;
          clearAbove(px, pz);
          put(px, groundY, pz, k.tile);
          if (rim) {
            put(px, groundY + 1, pz, k.tile);
            put(px, groundY + 2, pz, k.tile);
          } else {
            put(px, groundY + 1, pz, k.water);
            put(px, groundY + 2, pz, k.water);
          }
        }
        for (let h = 1; h <= 3; h++) put(x0 - 2, groundY + h, z0, k.ladder);
        break;
      }
      case 'lake':
      case 'pond': {
        // A natural basin: sand shore, deeper toward the middle, water to ground level.
        const cx = (x0 + x1) / 2;
        const cz = (z0 + z1) / 2;
        for (let px = x0 - 2; px <= x1 + 2; px++) for (let pz = z0 - 2; pz <= z1 + 2; pz++) {
          if (!inside(px, pz)) {
            if (inside(px - 1, pz) || inside(px + 1, pz) || inside(px, pz - 1) || inside(px, pz + 1)) put(px, groundY, pz, k.sand);
            continue;
          }
          clearAbove(px, pz);
          const nx = (px - cx) / (width / 2);
          const nz = (pz - cz) / (length / 2);
          const edge = Math.sqrt(nx * nx + nz * nz);
          const here = Math.max(1, Math.round(depth * (1 - edge * 0.8)));
          for (let d = 0; d < here; d++) put(px, groundY - d, pz, k.water);
          put(px, groundY - here, pz, k.sand);
        }
        break;
      }
      case 'pit': {
        for (let px = x0; px <= x1; px++) for (let pz = z0; pz <= z1; pz++) {
          clearAbove(px, pz);
          for (let d = 0; d < depth; d++) put(px, groundY - d, pz, 0);
        }
        // A ladder out, so nobody is stuck.
        for (let d = 0; d < depth; d++) put(x0, groundY - d, z0, k.ladder);
        break;
      }
      case 'bunker': {
        // An underground room with a lit, two-wide staircase down from a hatch on the surface.
        const floorY = groundY - depth - 1;
        for (let px = x0 - 1; px <= x1 + 1; px++) for (let pz = z0 - 1; pz <= z1 + 1; pz++) {
          const wall = px < x0 || px > x1 || pz < z0 || pz > z1;
          for (let py = floorY; py <= floorY + 4; py++) {
            if (wall || py === floorY || py === floorY + 4) put(px, py, pz, k.stone);
            else put(px, py, pz, 0);
          }
        }
        for (let px = x0 + 1; px < x1; px += 3) {
          put(px, floorY + 3, z0, k.lamp ?? k.glow);
          put(px, floorY + 3, z1, k.lamp ?? k.glow);
        }
        // Stairs: two wide (z, z+1), three blocks of headroom, descending toward +x into the room's
        // west wall. The last step lands on the room floor just inside the doorway.
        const stepCount = groundY - floorY - 1;
        const sz0 = z;
        const startX = x0 - stepCount - 1; // the last step stops just outside the doorway
        for (let i = 0; i < stepCount; i++) {
          const px = startX + i;
          const py = groundY - 1 - i;
          for (const pz of [sz0, sz0 + 1]) {
            put(px, py, pz, k.stairs, opts.stairRotationDown);
            put(px, py - 1, pz, k.stone);
            for (let h = 1; h <= 3; h++) put(px, py + h, pz, 0);
          }
          // Lined side walls so the earth never crumbles in.
          for (let h = 0; h <= 3; h++) {
            put(px, py + h, sz0 - 1, k.stone);
            put(px, py + h, sz0 + 2, k.stone);
          }
          if (i % 2 === 1) put(px, py + 2, sz0 - 1, k.lamp ?? k.glow);
        }
        // The doorway into the room and the landing inside it.
        for (const pz of [sz0, sz0 + 1]) {
          for (let h = 1; h <= 3; h++) put(x0 - 1, floorY + h, pz, 0);
          put(x0 - 1, floorY, pz, k.stone);
        }
        // The hatch: a 2×2 opening at the surface with headroom, a stone lip, and lanterns.
        for (let dx = -1; dx <= 0; dx++) for (const pz of [sz0, sz0 + 1]) {
          for (let h = 1; h <= 3; h++) put(startX + dx, groundY + h, pz, 0);
        }
        for (let dx = -2; dx <= 1; dx++) {
          put(startX + dx, groundY, sz0 - 1, k.stone);
          put(startX + dx, groundY, sz0 + 2, k.stone);
        }
        if (k.lantern) {
          put(startX - 2, groundY + 1, sz0 - 1, k.lantern);
          put(startX - 2, groundY + 1, sz0 + 2, k.lantern);
        }
        // A bed, a table and a chest to make it a den.
        put(x0 + 1, floorY + 1, z1 - 1, k.bed);
        put(x1 - 1, floorY + 1, z1 - 1, k.table);
        put(x1 - 1, floorY + 1, z0 + 1, k.box);
        break;
      }
      case 'tunnel': {
        // A lit tunnel along +x at ground level, two wide and three high, lined below.
        for (let px = x0; px <= x0 + length - 1; px++) {
          for (let dz = 0; dz <= 1; dz++) {
            const pz = z + dz;
            for (let h = 1; h <= 3; h++) put(px, groundY + h, pz, 0);
            put(px, groundY, pz, k.stone);
            put(px, groundY + 4, pz, k.stone);
          }
          put(px, groundY + 1, z - 1, k.stone);
          put(px, groundY + 2, z - 1, k.stone);
          put(px, groundY + 3, z - 1, k.stone);
          put(px, groundY + 1, z + 2, k.stone);
          put(px, groundY + 2, z + 2, k.stone);
          put(px, groundY + 3, z + 2, k.stone);
          if ((px - x0) % 4 === 0) put(px, groundY + 3, z - 1, k.lamp ?? k.glow);
        }
        break;
      }
      case 'well': {
        for (let px = x - 1; px <= x + 1; px++) for (let pz = z - 1; pz <= z + 1; pz++) {
          const rim = px !== x || pz !== z;
          clearAbove(px, pz);
          if (rim) {
            put(px, groundY + 1, pz, k.stone);
            for (let d = 0; d <= depth; d++) put(px, groundY - d, pz, k.stone);
          } else {
            for (let d = 0; d < depth; d++) put(px, groundY - d, pz, d < 2 ? 0 : k.water);
            put(px, groundY - depth, pz, k.stone);
          }
        }
        for (let h = 2; h <= 3; h++) {
          put(x - 1, groundY + h, z - 1, k.fence);
          put(x + 1, groundY + h, z + 1, k.fence);
        }
        for (let px = x - 1; px <= x + 1; px++) for (let pz = z - 1; pz <= z + 1; pz++) put(px, groundY + 4, pz, k.roof);
        break;
      }
      case 'moat': {
        // A water ring around the footprint, two deep, with a bridge at the front.
        for (let px = x0 - 3; px <= x1 + 3; px++) for (let pz = z0 - 3; pz <= z1 + 3; pz++) {
          const outer = px < x0 - 1 || px > x1 + 1 || pz < z0 - 1 || pz > z1 + 1;
          const inner = px >= x0 - 1 && px <= x1 + 1 && pz >= z0 - 1 && pz <= z1 + 1;
          if (!outer || inner) continue;
          const bridge = pz < z0 && Math.abs(px - x) <= 1;
          clearAbove(px, pz);
          if (bridge) {
            put(px, groundY, pz, k.tile);
            continue;
          }
          put(px, groundY, pz, k.water);
          put(px, groundY - 1, pz, k.water);
          put(px, groundY - 2, pz, k.stone);
        }
        break;
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
