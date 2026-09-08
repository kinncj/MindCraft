/**
 * Procedural 16×16 pixel textures, painted on canvases at startup. All art
 * is original: chunky pixels with our own palettes. Each texture key maps
 * to a painter and a seed so tiles look identical on every load.
 *
 * If 2D canvas is unavailable (jsdom), painting returns null and callers
 * fall back to flat colors.
 */

export const TILE_SIZE = 16;
const SIZE = TILE_SIZE;

type Rand = () => number;
type Ctx = CanvasRenderingContext2D;
export type Painter = (ctx: Ctx, rand: Rand) => void;

function lcg(seed: number): Rand {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function px(ctx: Ctx, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function pick<T>(rand: Rand, options: T[]): T {
  return options[Math.floor(rand() * options.length)];
}

function noiseFill(ctx: Ctx, rand: Rand, palette: string[]): void {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) px(ctx, x, y, pick(rand, palette));
  }
}

function speckle(ctx: Ctx, rand: Rand, color: string, count: number): void {
  for (let i = 0; i < count; i++) px(ctx, Math.floor(rand() * SIZE), Math.floor(rand() * SIZE), color);
}

/** Lighten/darken a hex color by a factor (1.1 = 10% lighter). */
export function shade(hex: string, factor: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.max(0, Math.min(255, Math.round(v * factor))),
  );
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

const GRASS_GREENS = ['#5fb636', '#67c23a', '#72cf45', '#58a933', '#6cc93e'];
const DIRT_BROWNS = ['#9c6b3c', '#a0703c', '#8a5f33', '#b07d46', '#96683a'];
const STONE_GRAYS = ['#9aa2ab', '#8f979f', '#a4acb5', '#99a1aa'];
const LEAF_GREENS = ['#3faf5c', '#37a052', '#4cbd68', '#2f9149'];
const CARDBOARD = ['#c99a63', '#c3945e', '#cf9f68', '#c69760'];
const TAPE = ['#a87f4d', '#a37a49', '#ad8451'];

// --- Ground ---------------------------------------------------------------

const grassTop: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, GRASS_GREENS);
  speckle(ctx, rand, '#8ed75f', 10);
};
const dirt: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, DIRT_BROWNS);
  speckle(ctx, rand, '#7a5230', 7);
};
const grassSide: Painter = (ctx, rand) => {
  dirt(ctx, rand);
  for (let x = 0; x < SIZE; x++) {
    const depth = 3 + Math.floor(rand() * 3);
    for (let y = 0; y < depth; y++) px(ctx, x, y, pick(rand, GRASS_GREENS));
  }
};
const stone: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, STONE_GRAYS);
  for (let i = 0; i < 5; i++) {
    let x = Math.floor(rand() * SIZE);
    let y = Math.floor(rand() * SIZE);
    for (let step = 0; step < 4; step++) {
      px(ctx, x % SIZE, y % SIZE, '#7c848d');
      x += rand() > 0.5 ? 1 : 0;
      y += 1;
    }
  }
};
const deepStone: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#6f7680', '#67707a', '#767d87']);
  speckle(ctx, rand, '#59616b', 8);
};
const sand: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#ecd9a3', '#e6d29a', '#f2e0ad', '#e9d6a0']);
  speckle(ctx, rand, '#d9c288', 8);
};
const gravel: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#a8a39c', '#9d9891', '#b3aea6', '#8f8a83']);
  speckle(ctx, rand, '#7d7871', 10);
};
const clay: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#a9a5b8', '#a19db0', '#b1adc0']);
};
const snow: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#f4f7fb', '#eef3f9', '#ffffff', '#f8fbfe']);
  speckle(ctx, rand, '#dde8f2', 6);
};
const snowSide: Painter = (ctx, rand) => {
  dirt(ctx, rand);
  for (let x = 0; x < SIZE; x++) {
    const depth = 3 + Math.floor(rand() * 3);
    for (let y = 0; y < depth; y++) px(ctx, x, y, pick(rand, ['#f4f7fb', '#ffffff', '#eef3f9']));
  }
};
const ice: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#bfe0f5', '#b6dbf2', '#c8e6f8']);
  for (let i = 0; i < 4; i++) {
    let x = Math.floor(rand() * SIZE);
    let y = Math.floor(rand() * SIZE);
    for (let step = 0; step < 5; step++) {
      px(ctx, x % SIZE, y % SIZE, '#e6f5fd');
      x += 1;
      y += rand() > 0.5 ? 1 : 0;
    }
  }
  px(ctx, 3, 3, '#ffffff');
  px(ctx, 12, 10, '#ffffff');
};
const moss: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#4f8f3a', '#478234', '#589d41']);
  speckle(ctx, rand, '#6db24f', 10);
};

// --- Building -------------------------------------------------------------

