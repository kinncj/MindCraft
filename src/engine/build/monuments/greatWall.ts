/**
 * The Great Wall: a rampart about 7.8 m high and 6.5 m wide at the base,
 * crenellated along the top, running over whatever hill is in the way, with
 * a watchtower standing twelve metres up every few hundred paces.
 */

import type { Monument, MonumentDraw } from './types';

export const greatWall: Monument = {
  id: 'great_wall',
  label: 'Great Wall of China',
  emoji: '🧱',
  place: 'Beijing, China',
  width: 41,
  depth: 13,
  height: 10,
  blurb: 'A wall that goes on and on over the hills, with towers!',
  real: {
    height: 12,
    width: 300,
    depth: 6.5,
    levels: { rampart: 7.8, tower: 12 },
    landscape: true,
    source: 'Great Wall: a rampart about 7.8 m high and 6.5 m wide, towers to 12 m',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const brick = m.ctx.color ?? m.kit.stone;
  const { grass, cobble, dirt } = m.kit;
  // The hills it rides over, never below the ground it was given.
  const ridge = (x: number): number => Math.round(((Math.sin(((x - m.x0) / m.w) * Math.PI * 2) + 1) / 2) * 2);
  for (let x = m.x0; x <= m.x1; x++) {
    const hill = ridge(x);
    for (let z = m.z0; z <= m.z1; z++) {
      // The hillside the wall rides over: it is never on the flat.
      const fall = Math.abs(z - m.cz) > 3 ? Math.max(0, hill - 1) : hill;
      for (let y = 1; y <= fall; y++) m.put(x, m.g + y, z, y === fall ? grass : dirt);
      for (let h = fall + 1; h <= 10; h++) m.put(x, m.g + h, z, 0);
    }
  }
  const rampart = m.up(7.8);
  const towerTop = m.up(12);
  for (let x = m.x0; x <= m.x1; x++) {
    const base = m.g + ridge(x);
    const tower = (x - m.x0) % 14 === 6;
    const half = tower ? 3 : 2;
    for (let dz = -half; dz <= half; dz++) {
      const z = m.cz + dz;
      for (let y = 1; y <= rampart; y++) {
        // Solid below the walkway, hollow inside a tower.
        const wall = Math.abs(dz) === half || !tower || y > rampart - 3;
        m.put(x, base + y, z, wall ? brick : 0);
      }
      // The walkway along the top, and the crenellations on the outer edge.
      m.put(x, base + rampart, z, cobble);
      if (Math.abs(dz) === half && (x + dz) % 2 === 0) m.put(x, base + rampart + 1, z, brick);
    }
    if (!tower) continue;
    // A watchtower: a storey above the walkway with a window on each side.
    for (let dz = -3; dz <= 3; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let y = rampart + 1; y <= towerTop; y++) {
          const edge = Math.abs(dz) === 3 || Math.abs(dx) === 1;
          const window = y === towerTop - 1 && (dz === 0 || dx === 0);
          m.put(x + dx, base + y, m.cz + dz, edge && !window ? brick : 0);
        }
        m.put(x + dx, base + towerTop, m.cz + dz, brick);
      }
    }
  }
}
