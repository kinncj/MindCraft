/**
 * The Golden Gate Bridge: two towers 227 m above the water carrying a main
 * span of 1280 m, the deck 67 m up, and the cables sagging between the tower
 * tops down almost to the roadway at mid-span. Painted International Orange.
 */

import type { Monument, MonumentDraw } from './types';

export const goldenGate: Monument = {
  id: 'golden_gate',
  label: 'Golden Gate Bridge',
  emoji: '🌉',
  place: 'San Francisco, USA',
  width: 51,
  depth: 11,
  height: 17,
  blurb: 'The big orange bridge, with cables that swoop!',
  real: {
    height: 227,
    width: 1280,
    depth: 27,
    levels: { deck: 67, towerTop: 227 },
    source: 'Golden Gate Bridge: 1280 m main span, towers 227 m, deck 67 m up',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const orange = m.ctx.color ?? m.kit.red;
  const { water, cobble, planks, fence } = m.kit;
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      const headland = x < m.x0 + 4 || x > m.x1 - 4;
      m.put(x, m.g - 1, z, cobble);
      m.put(x, m.g, z, headland ? cobble : water);
      for (let h = 1; h <= 18; h++) m.put(x, m.g + h, z, 0);
      // The headlands rise out of the water at each end.
      if (headland) for (let h = 1; h <= 2; h++) m.put(x, m.g + h, z, cobble);
    }
  }
  const deckY = m.g + Math.max(2, m.up(67));
  const topY = m.g + m.up(227);
  // The main span is most of what we draw, so the towers sit at four fifths
  // out from the middle: measuring 640 m off the height scale would put them
  // a long way past the headlands on a bridge this long and this low.
  const towerA = m.cx - Math.round(m.w * 0.4);
  const towerB = m.cx + Math.round(m.w * 0.4);

  // The two towers: portal frames with cross braces, the way they really are.
  for (const tx of [towerA, towerB]) {
    for (const dz of [-2, 2]) {
      for (let y = m.g + 1; y <= topY; y++) {
        m.put(tx, y, m.cz + dz, orange);
        m.put(tx + 1, y, m.cz + dz, orange);
      }
    }
    for (const y of [deckY + 1, Math.round((deckY + topY) / 2), topY]) {
      for (let dz = -2; dz <= 2; dz++) {
        m.put(tx, y, m.cz + dz, orange);
        m.put(tx + 1, y, m.cz + dz, orange);
      }
    }
  }
  // The roadway, all the way across, with its rails.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.cz - 2; z <= m.cz + 2; z++) m.put(x, deckY, z, planks);
    m.put(x, deckY + 1, m.cz - 3, fence);
    m.put(x, deckY + 1, m.cz + 3, fence);
  }
  // The main cables: a curve from tower top to tower top, dipping to the deck
  // at mid-span, and the vertical suspenders hanging off them.
  for (let x = towerA; x <= towerB; x++) {
    const t = (x - m.cx) / Math.max(1, towerB - m.cx);
    const y = Math.round(deckY + 1 + (topY - deckY - 1) * t * t);
    for (const dz of [-3, 3]) {
      m.put(x, y, m.cz + dz, orange);
      if ((x - towerA) % 3 === 0) for (let h = deckY + 1; h < y; h++) m.put(x, h, m.cz + dz, orange);
    }
  }
  // And the back stays, running down to the anchorages on the headlands.
  for (const [from, to] of [[m.x0 + 2, towerA], [towerB, m.x1 - 2]] as const) {
    for (let x = from; x <= to; x++) {
      const t = (x - from) / Math.max(1, to - from);
      const rise = from === towerB ? 1 - t : t;
      const y = Math.round(m.g + 2 + rise * (topY - m.g - 2));
      for (const dz of [-3, 3]) m.put(x, y, m.cz + dz, orange);
    }
  }
}