const cobblestone: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#848b93', '#7c838b']);
  const stones = ['#99a1aa', '#8f979f', '#a4acb5'];
  for (const [cx, cy] of [[3, 3], [10, 2], [5, 9], [12, 8], [2, 13], [9, 13]] as const) {
    ctx.fillStyle = pick(rand, stones);
    ctx.fillRect(cx - 1, cy, 4, 3);
    ctx.fillRect(cx, cy - 1, 2, 5);
  }
};
const stoneBricks: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#7e868f', '#767e87']);
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    const offset = row % 2 === 0 ? 0 : 4;
    for (let col = -1; col < 3; col++) {
      const x = col * 8 + offset;
      ctx.fillStyle = pick(rand, ['#9aa2ab', '#939ba4', '#a1a9b2']);
      ctx.fillRect(Math.max(x, 0), y, Math.min(7, x + 7 < SIZE ? 7 : SIZE - x), 3);
    }
  }
};
function planksPainter(light: string[], seam: string, nail: string): Painter {
  return (ctx, rand) => {
    for (let y = 0; y < SIZE; y++) {
      const isSeam = y % 4 === 3;
      for (let x = 0; x < SIZE; x++) px(ctx, x, y, isSeam ? seam : pick(rand, light));
    }
    px(ctx, 2, 1, nail);
    px(ctx, 13, 5, nail);
    px(ctx, 2, 9, nail);
    px(ctx, 13, 13, nail);
  };
}
const planks = planksPainter(['#d3a35e', '#cc9c57', '#dbaa64'], '#a87c42', '#8a6238');
const birchPlanks = planksPainter(['#e8d9b0', '#e2d3a8', '#eee0b8'], '#c2b088', '#a89468');
function logSide(colors: string[], seam: string): Painter {
  return (ctx, rand) => {
    for (let x = 0; x < SIZE; x++) {
      const isSeam = x % 4 === 3;
      for (let y = 0; y < SIZE; y++) px(ctx, x, y, isSeam ? seam : pick(rand, colors));
    }
  };
}
function logTop(colors: string[], ring: string, core: string): Painter {
  return (ctx, rand) => {
    noiseFill(ctx, rand, colors);
    ctx.strokeStyle = ring;
    for (const r of [2, 4, 6]) ctx.strokeRect(7.5 - r, 7.5 - r, r * 2 + 1, r * 2 + 1);
    px(ctx, 7, 7, core);
    px(ctx, 8, 8, core);
  };
}
const woodSide = logSide(['#c98d4b', '#c2874a', '#d09553'], '#9c6a35');
const woodTop = logTop(['#dba362', '#d69d5c', '#e0a967'], '#a97a3f', '#8a5f33');
const birchSide: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#ecebe4', '#e4e3dc', '#f2f1ea']);
  for (let i = 0; i < 7; i++) {
    const y = Math.floor(rand() * SIZE);
    const x = Math.floor(rand() * 12);
    ctx.fillStyle = '#3d3a33';
    ctx.fillRect(x, y, 2 + Math.floor(rand() * 3), 1);
  }
};
const birchTop = logTop(['#e8d9b0', '#e2d3a8', '#eee0b8'], '#c2b088', '#a89468');
const brick: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#d7c8b8', '#d2c3b3']);
  const bricks = ['#d0614e', '#c65a48', '#d96955'];
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    const offset = row % 2 === 0 ? 0 : 4;
    for (let col = -1; col < 3; col++) {
      const x = col * 8 + offset;
      ctx.fillStyle = pick(rand, bricks);
      ctx.fillRect(Math.max(x, 0), y, Math.min(7, x + 7 < SIZE ? 7 : SIZE - x), 3);
    }
  }
};
const glass: Painter = (ctx) => {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = 'rgba(210, 236, 246, 0.95)';
  ctx.fillRect(0, 0, SIZE, 1);
  ctx.fillRect(0, SIZE - 1, SIZE, 1);
  ctx.fillRect(0, 0, 1, SIZE);
  ctx.fillRect(SIZE - 1, 0, 1, SIZE);
  ctx.fillStyle = 'rgba(191, 230, 245, 0.25)';
  ctx.fillRect(1, 1, SIZE - 2, SIZE - 2);
  for (let i = 0; i < 6; i++) {
    px(ctx, 3 + i, 9 - i, 'rgba(255,255,255,0.6)');
    px(ctx, 8 + i, 13 - i, 'rgba(255,255,255,0.45)');
  }
};
/** Solid color blocks for kids: soft wool-like noise around one hue. */
export function colorBlock(hex: string): Painter {
  const palette = [hex, shade(hex, 0.94), shade(hex, 1.06), shade(hex, 0.97)];
  return (ctx, rand) => {
    noiseFill(ctx, rand, palette);
    for (let y = 0; y < SIZE; y += 4) for (let x = (y / 4) % 2; x < SIZE; x += 4) px(ctx, x, y, shade(hex, 0.9));
  };
}
const roofTiles: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#b6442f', '#ad3f2c']);
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    const offset = row % 2 === 0 ? 0 : 4;
    for (let x = offset; x < SIZE + 4; x += 8) {
      ctx.fillStyle = pick(rand, ['#d0614e', '#c85a47', '#d8695a']);
      ctx.fillRect(x - 4 < 0 ? 0 : x - 4, y, 7, 3);
      px(ctx, Math.min(x + 2, SIZE - 1), y + 3, '#8f3221');
    }
  }
};

