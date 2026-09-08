/**
 * Tokyo Tower: 333 m of lattice in international orange and white, banded
 * from the ground up, with a main deck at 150 m (45% of its height) and a
 * top deck at 250 m (75%). Straighter and squarer than its Paris cousin,
 * with a broad skirt at the bottom.
 */

import { box, plaza, ring } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const tokyoTower: Monument = {
  id: 'tokyo_tower',
  label: 'Tokyo Tower',
  emoji: '🗼',
  place: 'Tokyo, Japan',
  width: 13,
  depth: 13,
  height: 40,
  blurb: 'Orange and white all the way up, with two decks to look out of!',
  real: {
    height: 333,
    width: 89,
    depth: 89,
    levels: { mainDeck: 150, topDeck: 250 },
    source: 'Tokyo Tower: 333 m, decks at 150 m and 250 m, 89 m square base',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const orange = m.ctx.color ?? m.kit.red;
  const white = m.kit.white;
  plaza(m, m.kit.cobble);
  const top = m.g + m.up(333);
  const mainDeck = m.g + m.up(150);
  const topDeck = m.g + m.up(250);
  const base = Math.floor(Math.min(m.w, m.d) / 2) - 1;
  const legRadius = (y: number): number => {
    const metres = (y - m.g) / m.scale;
    if (metres >= 250) return 1;
    return Math.max(1, Math.round(base * (1 - metres / 250) ** 1.3 + 1));
  };
  // Four legs, banded orange and white as they climb.
  for (let y = m.g + 1; y <= top - 4; y++) {
    const r = legRadius(y);
    const banded = Math.floor((y - m.g) / 3) % 2 === 0 ? orange : white;
    for (const dx of [-r, r]) {
      for (const dz of [-r, r]) {
        m.put(m.cx + dx, y, m.cz + dz, banded);
        if ((y - m.g) % 4 === 0) {
          for (let i = 1; i < r * 2; i++) {
            m.put(m.cx + dx, y, m.cz + dz + (dz < 0 ? i : -i), banded);
            m.put(m.cx + dx + (dx < 0 ? i : -i), y, m.cz + dz, banded);
          }
        }
      }
    }
  }
  // The wide skirt at the bottom, which is what makes it look like Tokyo.
  for (let i = 0; i <= 2; i++) {
    ring(m, m.cx - base - 1 + i, m.g + 1 + i, m.cz - base - 1 + i, m.cx + base + 1 - i, m.cz + base + 1 - i, orange);
  }
  // The two decks: the main one square and deep, the top one small.
  const mainPad = legRadius(mainDeck) + 2;
  box(m, m.cx - mainPad, mainDeck, m.cz - mainPad, m.cx + mainPad, mainDeck, m.cz + mainPad, white);
  box(m, m.cx - mainPad, mainDeck + 1, m.cz - mainPad, m.cx + mainPad, mainDeck + 2, m.cz + mainPad, 0);
  ring(m, m.cx - mainPad, mainDeck + 1, m.cz - mainPad, m.cx + mainPad, m.cz + mainPad, m.kit.glass);
  const topPad = 2;
  box(m, m.cx - topPad, topDeck, m.cz - topPad, m.cx + topPad, topDeck, m.cz + topPad, white);
  ring(m, m.cx - topPad, topDeck + 1, m.cz - topPad, m.cx + topPad, m.cz + topPad, m.kit.glass);
  box(m, m.cx - topPad, topDeck + 2, m.cz - topPad, m.cx + topPad, topDeck + 2, m.cz + topPad, orange);
  // The antenna mast.
  for (let y = top - 3; y <= top; y++) m.put(m.cx, y, m.cz, (y - m.g) % 2 === 0 ? orange : white);
  if (m.kit.lamp !== null) m.put(m.cx, top + 1, m.cz, m.kit.lamp);
}
