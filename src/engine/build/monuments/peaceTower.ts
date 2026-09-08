/** A stone clock tower with a green roof and a flag. */

import { box, plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const peaceTower: Monument = {
  id: 'peace_tower',
  label: 'Peace Tower',
  emoji: '🕰️',
  place: 'Ottawa, Canada',
  width: 37,
  depth: 17,
  height: 26,
  blurb: 'A clock tower with a green copper roof!',
  real: {
    height: 92,
    width: 145,
    depth: 75,
    levels: { clock: 68, roof: 78 },
    source: 'Peace Tower: 92.2 m, clock faces near the top, with the Centre Block either side',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const { stone, glass, green, white, black, fence } = m.kit;
  plaza(m, m.kit.cobble);
  const top = m.g + m.up(68); // the clock faces sit at 68 m of the 92 m tower
  for (let y = m.g + 1; y <= top; y++) {
    for (let dx = -3; dx <= 3; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        const edge = Math.abs(dx) === 3 || Math.abs(dz) === 3;
        if (!edge) {
          m.put(m.cx + dx, y, m.cz + dz, 0);
          continue;
        }
        // Tall arched windows up the faces.
        const window = (dx === 0 || dz === 0) && (y - m.g) % 6 > 1 && (y - m.g) % 6 < 5 && y < top - 4;
        m.put(m.cx + dx, y, m.cz + dz, window ? glass : stone);
      }
    }
    // Corner buttresses.
    if (y < top - 2) for (const dx of [-4, 4]) for (const dz of [-4, 4]) m.put(m.cx + dx, y, m.cz + dz, stone);
  }
  // Four clock faces.
  for (const [dx, dz] of [[0, -3], [0, 3], [-3, 0], [3, 0]] as const) {
    for (let a = -1; a <= 1; a++) {
      for (let b = -1; b <= 1; b++) m.put(m.cx + dx + (dz === 0 ? 0 : a), top - 4 + b, m.cz + dz + (dz === 0 ? a : 0), white);
    }
    m.put(m.cx + dx, top - 4, m.cz + dz, black);
  }
  // The Centre Block: gothic wings running out either side of the tower,
  // with pointed windows and a green copper roof of their own.
  for (const side of [-1, 1]) {
    for (let i = 4; i <= Math.floor(m.w / 2) - 1; i++) {
      const x = m.cx + side * i;
      for (let dz = -2; dz <= 2; dz++) {
        for (let y = m.g + 1; y <= m.g + 7; y++) {
          const edge = Math.abs(dz) === 2;
          const window = edge && y > m.g + 2 && y < m.g + 6 && i % 2 === 0;
          m.put(x, y, m.cz + dz, edge ? (window ? glass : stone) : 0);
        }
        m.put(x, m.g, m.cz + dz, stone);
        m.put(x, m.g + 8, m.cz + dz, green);
        if (Math.abs(dz) < 2) m.put(x, m.g + 9, m.cz + dz, green);
      }
      // A pinnacle every few bays, the way the real roofline breaks up.
      if (i % 3 === 0) for (let h = 10; h <= 11; h++) m.put(x, m.g + h, m.cz, stone);
    }
  }

  // A copper roof that steps to a point, and the flag pole.
  for (let i = 0; i <= 4; i++) {
    const r = 3 - i;
    if (r < 0) break;
    box(m, m.cx - r, top + 1 + i, m.cz - r, m.cx + r, top + 1 + i, m.cz + r, green);
  }
  for (let y = top + 5; y <= top + 8; y++) m.put(m.cx, y, m.cz, fence);
  for (let dz = -1; dz <= 1; dz++) m.put(m.cx + 1, top + 7 + dz * 0, m.cz + dz, m.kit.red);
}
