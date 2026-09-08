/**
 * The Wire Opera House sits in the Pedreira — an old quarry. A round shell
 * of steel tubes and glass stands on an island in a spring-fed lake, with
 * rock walls rising behind it and a walkway that turns arriving into an
 * entrance.
 */

import { disc } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const wireOpera: Monument = {
  id: 'wire_opera',
  label: 'Wire Opera House',
  emoji: '🎭',
  place: 'Curitiba, Brazil',
  width: 25,
  depth: 23,
  height: 13,
  blurb: 'A ring of glass and tubes on a lake, with a quarry wall behind it!',
  draw,
};

function draw(m: MonumentDraw): void {
  const frame = m.ctx.color ?? m.kit.red;
  const { glass, water, stone, planks, fence, grass, leaves } = m.kit;

  // The quarry: rock walls around the back and sides, green along the top.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      const toEdge = Math.min(x - m.x0, m.x1 - x, z - m.z0);
      if (toEdge <= 2 && z < m.z1 - 3) {
        const height = 8 - toEdge * 3;
        for (let y = m.g; y <= m.g + height; y++) m.put(x, y, z, stone);
        m.put(x, m.g + height, z, (x + z) % 3 === 0 ? grass : stone);
        if ((x + z) % 5 === 0) m.put(x, m.g + height + 1, z, leaves);
        continue;
      }
      // The lake it stands in.
      m.put(x, m.g - 1, z, stone);
      m.put(x, m.g, z, water);
      for (let h = 1; h <= 8; h++) m.put(x, m.g + h, z, 0);
    }
  }

  // The island under the hall.
  disc(m, m.cx, m.g, m.cz, 8, stone);
  disc(m, m.cx, m.g + 1, m.cz, 7, stone);

  // A round shell: arcs of tube rising from the ring to a hoop on top, with
  // glass between every other rib so you can see the music happening inside.
  const radius = 7;
  const rise = 9;
  for (let step = 0; step < 20; step++) {
    const around = (Math.PI * 2 * step) / 20;
    const rib = step % 2 === 0;
    for (let a = 0; a <= 12; a++) {
      const up = (Math.PI / 2) * (a / 12);
      const ring = Math.round(Math.cos(up) * radius);
      const dy = Math.round(Math.sin(up) * rise);
      const x = m.cx + Math.round(Math.cos(around) * ring);
      const z = m.cz + Math.round(Math.sin(around) * ring);
      if (!rib && dy < 2) continue; // leave the ground floor open, as it is
      m.put(x, m.g + 2 + dy, z, rib ? frame : glass);
    }
    m.put(m.cx + Math.round(Math.cos(around) * radius), m.g + 2, m.cz + Math.round(Math.sin(around) * radius), frame);
    m.put(m.cx + Math.round(Math.cos(around) * 2), m.g + 2 + rise, m.cz + Math.round(Math.sin(around) * 2), frame);
  }

  // Seats facing a stage, under the shell.
  for (let dz = -4; dz <= 4; dz++) {
    for (let dx = -4; dx <= 4; dx++) {
      if (dx * dx + dz * dz > 20) continue;
      m.put(m.cx + dx, m.g + 2, m.cz + dz, dz < -1 ? planks : m.kit.slab);
    }
  }

  // The walkway in, over the water.
  for (let z = m.cz + 8; z <= m.z1; z++) {
    for (const dx of [-1, 0]) {
      m.put(m.cx + dx, m.g + 2, z, planks);
      for (let h = 1; h <= 4; h++) m.put(m.cx + dx, m.g + 2 + h, z, 0);
    }
    m.put(m.cx - 2, m.g + 3, z, fence);
    m.put(m.cx + 1, m.g + 3, z, fence);
  }
}
