/** Four iron legs curving in to a point, two decks, an antenna on top. */

import { box, plaza, ring } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const eiffel: Monument = {
  id: 'eiffel',
  label: 'Eiffel Tower',
  emoji: '🗼',
  place: 'Paris, France',
  width: 17,
  depth: 17,
  height: 38,
  blurb: 'Four big iron legs that meet in the sky!',
  real: {
    height: 330,
    width: 125,
    depth: 125,
    levels: { floor1: 57, floor2: 115, floor3: 276 },
    source: 'Eiffel Tower: 330 m, 125 m square base, floors at 57/115/276 m',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const { iron, lamp } = m.kit;
  plaza(m, m.kit.cobble);
  // Every height here is the real one, scaled: 330 m tall, floors at 57 m,
  // 115 m and 276 m, on a 125 m square base.
  const top = m.g + m.up(330);
  const base = Math.min(Math.floor(Math.min(m.w, m.d) / 2) - 1, Math.round(m.across(125) / 2));
  const deck1 = m.g + m.up(57);
  const deck2 = m.g + m.up(115);
  const topDeck = m.g + m.up(276);
  const legRadius = (y: number): number => {
    const metres = (y - m.g) / m.scale;
    // Steep curve under the first floor, nearly straight above the second, a
    // single mast above the top floor: the real profile, read in metres.
    if (metres >= 276) return 0;
    if (metres >= 115) return Math.max(1, Math.round(2 - (metres - 115) / 160));
    return Math.max(2, Math.round(base * (1 - metres / 115) ** 1.4 + 2));
  };
  for (let y = m.g + 1; y <= topDeck - 1; y++) {
    const r = legRadius(y);
    for (const dx of [-r, r]) {
      for (const dz of [-r, r]) {
        m.put(m.cx + dx, y, m.cz + dz, iron);
        // Diagonal bracing between the legs, so they read as lattice.
        // Lattice, not slabs: every fourth course braces the legs, and only
        // every other block of it, so daylight shows through the ironwork.
        if ((y - m.g) % 4 === 0) {
          for (let i = 1; i < r * 2; i++) {
            if ((i + y) % 2 !== 0) continue;
            m.put(m.cx + dx, y, m.cz + dz + (dz < 0 ? i : -i), iron);
            m.put(m.cx + dx + (dx < 0 ? i : -i), y, m.cz + dz, iron);
          }
        }
      }
    }
  }
  // The arch under the first deck.
  for (const side of [-1, 1]) {
    for (let i = 0; i <= base; i++) {
      const y = m.g + 1 + Math.round((base - i) * 0.9);
      m.put(m.cx + side * i, y, m.cz - base, iron);
      m.put(m.cx + side * i, y, m.cz + base, iron);
      m.put(m.cx - base, y, m.cz + side * i, iron);
      m.put(m.cx + base, y, m.cz + side * i, iron);
    }
  }
  for (const [y, pad] of [[deck1, legRadius(deck1) + 2], [deck2, legRadius(deck2) + 1]] as const) {
    box(m, m.cx - pad, y, m.cz - pad, m.cx + pad, y, m.cz + pad, iron);
    ring(m, m.cx - pad, y + 1, m.cz - pad, m.cx + pad, m.cz + pad, m.kit.fence);
  }
  // The top floor, its little cabin, and the mast above.
  box(m, m.cx - 1, topDeck, m.cz - 1, m.cx + 1, topDeck, m.cz + 1, iron);
  box(m, m.cx - 1, topDeck + 1, m.cz - 1, m.cx + 1, topDeck + 2, m.cz + 1, m.kit.glass);
  box(m, m.cx - 1, topDeck + 3, m.cz - 1, m.cx + 1, topDeck + 3, m.cz + 1, iron);
  for (let y = topDeck + 4; y <= top; y++) m.put(m.cx, y, m.cz, iron);
  if (lamp !== null) m.put(m.cx, top + 1, m.cz, lamp);
}
