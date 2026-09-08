/** Three glass vaults on a plinth, with flower beds in front. */

import { disc, plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const botanicalGarden: Monument = {
  id: 'botanical_garden',
  label: 'Botanical Garden',
  emoji: '🌷',
  place: 'Curitiba, Brazil',
  width: 21,
  depth: 17,
  height: 13,
  blurb: 'A glass greenhouse with flower beds in front!',
  draw,
};

function draw(m: MonumentDraw): void {
  const { glass, white, flowers, water } = m.kit;
  plaza(m, m.kit.cobble);
  const naveZ = m.cz - 2;
  const vaults: Array<[number, number, number]> = [
    [m.cx, 7, 6],
    [m.cx - 8, 5, 4],
    [m.cx + 8, 5, 4],
  ];
  for (const [x, height, half] of vaults) {
    for (let z = naveZ - half; z <= naveZ + half; z++) {
      for (let dx = -3; dx <= 3; dx++) {
        const frameCol = Math.abs(dx) === 3 || z === naveZ - half || z === naveZ + half;
        const arch = Math.round(Math.sqrt(Math.max(0, 1 - (dx / 3) ** 2)) * height);
        for (let y = 1; y <= arch; y++) {
          const shell = y === arch || Math.abs(dx) === 3;
          if (shell) m.put(x + dx, m.g + y, z, frameCol || y === arch ? (y % 3 === 0 ? white : glass) : glass);
          else m.put(x + dx, m.g + y, z, 0);
        }
        m.put(x + dx, m.g, z, white);
      }
    }
  }
  // Formal beds and a little fountain out front.
  for (let x = m.x0 + 2; x <= m.x1 - 2; x++) {
    for (let z = naveZ + 8; z <= m.z1 - 1; z++) {
      const bed = (x + z) % 2 === 0;
      m.put(m.cx === x ? x : x, m.g, z, bed ? m.kit.grass : m.kit.cobble);
      if (bed && flowers.length > 0) m.put(x, m.g + 1, z, flowers[(x + z) % flowers.length]);
    }
  }
  disc(m, m.cx, m.g, m.z1 - 3, 2, water);
  m.put(m.cx, m.g + 1, m.z1 - 3, water);
}
