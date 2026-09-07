import { BlockState } from '../blocks/BlockState';
import type { BlockRegistry } from '../blocks/registry';
import { resolveBlockId } from '../blocks/blocks';
import { SHAPES } from '../blocks/shapes';
import { DIR_PX } from '../world/coords';
import type { FeatureKind, FeatureKit, FurnitureItem, HouseOptions } from './BuildTools';

/**
 * Everything the building generator needs beyond the kid's words: which
 * blocks are furniture for which kind of building, how flags look, and
 * which way stairs must face to climb toward +x.
 */

export type BuildingArgs = {
  width?: number;
  depth?: number;
  floors?: number;
  wall?: string;
  roof?: string;
  trim?: string | null;
  colorful?: boolean;
  castle?: boolean;
  type?: string;
  furnish?: boolean;
  sign?: 'cross' | null;
  flag?: string | null;
  rooms?: boolean;
  flatRoof?: boolean;
  roomPlan?: Array<{ purpose: string; count: number }>;
  features?: string[];
};

const FURNITURE: Record<string, string[]> = {
  house: ['bed', 'table', 'chair', 'tv', 'bookshelf', 'flower_pot', 'fridge', 'stove'],
  hospital: ['bed', 'bed', 'table', 'chair', 'flower_pot', 'sink'],
  school: ['table', 'chair', 'table', 'chair', 'bookshelf', 'bookshelf'],
  shop: ['bookshelf', 'table', 'cake', 'bookshelf', 'fridge', 'flower_pot'],
  hotel: ['bed', 'bed', 'table', 'painting', 'flower_pot'],
  library: ['bookshelf', 'bookshelf', 'bookshelf', 'table', 'chair'],
  restaurant: ['table', 'chair', 'table', 'chair', 'stove', 'fridge', 'sink', 'cake'],
  barn: ['hay', 'hay', 'fence'],
  castle: ['table', 'chair', 'bookshelf', 'painting'],
  skyscraper: ['table', 'chair', 'tv', 'painting'],
  firestation: ['bed', 'table', 'chair'],
};

