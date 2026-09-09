/**
 * The Sydney Opera House: 183 m of podium along the harbour with the shells
 * rising off it in two rows, the tallest 67 m above the water, clad in a
 * million white tiles. The shells are sections of one sphere, which is what
 * lets them all be the same curve at different sizes.
 */

import { box } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const operaHouse: Monument = {
  id: 'opera_house',
  label: 'Sydney Opera House',
  emoji: '🎭',
  place: 'Sydney, Australia',
  width: 33,
  depth: 21,
  height: 12,
  blurb: 'White sails on the harbour, like a ship that stayed!',
  real: {
    height: 67,
    width: 183,
    depth: 120,
    levels: { podium: 15, tallestShell: 67 },
    source: 'Sydney Opera House: 183 m long, 120 m wide, tallest shell 67 m',
  },
  draw,
};

/** One shell: a quarter-sphere sliced to a sail, leaning the way the roof does. */
function shell(m: MonumentDraw, cx: number, base: number, cz: number, height: number, white: number, glass: number): void {
  // A shell drawn off the end of the point is not a shell, it is a mess.
  const put = (x: number, y: number, z: number, id: number): void => {
    if (x < m.x0 || x > m.x1 || z < m.z0 || z > m.z1) return;
    m.put(x, y, z, id);
  };
  for (let dy = 0; dy <= height; dy++) {
    const t = dy / Math.max(1, height);
    // The curve: wide at the foot, drawn to a ridge at the top.
    const r = Math.max(0, Math.round((1 - t * t) * (height * 0.62)));
    for (let dz = -r; dz <= r; dz++) {
      const rise = Math.round(Math.sqrt(Math.max(0, r * r - dz * dz)));
      // The shell is a skin: only the outer course, so it reads as a sail.
      put(cx + rise, base + dy, cz + dz, white);
      put(cx - rise, base + dy, cz + dz, white);
      if (dy === 0 && Math.abs(dz) < r) {
        // Glass under the open end, the way the foyers are glazed.
        for (let x = -rise + 1; x < rise; x++) put(cx + x, base, cz + dz, glass);
      }
    }
  }
}

function draw(m: MonumentDraw): void {
  const white = m.ctx.color ?? m.kit.white;
  const { water, cobble, glass, stone } = m.kit;
  // Bennelong Point: the harbour on three sides, the podium on the point.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      m.put(x, m.g - 1, z, cobble);
      m.put(x, m.g, z, water);
      for (let h = 1; h <= 12; h++) m.put(x, m.g + h, z, 0);
    }
  }
  const px0 = m.x0 + 2;
  const px1 = m.x1 - 2;
  const pz0 = m.cz - Math.floor(m.d / 4);
  const pz1 = m.cz + Math.floor(m.d / 4);
  // The podium, with its broad flight of steps at the land end.
  const podium = m.g + Math.max(1, m.up(15));
  box(m, px0, m.g, pz0, px1, podium, pz1, stone);
  for (let i = 0; i <= podium - m.g; i++) {
    const sx = px0 - 1 - i;
    if (sx < m.x0) break;
    for (let z = pz0; z <= pz1; z++) m.put(sx, podium - i, z, stone);
  }
  // The shells: the big row over the concert hall, a smaller row behind, and
  // the little one on its own that is the restaurant.
  const step = Math.max(3, Math.floor((px1 - px0) / 5));
  const heights = [m.up(67) - m.up(15), m.up(56) - m.up(15), m.up(45) - m.up(15)];
  heights.forEach((h, i) => {
    shell(m, px1 - 3 - i * step, podium + 1, m.cz - 2, Math.max(3, h), white, glass);
    shell(m, px1 - 5 - i * step, podium + 1, m.cz + 4, Math.max(2, h - 2), white, glass);
  });
}
