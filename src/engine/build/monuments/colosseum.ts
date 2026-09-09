/**
 * The Colosseum: an ellipse 189 m by 156 m and 48 m high, three storeys of
 * arcades — eighty arches to a ring — under a plain attic storey, with the
 * north side still standing tall and the south side fallen away.
 */

import type { Monument, MonumentDraw } from './types';

export const colosseum: Monument = {
  id: 'colosseum',
  label: 'Colosseum',
  emoji: '🏛️',
  place: 'Rome, Italy',
  width: 31,
  depth: 27,
  height: 10,
  blurb: 'The great round arena of Rome, arch upon arch!',
  real: {
    height: 48,
    width: 189,
    depth: 156,
    levels: { firstArcade: 10.5, secondArcade: 21, thirdArcade: 32, attic: 48 },
    source: 'Colosseum: 189 m by 156 m, 48 m high, three arcades and an attic',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const travertine = m.ctx.color ?? m.kit.yellow;
  const { sand, cobble, stone } = m.kit;
  const a = Math.floor(m.w / 2) - 1;
  const b = Math.floor(m.d / 2) - 1;
  const top = m.g + m.up(48);
  // The arena floor and the sand, inside the ring of seating.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      const dx = (x - m.cx) / a;
      const dz = (z - m.cz) / b;
      const r = dx * dx + dz * dz;
      m.put(x, m.g, z, r < 0.35 ? sand : cobble);
      for (let h = 1; h <= 10; h++) m.put(x, m.g + h, z, 0);
      // The hypogeum: the passages under the arena floor, in stone. Two of
      // them, so most of what you see is still the sand of the arena.
      if (r < 0.35 && Math.abs(Math.abs(x - m.cx) - 3) < 1) m.put(x, m.g, z, stone);
    }
  }
  // Three arcades and an attic. Each arcade is two courses: the opening, then
  // the heads of its arches — cut right through the wall, so from outside you
  // look straight into the next ring, which is what the Colosseum looks like.
  const storeys = [10.5, 21, 32];
  for (let y = m.g + 1; y <= top; y++) {
    const metres = (y - m.g) / m.scale;
    const arcade = storeys.findIndex((h, i) => metres > (i === 0 ? 0 : storeys[i - 1]) && metres <= h);
    const head = arcade >= 0 && metres > storeys[arcade] - 5.5;
    for (let x = m.x0; x <= m.x1; x++) {
      for (let z = m.z0; z <= m.z1; z++) {
        const dx = (x - m.cx) / a;
        const dz = (z - m.cz) / b;
        const r = Math.sqrt(dx * dx + dz * dz);
        if (r > 1 || r < 0.78) continue;
        // The south side is a ruin: the outer wall there fell long ago.
        const angle = Math.atan2(z - m.cz, x - m.cx);
        if (angle > 0.6 && angle < 2.4 && metres > 21) continue;
        // Twenty-four bays round the ring, a pier and an opening alternating.
        const bay = Math.round((angle / Math.PI) * 12);
        const open = arcade >= 0 && !head && bay % 2 === 0;
        m.put(x, y, z, open ? 0 : travertine);
      }
    }
  }
  // The tiers of seating, stepping down to the arena.
  for (let step = 0; step < 4; step++) {
    const y = m.g + 1 + step;
    for (let x = m.x0; x <= m.x1; x++) {
      for (let z = m.z0; z <= m.z1; z++) {
        const dx = (x - m.cx) / a;
        const dz = (z - m.cz) / b;
        const r = Math.sqrt(dx * dx + dz * dz);
        if (r < 0.36 + step * 0.09 || r > 0.45 + step * 0.09) continue;
        m.put(x, y, z, stone);
      }
    }
  }
}
