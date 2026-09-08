/** A white wedge with a red ramp curling out of the front. */

import { plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const ibirapuera: Monument = {
  id: 'ibirapuera',
  label: 'Ibirapuera Auditorium',
  emoji: '🎵',
  place: 'São Paulo, Brazil',
  width: 19,
  depth: 17,
  height: 13,
  blurb: 'A white wedge with a big red tongue!',
  real: {
    height: 25,
    width: 45,
    depth: 40,
    source: 'Ibirapuera Auditorium: a white wedge with its red marquee',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const { white } = m.kit;
  const tongue = m.ctx.color ?? m.kit.red;
  plaza(m, m.kit.cobble);
  const half = Math.floor(m.w / 2) - 2;
  const depth = Math.floor(m.d / 2) - 4; // room in front for the marquee
  for (let dx = -half; dx <= half; dx++) {
    for (let dz = -depth; dz <= depth; dz++) {
      // A wedge: tall at the back, sloping down to the front.
      const height = Math.max(2, Math.round((1 - (dz + depth) / (depth * 2)) * (13 - 2)));
      for (let y = 1; y <= height; y++) {
        const shell = Math.abs(dx) === half || dz === -depth || y === height;
        m.put(m.cx + dx, m.g + y, m.cz + dz, shell ? white : 0);
      }
      m.put(m.cx + dx, m.g, m.cz + dz, white);
    }
  }
  // The tongue: the red marquee curls out of the mouth of the wedge and back
  // on itself, which is the thing everyone photographs.
  for (let i = 0; i <= 6; i++) {
    const z = m.cz + depth + 1 + i;
    if (z > m.z1) break;
    const y = m.g + 6 - i;
    const curl = i > 4 ? (i - 4) * 2 : 0; // the tip lifts back up
    for (let dx = -3; dx <= 3; dx++) {
      m.put(m.cx + dx, Math.max(m.g + 1, y + curl), z, tongue);
      // The marquee is a slab with a lip, not a line of blocks.
      if (i > 0 && i < 5) m.put(m.cx + dx, Math.max(m.g + 1, y + curl) - 1, z, Math.abs(dx) === 3 ? tongue : 0);
    }
  }
  // A doorway under the marquee, so the wedge is a hall you can go into.
  for (let dx = -1; dx <= 1; dx++) for (let h = 1; h <= 2; h++) m.put(m.cx + dx, m.g + h, m.cz + depth, 0);
  // Park lawn around it.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      if (Math.abs(x - m.cx) <= half && Math.abs(z - m.cz) <= depth) continue;
      m.put(x, m.g, z, m.kit.grass);
      if ((x + z) % 11 === 0) {
        for (let h = 1; h <= 2; h++) m.put(x, m.g + h, z, m.kit.wood);
        m.put(x, m.g + 3, z, m.kit.leaves);
      }
    }
  }
}
