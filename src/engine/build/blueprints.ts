import { B } from '../blocks/blocks';
import { BlockState } from '../blocks/BlockState';
import type { Stamp } from './Clipboard';

/**
 * Blueprint cards: little builds a kid can stamp down and then change.
 * Each is drawn as ASCII layers, bottom first, with a legend of block ids.
 * All designs are original.
 */

export type Blueprint = {
  id: string;
  label: string;
  emoji: string;
  description: string;
  stamp: Stamp;
};

type Legend = Record<string, { id: number; state?: number }>;

function fromLayers(layers: string[][], legend: Legend): Stamp {
  const blocks: Stamp['blocks'] = [];
  let width = 0;
  let depth = 0;
  layers.forEach((rows, y) => {
    rows.forEach((row, z) => {
      depth = Math.max(depth, z + 1);
      for (let x = 0; x < row.length; x++) {
        width = Math.max(width, x + 1);
        const ch = row[x];
        if (ch === ' ' || ch === '.') continue;
        const entry = legend[ch];
        if (!entry) throw new Error(`blueprint legend missing "${ch}"`);
        blocks.push({ x, y, z, id: entry.id, state: entry.state ?? 0 });
      }
    });
  });
  return { width, height: layers.length, depth, blocks };
}

const R = (n: number): number => BlockState.withRotation(0, n);
const TOP = BlockState.withTopHalf(0, true);

const cozyHouse: Blueprint = {
  id: 'cozy_house',
  label: 'Cozy House',
  emoji: '🏠',
  description: 'Planks, a door, two windows, and a bed inside.',
  stamp: fromLayers(
    [
      ['PPPPP', 'PPPPP', 'PPPPP', 'PPPPP', 'PPPPP'],
      ['PWPWP', 'W...W', 'W.b.W', 'W...W', 'PPDPP'],
      ['PGPGP', 'G...G', 'W...W', 'G...G', 'PPdPP'],
      ['PPPPP', 'P...P', 'P...P', 'P...P', 'PPPPP'],
      ['RRRRR', 'rRRRr', 'rRRRr', 'rRRRr', 'RRRRR'],
      ['.....', '.RRR.', '.RRR.', '.RRR.', '.....'],
    ],
    {
      P: { id: B.planks },
      W: { id: B.planks },
      G: { id: B.glass_pane, state: R(1) },
      D: { id: B.door, state: R(2) },
      d: { id: B.door, state: BlockState.withTopHalf(R(2), true) },
      b: { id: B.bed, state: R(0) },
      R: { id: B.roof_tiles },
      r: { id: B.roof_stairs, state: R(1) },
    },
  ),
};

const castleTower: Blueprint = {
  id: 'castle_tower',
  label: 'Castle Tower',
  emoji: '🏰',
  description: 'Stone bricks, a ladder to the top, and a flag of rainbow.',
  stamp: fromLayers(
    [
      ['SSSSS', 'SSSSS', 'SSSSS', 'SSSSS', 'SSSSS'],
      ['SSSSS', 'S...S', 'S.L.S', 'S...S', 'SSDSS'],
      ['SSSSS', 'S...S', 'S.L.S', 'S...S', 'SSdSS'],
      ['SSSSS', 'S...S', 'S.L.S', 'S...S', 'SSSSS'],
      ['SSSSS', 'S...S', 'S.L.S', 'S...S', 'SSSSS'],
      ['SSSSS', 'S...S', 'S.L.S', 'S...S', 'SSSSS'],
      ['SSSSS', 'SSSSS', 'SSSSS', 'SSSSS', 'SSSSS'],
      ['S.S.S', '.....', 'S.T.S', '.....', 'S.S.S'],
      ['.....', '.....', '..F..', '.....', '.....'],
      ['.....', '.....', '..F..', '.....', '.....'],
    ],
    {
      S: { id: B.stone_bricks },
      L: { id: B.ladder, state: R(0) },
      D: { id: B.door, state: R(2) },
      d: { id: B.door, state: BlockState.withTopHalf(R(2), true) },
      T: { id: B.torch },
      F: { id: B.rainbow },
    },
  ),
};

const bridge: Blueprint = {
  id: 'bridge',
  label: 'Bridge',
  emoji: '🌉',
  description: 'A wooden bridge with railings. Great over water.',
  stamp: fromLayers(
    [
      ['.......', 'sPPPPPs', 'sPPPPPs', 'sPPPPPs', '.......'],
      ['.......', 'fffffff', '.......', 'fffffff', '.......'],
    ],
    {
      P: { id: B.planks },
      s: { id: B.planks_stairs, state: R(1) },
      f: { id: B.fence },
    },
  ),
};

const garden: Blueprint = {
  id: 'garden',
  label: 'Flower Garden',
  emoji: '🌷',
  description: 'A fenced garden with flowers and a little bench.',
  stamp: fromLayers(
    [
      ['GGGGGGG', 'GGGGGGG', 'GGGGGGG', 'GGGGGGG', 'GGGGGGG'],
      ['fffffff', 'f p y f', 'f b.r f', 'f y p f', 'fff.fff'],
    ],
    {
      G: { id: B.grass },
      f: { id: B.fence },
      p: { id: B.flower_pink },
      y: { id: B.flower_yellow },
      r: { id: B.flower_red },
      b: { id: B.chair, state: R(1) },
    },
  ),
};

const pool: Blueprint = {
  id: 'pool',
  label: 'Swimming Pool',
  emoji: '🏊',
  description: 'A sandstone pool full of water, with a ladder out.',
  stamp: fromLayers(
    [
      ['SSSSSS', 'SSSSSS', 'SSSSSS', 'SSSSSS', 'SSSSSS'],
      ['SSSSSS', 'SwwwwS', 'SwwwwS', 'SwwwwS', 'SSSSSS'],
      ['SSSSSS', 'SwwwwS', 'SwwwwS', 'SwwwwS', 'SSLSSS'],
    ],
    {
      S: { id: B.sandstone },
      w: { id: B.water },
      L: { id: B.ladder, state: R(2) },
    },
  ),
};

const treehouse: Blueprint = {
  id: 'treehouse',
  label: 'Treehouse',
  emoji: '🌳',
  description: 'A hut on stilts of logs, with a ladder up.',
  stamp: fromLayers(
    [
      ['W...W', '.....', '..L..', '.....', 'W...W'],
      ['W...W', '.....', '..L..', '.....', 'W...W'],
      ['W...W', '.....', '..L..', '.....', 'W...W'],
      ['PPPPP', 'PPPPP', 'PPLPP', 'PPPPP', 'PPPPP'],
      ['fffff', 'f...f', 'f...f', 'f...f', 'ff.ff'],
      ['.....', '.....', '.....', '.....', '.....'],
      ['.PPP.', 'PPPPP', 'PPPPP', 'PPPPP', '.PPP.'],
    ],
    {
      W: { id: B.wood },
      L: { id: B.ladder, state: R(0) },
      P: { id: B.planks },
      f: { id: B.fence },
    },
  ),
};

export const BLUEPRINTS: Blueprint[] = [cozyHouse, castleTower, bridge, garden, pool, treehouse];

export function blueprintById(id: string): Blueprint | undefined {
  return BLUEPRINTS.find((b) => b.id === id);
}

// TOP is exported for blueprint authors who want top slabs.
export { TOP as TOP_HALF_STATE };
