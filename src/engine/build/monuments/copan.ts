/** A long slab that waves, with a white band on every floor. */

import { plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const copan: Monument = {
  id: 'copan',
  label: 'Copan Building',
  emoji: '🌊',
  place: 'São Paulo, Brazil',
  width: 39,
  depth: 13,
  height: 24,
  blurb: 'A building that waves like the sea!',
  real: {
    height: 140,
    width: 250,
    depth: 20,
    source: 'Edificio Copan: 140 m and 32 floors along a 250 m S-curved facade',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const { white, glass } = m.kit;
  const band = m.ctx.color ?? white;
  plaza(m, m.kit.cobble);
  const top = m.g + m.up(140); // 140 m and thirty-two floors
  const half = Math.floor(m.w / 2) - 2;
  for (let dx = -half; dx <= half; dx++) {
    // The famous S: the plan sweeps one way then the other across its length,
    // which is what makes it read as Copan and not just a slab.
    const wave = Math.round(Math.sin((dx / half) * Math.PI) * 3.5);
    const x = m.cx + dx;
    for (let y = m.g + 1; y <= top; y++) {
      // Copan is read in stripes: a concrete brise-soleil on every floor with
      // the glazing showing between them, right across a 250 m facade.
      const brise = (y - m.g) % 2 === 0;
      for (let dz = -2; dz <= 2; dz++) {
        const z = m.cz + wave + dz;
        if (Math.abs(dz) === 2) {
          // The fins stand proud of the face; between them you see the glass.
          m.put(x, y, z, brise ? band : glass);
          continue;
        }
        m.put(x, y, z, brise ? band : dz === 0 ? 0 : glass);
      }
    }
    m.put(x, m.g, m.cz + wave, m.kit.cobble);
  }
}
