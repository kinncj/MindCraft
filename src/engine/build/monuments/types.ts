/**
 * What every monument is, and what it can draw with. One monument per file:
 * a spec a kid sees (label, place, footprint) and a `draw` that puts blocks.
 * Adding one touches its own file and the list in `index.ts`, nothing else.
 */

export type MonumentKit = {
  iron: number;
  concrete: number;
  white: number;
  glass: number;
  red: number;
  yellow: number;
  green: number;
  blue: number;
  pink: number;
  stone: number;
  cobble: number;
  water: number;
  ice: number;
  grass: number;
  dirt: number;
  sand: number;
  leaves: number;
  wood: number;
  planks: number;
  slab: number;
  stairs: number;
  fence: number;
  lamp: number | null;
  flowers: number[];
  black: number;
};

export type MonumentContext = {
  kit: MonumentKit;
  /** Word for a sign, when the monument is letters. */
  text?: string;
  /** Overrides the main colour where a monument has an obvious one. */
  color?: number | null;
};

/** Everything a monument needs while it draws itself. */
export type MonumentDraw = {
  put: (x: number, y: number, z: number, id: number, state?: number) => void;
  kit: MonumentKit;
  ctx: MonumentContext;
  /** Ground level: the block a character stands on. */
  g: number;
  /** Footprint corners and centre, in world blocks. */
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  cx: number;
  cz: number;
  w: number;
  d: number;
};

export type Monument = {
  id: string;
  label: string;
  emoji: string;
  /** Where a grown-up would say it is. */
  place: string;
  width: number;
  depth: number;
  height: number;
  /** One line a villager can say while building it. */
  blurb: string;
  /** How wide it really needs to be, when that depends on the request. */
  footprint?: (ctx: { text?: string }) => { width: number; depth: number };
  draw: (m: MonumentDraw) => void;
};
