/** A white gallery hanging between four red beams, with an open plaza under it. */

import { plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const masp: Monument = {
  id: 'masp',
  label: 'MASP Museum',
  emoji: '🏛️',
  place: 'São Paulo, Brazil',
  width: 23,
  depth: 15,
  height: 11,
  blurb: 'A museum hanging from four big red beams — walk underneath!',
  draw,
};

function draw(m: MonumentDraw): void {
  const beam = m.ctx.color ?? m.kit.red;
  const { white, glass } = m.kit;
  plaza(m, m.kit.cobble);
  const spanX = Math.floor(m.w / 2) - 2;
  const spanZ = Math.floor(m.d / 2) - 2;
  // The real thing spans 74 m and lifts the box only 8 m: long and low, with a
  // plaza running right through underneath. Keep just enough headroom to walk.
  const deck = m.g + 5;
  // Four columns, and nothing else at head height: the plaza runs right under.
  for (const dx of [-spanX, spanX]) {
    for (const dz of [-spanZ, spanZ]) {
      for (let y = m.g + 1; y <= deck + 5; y++) {
        m.put(m.cx + dx, y, m.cz + dz, beam);
        m.put(m.cx + dx + (dx < 0 ? 1 : -1), y, m.cz + dz, beam);
      }
    }
  }
  // The two beams the box hangs from, over the whole span.
  for (const dz of [-spanZ, spanZ]) {
    for (let x = m.cx - spanX; x <= m.cx + spanX; x++) {
      m.put(x, deck + 5, m.cz + dz, beam);
      m.put(x, deck + 4, m.cz + dz, beam);
    }
  }
  // The gallery box itself, glass on the long sides.
  for (let x = m.cx - spanX + 1; x <= m.cx + spanX - 1; x++) {
    for (let z = m.cz - spanZ + 1; z <= m.cz + spanZ - 1; z++) {
      m.put(x, deck, z, white);
      m.put(x, deck + 4, z, white);
      for (let y = deck + 1; y <= deck + 3; y++) {
        const edge = x === m.cx - spanX + 1 || x === m.cx + spanX - 1 || z === m.cz - spanZ + 1 || z === m.cz + spanZ - 1;
        m.put(x, y, z, edge ? glass : 0);
      }
    }
  }
}
