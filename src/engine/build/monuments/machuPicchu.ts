/**
 * Machu Picchu: an Inca town on a saddle between two peaks, its houses of
 * fitted granite along the ridge, the agricultural terraces stepping down the
 * mountainside below it, and Huayna Picchu standing over the far end.
 */

import type { Monument, MonumentDraw } from './types';

export const machuPicchu: Monument = {
  id: 'machu_picchu',
  label: 'Machu Picchu',
  emoji: '⛰️',
  place: 'Cusco, Peru',
  width: 35,
  depth: 29,
  height: 16,
  blurb: 'A stone town high on a mountain, with steps all the way down!',
  real: {
    height: 300,
    width: 530,
    depth: 300,
    levels: { terraces: 80, town: 160, huaynaPicchu: 300 },
    landscape: true,
    source: 'Machu Picchu: a 530 m site on a saddle, terraces below, Huayna Picchu above',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const granite = m.ctx.color ?? m.kit.stone;
  const { grass, dirt, cobble, wood, leaves } = m.kit;
  const ridgeY = 9;
  /** How high the mountain stands at a spot: high at the back, terraced down
   *  the near side in courses, and falling away at both ends of the saddle. */
  const terrace = (x: number, z: number): number => {
    const across = (z - m.z0) / Math.max(1, m.d - 1); // 0 at the back, 1 at the front
    const along = Math.abs(x - m.cx) / Math.max(1, m.w / 2);
    const slope = (1 - across) * ridgeY - along * 3;
    return Math.max(0, Math.round(Math.round(slope / 1.6) * 1.6));
  };
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      const across = (z - m.z0) / Math.max(1, m.d - 1);
      const height = terrace(x, z);
      for (let y = 1; y <= height; y++) m.put(x, m.g + y, z, y === height ? (across > 0.45 ? grass : cobble) : dirt);
      for (let h = height + 1; h <= 18; h++) m.put(x, m.g + h, z, 0);
      // Where the next course towards the front is lower, that face is the
      // granite retaining wall the Inca built to hold the soil in.
      if (height > 0 && terrace(x, z + 1) < height) m.put(x, m.g + height, z, granite);
    }
  }
  // The Inca staircase: the terraces themselves step two blocks in places and
  // no child can climb that, so one flight of single steps runs up the middle,
  // which is how anyone actually gets up there.
  // Along the flank, clear of the houses, the temple and the peak behind.
  const stairX = m.x0 + 1;
  for (let z = m.z1; z >= m.z0; z--) {
    const across = (z - m.z0) / Math.max(1, m.d - 1);
    const step = Math.max(0, Math.round((1 - across) * ridgeY));
    for (const dx of [0, 1]) {
      for (let y = 1; y <= step; y++) m.put(stairX + dx, m.g + y, z, y === step ? cobble : granite);
      for (let h = step + 1; h <= step + 4; h++) m.put(stairX + dx, m.g + h, z, 0);
    }
  }

  // The town along the ridge: rows of little houses with thatched gables.
  const townZ = m.z0 + Math.round(m.d * 0.22);
  for (let i = 0; i < 6; i++) {
    const hx = m.x0 + 4 + i * Math.max(3, Math.floor((m.w - 8) / 6));
    if (hx + 2 > m.x1) break;
    const base = m.g + ridgeY - 1;
    for (let dx = 0; dx <= 2; dx++) {
      for (let dz = 0; dz <= 2; dz++) {
        for (let y = 1; y <= 3; y++) {
          const wall = dx === 0 || dx === 2 || dz === 0 || dz === 2;
          const door = dz === 2 && dx === 1 && y <= 2;
          m.put(hx + dx, base + y, townZ + dz, wall && !door ? granite : 0);
        }
        m.put(hx + dx, base + 4, townZ + dz, wood); // the thatch
      }
    }
  }
  // The Temple of the Sun: the one round wall on the whole site.
  const tx = m.cx;
  const tz = townZ + 6;
  for (let a = 0; a < 360; a += 20) {
    const angle = (a / 180) * Math.PI;
    if (a > 200 && a < 260) continue; // its doorway
    const x = tx + Math.round(Math.cos(angle) * 3);
    const z = tz + Math.round(Math.sin(angle) * 3);
    for (let y = 1; y <= 3; y++) m.put(x, m.g + ridgeY - 2 + y, z, granite);
  }
  // Huayna Picchu behind, the peak in every photograph of the place.
  const px = m.x1 - 6;
  const pz = m.z0 + 2;
  for (let y = 1; y <= 8; y++) {
    const r = Math.max(0, 5 - Math.floor(y / 1.6));
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        if (dx * dx + dz * dz > r * r) continue;
        const x = px + dx;
        const z = pz + dz;
        if (x < m.x0 || x > m.x1 || z < m.z0 || z > m.z1) continue;
        m.put(x, m.g + ridgeY + y, z, y > 6 ? granite : y % 3 === 0 ? leaves : granite);
      }
    }
  }
}
