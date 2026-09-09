/**
 * The Leaning Tower of Pisa: eight storeys of white marble, 57 m on the high
 * side, six open arcades of columns between the ground floor and the belfry —
 * and about four degrees off upright, which is the whole point of it.
 */

import { circle, disc } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const leaningTower: Monument = {
  id: 'leaning_tower',
  label: 'Leaning Tower of Pisa',
  emoji: '🗼',
  place: 'Pisa, Italy',
  width: 9,
  depth: 9,
  height: 24,
  blurb: 'The tower that leans over and never falls down!',
  real: {
    height: 57,
    width: 15,
    depth: 15,
    levels: { firstArcade: 10, belfry: 51, top: 57 },
    source: 'Leaning Tower of Pisa: 57 m on the high side, eight storeys, 4 degrees off',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const marble = m.ctx.color ?? m.kit.white;
  const { grass, cobble } = m.kit;
  for (let x = m.x0; x <= m.x1; x++) {
    for (let z = m.z0; z <= m.z1; z++) {
      m.put(x, m.g, z, (x + z) % 7 === 0 ? cobble : grass);
      for (let h = 1; h <= 26; h++) m.put(x, m.g + h, z, 0);
    }
  }
  const top = m.g + m.up(57);
  const radius = 3;
  const height = top - m.g;
  // Four degrees is a lean of about one in fourteen: over the whole tower
  // that is four metres, and it is the reason anyone comes to look.
  // Centred on the footprint, so the foot sits back and the top hangs over:
  // the tower leans through its own ground rather than off the edge of it.
  const tilt = Math.max(2, m.across(4));
  const lean = (y: number): number => Math.round(((y - m.g) / Math.max(1, height)) * tilt - tilt / 2);
  for (let y = m.g + 1; y <= top; y++) {
    const cx = m.cx + lean(y);
    const metres = (y - m.g) / m.scale;
    // Six open arcades between the solid ground floor and the belfry.
    const arcade = metres > 10 && metres < 51;
    const storey = Math.round(((metres - 10) % 6.8) / 6.8 * 3);
    const open = arcade && storey > 0 && storey < 3;
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dz = -radius; dz <= radius; dz++) {
        const d = Math.hypot(dx, dz);
        if (Math.abs(d - radius) > 0.5) continue;
        // The columns of each arcade, with daylight between them.
        const column = (Math.round(Math.atan2(dz, dx) * 4) % 2) === 0;
        m.put(cx + dx, y, m.cz + dz, open && !column ? 0 : marble);
      }
      // A floor at every storey, so it is a tower and not a pipe.
      if (metres > 10 && Math.abs(storey) < 0.01) disc(m, cx, y, m.cz, radius - 1, marble);
    }
  }
  // The belfry at the top, narrower than the shaft, and the bells' openings.
  const belfry = m.g + m.up(51);
  for (let y = belfry; y <= top; y++) {
    const cx = m.cx + lean(y);
    circle(m, cx, y, m.cz, radius - 1, y === top ? marble : marble);
    if (y > belfry && y < top) {
      for (const [dx, dz] of [[radius - 1, 0], [-(radius - 1), 0], [0, radius - 1], [0, -(radius - 1)]] as const) {
        m.put(cx + dx, y, m.cz + dz, 0);
      }
    }
  }
  disc(m, m.cx, m.g + 1, m.cz, radius, marble); // the floor it stands on
}
