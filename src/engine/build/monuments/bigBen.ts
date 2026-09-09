/**
 * The Elizabeth Tower, which everyone calls Big Ben: 96 m of gothic stone
 * with its four clock faces at 55 m — a bit under six-tenths of the way up —
 * a belfry above them and a spire on top, standing at the end of the Palace
 * of Westminster.
 */

import { box, plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const bigBen: Monument = {
  id: 'big_ben',
  label: 'Big Ben',
  emoji: '🕰️',
  place: 'London, England',
  width: 27,
  depth: 15,
  height: 30,
  blurb: 'The big clock tower by the river, with a bell that bongs!',
  real: {
    height: 96,
    width: 90,
    depth: 40,
    levels: { clock: 55, belfry: 68, spire: 96 },
    source: 'Elizabeth Tower: 96 m, clock faces at 55 m, beside the Palace of Westminster',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const stone = m.ctx.color ?? m.kit.cobble;
  const { glass, white, black, yellow } = m.kit;
  plaza(m, m.kit.cobble);
  const tx = m.x0 + 5;
  const clockY = m.g + m.up(55);
  const belfry = m.g + m.up(68);
  const top = m.g + m.up(96);

  // The tower: a square shaft with slender windows all the way up.
  for (let y = m.g + 1; y <= belfry; y++) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        if (!edge) {
          m.put(tx + dx, y, m.cz + dz, 0);
          continue;
        }
        const window = (dx === 0 || dz === 0) && y < clockY - 2 && (y - m.g) % 5 > 1 && (y - m.g) % 5 < 4;
        m.put(tx + dx, y, m.cz + dz, window ? glass : stone);
      }
    }
  }
  // Four clock faces, white with black hands, ringed in gold.
  for (const [dx, dz] of [[0, -2], [0, 2], [-2, 0], [2, 0]] as const) {
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) {
        const x = tx + dx + (dz === 0 ? 0 : a);
        const z = m.cz + dz + (dz === 0 ? a : 0);
        m.put(x, clockY + b, z, Math.abs(a) === 1 && Math.abs(b) === 1 ? yellow : white);
      }
    }
    m.put(tx + dx, clockY, m.cz + dz, black);
  }
  // The belfry, open to the air, and the spire above it.
  for (let y = belfry + 1; y <= belfry + 3; y++) {
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const corner = Math.abs(dx) === 2 && Math.abs(dz) === 2;
        const edge = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        m.put(tx + dx, y, m.cz + dz, corner ? stone : edge ? 0 : 0);
      }
    }
  }
  for (let i = 0; belfry + 4 + i <= top; i++) {
    const r = Math.max(0, 2 - Math.floor(i / 2));
    box(m, tx - r, belfry + 4 + i, m.cz - r, tx + r, belfry + 4 + i, m.cz + r, i > 3 ? yellow : stone);
  }
  if (m.kit.lamp !== null) m.put(tx, top + 1, m.cz, m.kit.lamp);

  // The Palace running away from the tower: a long gothic front on the river.
  for (let x = tx + 4; x <= m.x1 - 1; x++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let y = m.g + 1; y <= m.g + 7; y++) {
        const edge = Math.abs(dz) === 2;
        const window = edge && y > m.g + 2 && y < m.g + 6 && x % 2 === 0;
        m.put(x, y, m.cz + dz, edge ? (window ? glass : stone) : 0);
      }
      m.put(x, m.g + 8, m.cz + dz, stone);
    }
    // Pinnacles along the roofline, the way Westminster bristles with them.
    if (x % 3 === 0) for (let h = 9; h <= 10; h++) m.put(x, m.g + h, m.cz, stone);
  }
}