const sandstone: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#e2cf96', '#dcc88e', '#e8d5a0']);
  for (let y = 3; y < SIZE; y += 5) for (let x = 0; x < SIZE; x++) if (rand() > 0.3) px(ctx, x, y, '#cdb87c');
};
const sandstoneTop: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#e8d5a0', '#e2cf96', '#eddaa6']);
  speckle(ctx, rand, '#cdb87c', 8);
};
const hay: Painter = (ctx, rand) => {
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) px(ctx, x, y, pick(rand, ['#d9b53c', '#cfa932', '#e2bf46', '#c69f2c']));
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(0, 4, SIZE, 1);
  ctx.fillRect(0, 11, SIZE, 1);
};
const hayTop: Painter = (ctx, rand) => {
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) px(ctx, x, y, pick(rand, ['#e2bf46', '#d9b53c', '#cfa932']));
  ctx.strokeStyle = '#a8852a';
  for (const r of [2, 5]) ctx.strokeRect(7.5 - r, 7.5 - r, r * 2 + 1, r * 2 + 1);
};
const ladder: Painter = (ctx) => {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#c98d4b';
  ctx.fillRect(2, 0, 2, SIZE);
  ctx.fillRect(12, 0, 2, SIZE);
  ctx.fillStyle = '#a97a3f';
  for (let y = 2; y < SIZE; y += 4) ctx.fillRect(2, y, 12, 2);
};

// --- Nature ---------------------------------------------------------------

const leaves: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, LEAF_GREENS);
  speckle(ctx, rand, '#256e38', 12);
  speckle(ctx, rand, '#5cc878', 6);
};
const birchLeaves: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#7fcf5c', '#74c453', '#8ad866', '#6cb84c']);
  speckle(ctx, rand, '#4f9c3a', 10);
};
const pinkLeaves: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#f4a6c8', '#f09bc0', '#f8b4d2', '#eb8fb6']);
  speckle(ctx, rand, '#d86f9c', 10);
  speckle(ctx, rand, '#ffd6ea', 6);
};
function flowerCross(petal: string, center: string): Painter {
  return (ctx) => {
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#4f9c3a';
    ctx.fillRect(7, 8, 2, 8);
    px(ctx, 5, 11, '#4f9c3a');
    px(ctx, 6, 10, '#4f9c3a');
    px(ctx, 10, 12, '#4f9c3a');
    px(ctx, 9, 11, '#4f9c3a');
    ctx.fillStyle = petal;
    ctx.fillRect(5, 4, 6, 5);
    ctx.fillRect(6, 3, 4, 7);
    ctx.fillStyle = center;
    ctx.fillRect(7, 5, 2, 2);
  };
}
const flowerPink = flowerCross('#f291bb', '#fff3b0');
const flowerYellow = flowerCross('#ffd94a', '#e07b39');
const flowerBlue = flowerCross('#6aa8f0', '#fff3b0');
const flowerRed = flowerCross('#e8574f', '#ffd94a');
const tallGrass: Painter = (ctx, rand) => {
  ctx.clearRect(0, 0, SIZE, SIZE);
  for (let i = 0; i < 9; i++) {
    const x = 1 + Math.floor(rand() * 14);
    const h = 5 + Math.floor(rand() * 9);
    ctx.fillStyle = pick(rand, GRASS_GREENS);
    ctx.fillRect(x, SIZE - h, 1, h);
  }
};
const mushroom: Painter = (ctx) => {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#f2e6d0';
  ctx.fillRect(6, 9, 4, 7);
  ctx.fillStyle = '#e8574f';
  ctx.fillRect(3, 5, 10, 5);
  ctx.fillRect(4, 4, 8, 1);
  ctx.fillStyle = '#ffffff';
  px(ctx, 5, 6, '#ffffff');
  px(ctx, 9, 5, '#ffffff');
  px(ctx, 11, 8, '#ffffff');
  px(ctx, 7, 8, '#ffffff');
};
const cactusSide: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#4f9c3a', '#479234', '#57a742']);
  for (let y = 0; y < SIZE; y += 3) {
    px(ctx, 0, y, '#2f6e24');
    px(ctx, 15, y + 1, '#2f6e24');
    px(ctx, 5, y + 2, '#2f6e24');
    px(ctx, 10, y, '#2f6e24');
  }
};
const cactusTop: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#57a742', '#4f9c3a']);
  ctx.fillStyle = '#7fcf5c';
  ctx.fillRect(4, 4, 8, 8);
};
const pumpkinSide: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#f2903c', '#e98632', '#f79a46']);
  for (let x = 2; x < SIZE; x += 5) for (let y = 0; y < SIZE; y++) px(ctx, x, y, '#c96f25');
};
const pumpkinTop: Painter = (ctx, rand) => {
  pumpkinSide(ctx, rand);
  ctx.fillStyle = '#4f9c3a';
  ctx.fillRect(7, 6, 2, 4);
};
const water: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#4fa8e8', '#4aa0df', '#55aeee']);
  for (let y = 2; y < SIZE; y += 5) {
    for (let x = 0; x < SIZE; x++) if ((x + y) % 7 < 3) px(ctx, x, y + ((x / 4) % 2 | 0), '#7cc2f2');
  }
};
const cloud: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#f4f8fc', '#eef4fa', '#ffffff']);
  speckle(ctx, rand, '#e2ecf6', 8);
};
const RAINBOW_BANDS = ['#e8574f', '#f2903c', '#ffd94a', '#67c23a', '#4fa8e8', '#7a6bd8', '#e85fa8'];
const rainbow: Painter = (ctx, rand) => {
  for (let y = 0; y < SIZE; y++) {
    const band = RAINBOW_BANDS[Math.floor((y / SIZE) * RAINBOW_BANDS.length)];
    for (let x = 0; x < SIZE; x++) px(ctx, x, y, band);
  }
  speckle(ctx, rand, '#ffffff', 5);
};
const STAR_SHAPE = [
  '       ##       ',
  '       ##       ',
  '      ####      ',
  '      ####      ',
  '  ############  ',
  '   ##########   ',
  '    ########    ',
  '     ######     ',
  '    ########    ',
  '   ###    ###   ',
  '  ##        ##  ',
];
const star: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#ffd94a', '#fbd344', '#ffde5c']);
  STAR_SHAPE.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') px(ctx, x, y + 2, '#fff8d0');
  });
  px(ctx, 2, 2, '#ffffff');
  px(ctx, 13, 12, '#ffffff');
};

