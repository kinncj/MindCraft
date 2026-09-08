/** A white wedge with a red ramp curling out of the front. */

import { plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const ibirapuera: Monument = {
  id: 'ibirapuera',
  label: 'Ibirapuera Auditorium',
  emoji: '🎵',
  place: 'São Paulo, Brazil',
  width: 19,
  depth: 17,
  height: 13,
  blurb: 'A white wedge with a big red tongue!',
  draw,
};

function draw(m: MonumentDraw): void {
  const { white } = m.kit;
  const tongue = m.ctx.color ?? m.kit.red;
  plaza(m, m.kit.cobble);
  const half = Math.floor(m.w / 2) - 2;
  const depth = Math.floor(m.d / 2) - 2;
  for (let dx = -half; dx <= half; dx++) {
    for (let dz = -depth; dz <= depth; dz++) {
      // A wedge: tall at the back, sloping down to the front.
      const height = Math.max(2, Math.round((1 - (dz + depth) / (depth * 2)) * (13 - 2)));
      for (let y = 1; y <= height; y++) {
        const shell = Math.abs(dx) === half || dz === -depth || y === height;
        m.put(m.cx + dx, m.g + y, m.cz + dz, shell ? white : 0);
      }
      m.put(m.cx + dx, m.g, m.cz + dz, white);
    }
  }
  // The tongue: a red ramp curving out of the entrance, stopping at the edge
  // of the monument's own ground rather than sprawling into the next one.
  for (let i = 0; i <= 5; i++) {
    const z = m.cz + depth + i;
    if (z > m.z1) break;
    for (let dx = -2; dx <= 2; dx++) m.put(m.cx + dx, Math.max(m.g + 1, m.g + 4 - i), z, tongue);
  }
}
