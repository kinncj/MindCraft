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
  height: 30,
  blurb: 'Standing on the mountain with his arms open over the whole city!',
  real: {
    // The summit rock counts: he is 30 m of figure on an 8 m pedestal, and the
    // outcrop of Corcovado under him is what he is standing on.
    height: 50,
    width: 60,
    depth: 40,
    levels: { outcrop: 12, pedestal: 8, figure: 30, armSpan: 28 },
    landscape: true,
    source: 'Christ the Redeemer: 30 m figure, 8 m pedestal, 28 m arm span, on Corcovado',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const stone = m.ctx.color ?? m.kit.white;
  const { cobble, grass } = m.kit;
  // Corcovado: the summit rock he stands on, twelve metres of it, green below.
  const outcrop = m.up(12);
  for (let dy = 0; dy <= outcrop; dy++) {
    const reach = Math.floor(Math.min(m.w, m.d) / 2) - 1;
    const r = Math.max(2, Math.round((1 - dy / (outcrop + 1)) * reach));
    disc(m, m.cx, m.g + dy, m.cz, r, dy < outcrop / 3 ? grass : cobble);
    for (let h = 1; h <= 3; h++) disc(m, m.cx, m.g + dy + h, m.cz, Math.max(0, r - 3), 0);
  }
  const base = m.g + outcrop;
  // An 8 m pedestal under a 30 m figure, and the arms reach 28 m tip to tip.
  box(m, m.cx - 2, base, m.cz - 2, m.cx + 2, base + m.up(8), m.cz + 2, cobble);
  const feet = base + m.up(8) + 1;
  const headY = feet + m.up(30);
  // The arms come off at 26 m of the 30 m figure — high, which is why the
  // silhouette reads as a cross from far away — leaving a small head above.
  const shoulders = feet + m.up(26);
  // Robe: a column that widens at the hem, narrowing to the shoulders.
  for (let y = feet; y < shoulders; y++) {
    const t = (y - feet) / Math.max(1, shoulders - feet);
    // The robe falls wide at the hem and draws in towards the shoulders.
    const r = t < 0.2 ? 3 : t < 0.55 ? 2 : 1;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (Math.abs(dx) === r && Math.abs(dz) === 1) continue;
        m.put(m.cx + dx, y, m.cz + dz, stone);
      }
    }
  }
  const reach = Math.min(Math.floor(m.w / 2) - 2, Math.round(m.across(28) / 2));
  for (let dx = -reach; dx <= reach; dx++) {
    m.put(m.cx + dx, shoulders, m.cz, stone);
    // The sleeves of the robe hang a little below the arms.
    if (Math.abs(dx) > 2 && Math.abs(dx) < reach - 1) m.put(m.cx + dx, shoulders - 1, m.cz, stone);
  }
  // Head and shoulders: a head is about a tenth of him, not a quarter.
  box(m, m.cx - 1, shoulders + 1, m.cz - 1, m.cx + 1, shoulders + 1, m.cz + 1, stone);
  box(m, m.cx, shoulders + 2, m.cz, m.cx, headY, m.cz, stone);
  box(m, m.cx - 1, shoulders + 2, m.cz - 1, m.cx + 1, headY - 1, m.cz + 1, stone);
}
