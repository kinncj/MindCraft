/**
 * Science World: a geodesic sphere of steel triangles on the edge of the
 * water, lit up at night. A whole ball, not a dome sitting on the ground.
 */

import { circle, disc, plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const scienceWorld: Monument = {
  id: 'science_world',
  label: 'Science World',
  emoji: '🔮',
  place: 'Vancouver, Canada',
  width: 21,
  depth: 21,
  height: 20,
  blurb: 'A giant silver ball made of triangles, with lights all over it!',
  draw,
};

function draw(m: MonumentDraw): void {
  const shell = m.ctx.color ?? m.kit.white;
  const radius = Math.floor(Math.min(m.w, m.d) / 2) - 2;
  plaza(m, m.kit.cobble);
  // A ball resting on a low plinth: rings whose width follows the sphere.
  const centreY = m.g + radius + 2;
  for (let dy = -radius; dy <= radius; dy++) {
    const r = Math.round(Math.sqrt(Math.max(0, radius * radius - dy * dy)));
    if (r <= 0) {
      m.put(m.cx, centreY + dy, m.cz, shell);
      continue;
    }
    circle(m, m.cx, centreY + dy, m.cz, r, shell);
    // The struts that make it read as triangles rather than a smooth ball.
    if (m.kit.lamp !== null && dy % 3 === 0) {
      m.put(m.cx + r, centreY + dy, m.cz, m.kit.lamp);
      m.put(m.cx - r, centreY + dy, m.cz, m.kit.lamp);
    }
  }
  // The plinth and the doorway in.
  disc(m, m.cx, m.g, m.cz, radius, m.kit.stone);
  disc(m, m.cx, m.g + 1, m.cz, radius - 1, m.kit.stone);
  for (let h = 1; h <= 3; h++) {
    m.put(m.cx, m.g + 1 + h, m.cz + radius - 1, 0);
    m.put(m.cx + 1, m.g + 1 + h, m.cz + radius - 1, 0);
  }
}
