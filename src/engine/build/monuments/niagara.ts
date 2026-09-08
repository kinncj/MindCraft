/**
 * Niagara is not one waterfall but three: the curved Horseshoe on the
 * Canadian side, then Goat Island, then the straight American Falls, with
 * little Bridal Veil split off it by Luna Island. The crest runs 820 m
 * across and drops 57 m — wide and low, not a tall wall. A boat noses into
 * the mist at the bottom.
 */

import type { Monument, MonumentDraw } from './types';

export const niagara: Monument = {
  id: 'niagara',
  label: 'Niagara Falls',
  emoji: '💦',
  place: 'Ontario, Canada',
  width: 39,
  depth: 23,
  height: 10,
  blurb: 'Three waterfalls in a row, with islands between them and a boat below!',
  draw,
};

function draw(m: MonumentDraw): void {
  const { stone, water, white, fence, grass, planks, wood } = m.kit;
  const rimZ = m.cz + 2;
  const cliff = m.g + 7;
  const horseshoeX = m.x0 + 10;
  const goatX = m.x0 + 20;
  const americanX = m.x0 + 27;
  const lunaX = m.x0 + 31;

  /** Where the crest is at this x, or null where land stands instead. */
  const crestAt = (x: number, z: number): boolean => {
    const dz = z - rimZ;
    if (x <= goatX - 3) {
      // The Horseshoe: a curve biting back into the plateau.
      const dx = x - horseshoeX;
      return dz <= 0 && dx * dx + dz * dz * 2.4 <= 64;
    }
    if (x >= goatX + 3 && x <= lunaX - 1) return dz <= 0 && dz >= -2 && x >= americanX - 5; // American: straight
    if (x >= lunaX + 1) return dz <= 0 && dz >= -1; // Bridal Veil: a narrow ribbon
    return false;
  };

  // The plateau, with the falls bitten out of its edge and islands left standing.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= rimZ; z++) {
      if (crestAt(x, z)) continue;
      for (let y = m.g; y <= cliff; y++) m.put(x, y, z, stone);
      m.put(x, cliff, z, grass);
      for (let h = 1; h <= 4; h++) m.put(x, cliff + h, z, 0);
      // Trees on Goat Island, which is what it really is: a wooded island.
      const onGoat = Math.abs(x - goatX) <= 2 && z > rimZ - 6;
      if (onGoat && (x + z) % 3 === 0) {
        for (let h = 1; h <= 2; h++) m.put(x, cliff + h, z, wood);
        m.put(x, cliff + 3, z, m.kit.leaves);
      }
    }
  }

  // The river above the crest, and the sheets of water falling over it.
  for (let x = m.x0 + 1; x < m.x1; x++) {
    for (let z = m.z0 + 1; z <= rimZ; z++) {
      if (!crestAt(x, z)) continue;
      m.put(x, cliff, z, water);
      const lip = !crestAt(x, z - 1) || !crestAt(x - 1, z) || !crestAt(x + 1, z);
      if (lip) for (let y = m.g + 2; y < cliff; y++) m.put(x, y, z, water);
    }
  }

  // The gorge below: water, and foam where each fall lands.
  for (let x = m.x0 + 1; x < m.x1; x++) {
    for (let z = rimZ - 1; z <= m.z1; z++) {
      m.put(x, m.g - 1, z, stone);
      m.put(x, m.g, z, water);
      const nearFall = z < rimZ + 3 && crestAt(x, rimZ - 1);
      m.put(x, m.g + 1, z, nearFall ? white : 0);
      for (let h = 2; h <= 5; h++) m.put(x, m.g + h, z, 0);
    }
  }

  // The Maid of the Mist, nosing towards the Horseshoe.
  const boatZ = rimZ + 5;
  for (let dx = -2; dx <= 2; dx++) {
    m.put(horseshoeX + dx, m.g + 1, boatZ, planks);
    if (Math.abs(dx) < 2) m.put(horseshoeX + dx, m.g + 1, boatZ + 1, planks);
  }
  m.put(horseshoeX, m.g + 2, boatZ + 1, white);

  // The viewing terrace along the Canadian shore, with a railing.
  for (let x = m.x0 + 2; x <= m.x1 - 2; x++) {
    m.put(x, m.g, m.z1, planks);
    m.put(x, m.g + 1, m.z1, fence);
  }
}
