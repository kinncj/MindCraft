/** Big blocky letters on a plinth: a city name, or a kid's own name. */

import { drawText, textWidth } from './font';
import { plaza } from './shapes';
import type { Monument, MonumentDraw } from './types';

export const sign: Monument = {
  id: 'sign',
  label: 'Big Letters',
  emoji: '🔤',
  place: 'anywhere',
  width: 25,
  depth: 5,
  height: 8,
  blurb: 'Big blocky letters you can read from far away!',
  // As wide as the word: "HI" needs far less ground than "SAO PAULO".
  footprint: (ctx: { text?: string }) => ({ width: Math.max(9, textWidth(ctx.text ?? 'HELLO') + 4), depth: 5 }),
  real: {
    height: 6,
    width: 20,
    depth: 2,
    source: 'Letters about as tall as a house',
  },
  draw,
};

function draw(m: MonumentDraw): void {
  const { white } = m.kit;
  const palette = [m.kit.red, m.kit.yellow, m.kit.green, m.kit.blue, m.kit.pink];
  const text = m.ctx.text ?? 'HELLO';
  const width = textWidth(text);
  const startX = m.cx - Math.floor(width / 2);
  plaza(m, m.kit.cobble);
  drawText(text, (column, row) => {
    const x = startX + column;
    const y = m.g + 5 - row; // the letters stand on the plinth, not above it
    const colour = m.ctx.color ?? palette[Math.floor(column / 6) % palette.length];
    m.put(x, y, m.cz, colour);
    m.put(x, y, m.cz + 1, colour);
  });
  for (let x = startX - 1; x <= startX + width; x++) {
    for (let z = m.cz - 1; z <= m.cz + 2; z++) m.put(x, m.g, z, white);
  }
}
