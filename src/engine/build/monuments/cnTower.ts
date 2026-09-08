/** A tapering concrete shaft, a round pod near the top, a long spire. */

import { box, circle, disc, plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const cnTower: Monument = {
  id: 'cn_tower',
  label: 'CN Tower',
  emoji: '🗼',
  place: 'Toronto, Canada',
  width: 9,
  depth: 9,
  height: 52,
  blurb: 'So tall you can see the whole lake from the top!',
  real: {
    height: 553,
    width: 66,
    depth: 66,
    levels: { pod: 346, skyPod: 447, antenna: 457 },
    source: 'CN Tower: 553.3 m, main pod 346 m, SkyPod 447 m',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const { concrete, glass, white, lamp } = m.kit;
  plaza(m, m.kit.cobble);
  // 553 m to the tip, the main pod at 346 m, the SkyPod at 447 m, and the
  // concrete shaft ending at 457 m where the antenna takes over.
  const spire = m.g + m.up(553);
  const top = m.g + m.up(457);
  const pod = m.g + m.up(346);
  const skyPod = m.g + m.up(447);
  for (let y = m.g + 1; y <= top; y++) {
    const t = (y - m.g) / (top - m.g);
    const r = y < m.g + 7 ? 2 : 1;
    box(m, m.cx - r, y, m.cz - r, m.cx + r, y, m.cz + r, concrete);
    // Three fins flaring out at the bottom, like the real base.
    if (t < 0.18) {
      const fin = Math.round((1 - t / 0.18) * 4);
      for (let i = 0; i <= fin; i++) {
        m.put(m.cx + r + i, y, m.cz, concrete);
        m.put(m.cx - r - i, y, m.cz - i, concrete);
        m.put(m.cx - r - i, y, m.cz + i, concrete);
      }
    }
  }
  // The main pod: a glass ring with a white floor and roof.
  for (let y = pod; y <= pod + 4; y++) {
    const lip = y === pod || y === pod + 4;
    if (lip) disc(m, m.cx, y, m.cz, 4, white);
    else circle(m, m.cx, y, m.cz, 5, glass);
  }
  // The little sky pod above it.
  for (let y = skyPod; y <= skyPod + 2; y++) {
    if (y === skyPod + 1) circle(m, m.cx, y, m.cz, 2, glass);
    else disc(m, m.cx, y, m.cz, 2, white);
  }
  for (let y = top + 1; y <= spire; y++) m.put(m.cx, y, m.cz, white);
  if (lamp !== null) m.put(m.cx, spire + 1, m.cz, lamp);
}
