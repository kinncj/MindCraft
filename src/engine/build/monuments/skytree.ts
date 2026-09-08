/**
 * Tokyo Skytree: 634 m, the tallest tower there is. A three-sided foot
 * that rounds off into a circular shaft as it climbs, a deck at 350 m
 * (55%) and another at 450 m (71%), then a long spire. Pale grey-white,
 * lit blue at night.
 */

import { circle, disc, plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const skytree: Monument = {
  id: 'skytree',
  label: 'Tokyo Skytree',
  emoji: '📡',
  place: 'Tokyo, Japan',
  width: 9,
  depth: 9,
  height: 58,
  blurb: 'The tallest tower in the world, with two decks in the clouds!',
  real: {
    height: 634,
    width: 68,
    depth: 68,
    levels: { tembo: 350, galleria: 450 },
    source: 'Tokyo Skytree: 634 m, decks at 350 m and 450 m, 68 m triangular foot',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const shell = m.ctx.color ?? m.kit.white;
  const top = m.g + m.up(634);
  const lower = m.g + m.up(350);
  const upper = m.g + m.up(450);
  plaza(m, m.kit.cobble);
  const mastFrom = m.g + m.up(500); // the shaft ends and the mast begins
  for (let y = m.g + 1; y <= mastFrom; y++) {
    const t = (y - m.g) / (top - m.g);
    // Wide three-sided foot, drawing in to a slim round shaft.
    const r = Math.max(1, Math.min(Math.floor(Math.min(m.w, m.d) / 2) - 2, Math.round(4 * (1 - t / 0.55) ** 1.1) + 1));
    if (t < 0.12) {
      // The tripod: three legs spreading out at the bottom.
      const reach = Math.floor(Math.min(m.w, m.d) / 2) - 2;
      for (const [dx, dz] of [[0, -1], [-1, 1], [1, 1]] as const) {
        const spread = Math.round((1 - t / 0.12) * 4);
        for (let i = 0; i <= spread; i++) {
          const out = Math.min(r + i, reach); // a leg may not step off its own ground
          m.put(m.cx + dx * out, y, m.cz + dz * out, shell);
        }
      }
    }
    circle(m, m.cx, y, m.cz, r, shell);
    if (r <= 1) m.put(m.cx, y, m.cz, shell);
  }
  // Two decks, the lower one wider.
  for (const [y, r] of [[lower, 5], [upper, 3]] as const) {
    disc(m, m.cx, y, m.cz, r, shell);
    circle(m, m.cx, y + 1, m.cz, r, m.kit.glass);
    circle(m, m.cx, y + 2, m.cz, r, m.kit.glass);
    disc(m, m.cx, y + 3, m.cz, r, shell);
  }
  // The spire, and a light on the very top.
  for (let y = mastFrom; y <= top; y++) m.put(m.cx, y, m.cz, shell);
  if (m.kit.lamp !== null) m.put(m.cx, top + 1, m.cz, m.kit.lamp);
}
