/**
 * Science World: a geodesic sphere of steel triangles on the edge of the
 * water, lit up at night. A whole ball, not a dome sitting on the ground.
 */

import { disc, plaza } from './shapes';
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
  real: {
    height: 47,
    width: 47,
    depth: 47,
    source: 'Science World: geodesic sphere about 47 m across',
  },
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
    // The shell is a frame, not a skin: twelve meridian struts, a ring every
    // third course, the diagonals that close each triangle, and glass in
    // between. Buckminster Fuller's geodesic, as close as blocks allow.
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (Math.abs(Math.hypot(dx, dz) - r) > 0.5) continue;
        const segment = (Math.atan2(dz, dx) * 6) / Math.PI;
        const meridian = Math.abs(segment - Math.round(segment)) < 0.16;
        const ring = dy % 3 === 0;
        const diagonal = (Math.round(segment) + Math.round(dy / 3)) % 3 === 0 && Math.abs(segment - Math.round(segment)) < 0.4;
        const strut = meridian || ring || diagonal;
        m.put(m.cx + dx, centreY + dy, m.cz + dz, strut ? shell : m.kit.glass);
        // A light at every node, which is why it glows at night.
        if (meridian && ring && m.kit.lamp !== null) m.put(m.cx + dx, centreY + dy, m.cz + dz, m.kit.lamp);
      }
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
