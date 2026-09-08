/** A great eye of glass in a coloured frame, up on a stem, over a pool. */

import { box, plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const niemeyerEye: Monument = {
  id: 'niemeyer_eye',
  label: 'The Eye Museum',
  emoji: '👁️',
  place: 'Curitiba, Brazil',
  width: 21,
  depth: 15,
  height: 20,
  blurb: 'A giant yellow eye on a stem, looking at the park!',
  draw,
};

function draw(m: MonumentDraw): void {
  const frame = m.ctx.color ?? m.kit.yellow;
  const { white, glass, water } = m.kit;
  plaza(m, white);
  // Reflecting pool in front.
  for (let x = m.cx - 6; x <= m.cx + 6; x++) {
    for (let z = m.z1 - 3; z <= m.z1; z++) {
      m.put(x, m.g, z, water);
      m.put(x, m.g - 1, z, white);
    }
  }
  // The stem.
  box(m, m.cx - 3, m.g + 1, m.cz - 1, m.cx + 3, m.g + 8, m.cz + 1, white);
  // The eye: an ellipse standing up, framed, glazed, three blocks thick.
  const ey = m.g + 14;
  const rx = Math.min(9, Math.floor(m.w / 2) - 1);
  const ry = 5;
  for (let dx = -rx; dx <= rx; dx++) {
    for (let dy = -ry; dy <= ry; dy++) {
      const value = (dx / rx) ** 2 + (dy / ry) ** 2;
      if (value > 1.05) continue;
      const onFrame = value > 0.72;
      for (let dz = -1; dz <= 1; dz++) {
        const id = onFrame ? frame : dz === 0 ? glass : 0;
        if (onFrame || dz === 0) m.put(m.cx + dx, ey + dy, m.cz + dz, id);
      }
    }
  }
  // The pupil, so it really reads as an eye.
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) m.put(m.cx + dx, ey + dy, m.cz, m.kit.black);
}
