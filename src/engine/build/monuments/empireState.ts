/**
 * The Empire State Building: 381 m to the roof of the 102nd floor and 443 m
 * to the tip of the mast, art deco setbacks stepping in as it climbs, and the
 * spire that was built to moor airships to.
 */

import { box, plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const empireState: Monument = {
  id: 'empire_state',
  label: 'Empire State Building',
  emoji: '🏙️',
  place: 'New York, USA',
  width: 17,
  depth: 17,
  height: 44,
  blurb: 'Up and up in steps, with a spire on the very top!',
  real: {
    height: 443,
    width: 129,
    depth: 60,
    levels: { shoulder: 76, tower: 320, roof: 381, mast: 443 },
    source: 'Empire State Building: 381 m to the roof, 443 m to the mast tip',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const stone = m.ctx.color ?? m.kit.white;
  const { glass, yellow } = m.kit;
  plaza(m, m.kit.cobble);
  const roof = m.g + m.up(381);
  const mast = m.g + m.up(443);

  // The wide base, then the tower, in art deco setbacks.
  let previous = 0;
  for (let y = m.g + 1; y <= roof; y++) {
    const metres = (y - m.g) / m.scale;
    const r = metres < 76 ? 6 : metres < 160 ? 4 : metres < 320 ? 3 : 2;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const edge = Math.abs(dx) === r || Math.abs(dz) === r;
        if (!edge) {
          m.put(m.cx + dx, y, m.cz + dz, 0);
          continue;
        }
        // Vertical bands of window and stone, which is the art deco look.
        const pier = (dx + dz) % 2 === 0;
        m.put(m.cx + dx, y, m.cz + dz, pier ? stone : glass);
      }
    }
    // A stone ledge wherever the building steps in: the art deco setbacks.
    if (previous > r) box(m, m.cx - previous, y, m.cz - previous, m.cx + previous, y, m.cz + previous, stone);
    previous = r;
  }
  box(m, m.cx - 2, roof, m.cz - 2, m.cx + 2, roof, m.cz + 2, stone);
  // The observation deck under the mast, then the mast itself.
  for (let y = roof + 1; y <= mast - 3; y++) {
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      const edge = Math.abs(dx) === 1 || Math.abs(dz) === 1;
      m.put(m.cx + dx, y, m.cz + dz, edge ? (y % 2 === 0 ? stone : glass) : 0);
    }
  }
  for (let y = mast - 2; y <= mast; y++) m.put(m.cx, y, m.cz, stone);
  m.put(m.cx, mast + 1, m.cz, yellow);
  if (m.kit.lamp !== null) m.put(m.cx, mast + 2, m.cz, m.kit.lamp);
}
