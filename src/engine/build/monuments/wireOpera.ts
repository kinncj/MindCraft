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
  // The barrel vault: ribs of wire with glass between them.
  for (let x = m.cx - 6; x <= m.cx + 6; x++) {
    const rib = (x - m.cx) % 3 === 0;
    for (let a = 0; a <= 12; a++) {
      const angle = (Math.PI * a) / 12;
      const dz = Math.round(Math.cos(angle) * 4);
      const dy = Math.round(Math.sin(angle) * 6);
      m.put(x, m.g + 1 + dy, m.cz + dz, rib ? frame : glass);
    }
    m.put(x, m.g + 1, m.cz - 4, frame);
    m.put(x, m.g + 1, m.cz + 4, frame);
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
