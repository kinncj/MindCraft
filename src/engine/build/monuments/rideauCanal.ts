/** A straight canal of ice with stone banks, lamps, and a bridge over it. */

import type { Monument, MonumentDraw } from './types';

export const rideauCanal: Monument = {
  id: 'rideau_canal',
  label: 'Rideau Canal',
  emoji: '⛸️',
  place: 'Ottawa, Canada',
  width: 33,
  depth: 13,
  height: 4,
  blurb: 'The longest skating rink in the world!',
  draw,
};

function draw(m: MonumentDraw): void {
  const { stone, ice, fence, lamp, planks } = m.kit;
  const bankZ = 3;
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      const inWater = Math.abs(z - m.cz) <= bankZ;
      if (inWater) {
        m.put(x, m.g - 2, z, stone);
        m.put(x, m.g - 1, z, ice);
        m.put(x, m.g, z, ice);
        for (let h = 1; h <= 4; h++) m.put(x, m.g + h, z, 0);
      } else {
        m.put(x, m.g, z, stone);
        for (let h = 1; h <= 4; h++) m.put(x, m.g + h, z, 0);
        if (Math.abs(z - m.cz) === bankZ + 1) {
          if ((x - m.x0) % 6 === 0 && lamp !== null) {
            m.put(x, m.g + 1, z, fence);
            m.put(x, m.g + 2, z, fence);
            m.put(x, m.g + 3, z, lamp);
          } else if ((x - m.x0) % 6 === 3) {
            m.put(x, m.g + 1, z, m.kit.slab); // a bench to do up your skates on
          } else if ((x - m.x0) % 12 === 6) {
            // A warming hut: the little wooden shelters along the skateway.
            for (let h = 1; h <= 3; h++) {
              for (let dx = 0; dx <= 2; dx++) {
                const wall = h < 3 && (dx === 0 || dx === 2);
                m.put(x + dx, m.g + h, z, h === 3 ? m.kit.red : wall ? m.kit.planks : 0);
              }
            }
          }
        }
      }
    }
  }
  // A little bridge across the middle, walkable end to end.
  for (let z = m.z0; z <= m.z1; z++) {
    for (const x of [m.cx, m.cx + 1]) {
      m.put(x, m.g + 2, z, planks);
      for (let h = 3; h <= 5; h++) m.put(x, m.g + h, z, 0);
    }
    m.put(m.cx - 1, m.g + 3, z, fence);
    m.put(m.cx + 2, m.g + 3, z, fence);
  }
  for (const x of [m.cx, m.cx + 1]) {
    for (let i = 1; i <= 2; i++) {
      m.put(x, m.g + 2 - i, m.cz - bankZ - i, planks);
      m.put(x, m.g + 2 - i, m.cz + bankZ + i, planks);
    }
  }
}
