/**
 * The Great Pyramid of Giza: 230 m along each side, 147 m tall when it was
 * finished, its faces at a little under 52 degrees, with the Sphinx keeping
 * watch in front of it and the last of the smooth casing at the very top.
 */

import type { Monument, MonumentDraw } from './types';

export const pyramid: Monument = {
  id: 'pyramid',
  label: 'Great Pyramid',
  emoji: '🔺',
  place: 'Giza, Egypt',
  width: 37,
  depth: 37,
  height: 24,
  blurb: 'The Great Pyramid, with the Sphinx out in front!',
  real: {
    height: 147,
    width: 230,
    depth: 230,
    levels: { kingsChamber: 43, apex: 147 },
    source: 'Great Pyramid of Giza: 230 m base, 147 m tall, faces at 51.8 degrees',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const limestone = m.ctx.color ?? m.kit.sand;
  const { sand, white, stone } = m.kit;
  // The desert it stands in.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      m.put(x, m.g, z, sand);
      for (let h = 1; h <= 5; h++) m.put(x, m.g + h, z, 0); // clear the bumps and trees, not the sky
    }
  }
  const half = Math.floor(m.w / 2) - 2;
  const apex = m.g + m.up(147);
  // Each course steps in by the same amount, which is what gives 51.8 degrees:
  // 230 m of base against 147 m of height is very nearly two steps in per one up.
  for (let y = m.g + 1; y <= apex; y++) {
    const t = (y - m.g) / (apex - m.g);
    const r = Math.round(half * (1 - t));
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        // Hollow inside except near the top: a pyramid of solid blocks is a
        // waste, and the shell is what anyone ever sees.
        const shell = Math.abs(dx) >= r - 1 || Math.abs(dz) >= r - 1 || r <= 2;
        // The last courses kept their polished casing.
        m.put(m.cx + dx, y, m.cz + dz, shell ? (t > 0.88 ? white : limestone) : 0);
      }
    }
  }
  // The entrance on the north face, and the passage sloping up inside it.
  for (let i = 0; i <= 3; i++) {
    m.put(m.cx, m.g + 1 + i, m.cz - half + i, 0);
    m.put(m.cx, m.g + 2 + i, m.cz - half + i, 0);
  }
  // The Sphinx: a crouching body with a head, out in front and facing east.
  const sx = m.cx - half - 4;
  if (sx > m.x0) {
    for (let i = 0; i < 6; i++) for (let h = 1; h <= 2; h++) m.put(sx + i, m.g + h, m.cz, limestone);
    for (let h = 1; h <= 4; h++) m.put(sx, m.g + h, m.cz, limestone);
    m.put(sx, m.g + 5, m.cz, stone); // the headdress
    m.put(sx - 1, m.g + 4, m.cz, limestone); // the face, looking out
    for (const dz of [-1, 1]) for (let i = 0; i < 4; i++) m.put(sx + i, m.g + 1, m.cz + dz, limestone);
  }
}
