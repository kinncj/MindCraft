/**
 * The Sydney Harbour Bridge: a single steel arch of 503 m carrying the road
 * 49 m over the water, the crown of the arch 134 m up, and a pylon of granite
 * at each corner that holds nothing up at all — they were built for the look.
 */

import { box } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const harbourBridge: Monument = {
  id: 'harbour_bridge',
  label: 'Sydney Harbour Bridge',
  emoji: '🌁',
  place: 'Sydney, Australia',
  width: 45,
  depth: 11,
  height: 14,
  blurb: 'The big coathanger! One huge arch over the water.',
  real: {
    height: 134,
    width: 503,
    depth: 49,
    levels: { deck: 49, crown: 134 },
    source: 'Sydney Harbour Bridge: 503 m arch, deck 49 m up, crown 134 m',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const steel = m.ctx.color ?? m.kit.iron;
  const { water, cobble, stone, planks, fence } = m.kit;
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      const bank = x < m.x0 + 3 || x > m.x1 - 3;
      m.put(x, m.g - 1, z, cobble);
      m.put(x, m.g, z, bank ? cobble : water);
      for (let h = 1; h <= 14; h++) m.put(x, m.g + h, z, 0);
    }
  }
  const deckY = m.g + Math.max(2, m.up(49));
  const crownY = m.g + m.up(134);
  const springing = m.x0 + 4;
  const far = m.x1 - 4;
  const half = (far - springing) / 2;

  // The arch: two chords, an upper and a lower, with the web between them.
  for (let x = springing; x <= far; x++) {
    const t = (x - springing - half) / half; // -1 at one foot, +1 at the other
    const upper = Math.round(crownY - (crownY - deckY) * t * t);
    const lower = Math.round(deckY + (upper - deckY) * 0.45);
    for (const z of [m.cz - 2, m.cz + 2]) {
      m.put(x, upper, z, steel);
      if (lower > deckY) m.put(x, lower, z, steel);
      // The diagonals that make it a truss and not a hoop.
      if ((x - springing) % 3 === 0) for (let y = lower; y <= upper; y++) m.put(x, y, z, steel);
      // Hangers down to the roadway.
      if ((x - springing) % 4 === 2) for (let y = deckY + 1; y < lower; y++) m.put(x, y, z, steel);
    }
  }
  // The roadway, right across, with a rail each side.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.cz - 2; z <= m.cz + 2; z++) m.put(x, deckY, z, planks);
    m.put(x, deckY + 1, m.cz - 3, fence);
    m.put(x, deckY + 1, m.cz + 3, fence);
    // The approach spans stand on piers out of the water.
    if ((x - m.x0) % 5 === 0 && (x < springing || x > far)) for (let y = m.g + 1; y < deckY; y++) m.put(x, y, m.cz, stone);
  }
  // The four granite pylons, two at each end, standing past the deck.
  for (const x of [springing - 1, far + 1]) {
    for (const z of [m.cz - 3, m.cz + 3]) {
      box(m, x - 1, m.g + 1, z - 1, x + 1, deckY + m.up(30), z + 1, stone);
    }
  }
}
