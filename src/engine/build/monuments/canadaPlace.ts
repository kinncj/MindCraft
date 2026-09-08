/**
 * Canada Place: five white sails over the cruise terminal on the harbour,
 * as if a ship were tied up in the middle of the city.
 */

import { box } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const canadaPlace: Monument = {
  id: 'canada_place',
  label: 'Canada Place',
  emoji: '⛵',
  place: 'Vancouver, Canada',
  width: 37,
  depth: 15,
  height: 11,
  blurb: 'Five white sails on the water, like a ship that never leaves!',
  real: {
    height: 40,
    width: 220,
    depth: 100,
    source: 'Canada Place: five fabric sails over a pier about 220 m long',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const sail = m.ctx.color ?? m.kit.white;
  const { glass, water, stone } = m.kit;
  // The harbour it stands in, and the pier deck over it.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      m.put(x, m.g - 1, z, stone);
      m.put(x, m.g, z, water);
      for (let h = 1; h <= 6; h++) m.put(x, m.g + h, z, 0);
    }
  }
  const px0 = m.x0 + 1;
  const px1 = m.x1 - 1;
  const pz0 = m.cz - 4;
  const pz1 = m.cz + 4;
  box(m, px0, m.g + 1, pz0, px1, m.g + 1, pz1, sail);
  // Two glazed storeys of terminal under the sails.
  for (let y = m.g + 2; y <= m.g + 4; y++) {
    for (let x = px0; x <= px1; x++) {
      for (let z = pz0; z <= pz1; z++) {
        const edge = x === px0 || x === px1 || z === pz0 || z === pz1;
        m.put(x, y, z, edge ? (y === m.g + 4 ? sail : glass) : 0);
      }
    }
  }
  box(m, px0, m.g + 5, pz0, px1, m.g + 5, pz1, sail);
  // Five sails in a row, each a peaked triangle of white.
  for (let s = 0; s < 5; s++) {
    const sx = px0 + 2 + s * Math.floor((px1 - px0 - 3) / 4);
    const peak = Math.max(3, m.up(40) - 6); // 40 m to the top of the sails
    for (let dz = -4; dz <= 4; dz++) {
      const height = Math.max(0, peak - Math.abs(dz) * 2);
      for (let h = 1; h <= height; h++) {
        m.put(sx, m.g + 5 + h, m.cz + dz, sail);
        if (h === height && height > 2) m.put(sx + 1, m.g + 5 + h, m.cz + dz, sail);
      }
    }
  }
}
