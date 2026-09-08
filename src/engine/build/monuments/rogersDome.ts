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
  // The roof: four panels that slide over each other, so it reads as the
  // retractable one it is rather than a smooth shell. The seams run across.
  const height = 15 - 3;
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
    if (y === height) disc(m, m.cx, m.g + 4 + y, m.cz, r - 1 > 0 ? r - 1 : 1, white);
  }
}
