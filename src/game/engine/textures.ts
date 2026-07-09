import * as THREE from 'three';
import type { BlockTypeId } from '../../types/game';
import { BLOCK_DEFINITIONS } from './blockRegistry';

/**
 * Procedural 16x16 pixel textures, drawn on canvases at startup.
 * All art is original: chunky pixels for the classic block-game feel,
 * but our own palettes and patterns. Nearest-neighbor filtering keeps
 * the pixels crisp at any distance.
 *
 * Everything degrades gracefully: if 2D canvas is unavailable (jsdom),
 * every function returns null and callers fall back to flat colors.
 */

const SIZE = 16;

export type BlockFace = 'top' | 'side' | 'bottom';

type Rand = () => number;

// Deterministic LCG so textures look identical on every load.
function lcg(seed: number): Rand {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function pick<T>(rand: Rand, options: T[]): T {
  return options[Math.floor(rand() * options.length)];
}

function noiseFill(ctx: CanvasRenderingContext2D, rand: Rand, palette: string[]): void {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      px(ctx, x, y, pick(rand, palette));
    }
  }
}

const GRASS_GREENS = ['#5fb636', '#67c23a', '#72cf45', '#58a933', '#6cc93e'];
const DIRT_BROWNS = ['#9c6b3c', '#a0703c', '#8a5f33', '#b07d46', '#96683a'];
const STONE_GRAYS = ['#9aa2ab', '#8f979f', '#a4acb5', '#99a1aa'];
const LEAF_GREENS = ['#3faf5c', '#37a052', '#4cbd68', '#2f9149'];
const CARDBOARD = ['#c99a63', '#c3945e', '#cf9f68', '#c69760'];
const TAPE = ['#a87f4d', '#a37a49', '#ad8451'];

type Painter = (ctx: CanvasRenderingContext2D, rand: Rand) => void;

function paintGrassTop(ctx: CanvasRenderingContext2D, rand: Rand): void {
  noiseFill(ctx, rand, GRASS_GREENS);
  // A few brighter blades.
  for (let i = 0; i < 10; i++) {
    px(ctx, Math.floor(rand() * SIZE), Math.floor(rand() * SIZE), '#8ed75f');
  }
}

function paintDirt(ctx: CanvasRenderingContext2D, rand: Rand): void {
  noiseFill(ctx, rand, DIRT_BROWNS);
  for (let i = 0; i < 7; i++) {
    px(ctx, Math.floor(rand() * SIZE), Math.floor(rand() * SIZE), '#7a5230');
  }
}

function paintGrassSide(ctx: CanvasRenderingContext2D, rand: Rand): void {
  paintDirt(ctx, rand);
  for (let x = 0; x < SIZE; x++) {
    const depth = 3 + Math.floor(rand() * 3); // ragged grass edge
    for (let y = 0; y < depth; y++) {
      px(ctx, x, y, pick(rand, GRASS_GREENS));
    }
  }
}

function paintStone(ctx: CanvasRenderingContext2D, rand: Rand): void {
  noiseFill(ctx, rand, STONE_GRAYS);
  // Darker cracks.
  for (let i = 0; i < 5; i++) {
    let x = Math.floor(rand() * SIZE);
    let y = Math.floor(rand() * SIZE);
    for (let step = 0; step < 4; step++) {
      px(ctx, x % SIZE, y % SIZE, '#7c848d');
      x += rand() > 0.5 ? 1 : 0;
      y += 1;
    }
  }
}

function paintWoodSide(ctx: CanvasRenderingContext2D, rand: Rand): void {
  for (let x = 0; x < SIZE; x++) {
    const seam = x % 4 === 3;
    for (let y = 0; y < SIZE; y++) {
      px(ctx, x, y, seam ? '#9c6a35' : pick(rand, ['#c98d4b', '#c2874a', '#d09553']));
    }
  }
}

function paintWoodTop(ctx: CanvasRenderingContext2D, rand: Rand): void {
  noiseFill(ctx, rand, ['#dba362', '#d69d5c', '#e0a967']);
  // Growth rings.
  ctx.strokeStyle = '#a97a3f';
  for (const r of [2, 4, 6]) {
    ctx.strokeRect(7.5 - r, 7.5 - r, r * 2 + 1, r * 2 + 1);
  }
  px(ctx, 7, 7, '#8a5f33');
  px(ctx, 8, 8, '#8a5f33');
}

function paintLeaves(ctx: CanvasRenderingContext2D, rand: Rand): void {
  noiseFill(ctx, rand, LEAF_GREENS);
  for (let i = 0; i < 12; i++) {
    px(ctx, Math.floor(rand() * SIZE), Math.floor(rand() * SIZE), '#256e38');
  }
  for (let i = 0; i < 6; i++) {
    px(ctx, Math.floor(rand() * SIZE), Math.floor(rand() * SIZE), '#5cc878');
  }
}