// --- Light ----------------------------------------------------------------

const light: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#fff2a8', '#ffefa0', '#fff5b4']);
  ctx.fillStyle = '#fffbe0';
  ctx.fillRect(5, 5, 6, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(7, 7, 2, 2);
};
const torchSide: Painter = (ctx) => {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(7, 6, 2, 10);
  ctx.fillStyle = '#ffb03c';
  ctx.fillRect(6, 2, 4, 4);
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(7, 3, 2, 2);
  px(ctx, 7, 4, '#fff3b0');
};
const torchTop: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#ffb03c', '#f2a032']);
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(5, 5, 6, 6);
  ctx.fillStyle = '#fff3b0';
  ctx.fillRect(7, 7, 2, 2);
};
const lantern: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#3a3226', '#443a2c']);
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(4, 4, 8, 9);
  ctx.fillStyle = '#fff3b0';
  ctx.fillRect(6, 6, 4, 5);
  ctx.fillStyle = '#6b4a26';
  ctx.fillRect(4, 3, 8, 1);
  ctx.fillRect(4, 13, 8, 1);
  ctx.fillRect(7, 1, 2, 2);
};
const campfireTop: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#6b4a26', '#5f4222']);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(0, 6, 16, 4);
  ctx.fillRect(6, 0, 4, 16);
  ctx.fillStyle = '#e07b39';
  ctx.fillRect(5, 5, 6, 6);
  ctx.fillStyle = '#ffb03c';
  ctx.fillRect(6, 6, 4, 4);
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(7, 7, 2, 2);
};
const campfireSide: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#5f4222', '#553b1e']);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(1, 10, 5, 5);
  ctx.fillRect(10, 10, 5, 5);
  ctx.fillStyle = '#c98d4b';
  ctx.fillRect(2, 11, 3, 3);
  ctx.fillRect(11, 11, 3, 3);
  ctx.fillStyle = '#ffb03c';
  ctx.fillRect(6, 3, 4, 7);
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(7, 5, 2, 4);
};
const glowCrystal: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#b8f0ff', '#a8e8fc', '#c8f6ff']);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(4, 4, 3, 3);
  ctx.fillRect(9, 8, 3, 4);
  ctx.fillRect(6, 10, 2, 2);
};

// --- Furniture ------------------------------------------------------------

const bedTop: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#e8574f', '#e04f47', '#ef6058']);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(1, 1, 14, 5);
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(2, 2, 12, 3);
  for (let y = 7; y < SIZE; y += 3) for (let x = 1; x < SIZE; x += 4) px(ctx, x, y, '#ffd94a');
};
const bedSide: Painter = (ctx, rand) => {
  planks(ctx, rand);
  ctx.fillStyle = '#e8574f';
  ctx.fillRect(0, 4, 16, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 4, 16, 2);
};
const table: Painter = (ctx, rand) => {
  planks(ctx, rand);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(1, 5, 2, 11);
  ctx.fillRect(13, 5, 2, 11);
};
const chair: Painter = (ctx, rand) => {
  planks(ctx, rand);
  ctx.fillStyle = '#4a7fd6';
  ctx.fillRect(3, 6, 10, 4);
};
const bookshelf: Painter = (ctx, rand) => {
  planks(ctx, rand);
  const books = ['#e8574f', '#4a7fd6', '#67c23a', '#ffd94a', '#c48ae0', '#f2903c'];
  for (const row of [2, 9]) {
    ctx.fillStyle = '#5a3d1e';
    ctx.fillRect(1, row - 1, 14, 6);
    for (let x = 2; x < 14; x += 2) {
      ctx.fillStyle = pick(rand, books);
      ctx.fillRect(x, row, 2, 4 + (rand() > 0.5 ? 1 : 0));
    }
  }
};
const tv: Painter = (ctx) => {
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#4a7fd6';
  ctx.fillRect(2, 2, 12, 9);
  ctx.fillStyle = '#8ed75f';
  ctx.fillRect(3, 7, 10, 4);
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(10, 3, 3, 3);
  ctx.fillStyle = '#555555';
  ctx.fillRect(6, 12, 4, 3);
};
const painting: Painter = (ctx) => {
  ctx.fillStyle = '#c98d4b';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#aee3ff';
  ctx.fillRect(2, 2, 12, 12);
  ctx.fillStyle = '#67c23a';
  ctx.fillRect(2, 10, 12, 4);
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(9, 4, 3, 3);
  ctx.fillStyle = '#e8574f';
  ctx.fillRect(4, 7, 4, 4);
};
const cake: Painter = (ctx) => {
  ctx.fillStyle = '#f8e5c8';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, SIZE, 5);
  ctx.fillStyle = '#e8574f';
  for (let x = 1; x < SIZE; x += 4) ctx.fillRect(x, 4, 2, 2);
  ctx.fillStyle = '#d0614e';
  ctx.fillRect(0, 9, SIZE, 2);
};
const flowerPot: Painter = (ctx) => {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#c96f25';
  ctx.fillRect(4, 9, 8, 7);
  ctx.fillRect(3, 8, 10, 2);
  ctx.fillStyle = '#4f9c3a';
  ctx.fillRect(7, 3, 2, 6);
  ctx.fillStyle = '#f291bb';
  ctx.fillRect(5, 1, 6, 4);
  ctx.fillStyle = '#fff3b0';
  ctx.fillRect(7, 2, 2, 2);
};

