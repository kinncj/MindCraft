/** A white dome over a green field, with seats around it. */

import { circle, disc } from './shapes';
import { slidingRoof } from './automation';
import type { Monument, MonumentDraw } from './types';

export const rogersDome: Monument = {
  id: 'rogers_dome',
  label: 'Rogers Centre',
  emoji: '⚾',
  place: 'Toronto, Canada',
  width: 23,
  depth: 23,
  height: 11,
  blurb: 'A round white roof over a green field!',
  real: {
    height: 86,
    width: 205,
    depth: 205,
    source: 'Rogers Centre: a retractable roof 86 m high over a 205 m bowl',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const { white, green, sand, blue } = m.kit;
  const radius = Math.floor(Math.min(m.w, m.d) / 2) - 1;
  // The field, with a sand diamond on it.
  disc(m, m.cx, m.g, m.cz, radius, green);
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      if (Math.abs(dx) + Math.abs(dz) <= 3) m.put(m.cx + dx, m.g, m.cz + dz + 1, sand);
    }
  }
  // Two rings of seats.
  for (let y = 1; y <= 2; y++) circle(m, m.cx, m.g + y, m.cz, radius - y + 1, blue);
  // The roof really opens: two panels ride in on sticky pistons from the rims,
  // worked by a lever on the concourse. The fixed sections stay put, the way
  // the real one keeps one panel fixed over the north stand.
  const height = Math.max(3, m.up(86) - 5); // the shell, with room for the roof gear on top
  for (let y = 0; y <= height; y++) {
    const r = Math.round(radius * Math.cos((Math.PI / 2) * (y / (height + 1))));
    if (r <= 0) break;
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const d2 = dx * dx + dz * dz;
        if (d2 > (r + 0.35) ** 2 || d2 < (r - 0.75) ** 2) continue;
        // Panel seams: two rings of steel where the sections meet.
        const seam = Math.abs(Math.abs(dz) - Math.round(radius * 0.45)) < 1;
        m.put(m.cx + dx, m.g + 3 + y, m.cz + dz, seam ? m.kit.stone : white);
      }
    }
    if (y === height) {
      const cap = Math.max(1, r - 1);
      slidingRoof(m, {
        x0: m.cx - cap,
        x1: m.cx + cap,
        zNorth: m.cz - cap - 1,
        zSouth: m.cz + cap + 1,
        y: m.g + 4 + y,
        reach: cap,
        panel: white,
        groundY: m.g,
        minZ: m.z0,
        step: m.kit.stone,
      });
    }
  }
}
