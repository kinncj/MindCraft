/**
 * Tower Bridge: 244 m between two 65 m towers, the roadway that splits and
 * lifts in the middle, and the high walkways joining the towers near the top.
 * Cornish granite and Portland stone over a steel frame, painted blue.
 */

import type { Monument, MonumentDraw } from './types';

export const towerBridge: Monument = {
  id: 'tower_bridge',
  label: 'Tower Bridge',
  emoji: '🌉',
  place: 'London, England',
  width: 41,
  depth: 13,
  height: 16,
  blurb: 'The bridge with two towers and a road that opens in the middle!',
  real: {
    height: 65,
    width: 244,
    depth: 30,
    levels: { roadway: 9, walkway: 44, towerTop: 65 },
    source: 'Tower Bridge: 244 m long between two 65 m towers, walkways up at 44 m',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const stone = m.ctx.color ?? m.kit.white;
  const blue = m.kit.blue;
  const { water, planks, fence, glass, cobble } = m.kit;
  const towerA = m.cx - Math.round(m.across(70));
  const towerB = m.cx + Math.round(m.across(70));
  const deckY = m.g + Math.max(2, m.up(9));
  const walkY = m.g + m.up(44);
  // The parapet, the turret tops and the pinnacle: all inside the real 65 m.
  const topY = m.g + m.up(54);
  const turretY = m.g + m.up(61);
  const spireY = m.g + m.up(65);

  // The Thames, with a stone bank at each end.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      const bank = x < m.x0 + 3 || x > m.x1 - 3;
      m.put(x, m.g - 1, z, cobble);
      m.put(x, m.g, z, bank ? cobble : water);
      for (let h = 1; h <= 6; h++) m.put(x, m.g + h, z, 0);
    }
  }
  // The roadway, split in the middle where the bascules lift.
  for (let x = m.x0; x <= m.x1; x++) {
    const gap = Math.abs(x - m.cx) <= 1;
    for (let z = m.cz - 1; z <= m.cz + 1; z++) {
      if (!gap) m.put(x, deckY, z, planks);
      for (let h = 1; h <= 4; h++) m.put(x, deckY + h, z, 0);
    }
    if (!gap) {
      m.put(x, deckY + 1, m.cz - 2, fence);
      m.put(x, deckY + 1, m.cz + 2, fence);
    }
  }
  // The two bascules, tilted up, which is how everyone pictures it.
  for (let i = 1; i <= 3; i++) {
    for (let z = m.cz - 1; z <= m.cz + 1; z++) {
      m.put(m.cx - 1 - i, deckY + i, z, planks);
      m.put(m.cx + 1 + i, deckY + i, z, planks);
    }
  }
  // The towers: stone piers, four corner turrets, a pointed roof.
  for (const tx of [towerA, towerB]) {
    for (let y = m.g; y <= topY; y++) {
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -3; dz <= 3; dz++) {
          const edge = Math.abs(dx) === 2 || Math.abs(dz) === 3;
          if (!edge) {
            m.put(tx + dx, y, m.cz + dz, 0);
            continue;
          }
          const window = y > deckY + 2 && y < walkY - 1 && (y - m.g) % 4 === 0 && (dx === 0 || dz === 0);
          m.put(tx + dx, y, m.cz + dz, window ? glass : stone);
        }
      }
    }
    // Corner turrets, then the pointed pinnacle between them.
    for (const dx of [-2, 2]) {
      for (const dz of [-3, 3]) {
        for (let y = topY + 1; y <= turretY; y++) m.put(tx + dx, y, m.cz + dz, stone);
        m.put(tx + dx, turretY + 1, m.cz + dz, blue);
      }
    }
    for (let y = topY + 1; y <= spireY; y++) {
      const r = y <= turretY ? 1 : 0;
      for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) m.put(tx + dx, y, m.cz + dz, y > turretY ? blue : stone);
    }
  }
  // The two high walkways between the towers, and the blue suspension chains
  // that carry the outer spans down to the banks.
  for (let x = towerA; x <= towerB; x++) {
    for (const dz of [-2, 2]) m.put(x, walkY, m.cz + dz, blue);
    m.put(x, walkY + 1, m.cz, glass);
    m.put(x, walkY - 1, m.cz, blue);
  }
  for (const [from, to] of [[m.x0 + 2, towerA], [towerB, m.x1 - 2]] as const) {
    for (let x = from; x <= to; x++) {
      const t = (x - from) / Math.max(1, to - from);
      const rise = from === towerB ? 1 - t : t;
      const y = deckY + 2 + Math.round(rise * (walkY - deckY - 3));
      m.put(x, y, m.cz - 2, blue);
      m.put(x, y, m.cz + 2, blue);
    }
  }
}