const tvOn: Painter = (ctx) => {
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#aee3ff';
  ctx.fillRect(2, 2, 12, 9);
  ctx.fillStyle = '#8ed75f';
  ctx.fillRect(3, 8, 10, 3);
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(9, 3, 3, 3);
  ctx.fillStyle = '#f291bb';
  ctx.fillRect(4, 4, 3, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(3, 3, 1, 1);
  ctx.fillStyle = '#555555';
  ctx.fillRect(6, 12, 4, 3);
};
const lamp: Painter = (ctx) => {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#f4e7c3';
  ctx.fillRect(3, 1, 10, 6);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(7, 7, 2, 7);
  ctx.fillRect(4, 14, 8, 2);
};
const lampOn: Painter = (ctx) => {
  lamp(ctx, () => 0);
  ctx.fillStyle = '#fff2a8';
  ctx.fillRect(3, 1, 10, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(6, 3, 4, 2);
};
const stove: Painter = (ctx) => {
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(2, 5, 12, 8);
  ctx.fillStyle = '#ffb03c';
  ctx.fillRect(4, 7, 8, 4);
  ctx.fillStyle = '#8a8a8a';
  for (let x = 3; x < 13; x += 3) ctx.fillRect(x, 2, 2, 2);
};
const stoveTop: Painter = (ctx) => {
  ctx.fillStyle = '#d8d8d8';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#3a3a3a';
  for (const [x, y] of [[2, 2], [9, 2], [2, 9], [9, 9]]) ctx.fillRect(x, y, 5, 5);
  ctx.fillStyle = '#e8574f';
  ctx.fillRect(3, 3, 3, 3);
};
const fridge: Painter = (ctx) => {
  ctx.fillStyle = '#eef2f5';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#c9d3da';
  ctx.fillRect(0, 6, SIZE, 1);
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(12, 2, 1, 3);
  ctx.fillRect(12, 8, 1, 6);
  ctx.fillStyle = '#f291bb';
  ctx.fillRect(3, 9, 3, 3);
};
const fridgeTop: Painter = (ctx) => {
  ctx.fillStyle = '#eef2f5';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#c9d3da';
  ctx.fillRect(1, 1, 14, 14);
};
const sink: Painter = (ctx) => {
  ctx.fillStyle = '#dfe6ea';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#b8c4cc';
  ctx.fillRect(2, 10, 12, 4);
};
const sinkTop: Painter = (ctx) => {
  ctx.fillStyle = '#dfe6ea';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#4fa8e8';
  ctx.fillRect(3, 4, 10, 8);
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(7, 1, 2, 4);
};
function cardPainter(bg: string, draw: (ctx: Ctx) => void): Painter {
  return (ctx) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1, 1, 14, 14);
    draw(ctx);
  };
}
const carCard = cardPainter('#e8574f', (ctx) => {
  ctx.fillStyle = '#e8574f';
  ctx.fillRect(2, 7, 12, 5);
  ctx.fillRect(4, 4, 8, 3);
  ctx.fillStyle = '#aee3ff';
  ctx.fillRect(5, 5, 6, 2);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(3, 11, 3, 3);
  ctx.fillRect(10, 11, 3, 3);
});
const boatCard = cardPainter('#4fa8e8', (ctx) => {
  ctx.fillStyle = '#c98d4b';
  ctx.fillRect(2, 9, 12, 4);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(7, 2, 1, 7);
  ctx.fillStyle = '#e8574f';
  ctx.fillRect(8, 3, 5, 5);
  ctx.fillStyle = '#4fa8e8';
  ctx.fillRect(1, 13, 14, 2);
});
const motorcycleCard = cardPainter('#2f6fd6', (ctx) => {
  ctx.fillStyle = '#2f6fd6';
  ctx.fillRect(4, 7, 8, 3);
  ctx.fillRect(6, 5, 4, 2);
  ctx.fillStyle = '#777777';
  ctx.fillRect(10, 4, 3, 1);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(2, 9, 4, 4);
  ctx.fillRect(10, 9, 4, 4);
  ctx.fillStyle = '#fff3b0';
  ctx.fillRect(12, 7, 2, 2);
});
const planeCard = cardPainter('#4fa8e8', (ctx) => {
  ctx.fillStyle = '#4fa8e8';
  ctx.fillRect(1, 1, 14, 14);
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(2, 7, 12, 3);
  ctx.fillRect(6, 3, 3, 10);
  ctx.fillRect(2, 5, 2, 2);
  ctx.fillStyle = '#e8574f';
  ctx.fillRect(13, 7, 2, 3);
  ctx.fillStyle = '#aee3ff';
  ctx.fillRect(10, 8, 2, 1);
});
const helicopterCard = cardPainter('#4fa8e8', (ctx) => {
  ctx.fillStyle = '#4fa8e8';
  ctx.fillRect(1, 1, 14, 14);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(2, 3, 12, 1);
  ctx.fillRect(8, 4, 1, 2);
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(5, 6, 7, 5);
  ctx.fillRect(1, 7, 4, 2);
  ctx.fillStyle = '#aee3ff';
  ctx.fillRect(9, 7, 2, 2);
  ctx.fillStyle = '#777777';
  ctx.fillRect(4, 12, 9, 1);
});
const dogCard = cardPainter('#c98d4b', (ctx) => {
  ctx.fillStyle = '#c98d4b';
  ctx.fillRect(4, 5, 8, 7);
  ctx.fillRect(2, 4, 3, 5);
  ctx.fillRect(11, 4, 3, 5);
  ctx.fillStyle = '#3a3226';
  ctx.fillRect(6, 7, 1, 1);
  ctx.fillRect(9, 7, 1, 1);
  ctx.fillRect(7, 9, 2, 1);
});
const catCard = cardPainter('#f2903c', (ctx) => {
  ctx.fillStyle = '#f2903c';
  ctx.fillRect(4, 6, 8, 6);
  ctx.fillRect(4, 3, 2, 3);
  ctx.fillRect(10, 3, 2, 3);
  ctx.fillStyle = '#67c23a';
  ctx.fillRect(6, 8, 1, 1);
  ctx.fillRect(9, 8, 1, 1);
  ctx.fillStyle = '#f291bb';
  ctx.fillRect(7, 10, 2, 1);
});
const villagerCard = cardPainter('#4a7fd6', (ctx) => {
  ctx.fillStyle = '#f2c79a';
  ctx.fillRect(5, 3, 6, 5);
  ctx.fillStyle = '#6b4a26';
  ctx.fillRect(5, 2, 6, 2);
  ctx.fillStyle = '#4a7fd6';
  ctx.fillRect(4, 8, 8, 6);
  ctx.fillStyle = '#3a3226';
  ctx.fillRect(6, 5, 1, 1);
  ctx.fillRect(9, 5, 1, 1);
});

