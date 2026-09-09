/**
 * The Statue of Liberty: 46 m of green copper on a 47 m pedestal, so she is
 * exactly half statue and half base. Torch up in the right hand, tablet in
 * the left, seven spikes on the crown, on her star-shaped island.
 */

import { box, disc } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const liberty: Monument = {
  id: 'liberty',
  label: 'Statue of Liberty',
  emoji: '🗽',
  place: 'New York, USA',
  width: 21,
  depth: 21,
  height: 32,
  blurb: 'Green as a leaf, holding her torch up over the water!',
  real: {
    height: 93,
    width: 60,
    depth: 60,
    levels: { pedestal: 47, shoulders: 78, torch: 93 },
    landscape: true,
    source: 'Statue of Liberty: a 46 m statue on a 47 m pedestal, 93 m to the torch',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const copper = m.ctx.color ?? m.kit.green;
  const { water, cobble, white, yellow, grass } = m.kit;
  // Her island, with water all round it.
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      m.put(x, m.g - 1, z, cobble);
      m.put(x, m.g, z, water);
      for (let h = 1; h <= 5; h++) m.put(x, m.g + h, z, 0);
    }
  }
  disc(m, m.cx, m.g, m.cz, 8, grass);
  // The eleven-pointed star fort she stands on, then the pedestal above it.
  const base = m.g + 1;
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = -6; dx <= 6; dx++) {
      for (let dz = -6; dz <= 6; dz++) {
        const star = Math.abs(dx) + Math.abs(dz) <= 8 && Math.max(Math.abs(dx), Math.abs(dz)) <= 6;
        if (star) m.put(m.cx + dx, base + dy, m.cz + dz, cobble);
      }
    }
  }
  const pedestalTop = base + m.up(47);
  for (let y = base + 2; y <= pedestalTop; y++) {
    const t = (y - base) / Math.max(1, pedestalTop - base);
    const r = t > 0.6 ? 2 : 3;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const edge = Math.abs(dx) === r || Math.abs(dz) === r;
        m.put(m.cx + dx, y, m.cz + dz, edge ? white : 0);
      }
    }
  }
  // The lady herself: robe, arms, crown, torch.
  const feet = pedestalTop + 1;
  // Heel to torch is 46 m: shoulders at 24 m, the top of the crown at 34 m.
  const shoulders = feet + m.up(24);
  const head = feet + m.up(34);
  const hand = feet + m.up(41);
  const flame = feet + m.up(46);
  for (let y = feet; y < shoulders; y++) {
    const t = (y - feet) / Math.max(1, shoulders - feet);
    const r = t < 0.35 ? 2 : 1;
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) m.put(m.cx + dx, y, m.cz + dz, copper);
  }
  // The right arm goes up with the torch; the left holds the tablet.
  for (let y = shoulders; y <= hand; y++) m.put(m.cx + 2, y, m.cz, copper);
  for (let y = hand + 1; y < flame; y++) m.put(m.cx + 2, y, m.cz, yellow);
  m.put(m.cx + 2, flame, m.cz, m.kit.lamp ?? yellow);
  box(m, m.cx - 2, shoulders - 1, m.cz, m.cx - 2, shoulders, m.cz, copper);
  m.put(m.cx - 3, shoulders, m.cz, white);
  // Head, and a crown of seven spikes.
  box(m, m.cx, shoulders + 1, m.cz, m.cx, head, m.cz, copper);
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1]] as const) {
    m.put(m.cx + dx, head, m.cz + dz, copper);
  }
}
