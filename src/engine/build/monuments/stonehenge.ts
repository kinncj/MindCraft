/**
 * Stonehenge: a ring of thirty sarsen uprights 33 m across, 4.1 m tall, with
 * a continuous lintel laid on top of them, and inside it the five trilithons
 * in a horseshoe opening to the north-east, the tallest 7.3 m.
 */

import type { Monument, MonumentDraw } from './types';

export const stonehenge: Monument = {
  id: 'stonehenge',
  label: 'Stonehenge',
  emoji: '🪨',
  place: 'Wiltshire, England',
  width: 23,
  depth: 23,
  height: 9,
  blurb: 'A great ring of standing stones, older than everything!',
  real: {
    height: 7.3,
    width: 33,
    depth: 33,
    levels: { sarsenTop: 4.9, trilithon: 7.3 },
    source: 'Stonehenge: a 33 m sarsen circle 4.1 m tall under its lintels, trilithons to 7.3 m',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const sarsen = m.ctx.color ?? m.kit.stone;
  const { grass, cobble } = m.kit;
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      const d = Math.hypot(x - m.cx, z - m.cz);
      m.put(x, m.g, z, d < 9 ? cobble : grass);
      for (let h = 1; h <= 6; h++) m.put(x, m.g + h, z, 0);
    }
  }
  const upright = m.up(4.1);
  const lintel = m.up(4.9);
  const radius = Math.floor(m.w / 2) - 3;
  // Thirty uprights round the circle, with the lintel ring resting on them.
  for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * Math.PI * 2;
    const x = m.cx + Math.round(Math.cos(angle) * radius);
    const z = m.cz + Math.round(Math.sin(angle) * radius);
    for (let y = 1; y <= upright; y++) m.put(x, m.g + y, z, sarsen);
  }
  // The lintels: a full ring, which is what makes Stonehenge Stonehenge.
  for (let a = 0; a < 360; a += 3) {
    const angle = (a / 180) * Math.PI;
    const x = m.cx + Math.round(Math.cos(angle) * radius);
    const z = m.cz + Math.round(Math.sin(angle) * radius);
    for (let y = upright + 1; y <= lintel; y++) m.put(x, m.g + y, z, sarsen);
  }
  // The five trilithons inside: two uprights and a lintel, in a horseshoe
  // that opens to the north-east, tallest at the closed end.
  const inner = radius - 4;
  const tall = m.up(7.3);
  for (let i = 0; i < 5; i++) {
    const angle = Math.PI * (0.62 + (i / 4) * 0.76); // the horseshoe, open one way
    const height = Math.max(2, tall - Math.abs(i - 2));
    const x = m.cx + Math.round(Math.cos(angle) * inner);
    const z = m.cz + Math.round(Math.sin(angle) * inner);
    const px = Math.round(-Math.sin(angle));
    const pz = Math.round(Math.cos(angle));
    for (const s of [-1, 1]) {
      for (let y = 1; y <= height - 1; y++) m.put(x + px * s, m.g + y, z + pz * s, sarsen);
    }
    for (const s of [-1, 0, 1]) m.put(x + px * s, m.g + height, z + pz * s, sarsen);
  }
  // The Heel Stone, out on its own where the midsummer sun comes up.
  const hx = m.cx + Math.round(Math.cos(-Math.PI / 4) * (radius + 5));
  const hz = m.cz + Math.round(Math.sin(-Math.PI / 4) * (radius + 5));
  if (hx >= m.x0 && hx <= m.x1 && hz >= m.z0 && hz <= m.z1) {
    for (let y = 1; y <= upright + 1; y++) m.put(hx, m.g + y, hz, sarsen);
  }
}
