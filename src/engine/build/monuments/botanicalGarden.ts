/**
 * The Botanical Garden of Curitiba: an Art Nouveau greenhouse of metal and
 * glass in three domed naves — the middle one tall, the wings lower — after
 * London's Crystal Palace, standing at the head of French formal gardens
 * whose beds are laid out in symmetrical parterres around a fountain.
 */

import { disc, plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const botanicalGarden: Monument = {
  id: 'botanical_garden',
  label: 'Botanical Garden',
  emoji: '🌷',
  place: 'Curitiba, Brazil',
  width: 25,
  depth: 23,
  height: 12,
  blurb: 'A glass palace with three domes, and flower beds in patterns!',
  real: {
    height: 20,
    width: 45,
    depth: 40,
    source: 'Botanical Garden of Curitiba: a 458 m2 greenhouse of three glass naves',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const frame = m.ctx.color ?? m.kit.white;
  const { glass, flowers, water, grass, cobble } = m.kit;
  plaza(m, cobble);
  const houseZ = m.z0 + 5;

  // Three glass naves: a tall domed middle and two lower wings beside it.
  const naves: Array<{ x: number; radius: number; height: number }> = [
    { x: m.cx, radius: 4, height: 11 },
    { x: m.cx - 7, radius: 3, height: 7 },
    { x: m.cx + 7, radius: 3, height: 7 },
  ];
  for (const nave of naves) {
    for (let dz = -nave.radius; dz <= nave.radius; dz++) {
      for (let dx = -nave.radius; dx <= nave.radius; dx++) {
        // A dome: the shell follows a quarter circle in both directions.
        const away = Math.sqrt(dx * dx + dz * dz) / nave.radius;
        if (away > 1.05) continue;
        const roof = Math.round(Math.cos((Math.PI / 2) * Math.min(1, away)) * nave.height);
        const x = nave.x + dx;
        const z = houseZ + dz;
        m.put(x, m.g, z, frame);
        for (let y = 1; y <= roof; y++) {
          const shell = y === roof || away > 0.8;
          // Ribs of white metal every few blocks, glass in between.
          const rib = (x + z) % 4 === 0 || y === roof;
          m.put(x, m.g + y, z, shell ? (rib ? frame : glass) : 0);
        }
      }
    }
    // A doorway into each nave, facing the gardens.
    for (let h = 1; h <= 2; h++) m.put(nave.x, m.g + h, houseZ + nave.radius, 0);
  }

  // French parterres: four beds around a fountain, with paths between them.
  const gardenZ0 = houseZ + 6;
  for (let x = m.x0 + 1; x <= m.x1 - 1; x++) {
    for (let z = gardenZ0; z <= m.z1 - 1; z++) {
      const path = x === m.cx || z === gardenZ0 + 4 || Math.abs(x - m.cx) === 6;
      m.put(x, m.g, z, path ? cobble : grass);
      if (path || flowers.length === 0) continue;
      // Each bed is one colour, edged in another: a pattern from above.
      const bed = Math.abs(x - m.cx) < 6 ? 0 : 1;
      const edge = Math.abs(x - m.cx) === 5 || Math.abs(x - m.cx) === 7 || z === gardenZ0 + 1 || z === m.z1 - 2;
      m.put(x, m.g + 1, z, flowers[(bed + (edge ? 2 : 0)) % flowers.length]);
    }
  }
  // The fountain on the middle of the axis.
  disc(m, m.cx, m.g, gardenZ0 + 4, 2, frame);
  disc(m, m.cx, m.g, gardenZ0 + 4, 1, water);
  m.put(m.cx, m.g + 1, gardenZ0 + 4, water);
  m.put(m.cx, m.g + 2, gardenZ0 + 4, water);
}
