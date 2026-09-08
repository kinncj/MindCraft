/**
 * Sugarloaf Mountain: a bare granite dome standing out of the sea at the
 * mouth of Guanabara Bay, with the cable car running up to the top.
 */

import { disc } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const sugarloaf: Monument = {
  id: 'sugarloaf',
  label: 'Sugarloaf Mountain',
  emoji: '🚡',
  place: 'Rio de Janeiro, Brazil',
  width: 25,
  depth: 21,
  height: 20,
  blurb: 'A big round rock out of the sea, with a cable car up the side!',
  real: {
    height: 396,
    width: 600,
    depth: 500,
    landscape: true,
    source: 'Sugarloaf Mountain: 396 m of granite above the bay',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const rock = m.ctx.color ?? m.kit.stone;
  const { water, grass, wood, fence, planks } = m.kit;
  // The bay it rises out of.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      m.put(x, m.g - 1, z, m.kit.sand);
      m.put(x, m.g, z, water);
      for (let h = 1; h <= 6; h++) m.put(x, m.g + h, z, 0);
    }
  }
  // The loaf: steep sides, rounded top, greener at the waterline.
  const peak = 18;
  const px = m.cx + 4;
  for (let y = 0; y <= peak; y++) {
    const t = y / peak;
    const r = Math.max(1, Math.round(7 * Math.cos((Math.PI / 2) * t ** 1.6)));
    disc(m, px, m.g + y, m.cz, r, y < 2 ? grass : rock);
    for (let h = 1; h <= 3; h++) disc(m, px, m.g + y + h, m.cz, Math.max(0, r - 2), 0);
  }
  // The smaller hill the cable car starts from, and the cable between them.
  const sx = m.x0 + 4;
  for (let y = 0; y <= 8; y++) {
    const r = Math.max(1, 4 - Math.round(y / 2));
    disc(m, sx, m.g + y, m.cz, r, y < 2 ? grass : rock);
  }
  for (let h = 1; h <= 3; h++) m.put(sx, m.g + 9 + h, m.cz, fence);
  for (let x = sx; x <= px - 2; x++) {
    const t = (x - sx) / Math.max(1, px - 2 - sx);
    m.put(x, m.g + 12 + Math.round(t * 6), m.cz, wood);
  }
  // A little cable car hanging on the wire, halfway across.
  const carX = Math.round((sx + px) / 2);
  const carY = m.g + 12 + Math.round(((carX - sx) / Math.max(1, px - 2 - sx)) * 6) - 1;
  for (let dx = -1; dx <= 1; dx++) m.put(carX + dx, carY, m.cz, planks);
}
