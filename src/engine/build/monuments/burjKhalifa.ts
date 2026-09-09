/**
 * The Burj Khalifa: 828 m, the tallest building there is. A Y-shaped plan of
 * three wings round a central core, each wing stepping back in a spiral as it
 * climbs, and the spire alone accounting for the last 244 m.
 */

import { plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const burjKhalifa: Monument = {
  id: 'burj_khalifa',
  label: 'Burj Khalifa',
  emoji: '🏙️',
  place: 'Dubai, UAE',
  width: 13,
  depth: 13,
  height: 56,
  blurb: 'The tallest building in the whole world!',
  real: {
    height: 828,
    width: 150,
    depth: 150,
    levels: { lastFloor: 584, spire: 828 },
    source: 'Burj Khalifa: 828 m, a Y-shaped plan of three wings, spire from 584 m',
  },
  draw,
};

/** Whether a spot is inside the Y at a given wing length: three arms at 120°. */
function inWings(dx: number, dz: number, reach: number): boolean {
  if (Math.hypot(dx, dz) <= 1.4) return true; // the core
  for (let i = 0; i < 3; i++) {
    const angle = (i / 3) * Math.PI * 2 + Math.PI / 2;
    const ax = Math.cos(angle);
    const az = Math.sin(angle);
    const along = dx * ax + dz * az;
    const across = Math.abs(dx * -az + dz * ax);
    if (along >= 0 && along <= reach && across <= 1.2) return true;
  }
  return false;
}

function draw(m: MonumentDraw): void {
  const glass = m.ctx.color ?? m.kit.glass;
  const { white, yellow, water } = m.kit;
  plaza(m, m.kit.cobble);
  // The fountain lake it stands beside.
  for (let x = m.x0; x <= m.x0 + 3; x++) for (let z = m.z0; z <= m.z1; z++) m.put(x, m.g, z, water);
  const spire = m.g + m.up(584);
  const top = m.g + m.up(828);
  const full = Math.floor(m.w / 2) - 1;
  for (let y = m.g + 1; y <= spire; y++) {
    // Every wing draws in as it rises, and the three do it out of step, which
    // is the spiral of setbacks you see from the ground.
    const t = (y - m.g) / (spire - m.g);
    const reach = Math.max(1, full * (1 - t * 0.78));
    for (let dx = -full; dx <= full; dx++) {
      for (let dz = -full; dz <= full; dz++) {
        if (!inWings(dx, dz, reach)) continue;
        // Silver mullions every few floors between the bands of glass.
        m.put(m.cx + dx, y, m.cz + dz, y % 4 === 0 ? white : glass);
      }
    }
  }
  // The spire: 244 m of it, drawing to a point.
  for (let y = spire + 1; y <= top; y++) {
    const t = (y - spire) / Math.max(1, top - spire);
    const r = t > 0.6 ? 0 : 1;
    for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) m.put(m.cx + dx, y, m.cz + dz, white);
  }
  m.put(m.cx, top + 1, m.cz, yellow);
  if (m.kit.lamp !== null) m.put(m.cx, top + 2, m.cz, m.kit.lamp);
}
