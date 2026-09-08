/** Drawing bits every monument uses: plazas, boxes, rings, discs, circles. */

import type { MonumentDraw } from './types';

/** A flat plaza the monument stands on, so it never floats over a bump. */
export function plaza(m: MonumentDraw, id: number, inset = 0): void {
  for (let x = m.x0 + inset; x <= m.x1 - inset; x++) {
    for (let z = m.z0 + inset; z <= m.z1 - inset; z++) {
      m.put(x, m.g, z, id);
      for (let h = 1; h <= 3; h++) m.put(x, m.g + h, z, 0);
    }
  }
}

export function box(m: MonumentDraw, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, id: number): void {
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) m.put(x, y, z, id);
}

/** The outline of a rectangle at one height. */
export function ring(m: MonumentDraw, x0: number, y: number, z0: number, x1: number, z1: number, id: number): void {
  for (let x = x0; x <= x1; x++) {
    m.put(x, y, z0, id);
    m.put(x, y, z1, id);
  }
  for (let z = z0; z <= z1; z++) {
    m.put(x0, y, z, id);
    m.put(x1, y, z, id);
  }
}

/** A filled circle of blocks around (cx, cz). */
export function disc(m: MonumentDraw, cx: number, y: number, cz: number, radius: number, id: number): void {
  const r2 = (radius + 0.35) ** 2;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      if (dx * dx + dz * dz <= r2) m.put(cx + dx, y, cz + dz, id);
    }
  }
}

/** The edge of a circle only. */
export function circle(m: MonumentDraw, cx: number, y: number, cz: number, radius: number, id: number): void {
  const outer = (radius + 0.35) ** 2;
  const inner = (radius - 0.75) ** 2;
  for (let dx = -radius; dx <= radius; dx++) {
    for (let dz = -radius; dz <= radius; dz++) {
      const d2 = dx * dx + dz * dz;
      if (d2 <= outer && d2 >= inner) m.put(cx + dx, y, cz + dz, id);
    }
  }
}
