/**
 * Arena da Baixada, home of Club Athletico Paranaense in Curitiba: a tight
 * rectangular bowl right up against the pitch, four tiers of red and black
 * seats, and the first retractable roof in South America — two panels that
 * meet over the middle. The pitch is the regulation 105 by 68 metres.
 */

import { box } from './shapes';
import { slidingRoof } from './automation';
import type { Monument, MonumentDraw } from './types';

export const arenaBaixada: Monument = {
  id: 'arena_baixada',
  label: 'Arena da Baixada',
  emoji: '⚽',
  place: 'Curitiba, Brazil',
  width: 37,
  depth: 27,
  height: 9,
  blurb: 'Athletico Paranaense in red and black, with a roof that slides shut!',
  real: {
    height: 40,
    width: 190,
    depth: 150,
    levels: { pitch: 0, tiers: 24, roof: 40 },
    source: 'Arena da Baixada: 105 x 68 m pitch, 42,372 seats, retractable roof',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const red = m.ctx.color ?? m.kit.red;
  const { black, white, grass, glass, cobble } = m.kit;
  // The pitch: 105 by 68 metres of it, with the halfway line and the circle.
  const tiers = 4;
  const margin = tiers + 1; // stands and the outer wall
  const pitchX = Math.max(9, Math.min(Math.round(m.across(105)), m.w - margin * 2 - 2));
  const pitchZ = Math.max(7, Math.min(Math.round(m.across(68)), m.d - margin * 2 - 2));
  const px0 = m.cx - Math.floor(pitchX / 2);
  const px1 = px0 + pitchX - 1;
  const pz0 = m.cz - Math.floor(pitchZ / 2);
  const pz1 = pz0 + pitchZ - 1;
  for (let x = px0; x <= px1; x++) {
    for (let z = pz0; z <= pz1; z++) {
      const line =
        x === m.cx ||
        x === px0 ||
        x === px1 ||
        z === pz0 ||
        z === pz1 ||
        Math.round(Math.hypot(x - m.cx, (z - m.cz) * 1.4)) === 3 ||
        // The two penalty areas.
        ((x < px0 + 3 || x > px1 - 3) && Math.abs(z - m.cz) <= 4 && (Math.abs(z - m.cz) === 4 || x === px0 + 3 || x === px1 - 3));
      m.put(x, m.g, z, line ? white : grass);
      for (let h = 1; h <= 6; h++) m.put(x, m.g + h, z, 0);
    }
  }
  // Goals at each end.
  for (const x of [px0, px1]) {
    for (let dz = -1; dz <= 1; dz++) m.put(x, m.g + 1, m.cz + dz, white);
    for (let dz = -1; dz <= 1; dz++) m.put(x, m.g + 2, m.cz + dz, dz === 0 ? white : 0);
  }
  // Four stands, stepping up close to the touchline — rubro-negro, in bands.
  for (let ring = 1; ring <= tiers; ring++) {
    const x0 = px0 - ring;
    const x1 = px1 + ring;
    const z0 = pz0 - ring;
    const z1 = pz1 + ring;
    for (let x = x0; x <= x1; x++) {
      for (let z = z0; z <= z1; z++) {
        if (x !== x0 && x !== x1 && z !== z0 && z !== z1) continue;
        const seat = ring % 2 === 0 ? black : red;
        for (let y = 1; y <= ring; y++) m.put(x, m.g + y, z, y === ring ? seat : cobble);
      }
    }
  }
  // The outer wall: dark, with a band of glass around the concourse.
  const wx0 = px0 - tiers - 1;
  const wx1 = px1 + tiers + 1;
  const wz0 = pz0 - tiers - 1;
  const wz1 = pz1 + tiers + 1;
  for (let x = wx0; x <= wx1; x++) {
    for (let z = wz0; z <= wz1; z++) {
      if (x !== wx0 && x !== wx1 && z !== wz0 && z !== wz1) continue;
      for (let y = 1; y <= m.up(30); y++) {
        const band = y === m.up(18) || y === m.up(18) + 1;
        m.put(x, m.g + y, z, band ? glass : black);
      }
      // The club's red runs round the top of the facade.
      m.put(x, m.g + m.up(30) + 1, z, red);
    }
  }
  // The first retractable roof in South America, and here it really works:
  // two panels ride in from the rims on sticky pistons when the lever goes on.
  const roofY = m.g + Math.max(5, m.up(40));
  // The fixed edge of the roof, over the stands.
  for (let x = wx0; x <= wx1; x++) {
    for (let z = wz0; z <= wz1; z++) {
      const overStands = Math.abs(z - m.cz) > Math.floor(pitchZ / 2) + 1 || Math.abs(x - m.cx) > Math.floor(pitchX / 2) + 1;
      if (overStands) m.put(x, roofY, z, (x + z) % 7 === 0 ? white : glass);
    }
  }
  const openX = Math.floor(pitchX / 2);
  const openZ = Math.floor(pitchZ / 2) + 1;
  slidingRoof(m, {
    x0: m.cx - openX,
    x1: m.cx + openX,
    zNorth: m.cz - openZ,
    zSouth: m.cz + openZ,
    y: roofY,
    reach: openZ,
    panel: white,
    groundY: m.g,
    minZ: m.z0,
    step: black,
  });
  // Floodlight masts at the corners.
  if (m.kit.lamp !== null) {
    for (const x of [wx0, wx1]) for (const z of [wz0, wz1]) m.put(x, roofY + 1, z, m.kit.lamp);
  }
  box(m, wx0, m.g, wz0, wx0, m.g, wz1, cobble);
}