/** Flag bitmaps: letters map to colour blocks, '.' is a gap. Top row first, 12 wide, 7 tall. */
const FLAG_ART: Record<string, { rows: string[]; colors: Record<string, string> }> = {
  canada: { rows: ['RRRWWWWWWRRR', 'RRRWWWRWWRRR', 'RRRWWRRRWRRR', 'RRRWRRRRRRRR', 'RRRWWRRRWRRR', 'RRRWWWRWWRRR', 'RRRWWWWWWRRR'], colors: { R: 'color_red', W: 'color_white' } },
  brazil: { rows: ['GGGGGGGGGGGG', 'GGGGYYYYGGGG', 'GGYYYBBYYYGG', 'GYYYBBBBYYYG', 'GGYYYBBYYYGG', 'GGGGYYYYGGGG', 'GGGGGGGGGGGG'], colors: { G: 'color_green', Y: 'color_yellow', B: 'color_blue' } },
  usa: { rows: ['BWBWBRRRRRRR', 'WBWBWWWWWWWW', 'BWBWBRRRRRRR', 'WBWBWWWWWWWW', 'RRRRRRRRRRRR', 'WWWWWWWWWWWW', 'RRRRRRRRRRRR'], colors: { R: 'color_red', W: 'color_white', B: 'color_blue' } },
  uk: { rows: ['RWBBBRRBBBWR', 'WRWBBRRBBWRW', 'BWRWBRRBWRWB', 'RRRRRRRRRRRR', 'BWRWBRRBWRWB', 'WRWBBRRBBWRW', 'RWBBBRRBBBWR'], colors: { R: 'color_red', W: 'color_white', B: 'color_blue' } },
  france: { rows: ['BBBBWWWWRRRR', 'BBBBWWWWRRRR', 'BBBBWWWWRRRR', 'BBBBWWWWRRRR', 'BBBBWWWWRRRR', 'BBBBWWWWRRRR', 'BBBBWWWWRRRR'], colors: { R: 'color_red', W: 'color_white', B: 'color_blue' } },
  italy: { rows: ['GGGGWWWWRRRR', 'GGGGWWWWRRRR', 'GGGGWWWWRRRR', 'GGGGWWWWRRRR', 'GGGGWWWWRRRR', 'GGGGWWWWRRRR', 'GGGGWWWWRRRR'], colors: { R: 'color_red', W: 'color_white', G: 'color_green' } },
  germany: { rows: ['KKKKKKKKKKKK', 'KKKKKKKKKKKK', 'RRRRRRRRRRRR', 'RRRRRRRRRRRR', 'YYYYYYYYYYYY', 'YYYYYYYYYYYY', 'YYYYYYYYYYYY'], colors: { K: 'color_black', R: 'color_red', Y: 'color_yellow' } },
  japan: { rows: ['WWWWWWWWWWWW', 'WWWWWRRWWWWW', 'WWWWRRRRWWWW', 'WWWWRRRRWWWW', 'WWWWRRRRWWWW', 'WWWWWRRWWWWW', 'WWWWWWWWWWWW'], colors: { R: 'color_red', W: 'color_white' } },
  portugal: { rows: ['GGGGRRRRRRRR', 'GGGGRRRRRRRR', 'GGGYYRRRRRRR', 'GGGYYRRRRRRR', 'GGGYYRRRRRRR', 'GGGGRRRRRRRR', 'GGGGRRRRRRRR'], colors: { G: 'color_green', R: 'color_red', Y: 'color_yellow' } },
  spain: { rows: ['RRRRRRRRRRRR', 'RRRRRRRRRRRR', 'YYYYYYYYYYYY', 'YYYRRYYYYYYY', 'YYYYYYYYYYYY', 'RRRRRRRRRRRR', 'RRRRRRRRRRRR'], colors: { R: 'color_red', Y: 'color_yellow' } },
  mexico: { rows: ['GGGGWWWWRRRR', 'GGGGWWWWRRRR', 'GGGGWBBWRRRR', 'GGGGWBBWRRRR', 'GGGGWBBWRRRR', 'GGGGWWWWRRRR', 'GGGGWWWWRRRR'], colors: { G: 'color_green', W: 'color_white', R: 'color_red', B: 'color_brown' } },
  ireland: { rows: ['GGGGWWWWOOOO', 'GGGGWWWWOOOO', 'GGGGWWWWOOOO', 'GGGGWWWWOOOO', 'GGGGWWWWOOOO', 'GGGGWWWWOOOO', 'GGGGWWWWOOOO'], colors: { G: 'color_green', W: 'color_white', O: 'color_orange' } },
  rainbow: { rows: ['RRRRRRRRRRRR', 'OOOOOOOOOOOO', 'YYYYYYYYYYYY', 'GGGGGGGGGGGG', 'BBBBBBBBBBBB', 'PPPPPPPPPPPP', 'KKKKKKKKKKKK'], colors: { R: 'color_red', O: 'color_orange', Y: 'color_yellow', G: 'color_green', B: 'color_blue', P: 'color_purple', K: 'color_pink' } },
};

/** Furniture per room purpose; a pair stacks something on top (a screen on a desk). */
const ROOM_FURNITURE: Record<string, Array<string | [string, string]>> = {
  classroom: ['table', 'chair', 'table', 'chair', 'bookshelf', 'table', 'chair', 'table', 'chair'],
  'computer room': [['table', 'tv'], ['table', 'tv'], 'chair', ['table', 'tv'], 'chair', ['table', 'tv']],
  library: ['bookshelf', 'bookshelf', 'table', 'chair', 'bookshelf', 'bookshelf'],
  canteen: ['table', 'chair', 'cake', 'table', 'chair', 'fridge', 'stove', 'sink'],
  gym: ['fence', 'hay', 'fence'],
  office: ['table', 'chair', 'painting', 'bookshelf'],
  ward: ['bed', 'bed', 'table', 'chair', 'flower_pot'],
  bedroom: ['bed', 'table', 'painting', 'flower_pot'],
  lab: ['table', 'glow_crystal', 'table', 'chair', 'bookshelf'],
  kitchen: ['stove', 'fridge', 'sink', 'table', 'cake'],
  'living room': ['tv', 'chair', 'chair', 'table', 'painting', 'flower_pot'],
  bathroom: ['sink', 'flower_pot'],
  shop: ['bookshelf', 'table', 'cake', 'fridge'],
  room: ['table', 'chair', 'bookshelf'],
};

export const FEATURE_KINDS: FeatureKind[] = ['court', 'playground', 'pool', 'garden', 'parking', 'fountain', 'fence'];

export function flagNames(): string[] {
  return Object.keys(FLAG_ART);
}

