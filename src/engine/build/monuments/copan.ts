/** A long slab that waves, with a white band on every floor. */

import { plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const copan: Monument = {
  id: 'copan',
  label: 'Copan Building',
  emoji: '🌊',
  place: 'São Paulo, Brazil',
  width: 27,
  depth: 13,
  height: 30,
  blurb: 'A building that waves like the sea!',
  draw,
};

function draw(m: MonumentDraw): void {
  const { white, glass } = m.kit;
  const band = m.ctx.color ?? white;
  plaza(m, m.kit.cobble);
  const top = m.g + 30;
  const half = Math.floor(m.w / 2) - 2;
  for (let dx = -half; dx <= half; dx++) {
    // The famous S: the plan curves twice across its length.
    const wave = Math.round(Math.sin((dx / half) * Math.PI) * 2.5);
    const x = m.cx + dx;
    for (let y = m.g + 1; y <= top; y++) {
      const brise = (y - m.g) % 2 === 0;
      for (let dz = -1; dz <= 1; dz++) {
        const z = m.cz + wave + dz;
        m.put(x, y, z, brise ? band : dz === 0 ? glass : white);
      }
    }
    m.put(x, m.g, m.cz + wave, m.kit.cobble);
  }
}
