/**
 * The Oscar Niemeyer Museum, the "Museu do Olho": a white concrete eye on a
 * yellow-tiled base — the tiles are the part Niemeyer painted himself — with
 * a curving ramp up to it, standing in front of the long low slab of the
 * original museum on its pilotis, over a reflecting pool.
 */

import { box, plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const niemeyerEye: Monument = {
  id: 'niemeyer_eye',
  label: 'The Eye Museum',
  emoji: '👁️',
  place: 'Curitiba, Brazil',
  width: 27,
  depth: 21,
  height: 22,
  blurb: 'A giant white eye on a yellow base, looking out over the park!',
  draw,
};

function draw(m: MonumentDraw): void {
  const shell = m.ctx.color ?? m.kit.white;
  const yellow = m.kit.yellow;
  const { white, glass, water, black, cobble } = m.kit;
  plaza(m, cobble);

  // The original museum behind: a long white slab lifted on pilotis.
  const slabZ = m.z0 + 3;
  for (let x = m.x0 + 2; x <= m.x1 - 2; x++) {
    if ((x - m.x0) % 4 === 0) for (let y = m.g + 1; y <= m.g + 4; y++) m.put(x, y, slabZ, white);
    for (let dz = -1; dz <= 1; dz++) {
      m.put(x, m.g + 5, slabZ + dz, white);
      m.put(x, m.g + 6, slabZ + dz, dz === 0 ? glass : white);
      m.put(x, m.g + 7, slabZ + dz, white);
    }
  }

  // The reflecting pool the eye stands over.
  for (let x = m.cx - 7; x <= m.cx + 7; x++) {
    for (let z = m.z1 - 4; z <= m.z1 - 1; z++) {
      m.put(x, m.g, z, water);
      m.put(x, m.g - 1, z, white);
    }
  }

  // The yellow-tiled base, and the white stem standing on it.
  box(m, m.cx - 5, m.g + 1, m.cz - 3, m.cx + 5, m.g + 3, m.cz + 3, yellow);
  box(m, m.cx - 4, m.g + 4, m.cz - 2, m.cx + 4, m.g + 4, m.cz + 2, yellow);
  box(m, m.cx - 3, m.g + 4, m.cz - 1, m.cx + 3, m.g + 9, m.cz + 1, shell);

  // The ramp: a Niemeyer building always has one, curving as it climbs.
  for (let i = 0; i <= 8; i++) {
    const y = m.g + 1 + Math.floor(i / 2);
    const x = m.cx - 5 - Math.round(Math.sin((i / 8) * Math.PI) * 3);
    m.put(x, y, m.cz + 4 + Math.round(i / 2), shell);
    m.put(x - 1, y, m.cz + 4 + Math.round(i / 2), shell);
  }

  // The eye itself: an ellipse of white concrete, glazed, with a dark pupil.
  const ey = m.g + 15;
  const rx = Math.min(10, Math.floor(m.w / 2) - 2);
  const ry = 5;
  for (let dx = -rx; dx <= rx; dx++) {
    for (let dy = -ry; dy <= ry; dy++) {
      const value = (dx / rx) ** 2 + (dy / ry) ** 2;
      if (value > 1.05) continue;
      const onShell = value > 0.68;
      for (let dz = -2; dz <= 2; dz++) {
        if (onShell) m.put(m.cx + dx, ey + dy, m.cz + dz, shell);
        else if (Math.abs(dz) === 2) m.put(m.cx + dx, ey + dy, m.cz + dz, glass);
      }
    }
  }
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      if (Math.abs(dx) === 2 && dy !== 0) continue;
      m.put(m.cx + dx, ey + dy, m.cz - 2, black);
    }
  }
}