const robotCard = cardPainter('#9aa2ab', (ctx) => {
  ctx.fillStyle = '#9aa2ab';
  ctx.fillRect(4, 4, 8, 8);
  ctx.fillStyle = '#b8f0ff';
  ctx.fillRect(5, 6, 2, 2);
  ctx.fillRect(9, 6, 2, 2);
  ctx.fillStyle = '#e8574f';
  ctx.fillRect(7, 1, 2, 3);
  ctx.fillStyle = '#3a3a3a';
  ctx.fillRect(5, 12, 2, 3);
  ctx.fillRect(9, 12, 2, 3);
});
const craftingTop: Painter = (ctx, rand) => {
  planks(ctx, rand);
  ctx.fillStyle = '#6b4a26';
  for (const [x, y] of [[2, 2], [9, 2], [2, 9], [9, 9]]) ctx.strokeRect(x + 0.5, y + 0.5, 4, 4);
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(3, 3, 3, 3);
  ctx.fillStyle = '#e8574f';
  ctx.fillRect(10, 10, 3, 3);
};
const craftingSide: Painter = (ctx, rand) => {
  planks(ctx, rand);
  ctx.fillStyle = '#8a8a8a';
  ctx.fillRect(3, 4, 2, 6);
  ctx.fillStyle = '#6b4a26';
  ctx.fillRect(9, 5, 4, 2);
};
const lever: Painter = (ctx) => {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#848b93';
  ctx.fillRect(4, 10, 8, 5);
  ctx.fillStyle = '#8a6238';
  ctx.fillRect(7, 2, 2, 9);
  ctx.fillStyle = '#e8574f';
  ctx.fillRect(6, 1, 4, 3);
};
const button: Painter = (ctx) => {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#9aa2ab';
  ctx.fillRect(4, 9, 8, 6);
  ctx.fillStyle = '#b4bcc4';
  ctx.fillRect(5, 10, 6, 2);
};
const plate: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#b4bcc4', '#a8b0b8']);
  ctx.strokeStyle = '#7c848d';
  ctx.strokeRect(1.5, 1.5, 13, 13);
};
const wire: Painter = (ctx) => {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#7a1c15';
  ctx.fillRect(6, 0, 4, SIZE);
  ctx.fillRect(0, 6, SIZE, 4);
};
const repeater: Painter = (ctx) => {
  ctx.fillStyle = '#b9c0c8';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#8f979f';
  ctx.fillRect(0, 0, SIZE, 2);
  ctx.fillRect(0, SIZE - 2, SIZE, 2);
  ctx.fillStyle = '#7a1c15';
  ctx.fillRect(6, 0, 4, SIZE); // the line running through it
  ctx.fillStyle = '#3a3226';
  ctx.fillRect(4, 4, 3, 3); // the little torches that make it a repeater
  ctx.fillRect(9, 9, 3, 3);
};
const repeaterOn: Painter = (ctx) => {
  ctx.fillStyle = '#c8cfd7';
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#ff3b2f';
  ctx.fillRect(6, 0, 4, SIZE);
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(4, 4, 3, 3);
  ctx.fillRect(9, 9, 3, 3);
};
const wireOn: Painter = (ctx) => {
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.fillStyle = '#ff3b2f';
  ctx.fillRect(6, 0, 4, SIZE);
  ctx.fillRect(0, 6, SIZE, 4);
  ctx.fillStyle = '#ffb3ad';
  ctx.fillRect(7, 7, 2, 2);
};
const logicLamp: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#7a6f4a', '#6f6442']);
  ctx.fillStyle = '#9c8f5f';
  ctx.fillRect(3, 3, 10, 10);
};
const logicLampOn: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#fff2a8', '#ffefa0']);
  ctx.fillStyle = '#fffbe0';
  ctx.fillRect(3, 3, 10, 10);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(6, 6, 4, 4);
};
const pistonSide: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#9aa2ab', '#8f979f']);
  ctx.fillStyle = '#d3a35e';
  ctx.fillRect(0, 0, SIZE, 4);
  ctx.fillStyle = '#5c636b';
  ctx.fillRect(2, 6, 12, 8);
};
const pistonBack: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, ['#8f979f', '#848b93']);
  ctx.fillStyle = '#5c636b';
  ctx.fillRect(4, 4, 8, 8);
};
const pistonFace: Painter = (ctx, rand) => {
  planksPainter(['#d3a35e', '#cc9c57', '#dbaa64'], '#a87c42', '#8a6238')(ctx, rand);
  ctx.fillStyle = '#5c636b';
  ctx.fillRect(6, 6, 4, 4);
};
const pistonSticky: Painter = (ctx, rand) => {
  pistonFace(ctx, rand);
  ctx.fillStyle = '#4f8f3a';
  ctx.fillRect(3, 3, 10, 10);
};
const noteBlock: Painter = (ctx, rand) => {
  planks(ctx, rand);
  ctx.fillStyle = '#3a3226';
  ctx.fillRect(5, 4, 6, 8);
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(7, 6, 2, 2);
};

