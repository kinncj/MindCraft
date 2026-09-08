/** A tube of glass and wire over a lake, with a bridge in. */

import type { Monument, MonumentDraw } from './types';

export const wireOpera: Monument = {
  id: 'wire_opera',
  label: 'Wire Opera House',
  emoji: '🎭',
  place: 'Curitiba, Brazil',
  width: 19,
  depth: 17,
  height: 13,
  blurb: 'A glass tube of music in the middle of a lake!',
  draw,
};

function draw(m: MonumentDraw): void {
  const { glass, water, fence, stone } = m.kit;
  const frame = m.ctx.color ?? m.kit.red;
  // The lake it sits in.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      m.put(x, m.g - 1, z, stone);
      m.put(x, m.g, z, water);
      for (let h = 1; h <= 4; h++) m.put(x, m.g + h, z, 0);
    }
  }
  // A stone island under the hall.
  for (let x = m.cx - 6; x <= m.cx + 6; x++) for (let z = m.cz - 4; z <= m.cz + 4; z++) m.put(x, m.g, z, stone);
  // A round shell of steel tubes with glass between them: arcs of tube run
  // from the ring at the bottom up and over, meeting at a hoop on top.
  const radius = 6;
  const rise = 7;
  for (let step = 0; step < 16; step++) {
    const around = (Math.PI * 2 * step) / 16;
    const rib = step % 2 === 0;
    for (let a = 0; a <= 10; a++) {
      const up = (Math.PI / 2) * (a / 10);
      const ring = Math.round(Math.cos(up) * radius);
      const dy = Math.round(Math.sin(up) * rise);
      const x = m.cx + Math.round(Math.cos(around) * ring);
      const z = m.cz + Math.round(Math.sin(around) * ring * 0.7);
      m.put(x, m.g + 1 + dy, z, rib ? frame : glass);
    }
  }
  // The hoop the tubes meet at, and the ring they spring from.
  for (let step = 0; step < 16; step++) {
    const around = (Math.PI * 2 * step) / 16;
    m.put(m.cx + Math.round(Math.cos(around) * 2), m.g + 1 + rise, m.cz + Math.round(Math.sin(around) * 2), frame);
    m.put(m.cx + Math.round(Math.cos(around) * radius), m.g + 1, m.cz + Math.round(Math.sin(around) * radius * 0.7), frame);
  }
  // Seats and a stage inside.
  for (let x = m.cx - 4; x <= m.cx + 4; x++) for (let z = m.cz - 2; z <= m.cz + 2; z++) m.put(x, m.g + 1, z, z <= m.cz - 1 ? m.kit.planks : m.kit.slab);
  // The bridge across the water.
  for (let z = m.cz + 5; z <= m.z1; z++) {
    m.put(m.cx, m.g + 1, z, m.kit.planks);
    m.put(m.cx - 1, m.g + 1, z, m.kit.planks);
    m.put(m.cx + 1, m.g + 2, z, fence);
    m.put(m.cx - 2, m.g + 2, z, fence);
    for (let h = 2; h <= 4; h++) m.put(m.cx, m.g + h, z, 0);
  }
}
