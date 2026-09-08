/**
 * Where to put the next thing. A villager asked for a school, a lake and
 * an airport should not pile them on the same square of grass: each one
 * needs its own patch of open, level ground, and the ones already put
 * down (or already promised) have to be left alone.
 *
 * The search spirals outward from where the child is standing, so the
 * first clear spot is also the nearest one.
 */

export type Footprint = { width: number; depth: number };
export type Site = { x: number; y: number; z: number };
export type Rect = { x0: number; x1: number; z0: number; z1: number };

/** The little the planner needs to know about the world. */
export type Ground = {
  /** Highest solid block in this column, or -1 when the column is not loaded. */
  height(x: number, z: number): number;
  /** Is this block something a builder would have to knock down (a tree, a wall, a roof)? */
  blocked(x: number, y: number, z: number): boolean;
  /**
   * Is this block plain land — grass, dirt, sand, stone, snow — rather than
   * something somebody laid down? A road, a plaza or a sports court is flat
   * and has nothing standing on it, and building on it is still wrong.
   */
  natural(x: number, y: number, z: number): boolean;
};

/** Blocks of margin kept clear around everything that goes up. */
const MARGIN = 2;
/** How much the ground may rise and fall across a footprint before it counts as a hill. */
const MAX_SLOPE = 2;
/** How far out to look before giving up and building where the child stands. */
const MAX_RADIUS = 128;

export class SitePlanner {
  /** Everything this session has already promised to build. */
  private taken: Rect[] = [];

  constructor(private ground: Ground) {}

  /** Remembers a patch so the next request goes somewhere else. */
  claim(centre: Site, footprint: Footprint): void {
    this.taken.push(rectAround(centre.x, centre.z, footprint));
  }

  /** Forgets every claim (a new world, or a fresh start). */
  clear(): void {
    this.taken = [];
  }

  /**
   * The nearest patch of level, empty ground that fits, starting from
   * `near`. Claims it, so two things in one sentence never overlap. Falls
   * back to `near` itself when the world is full of hills and houses —
   * a kid who asks for a building always gets one.
   */
  place(footprint: Footprint, near: { x: number; z: number }): Site {
    for (const { x, z } of spiral(Math.round(near.x), Math.round(near.z), MAX_RADIUS)) {
      const site = this.check(x, z, footprint);
      if (!site) continue;
      this.claim(site, footprint);
      return site;
    }
    const y = this.ground.height(Math.round(near.x), Math.round(near.z));
    const site = { x: Math.round(near.x), y: (y >= 0 ? y : 0) + 1, z: Math.round(near.z) };
    this.claim(site, footprint);
    return site;
  }

  /** Is this centre a place a building could stand? Returns the site if so. */
  private check(x: number, z: number, footprint: Footprint): Site | null {
    const rect = rectAround(x, z, footprint);
    if (this.taken.some((other) => overlaps(rect, other))) return null;
    let low = Infinity;
    let high = -Infinity;
    // Sample the corners, the edges and the middle rather than every column:
    // enough to catch a slope or a wall, cheap enough to run over a wide search.
    for (const px of steps(rect.x0, rect.x1)) {
      for (const pz of steps(rect.z0, rect.z1)) {
        const top = this.ground.height(px, pz);
        if (top < 0) return null; // not loaded: do not build into the unknown
        if (!this.ground.natural(px, top, pz)) return null; // a path, a floor, a courtyard: someone's work
        low = Math.min(low, top);
        high = Math.max(high, top);
        if (high - low > MAX_SLOPE) return null;
        // Anything standing on the ground here — a tree, someone's house — means keep looking.
        for (let h = 1; h <= 4; h++) if (this.ground.blocked(px, top + h, pz)) return null;
      }
    }
    return { x, y: high + 1, z };
  }
}

function rectAround(x: number, z: number, footprint: Footprint): Rect {
  const w = Math.max(1, Math.round(footprint.width));
  const d = Math.max(1, Math.round(footprint.depth));
  return {
    x0: x - Math.floor(w / 2) - MARGIN,
    x1: x + Math.ceil(w / 2) + MARGIN,
    z0: z - Math.floor(d / 2) - MARGIN,
    z1: z + Math.ceil(d / 2) + MARGIN,
  };
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x0 <= b.x1 && a.x1 >= b.x0 && a.z0 <= b.z1 && a.z1 >= b.z0;
}

/** Every third column across a span, always including both ends. */
function steps(from: number, to: number): number[] {
  const out: number[] = [];
  for (let v = from; v < to; v += 3) out.push(v);
  out.push(to);
  return out;
}

/** Coordinates spiralling outward in rings, nearest first. */
function* spiral(x: number, z: number, radius: number): Generator<{ x: number; z: number }> {
  yield { x, z };
  for (let r = 4; r <= radius; r += 4) {
    for (let i = -r; i <= r; i += 4) {
      yield { x: x + i, z: z - r };
      yield { x: x + i, z: z + r };
      yield { x: x - r, z: z + i };
      yield { x: x + r, z: z + i };
    }
  }
}