function paintWater(ctx: CanvasRenderingContext2D, rand: Rand): void {
  noiseFill(ctx, rand, ['#4fa8e8', '#4aa0df', '#55aeee']);
  // Light wave streaks.
  for (let y = 2; y < SIZE; y += 5) {
    for (let x = 0; x < SIZE; x++) {
      if ((x + y) % 7 < 3) px(ctx, x, y + ((x / 4) % 2 | 0), '#7cc2f2');
    }
  }
}

function paintCloud(ctx: CanvasRenderingContext2D, rand: Rand): void {
  noiseFill(ctx, rand, ['#f4f8fc', '#eef4fa', '#ffffff']);
  for (let i = 0; i < 8; i++) {
    px(ctx, Math.floor(rand() * SIZE), Math.floor(rand() * SIZE), '#e2ecf6');
  }
}

const RAINBOW_BANDS = ['#e8574f', '#f2903c', '#ffd94a', '#67c23a', '#4fa8e8', '#7a6bd8', '#e85fa8'];

function paintRainbow(ctx: CanvasRenderingContext2D, rand: Rand): void {
  for (let y = 0; y < SIZE; y++) {
    const band = RAINBOW_BANDS[Math.floor((y / SIZE) * RAINBOW_BANDS.length)];
    for (let x = 0; x < SIZE; x++) {
      px(ctx, x, y, band);
    }
  }
  // Soft sparkle.
  for (let i = 0; i < 5; i++) {
    px(ctx, Math.floor(rand() * SIZE), Math.floor(rand() * SIZE), '#ffffff');
  }
}

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

function paintStar(ctx: CanvasRenderingContext2D, rand: Rand): void {
  noiseFill(ctx, rand, ['#ffd94a', '#fbd344', '#ffde5c']);
  STAR_SHAPE.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (row[x] === '#') px(ctx, x, y + 2, '#fff8d0');
    }
  });
  px(ctx, 2, 2, '#ffffff');
  px(ctx, 13, 12, '#ffffff');
}

function paintLight(ctx: CanvasRenderingContext2D, rand: Rand): void {
  noiseFill(ctx, rand, ['#fff2a8', '#ffefa0', '#fff5b4']);
  // Bright core.
  ctx.fillStyle = '#fffbe0';
  ctx.fillRect(5, 5, 6, 6);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(7, 7, 2, 2);
  void rand;
}

function paintBrick(ctx: CanvasRenderingContext2D, rand: Rand): void {
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
}

