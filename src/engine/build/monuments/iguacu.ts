/** Many falls side by side over jungle steps, with islands between them. */

import type { Monument, MonumentDraw } from './types';

export const iguacu: Monument = {
  id: 'iguacu',
  label: 'Iguaçu Falls',
  emoji: '🌈',
  place: 'Paraná, Brazil',
  width: 39,
  depth: 23,
  height: 14,
  blurb: 'Waterfalls everywhere, with jungle on top!',
  draw,
};

function draw(m: MonumentDraw): void {
  const { stone, water, leaves, white } = m.kit;
  const rimZ = m.cz + 1;
  const cliff = m.g + 10;
  // The Devil's Throat: a U-shaped chasm at one end, taller than the rest and
  // roaring into a narrow gap, which is what everybody remembers.
  const throatX = m.x0 + 6;
  for (let x = m.x0; x <= m.x1; x++) {
    // Three steps back, so the water falls in tiers rather than one wall.
    const tier = Math.abs((x - m.x0) % 13) < 5 ? 0 : Math.abs((x - m.x0) % 13) < 9 ? 1 : 2;
    const edge = rimZ - tier * 2;
    for (let z = m.z0; z <= edge; z++) {
      for (let y = m.g; y <= cliff - tier; y++) m.put(x, y, z, stone);
      m.put(x, cliff - tier, z, m.kit.grass);
      for (let h = 1; h <= 4; h++) m.put(x, cliff - tier + h, z, 0);
      // Jungle along the top.
      if ((x + z) % 7 === 0 && z < edge - 1) {
        for (let h = 1; h <= 3; h++) m.put(x, cliff - tier + h, z, m.kit.wood);
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) m.put(x + dx, cliff - tier + 4, z + dz, leaves);
      }
    }
    // A curtain of water, broken by rocky islands.
    const falling = (x - m.x0) % 13 !== 5 && (x - m.x0) % 13 !== 12;
    if (falling) {
      m.put(x, cliff - tier, edge, water);
      for (let y = m.g + 2; y < cliff - tier; y++) m.put(x, y, edge, water);
      m.put(x, m.g + 1, edge + 1, white);
    }
  }
  // The Devil's Throat itself: a horseshoe of water falling into a slot.
  for (let dx = -4; dx <= 4; dx++) {
    for (let dz = -4; dz <= 0; dz++) {
      const inThroat = dx * dx + dz * dz * 1.6 <= 18;
      if (!inThroat) continue;
      const x = throatX + dx;
      const z = rimZ + dz;
      const edge = (dx + 1) * (dx + 1) + dz * dz * 1.6 > 18 || (dx - 1) * (dx - 1) + dz * dz * 1.6 > 18 || dx * dx + (dz + 1) * (dz + 1) * 1.6 > 18;
      m.put(x, cliff, z, water);
      if (edge) for (let y = m.g + 1; y < cliff; y++) m.put(x, y, z, water);
      else for (let y = m.g + 1; y < cliff; y++) m.put(x, y, z, 0);
      m.put(x, m.g, z, water);
      m.put(x, m.g - 1, z, stone);
    }
  }
  for (let dx = -5; dx <= 5; dx++) m.put(throatX + dx, m.g + 1, rimZ + 1, white);

  // The river below.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = rimZ + 1; z <= m.z1; z++) {
      m.put(x, m.g - 1, z, stone);
      m.put(x, m.g, z, water);
      for (let h = 1; h <= 4; h++) m.put(x, m.g + h, z, z <= rimZ + 2 && (x + z) % 5 === 0 ? white : 0);
    }
  }
}