// --- Magic Delivery Box ---------------------------------------------------

const cardboardBase: Painter = (ctx, rand) => {
  noiseFill(ctx, rand, CARDBOARD);
  for (let y = 0; y < SIZE; y += 4) for (let x = 0; x < SIZE; x++) if (rand() > 0.6) px(ctx, x, y, '#bd8f5a');
};
const boxTop: Painter = (ctx, rand) => {
  cardboardBase(ctx, rand);
  for (let x = 0; x < SIZE; x++) {
    px(ctx, x, 7, '#8a6238');
    px(ctx, x, 8, '#9c7040');
  }
  for (let y = 0; y < SIZE; y++) for (let x = 6; x <= 9; x++) px(ctx, x, y, pick(rand, TAPE));
  for (let y = 0; y < SIZE; y++) {
    px(ctx, 6, y, '#96703f');
    px(ctx, 9, y, '#96703f');
  }
};
const boxSide: Painter = (ctx, rand) => {
  cardboardBase(ctx, rand);
  for (let y = 0; y < 3; y++) for (let x = 6; x <= 9; x++) px(ctx, x, y, pick(rand, TAPE));
  for (let x = 0; x < SIZE; x++) px(ctx, x, 0, '#a87f4d');
  const ink = '#6b4a26';
  for (const [x, y] of [[5, 7], [10, 7], [4, 10], [5, 11], [6, 12], [7, 12], [8, 12], [9, 12], [10, 11], [11, 10]]) px(ctx, x, y, ink);
};
const boxBottom: Painter = (ctx, rand) => {
  cardboardBase(ctx, rand);
  for (let x = 0; x < SIZE; x++) {
    px(ctx, x, 7, '#9c7040');
    px(ctx, x, 8, '#9c7040');
  }
};

/** Kid color palette shared by color blocks and carpets. */
export const KID_COLORS: Record<string, string> = {
  red: '#e8574f',
  orange: '#f2903c',
  yellow: '#ffd94a',
  green: '#67c23a',
  blue: '#4a7fd6',
  purple: '#9b6bd8',
  pink: '#f291bb',
  white: '#f4f4f0',
  black: '#3a3a3a',
  brown: '#8a6238',
};

