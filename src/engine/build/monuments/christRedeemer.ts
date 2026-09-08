/**
 * Christ the Redeemer on Corcovado: a 30 m figure on an 8 m pedestal, arms
 * out 28 m from hand to hand — almost as wide as the statue is tall. Pale
 * soapstone, standing on a mountain above the city.
 */

import { box, disc } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const christRedeemer: Monument = {
  id: 'christ_redeemer',
  label: 'Christ the Redeemer',
  emoji: '🙌',
  place: 'Rio de Janeiro, Brazil',
  width: 25,
  depth: 15,
  height: 26,
  blurb: 'Standing on the mountain with his arms open over the whole city!',
  draw,
};

function draw(m: MonumentDraw): void {
  const stone = m.ctx.color ?? m.kit.white;
  const { cobble, grass } = m.kit;
  // Corcovado: a rocky hill for him to stand on, green at the bottom.
  for (let dy = 0; dy <= 4; dy++) {
    const r = 8 - dy;
    disc(m, m.cx, m.g + dy, m.cz, r, dy < 2 ? grass : cobble);
    for (let h = 1; h <= 3; h++) disc(m, m.cx, m.g + dy + h, m.cz, Math.max(0, r - 3), 0);
  }
  const base = m.g + 5;
  // The square pedestal, a bit over a quarter of his height.
  box(m, m.cx - 2, base, m.cz - 2, m.cx + 2, base + 4, m.cz + 2, cobble);
  const feet = base + 5;
  const headY = feet + 16; // the figure itself, 30 m of the 38 m total
  // Robe: a column that widens at the hem, narrowing to the shoulders.
  for (let y = feet; y < headY - 3; y++) {
    const t = (y - feet) / (headY - 3 - feet);
    const r = t < 0.25 ? 3 : t > 0.8 ? 1 : 2;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (Math.abs(dx) === r && Math.abs(dz) === 1) continue;
        m.put(m.cx + dx, y, m.cz + dz, stone);
      }
    }
  }
  // The arms: straight out, level, nearly the width of the whole monument.
  const shoulders = headY - 4;
  const reach = Math.floor(m.w / 2) - 2;
  for (let dx = -reach; dx <= reach; dx++) {
    m.put(m.cx + dx, shoulders, m.cz, stone);
    // The sleeves of the robe hang a little below the arms.
    if (Math.abs(dx) > 2 && Math.abs(dx) < reach - 1) m.put(m.cx + dx, shoulders - 1, m.cz, stone);
  }
  // Head and shoulders.
  box(m, m.cx - 1, shoulders + 1, m.cz - 1, m.cx + 1, shoulders + 1, m.cz + 1, stone);
  box(m, m.cx - 1, shoulders + 2, m.cz - 1, m.cx + 1, headY, m.cz + 1, stone);
  m.put(m.cx, headY + 1, m.cz, stone);
}
