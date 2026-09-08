/**
 * Sensō-ji in Asakusa: the Kaminarimon gate with its huge red lantern,
 * and the five-storey pagoda beside it. Vermilion posts, white walls,
 * dark tiled roofs that flare at the corners.
 */

import { box, plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const sensoji: Monument = {
  id: 'sensoji',
  label: 'Sensoji Temple',
  emoji: '⛩️',
  place: 'Tokyo, Japan',
  width: 23,
  depth: 17,
  height: 22,
  blurb: 'A red gate with a giant lantern, and a pagoda with five roofs!',
  draw,
};

function draw(m: MonumentDraw): void {
  const vermilion = m.ctx.color ?? m.kit.red;
  const { white, black, wood } = m.kit;
  plaza(m, m.kit.cobble);

  // --- The Kaminarimon gate, on the left ---
  const gx = m.x0 + 5;
  const gz = m.cz;
  for (const dx of [-3, 3]) {
    for (const dz of [-1, 1]) box(m, gx + dx, m.g + 1, gz + dz, gx + dx, m.g + 6, gz + dz, vermilion);
  }
  box(m, gx - 4, m.g + 7, gz - 2, gx + 4, m.g + 7, gz + 2, vermilion);
  // A tiled roof that oversails the posts and turns up at the ends.
  for (let step = 0; step <= 2; step++) {
    box(m, gx - 5 + step, m.g + 8 + step, gz - 3 + step, gx + 5 - step, m.g + 8 + step, gz + 3 - step, black);
  }
  for (const dx of [-5, 5]) m.put(gx + dx, m.g + 9, gz, black);
  // The lantern hanging in the middle of the gate.
  box(m, gx - 1, m.g + 4, gz, gx + 1, m.g + 6, gz, vermilion);
  m.put(gx, m.g + 3, gz, black);
  m.put(gx, m.g + 7, gz, black);

  // --- The five-storey pagoda, on the right ---
  const px = m.x1 - 5;
  const pz = m.cz;
  for (let storey = 0; storey < 5; storey++) {
    const y = m.g + 1 + storey * 4;
    const r = 3 - Math.floor(storey / 2);
    // White walls between vermilion corner posts.
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const edge = Math.abs(dx) === r || Math.abs(dz) === r;
        const corner = Math.abs(dx) === r && Math.abs(dz) === r;
        for (let h = 0; h < 3; h++) m.put(px + dx, y + h, pz + dz, edge ? (corner ? vermilion : white) : 0);
      }
    }
    // The roof of this storey, wider than the walls, with turned-up corners.
    for (let dx = -r - 1; dx <= r + 1; dx++) {
      for (let dz = -r - 1; dz <= r + 1; dz++) m.put(px + dx, y + 3, pz + dz, black);
    }
    for (const dx of [-r - 2, r + 2]) for (const dz of [-r - 2, r + 2]) m.put(px + dx, y + 4, pz + dz, black);
  }
  // The finial on top.
  for (let h = 0; h <= 2; h++) m.put(px, m.g + 21 + h - 1, pz, wood);
  if (m.kit.lamp !== null) m.put(px, m.g + 22, pz, m.kit.lamp);
}