export const PAINTERS: Record<string, { paint: Painter; seed: number }> = {
  grass_top: { paint: grassTop, seed: 11 },
  grass_side: { paint: grassSide, seed: 12 },
  dirt: { paint: dirt, seed: 22 },
  stone: { paint: stone, seed: 33 },
  deep_stone: { paint: deepStone, seed: 35 },
  cobblestone: { paint: cobblestone, seed: 34 },
  stone_bricks: { paint: stoneBricks, seed: 37 },
  sand: { paint: sand, seed: 36 },
  gravel: { paint: gravel, seed: 38 },
  clay: { paint: clay, seed: 40 },
  snow: { paint: snow, seed: 39 },
  snow_side: { paint: snowSide, seed: 42 },
  ice: { paint: ice, seed: 41 },
  moss: { paint: moss, seed: 45 },
  sandstone: { paint: sandstone, seed: 50 },
  sandstone_top: { paint: sandstoneTop, seed: 51 },
  hay: { paint: hay, seed: 52 },
  hay_top: { paint: hayTop, seed: 53 },
  ladder: { paint: ladder, seed: 54 },
  planks: { paint: planks, seed: 43 },
  birch_planks: { paint: birchPlanks, seed: 46 },
  wood_side: { paint: woodSide, seed: 44 },
  wood_top: { paint: woodTop, seed: 47 },
  birch_side: { paint: birchSide, seed: 48 },
  birch_top: { paint: birchTop, seed: 49 },
  brick: { paint: brick, seed: 122 },
  roof_tiles: { paint: roofTiles, seed: 124 },
  glass: { paint: glass, seed: 133 },
  leaves: { paint: leaves, seed: 55 },
  birch_leaves: { paint: birchLeaves, seed: 56 },
  pink_leaves: { paint: pinkLeaves, seed: 57 },
  flower_pink: { paint: flowerPink, seed: 58 },
  flower_yellow: { paint: flowerYellow, seed: 59 },
  flower_blue: { paint: flowerBlue, seed: 60 },
  flower_red: { paint: flowerRed, seed: 61 },
  tall_grass: { paint: tallGrass, seed: 62 },
  mushroom: { paint: mushroom, seed: 63 },
  cactus_side: { paint: cactusSide, seed: 64 },
  cactus_top: { paint: cactusTop, seed: 65 },
  pumpkin_side: { paint: pumpkinSide, seed: 67 },
  pumpkin_top: { paint: pumpkinTop, seed: 68 },
  water: { paint: water, seed: 66 },
  cloud: { paint: cloud, seed: 77 },
  rainbow: { paint: rainbow, seed: 88 },
  star: { paint: star, seed: 99 },
  light: { paint: light, seed: 111 },
  torch_side: { paint: torchSide, seed: 115 },
  torch_top: { paint: torchTop, seed: 116 },
  lantern: { paint: lantern, seed: 117 },
  campfire_top: { paint: campfireTop, seed: 118 },
  campfire_side: { paint: campfireSide, seed: 119 },
  glow_crystal: { paint: glowCrystal, seed: 120 },
  bed_top: { paint: bedTop, seed: 150 },
  bed_side: { paint: bedSide, seed: 151 },
  table: { paint: table, seed: 152 },
  chair: { paint: chair, seed: 153 },
  bookshelf: { paint: bookshelf, seed: 154 },
  tv: { paint: tv, seed: 155 },
  painting: { paint: painting, seed: 156 },
  cake: { paint: cake, seed: 157 },
  flower_pot: { paint: flowerPot, seed: 158 },
  tv_on: { paint: tvOn, seed: 159 },
  lamp: { paint: lamp, seed: 160 },
  lamp_on: { paint: lampOn, seed: 161 },
  stove: { paint: stove, seed: 162 },
  stove_top: { paint: stoveTop, seed: 163 },
  fridge: { paint: fridge, seed: 164 },
  fridge_top: { paint: fridgeTop, seed: 165 },
  sink: { paint: sink, seed: 166 },
  sink_top: { paint: sinkTop, seed: 167 },
  car: { paint: carCard, seed: 170 },
  motorcycle: { paint: motorcycleCard, seed: 112 },
  plane: { paint: planeCard, seed: 113 },
  helicopter: { paint: helicopterCard, seed: 114 },
  boat: { paint: boatCard, seed: 171 },
  dog: { paint: dogCard, seed: 172 },
  cat: { paint: catCard, seed: 173 },
  villager: { paint: villagerCard, seed: 174 },
  robot: { paint: robotCard, seed: 175 },
  crafting_top: { paint: craftingTop, seed: 180 },
  crafting_side: { paint: craftingSide, seed: 181 },
  lever: { paint: lever, seed: 182 },
  button: { paint: button, seed: 183 },
  plate: { paint: plate, seed: 184 },
  wire: { paint: wire, seed: 185 },
  wire_on: { paint: wireOn, seed: 186 },
  repeater: { paint: repeater, seed: 187 },
  repeater_on: { paint: repeaterOn, seed: 188 },
  logic_lamp: { paint: logicLamp, seed: 187 },
  logic_lamp_on: { paint: logicLampOn, seed: 188 },
  piston_side: { paint: pistonSide, seed: 189 },
  piston_back: { paint: pistonBack, seed: 190 },
  piston_face: { paint: pistonFace, seed: 191 },
  piston_sticky: { paint: pistonSticky, seed: 192 },
  note_block: { paint: noteBlock, seed: 193 },
  box_top: { paint: boxTop, seed: 144 },
  box_side: { paint: boxSide, seed: 145 },
  box_bottom: { paint: boxBottom, seed: 146 },
};

for (const [name, hex] of Object.entries(KID_COLORS)) {
  PAINTERS[`color_${name}`] = { paint: colorBlock(hex), seed: 200 + name.length * 7 + hex.charCodeAt(1) };
}

export function textureKeys(): string[] {
  return Object.keys(PAINTERS);
}

const tileCache = new Map<string, HTMLCanvasElement | null>();

/** Paints (and caches) one 16×16 tile. Null when 2D canvas is unavailable. */
export function paintTile(key: string): HTMLCanvasElement | null {
  if (tileCache.has(key)) return tileCache.get(key) ?? null;
  const entry = PAINTERS[key];
  let canvas: HTMLCanvasElement | null = null;
  if (entry && typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) canvas = null;
    else entry.paint(ctx, lcg(entry.seed));
  }
  tileCache.set(key, canvas);
  return canvas;
}

const iconCache = new Map<string, string | null>();

/** A data URL of a tile, for hotbar and panel icons. */
export function tileDataUrl(key: string): string | null {
  if (iconCache.has(key)) return iconCache.get(key) ?? null;
  const canvas = paintTile(key);
  let url: string | null = null;
  if (canvas) {
    try {
      url = canvas.toDataURL();
    } catch {
      url = null;
    }
  }
  iconCache.set(key, url);
  return url;
}
