/**
 * The Taj Mahal: white marble on a 95 m platform, the great dome 73 m to the
 * top of its finial, four minarets of 40 m leaning very slightly outward, and
 * the long reflecting pool running away from the front of it.
 */

import { box } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const tajMahal: Monument = {
  id: 'taj_mahal',
  label: 'Taj Mahal',
  emoji: '🕌',
  place: 'Agra, India',
  width: 33,
  depth: 33,
  height: 20,
  blurb: 'White marble with a great round dome, and a pool in front!',
  real: {
    height: 73,
    width: 95,
    depth: 95,
    levels: { plinth: 7, roof: 40, domeTop: 73, minaret: 40 },
    source: 'Taj Mahal: 73 m to the finial on a 95 m plinth, minarets of 40 m',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const marble = m.ctx.color ?? m.kit.white;
  const { water, red, cobble, grass, glass } = m.kit;
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      m.put(x, m.g, z, grass);
      for (let h = 1; h <= 5; h++) m.put(x, m.g + h, z, 0); // clear the bumps and trees, not the sky
    }
  }
  // The reflecting pool, running down the garden from the front.
  for (let z = m.cz + 6; z <= m.z1 - 1; z++) {
    for (let dx = -1; dx <= 1; dx++) {
      m.put(m.cx + dx, m.g, z, water);
      m.put(m.cx + dx - 2, m.g, z, cobble);
      m.put(m.cx + dx + 2, m.g, z, cobble);
    }
  }
  const half = 8;
  const plinth = m.g + Math.max(1, m.up(7));
  // The plinth, with a minaret standing at each of its corners.
  box(m, m.cx - half - 2, m.g + 1, m.cz - half - 2, m.cx + half + 2, plinth, m.cz + half + 2, marble);
  const minaret = m.g + m.up(40);
  for (const dx of [-half - 2, half + 2]) {
    for (const dz of [-half - 2, half + 2]) {
      for (let y = plinth + 1; y <= minaret; y++) m.put(m.cx + dx, y, m.cz + dz, marble);
      m.put(m.cx + dx, minaret + 1, m.cz + dz, marble); // its little cupola
    }
  }
  // The mausoleum itself: a square block with the great arch on each face.
  const roof = m.g + m.up(40);
  for (let y = plinth + 1; y <= roof; y++) {
    for (let dx = -half; dx <= half; dx++) {
      for (let dz = -half; dz <= half; dz++) {
        const edge = Math.abs(dx) === half || Math.abs(dz) === half;
        if (!edge) {
          m.put(m.cx + dx, y, m.cz + dz, 0);
          continue;
        }
        // The iwan: the tall pointed recess in the middle of every face.
        const middle = Math.abs(dx) <= 2 || Math.abs(dz) <= 2;
        const arch = middle && y < roof - 2 && (Math.abs(dx) <= 1 || Math.abs(dz) <= 1);
        m.put(m.cx + dx, y, m.cz + dz, arch ? 0 : y === roof ? red : marble);
      }
    }
  }
  // The four chattris on the roof corners, then the great dome on its drum.
  for (const dx of [-half + 2, half - 2]) {
    for (const dz of [-half + 2, half - 2]) {
      for (let h = 1; h <= 3; h++) m.put(m.cx + dx, roof + h, m.cz + dz, h === 3 ? red : marble);
    }
  }
  const domeTop = m.g + m.up(73);
  const drum = roof + Math.max(1, Math.round((domeTop - roof) * 0.25));
  for (let y = roof + 1; y <= drum; y++) {
    for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) {
      if (dx * dx + dz * dz > 18) continue;
      m.put(m.cx + dx, y, m.cz + dz, Math.abs(dx) === 4 || Math.abs(dz) === 4 ? glass : marble);
    }
  }
  // The onion dome: wide at the shoulder, drawn in to the finial.
  const rise = domeTop - drum;
  for (let i = 1; i <= rise; i++) {
    const t = i / rise;
    const r = Math.max(0, Math.round(4.6 * Math.sin(Math.acos(t * 0.94)) - t * 0.6));
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
      if (dx * dx + dz * dz > r * r + 1) continue;
      m.put(m.cx + dx, drum + i, m.cz + dz, marble);
    }
  }
  m.put(m.cx, domeTop + 1, m.cz, m.kit.yellow); // the gilded finial
}
