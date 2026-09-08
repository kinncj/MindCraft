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
  draw,
};

function draw(m: MonumentDraw): void {
  const { iron, lamp } = m.kit;
  plaza(m, m.kit.cobble);
  const top = m.g + Math.min(38, 38);
  const base = Math.floor(Math.min(m.w, m.d) / 2) - 1;
  const deck1 = m.g + 11;
  const deck2 = m.g + 22;
  const legRadius = (y: number): number => {
    const t = (y - m.g) / (top - m.g);
    if (t >= 0.62) return 1;
    // Curves in fast at the bottom, like the real ironwork.
    return Math.max(1, Math.round(base * (1 - t / 0.62) ** 1.5 + 1));
  };
  for (let y = m.g + 1; y <= top - 6; y++) {
    const r = legRadius(y);
    for (const dx of [-r, r]) {
      for (const dz of [-r, r]) {
        m.put(m.cx + dx, y, m.cz + dz, iron);
        // Diagonal bracing between the legs, so they read as lattice.
        if ((y - m.g) % 3 === 0) {
          for (let i = 1; i < r * 2; i++) {
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
  // Cabin and antenna.
  box(m, m.cx - 1, top - 6, m.cz - 1, m.cx + 1, top - 4, m.cz + 1, iron);
  for (let y = top - 3; y <= top; y++) m.put(m.cx, y, m.cz, iron);
  if (lamp !== null) m.put(m.cx, top + 1, m.cz, lamp);
}
