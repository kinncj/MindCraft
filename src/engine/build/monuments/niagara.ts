/** A horseshoe of water pouring off a cliff into a pool, with a lookout. */

import type { Monument, MonumentDraw } from './types';

export const niagara: Monument = {
  id: 'niagara',
  label: 'Niagara Falls',
  emoji: '💦',
  place: 'Ontario, Canada',
  width: 29,
  depth: 21,
  height: 12,
  blurb: 'A horseshoe of water thundering over the edge!',
  draw,
};

function draw(m: MonumentDraw): void {
  const { stone, water, white, fence } = m.kit;
  const rimZ = m.cz + 2;
  const cliff = m.g + 9;
  const radius = Math.floor(m.w / 2) - 3;
  const inHorseshoe = (x: number, z: number): boolean => {
    const dx = x - m.cx;
    const dz = z - rimZ;
    return dz <= 0 && dx * dx + dz * dz * 2.2 <= radius * radius;
  };
  // The plateau behind the falls, with the horseshoe bitten out of it.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= rimZ; z++) {
      if (inHorseshoe(x, z)) continue;
      for (let y = m.g; y <= cliff; y++) m.put(x, y, z, stone);
      m.put(x, cliff, z, m.kit.grass);
      for (let h = 1; h <= 3; h++) m.put(x, cliff + h, z, 0);
    }
  }
  // The river above, and the sheet of water falling over the edge.
  for (let x = m.x0 + 1; x < m.x1; x++) {
    for (let z = m.z0 + 1; z <= rimZ; z++) {
      if (!inHorseshoe(x, z)) continue;
      m.put(x, cliff, z, water);
      const edge = !inHorseshoe(x, z - 1) || !inHorseshoe(x - 1, z) || !inHorseshoe(x + 1, z);
      if (edge) for (let y = m.g + 2; y < cliff; y++) m.put(x, y, z, water);
    }
  }
  // The plunge pool, two deep, with foam where the water lands.
  for (let x = m.x0 + 1; x < m.x1; x++) {
    for (let z = rimZ - 1; z <= m.z1; z++) {
      const inPool = (x - m.cx) ** 2 + (z - rimZ) ** 2 <= (radius + 3) ** 2;
      if (!inPool) continue;
      m.put(x, m.g - 1, z, stone);
      m.put(x, m.g, z, water);
      m.put(x, m.g + 1, z, z < rimZ + 3 ? white : water);
      for (let h = 2; h <= 4; h++) m.put(x, m.g + h, z, 0);
    }
  }
  // A safe lookout on the near shore.
  for (let x = m.cx - 4; x <= m.cx + 4; x++) {
    m.put(x, m.g, m.z1, m.kit.planks);
    m.put(x, m.g + 1, m.z1, fence);
  }
}