export function flagRows(registry: BlockRegistry, name: string): number[][] | null {
  const art = FLAG_ART[name];
  if (!art) return null;
  return art.rows.map((row) => [...row].map((ch) => (ch === '.' ? 0 : registry.numericOf(art.colors[ch] ?? 'color_white'))));
}

/** Which quarter turn makes a stairs block climb toward +x. */
export function stairRotationTowardPlusX(): number {
  for (let r = 0; r < 4; r++) if (SHAPES.stairs.occludes(DIR_PX, BlockState.withRotation(0, r))) return r;
  return 0;
}

/** Fills in the generator's knobs from loose arguments, with safe block fallbacks. */
export function houseOptions(registry: BlockRegistry, a: BuildingArgs): HouseOptions {
  const id = (name: string | null | undefined, fallback: string): number => {
    const def = name ? resolveBlockId(name) : undefined;
    return def?.numericId ?? registry.numericOf(fallback);
  };
  const maybe = (name: string): number | null => (registry.has(name) ? registry.numericOf(name) : null);
  const castle = a.castle === true;
  const type = a.type ?? (castle ? 'castle' : 'house');
  const wall = id(a.wall, castle ? 'stone_bricks' : 'planks');
  const furniture: FurnitureItem[] = (FURNITURE[type] ?? FURNITURE.house).filter((n) => registry.has(n)).map((n) => ({ id: registry.numericOf(n) }));
  const purposeFurniture: Record<string, FurnitureItem[]> = {};
  for (const [purpose, items] of Object.entries(ROOM_FURNITURE)) {
    purposeFurniture[purpose] = items
      .map((it) => (typeof it === 'string' ? { base: it, on: undefined } : { base: it[0], on: it[1] }))
      .filter((it) => registry.has(it.base))
      .map((it) => ({ id: registry.numericOf(it.base), on: it.on && registry.has(it.on) ? registry.numericOf(it.on) : undefined }));
  }
  const kit: FeatureKit = {
    courtFloor: registry.numericOf('color_green'),
    courtLine: registry.numericOf('color_white'),
    fence: id('fence', 'wood'),
    sand: registry.numericOf('sand'),
    planks: registry.numericOf('planks'),
    ladder: id('ladder', 'planks'),
    stairs: id('planks_stairs', 'planks'),
    slab: id('planks_slab', 'planks'),
    poolRim: id('stone_bricks', 'stone'),
    water: registry.numericOf('water'),
    grass: registry.numericOf('grass'),
    flowers: ['flower_pink', 'flower_yellow', 'flower_blue', 'flower_red'].filter((n) => registry.has(n)).map((n) => registry.numericOf(n)),
    parkingFloor: id('stone', 'cobblestone'),
    lamp: maybe('lantern'),
  };
  const roomPlan = (a.roomPlan ?? []).filter((r) => r.count > 0);
  const features = (a.features ?? []).filter((f): f is FeatureKind => (FEATURE_KINDS as string[]).includes(f));
  const flatRoof = a.flatRoof ?? (type === 'skyscraper' || type === 'hospital' || type === 'firestation');
  return {
    width: a.width ?? 7,
    depth: a.depth ?? 7,
    floors: a.floors ?? 1,
    wall,
    roof: id(a.roof, castle ? 'stone_bricks' : 'roof_tiles'),
    floor: registry.numericOf('planks'),
    glass: registry.numericOf('glass'),
    chimney: registry.numericOf('brick'),
    door: id('door', 'planks'),
    doorState: 0,
    stairs: id('planks_stairs', 'planks'),
    stairRotation: stairRotationTowardPlusX(),
    lamp: maybe('lamp'),
    lantern: maybe('lantern'),
    pole: id('fence', 'wood'),
    signBlock: registry.numericOf('color_red'),
    trim: a.trim ? id(a.trim, 'planks') : null,
    colorful: a.colorful === true,
    castle,
    flatRoof,
    rooms: a.rooms ?? (roomPlan.length > 0 || (type !== 'house' && type !== 'castle' && type !== 'barn')),
    furnish: a.furnish === true || roomPlan.length > 0,
    furniture,
    roomPlan,
    purposeFurniture,
    features,
    kit,
    sign: a.sign ?? null,
    flag: a.flag ? flagRows(registry, a.flag) : null,
    palette: ['color_red', 'color_orange', 'color_yellow', 'color_green', 'color_blue', 'color_purple', 'color_pink'].map((c) => registry.numericOf(c)),
  };
}
