/** A stone clock tower with a green roof and a flag. */

import { box, plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const peaceTower: Monument = {
  id: 'peace_tower',
  label: 'Peace Tower',
  emoji: '🕰️',
  place: 'Ottawa, Canada',
  width: 15,
  depth: 15,
  height: 32,
  blurb: 'A clock tower with a green copper roof!',
  draw,
};

function draw(m: MonumentDraw): void {
  const { stone, glass, green, white, black, fence } = m.kit;
  plaza(m, m.kit.cobble);
  const top = m.g + 24;
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
  // A copper roof that steps to a point, and the flag pole.
  for (let i = 0; i <= 4; i++) {
    const r = 3 - i;
    if (r < 0) break;
    box(m, m.cx - r, top + 1 + i, m.cz - r, m.cx + r, top + 1 + i, m.cz + r, green);
  }
  for (let y = top + 5; y <= top + 8; y++) m.put(m.cx, y, m.cz, fence);
  for (let dz = -1; dz <= 1; dz++) m.put(m.cx + 1, top + 7 + dz * 0, m.cz + dz, m.kit.red);
}
