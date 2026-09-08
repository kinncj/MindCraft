/**
 * Lions Gate Bridge: a green suspension bridge over the narrows, with two
 * towers, a curve of cable between them, and hangers dropping to the deck.
 */

import type { Monument, MonumentDraw } from './types';

export const lionsGate: Monument = {
  id: 'lions_gate',
  label: 'Lions Gate Bridge',
  emoji: '🌉',
  place: 'Vancouver, Canada',
  width: 41,
  depth: 13,
  height: 22,
  blurb: 'A long green bridge on cables, with two towers standing in the water!',
  draw,
};

function draw(m: MonumentDraw): void {
  const green = m.ctx.color ?? m.kit.green;
  const { water, stone, planks, fence } = m.kit;
  const deckY = m.g + 6;
  const towerY = m.g + 20;
  const towerA = m.x0 + 8;
  const towerB = m.x1 - 8;
  const roadZ0 = m.cz - 1;
  const roadZ1 = m.cz + 1;
  // The water underneath, and the shores at each end.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      const shore = x < m.x0 + 4 || x > m.x1 - 4;
      m.put(x, m.g - 1, z, stone);
      m.put(x, m.g, z, shore ? m.kit.grass : water);
      for (let h = 1; h <= 8; h++) m.put(x, m.g + h, z, 0);
    }
  }
  // The deck, rising gently from each shore to the middle.
  for (let x = m.x0; x <= m.x1; x++) {
    const t = Math.abs(x - m.cx) / Math.max(1, m.cx - m.x0);
    const y = Math.round(deckY - t * 2);
    for (let z = roadZ0; z <= roadZ1; z++) {
      m.put(x, y, z, planks);
      for (let h = 1; h <= 4; h++) m.put(x, y + h, z, 0);
    }
    m.put(x, y + 1, roadZ0 - 1, fence);
    m.put(x, y + 1, roadZ1 + 1, fence);
    // Hangers dropping from the cable to the deck.
    const span = Math.abs(x - towerA) < Math.abs(x - towerB) ? towerA : towerB;
    const between = x > towerA && x < towerB;
    const sag = between
      ? Math.round(towerY - 8 * (1 - ((x - m.cx) / Math.max(1, towerB - m.cx)) ** 2))
      : Math.round(towerY - 8 - Math.abs(x - span) * 1.2);
    if ((x - m.x0) % 3 === 0 && sag > y + 2) {
      for (let cy = y + 2; cy < sag; cy++) m.put(x, cy, m.cz, green);
    }
    m.put(x, Math.max(y + 2, sag), m.cz, green);
  }
  // Two towers standing in the narrows.
  for (const tx of [towerA, towerB]) {
    for (const dz of [-2, 2]) {
      for (let y = m.g; y <= towerY; y++) m.put(tx, y, m.cz + dz, green);
    }
    for (const y of [towerY, towerY - 6, deckY + 3]) {
      for (let dz = -2; dz <= 2; dz++) m.put(tx, y, m.cz + dz, green);
    }
  }
}
