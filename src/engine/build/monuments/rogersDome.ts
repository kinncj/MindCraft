/** A white dome over a green field, with seats around it. */

import { circle, disc } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const rogersDome: Monument = {
  id: 'rogers_dome',
  label: 'Rogers Centre',
  emoji: '⚾',
  place: 'Toronto, Canada',
  width: 23,
  depth: 23,
  height: 15,
  blurb: 'A round white roof over a green field!',
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
  // The roof: a stepped dome that stays hollow inside.
  const height = 15 - 3;
  for (let y = 0; y <= height; y++) {
    const r = Math.round(radius * Math.cos((Math.PI / 2) * (y / (height + 1))));
    if (r <= 0) break;
    circle(m, m.cx, m.g + 3 + y, m.cz, r, white);
    if (y === height) disc(m, m.cx, m.g + 4 + y, m.cz, r - 1 > 0 ? r - 1 : 1, white);
  }
}
