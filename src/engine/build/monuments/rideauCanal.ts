/**
 * The Rideau Canal Skateway: 7.8 km of ice sunk between stone retaining
 * walls, the flight of eight Ottawa Locks stepping up to Parliament Hill at
 * one end, an arched stone bridge over the middle, and the red warming huts
 * where children put their skates on.
 */

import type { Monument, MonumentDraw } from './types';

export const rideauCanal: Monument = {
  id: 'rideau_canal',
  label: 'Rideau Canal',
  emoji: '⛸️',
  place: 'Ottawa, Canada',
  width: 41,
  depth: 15,
  height: 6,
  blurb: 'The longest skating rink in the world, with the locks at the end!',
  real: {
    height: 24,
    width: 300,
    depth: 60,
    levels: { ice: 0, bank: 8, lockTop: 24 },
    landscape: true,
    source: 'Rideau Canal Skateway: ice between stone banks, eight locks rising 24 m',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const { stone, cobble, ice, water, fence, lamp, planks, slab, red, grass, wood } = m.kit;
  const half = 4; // the ice is nine blocks across
  // The ice sits below the bank, the way a canal really does, so the walls
  // read as walls and a skater is down between them.
  const iceY = m.g - 2;
  const lockFrom = m.x1 - 11;

  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      const d = Math.abs(z - m.cz);
      // Everything starts as bank: grass on top of stone, cleared above.
      m.put(x, m.g - 1, z, cobble);
      m.put(x, m.g, z, d <= half + 2 ? cobble : grass);
      for (let h = 1; h <= 6; h++) m.put(x, m.g + h, z, 0);
      if (d > half) continue;
      // The channel: retaining walls down each side, ice along the bottom.
      for (let y = iceY; y < m.g; y++) m.put(x, y, z, 0);
      m.put(x, iceY - 1, z, stone);
      m.put(x, iceY, z, x >= lockFrom ? water : ice);
      if (d === half) for (let y = iceY; y <= m.g; y++) m.put(x, y, z, stone);
    }
  }

  // The flight of locks: chambers stepping up, wooden gates between them,
  // and the lockmaster's crank posts on the wall beside each gate.
  for (let i = 0; i < 4; i++) {
    const gateX = lockFrom + i * 3;
    // Each chamber holds its water a step higher, and its walls rise with it.
    const level = Math.min(m.g - 1, iceY + i);
    for (let x = gateX; x < gateX + 3; x++) {
      for (let z = m.cz - half; z <= m.cz + half; z++) {
        if (Math.abs(z - m.cz) === half) {
          for (let y = iceY; y <= m.g; y++) m.put(x, y, z, stone);
          continue;
        }
        for (let y = iceY; y <= level; y++) m.put(x, y, z, y === level ? water : stone);
        for (let y = level + 1; y <= m.g + 4; y++) m.put(x, y, z, 0);
      }
    }
    for (let z = m.cz - half + 1; z <= m.cz + half - 1; z++) {
      for (let y = level; y <= level + 2; y++) m.put(gateX, y, z, wood);
    }
    for (const z of [m.cz - half, m.cz + half]) {
      m.put(gateX, m.g + 1, z, fence);
      m.put(gateX + 1, m.g + 1, z, slab);
    }
  }

  // The arched stone bridge over the middle, walkable bank to bank.
  for (let z = m.z0; z <= m.z1; z++) {
    for (const x of [m.cx - 1, m.cx, m.cx + 1]) {
      m.put(x, m.g + 1, z, x === m.cx ? cobble : stone);
      for (let h = 2; h <= 5; h++) m.put(x, m.g + h, z, 0);
    }
    if (Math.abs(z - m.cz) > half) {
      m.put(m.cx - 2, m.g + 2, z, fence);
      m.put(m.cx + 2, m.g + 2, z, fence);
    }
  }
  // The arch under it: stone haunches that curve down to the walls.
  for (const dz of [-half, half]) {
    for (const [dx, dy] of [[-1, 0], [1, 0], [-1, -1], [1, -1]] as const) {
      m.put(m.cx + dx * 2, m.g + 1 + dy, m.cz + dz, stone);
    }
  }
  for (const x of [m.cx - 1, m.cx, m.cx + 1]) {
    for (let i = 1; i <= 2; i++) {
      m.put(x, m.g + 1, m.cz - half - i, stone);
      m.put(x, m.g + 1, m.cz + half + i, stone);
    }
  }

  // Along the bank: lamps, benches, and the red warming huts.
  for (let x = m.x0 + 1; x < lockFrom - 1; x++) {
    const step = (x - m.x0) % 8;
    for (const z of [m.cz - half - 2, m.cz + half + 2]) {
      if (Math.abs(x - m.cx) <= 2) continue;
      if (step === 0 && lamp !== null) {
        m.put(x, m.g + 1, z, fence);
        m.put(x, m.g + 2, z, fence);
        m.put(x, m.g + 3, z, lamp);
      } else if (step === 3) {
        m.put(x, m.g + 1, z, slab);
      } else if (step === 5) {
        // A warming hut: three blocks of planks under a red roof.
        for (let dx = 0; dx <= 2; dx++) {
          for (let h = 1; h <= 2; h++) {
            const wall = dx === 0 || dx === 2;
            m.put(x + dx, m.g + h, z, wall ? planks : 0);
          }
          m.put(x + dx, m.g + 3, z, red);
        }
      }
    }
  }
  // A ramp down onto the ice, so a skater can actually get on.
  for (let i = 0; i <= 2; i++) {
    for (let z = m.cz - 1; z <= m.cz + 1; z++) m.put(m.x0 + 1 + i, m.g - i, z, i === 2 ? ice : cobble);
    for (let y = m.g - i + 1; y <= m.g + 2; y++) for (let z = m.cz - 1; z <= m.cz + 1; z++) m.put(m.x0 + 1 + i, y, z, 0);
  }
}
