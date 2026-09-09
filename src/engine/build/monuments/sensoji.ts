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
  height: 26,
  blurb: 'A red gate with a giant lantern, and a pagoda with five roofs!',
  real: {
    height: 53,
    width: 60,
    depth: 40,
    levels: { gate: 12, pagoda: 53 },
    source: 'Sensoji: five-storey pagoda 53 m, Kaminarimon gate about 12 m',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const vermilion = m.ctx.color ?? m.kit.red;
  const { white, black, wood } = m.kit;
  plaza(m, m.kit.cobble);

  // --- The Kaminarimon gate, on the left: 11.7 m to the ridge of its roof ---
  const gx = m.x0 + 5;
  const gz = m.cz;
  const gateTop = m.g + m.up(12);
  const lintel = gateTop - 3;
  // Kaminarimon is as wide as it is tall — 11.4 m by 11.7 — so its roof is
  // seven blocks across, not eleven.
  for (const dx of [-2, 2]) {
    for (const dz of [-1, 1]) box(m, gx + dx, m.g + 1, gz + dz, gx + dx, lintel - 1, gz + dz, vermilion);
  }
  box(m, gx - 3, lintel, gz - 2, gx + 3, lintel, gz + 2, vermilion);
  // A tiled roof that oversails the posts and turns up at the ends.
  for (let step = 0; step <= 1; step++) {
    box(m, gx - 4 + step, lintel + 1 + step, gz - 3 + step, gx + 4 - step, lintel + 1 + step, gz + 3 - step, black);
  }
  for (const dx of [-4, 4]) m.put(gx + dx, lintel + 2, gz, black);
  // The great red lantern hanging in the middle of the gate.
  box(m, gx - 1, lintel - 3, gz, gx + 1, lintel - 1, gz, vermilion);
  m.put(gx, lintel - 4, gz, black);
  m.put(gx, lintel, gz, black);

  // --- The five-storey pagoda, on the right ---
  // Five storeys make up the first 40 m; the sorin spire carries it to 53.
  const px = m.x1 - 5;
  const pz = m.cz;
  const body = m.up(40);
  const storeyHeight = Math.max(3, Math.round(body / 5));
  for (let storey = 0; storey < 5; storey++) {
    const y = m.g + 1 + storey * storeyHeight;
    const r = 3 - Math.floor(storey / 2);
    // White walls between vermilion corner posts.
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const edge = Math.abs(dx) === r || Math.abs(dz) === r;
        const corner = Math.abs(dx) === r && Math.abs(dz) === r;
        for (let h = 0; h < storeyHeight - 1; h++) m.put(px + dx, y + h, pz + dz, edge ? (corner ? vermilion : white) : 0);
      }
    }
    // The roof of this storey, wider than the walls, with turned-up corners.
    for (let dx = -r - 1; dx <= r + 1; dx++) {
      for (let dz = -r - 1; dz <= r + 1; dz++) m.put(px + dx, y + storeyHeight - 1, pz + dz, black);
    }
    for (const dx of [-r - 2, r + 2]) for (const dz of [-r - 2, r + 2]) m.put(px + dx, y + storeyHeight, pz + dz, black);
  }
  // The sorin: the bronze spire that finishes every pagoda.
  const bodyTop = m.g + 1 + 5 * storeyHeight - 1;
  const spire = m.g + m.up(53);
  for (let y = bodyTop; y < spire; y++) m.put(px, y, pz, wood);
  m.put(px, spire, pz, m.kit.lamp ?? wood);
}