function paintGlass(ctx: CanvasRenderingContext2D, rand: Rand): void {
  ctx.clearRect(0, 0, SIZE, SIZE);
  // Pale frame.
  ctx.fillStyle = 'rgba(210, 236, 246, 0.95)';
  ctx.fillRect(0, 0, SIZE, 1);
  ctx.fillRect(0, SIZE - 1, SIZE, 1);
  ctx.fillRect(0, 0, 1, SIZE);
  ctx.fillRect(SIZE - 1, 0, 1, SIZE);
  // Faint pane tint and a diagonal shine.
  ctx.fillStyle = 'rgba(191, 230, 245, 0.25)';
  ctx.fillRect(1, 1, SIZE - 2, SIZE - 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  for (let i = 0; i < 6; i++) {
    px(ctx, 3 + i, 9 - i, 'rgba(255,255,255,0.6)');
    px(ctx, 8 + i, 13 - i, 'rgba(255,255,255,0.45)');
  }
  void rand;
}

// --- Magic Delivery Box: a kraft cardboard shipping box. Tape down the
// middle, flap seams on top, and a hand-drawn marker smiley on the sides.
// Friendly and box-like, with no logos and no trademarked shapes.

function paintCardboardBase(ctx: CanvasRenderingContext2D, rand: Rand): void {
  noiseFill(ctx, rand, CARDBOARD);
  // Corrugation hints: faint horizontal grain.
  for (let y = 0; y < SIZE; y += 4) {
    for (let x = 0; x < SIZE; x++) {
      if (rand() > 0.6) px(ctx, x, y, '#bd8f5a');
    }
  }
}

function paintBoxTop(ctx: CanvasRenderingContext2D, rand: Rand): void {
  paintCardboardBase(ctx, rand);
  // Flap seam across the middle.
  for (let x = 0; x < SIZE; x++) {
    px(ctx, x, 7, '#8a6238');
    px(ctx, x, 8, '#9c7040');
  }
  // Packing tape strip running the other way, over the seam.
  for (let y = 0; y < SIZE; y++) {
    for (let x = 6; x <= 9; x++) {
      px(ctx, x, y, pick(rand, TAPE));
    }
  }
  // Tape edges.
  for (let y = 0; y < SIZE; y++) {
    px(ctx, 6, y, '#96703f');
    px(ctx, 9, y, '#96703f');
  }
}

function paintBoxSide(ctx: CanvasRenderingContext2D, rand: Rand): void {
  paintCardboardBase(ctx, rand);
  // The tape folds a little way down the side.
  for (let y = 0; y < 3; y++) {
    for (let x = 6; x <= 9; x++) {
      px(ctx, x, y, pick(rand, TAPE));
    }
  }
  // Top edge shadow so the lid reads as a lid.
  for (let x = 0; x < SIZE; x++) {
    px(ctx, x, 0, '#a87f4d');
  }
  // Marker-doodle smiley: two eyes and a happy mouth.
  const ink = '#6b4a26';
  px(ctx, 5, 7, ink);
  px(ctx, 10, 7, ink);
  px(ctx, 4, 10, ink);
  px(ctx, 5, 11, ink);
  px(ctx, 6, 12, ink);
  px(ctx, 7, 12, ink);
  px(ctx, 8, 12, ink);
  px(ctx, 9, 12, ink);
  px(ctx, 10, 11, ink);
  px(ctx, 11, 10, ink);
}

function paintBoxBottom(ctx: CanvasRenderingContext2D, rand: Rand): void {
  paintCardboardBase(ctx, rand);
  for (let x = 0; x < SIZE; x++) {
    px(ctx, x, 7, '#9c7040');
    px(ctx, x, 8, '#9c7040');
  }
}

type FacePainters = {
  top: Painter;
  side: Painter;
  bottom: Painter;
  seed: number;
};

function uniform(painter: Painter, seed: number): FacePainters {
  return { top: painter, side: painter, bottom: painter, seed };
}

const PAINTERS: Record<BlockTypeId, FacePainters> = {
  grass: { top: paintGrassTop, side: paintGrassSide, bottom: paintDirt, seed: 11 },
  dirt: uniform(paintDirt, 22),
  stone: uniform(paintStone, 33),
  wood: { top: paintWoodTop, side: paintWoodSide, bottom: paintWoodTop, seed: 44 },
  leaves: uniform(paintLeaves, 55),
  water: uniform(paintWater, 66),
  cloud: uniform(paintCloud, 77),
  rainbow: uniform(paintRainbow, 88),
  star: uniform(paintStar, 99),
  light: uniform(paintLight, 111),
  brick: uniform(paintBrick, 122),
  glass: uniform(paintGlass, 133),
  'magic-box': { top: paintBoxTop, side: paintBoxSide, bottom: paintBoxBottom, seed: 144 },
};

const faceCanvasCache = new Map<string, HTMLCanvasElement | null>();

export function blockFaceCanvas(type: BlockTypeId, face: BlockFace): HTMLCanvasElement | null {
  const key = `${type}:${face}`;
  if (faceCanvasCache.has(key)) return faceCanvasCache.get(key) ?? null;
  let canvas: HTMLCanvasElement | null = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas = null; // jsdom and friends: no 2D canvas, callers fall back to colors
  } else {
    const painters = PAINTERS[type];
    painters[face](ctx, lcg(painters.seed + (face === 'side' ? 1 : face === 'bottom' ? 2 : 0)));
  }
  faceCanvasCache.set(key, canvas);
  return canvas;
}

const iconCache = new Map<BlockTypeId, string | null>();

/** A data URL of the block's side face, for hotbar and panel icons. */
export function blockIconDataUrl(type: BlockTypeId): string | null {
  if (iconCache.has(type)) return iconCache.get(type) ?? null;
  const canvas = blockFaceCanvas(type, 'side');
  let url: string | null = null;
  if (canvas) {
    try {
      url = canvas.toDataURL();
    } catch {
      url = null;
    }
  }
  iconCache.set(type, url);
  return url;
}

function textureFrom(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Builds the Three.js material (or 6-face material array) for a block
 * type. Returns null when canvases are unavailable; the renderer then
 * falls back to flat colors.
 */
export function createBlockMaterials(type: BlockTypeId): THREE.Material | THREE.Material[] | null {
  const def = BLOCK_DEFINITIONS[type];
  const top = blockFaceCanvas(type, 'top');
  const side = blockFaceCanvas(type, 'side');
  const bottom = blockFaceCanvas(type, 'bottom');
  if (!top || !side || !bottom) return null;

  function material(canvas: HTMLCanvasElement): THREE.MeshLambertMaterial {
    const mat = new THREE.MeshLambertMaterial({ map: textureFrom(canvas) });
    if (def.transparent) {
      mat.transparent = true;
      mat.opacity = def.opacity;
      if (type === 'glass') {
        // Glass panes should not hide what's behind their clear pixels.
        mat.opacity = 1;
        mat.alphaTest = 0.05;
        mat.side = THREE.DoubleSide;
      }
      if (type === 'water') mat.depthWrite = false;
    }
    if (type === 'light') {
      mat.emissive = new THREE.Color('#fff2a8');
      mat.emissiveIntensity = 0.55;
    }
    if (type === 'star') {
      mat.emissive = new THREE.Color('#ffd94a');
      mat.emissiveIntensity = 0.25;
    }
    return mat;
  }

  const topMat = material(top);
  const sideMat = material(side);
  const bottomMat = material(bottom);
  // BoxGeometry face order: +x, -x, +y, -y, +z, -z
  return [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
}
