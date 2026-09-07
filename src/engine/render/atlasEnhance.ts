/**
 * Turns a 16×16 pixel-art tile into a 64×64 "material": a detailed color
 * map, a tangent-space normal map, and a roughness map, all generated in
 * code. This is what makes Cinema mode look physically based while the
 * art stays original pixel art underneath.
 */

export const HI_RES_SCALE = 4;

/** Base roughness per texture key prefix (0 = mirror, 1 = chalk). */
const ROUGHNESS: Array<[RegExp, number]> = [
  [/^(glass|ice|glow_crystal|tv_on|lamp_on|logic_lamp_on)/, 0.12],
  [/^water/, 0.06],
  [/^(light|lantern|star|torch_top)/, 0.35],
  [/^(planks|birch_planks|wood_|birch_|table|chair|bookshelf|bed_side|crafting)/, 0.62],
  [/^(color_|carpet|bed_top|cloud|rainbow)/, 0.7],
  [/^(stone|deep_stone|cobblestone|stone_bricks|brick|sandstone|roof_tiles|piston|plate)/, 0.88],
  [/^(sand|gravel|clay|dirt|grass|snow|moss|hay|mushroom|leaves|birch_leaves|pink_leaves|flower|tall_grass|cactus|pumpkin)/, 0.95],
];

export function roughnessFor(key: string): number {
  for (const [pattern, value] of ROUGHNESS) if (pattern.test(key)) return value;
  return 0.75;
}

/** Deterministic noise per tile so the look never flickers between loads. */
function noise(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

export type MaterialTiles = { color: HTMLCanvasElement; normal: HTMLCanvasElement; roughness: HTMLCanvasElement };

/** Whether the tile keeps a see-through look (no bevel, gentle normals). */
function isSmooth(key: string): boolean {
  return /^(glass|ice|water|cloud|tv|lamp|light|logic_lamp|glow)/.test(key);
}

export function enhanceTile(tile: HTMLCanvasElement, key: string, seed: number): MaterialTiles | null {
  const size = tile.width * HI_RES_SCALE;
  const src = tile.getContext('2d')?.getImageData(0, 0, tile.width, tile.height);
  if (!src) return null;
  const color = document.createElement('canvas');
  color.width = color.height = size;
  const normal = document.createElement('canvas');
  normal.width = normal.height = size;
  const rough = document.createElement('canvas');
  rough.width = rough.height = size;
  const cctx = color.getContext('2d');
  const nctx = normal.getContext('2d');
  const rctx = rough.getContext('2d');
  if (!cctx || !nctx || !rctx) return null;

  const rand = noise(seed * 7919 + 17);
  const smooth = isSmooth(key);
  const base = roughnessFor(key);
  const colorData = cctx.createImageData(size, size);
  const height = new Float32Array(size * size);
  const w = tile.width;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const sx = Math.floor(x / HI_RES_SCALE);
      const sy = Math.floor(y / HI_RES_SCALE);
      const si = (sy * w + sx) * 4;
      const r = src.data[si];
      const g = src.data[si + 1];
      const b = src.data[si + 2];
      const a = src.data[si + 3];
      // Fine grain and a soft bevel at texel edges give the "material" feel.
      const grain = smooth ? 1 : 1 + (rand() - 0.5) * 0.08;
      const fx = x % HI_RES_SCALE;
      const fy = y % HI_RES_SCALE;
      const edge = !smooth && (fx === 0 || fy === 0 || fx === HI_RES_SCALE - 1 || fy === HI_RES_SCALE - 1) ? 0.93 : 1;
      const k = grain * edge;
      const di = (y * size + x) * 4;
      colorData.data[di] = Math.min(255, r * k);
      colorData.data[di + 1] = Math.min(255, g * k);
      colorData.data[di + 2] = Math.min(255, b * k);
      colorData.data[di + 3] = a;
      // Height: luminance, dipped at texel edges, plus a little grain.
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      height[y * size + x] = lum * (smooth ? 0.15 : 0.6) + (edge < 1 ? -0.25 : 0) + (smooth ? 0 : (rand() - 0.5) * 0.06);
    }
  }
  cctx.putImageData(colorData, 0, 0);

  // Normal map from height (Sobel), tangent space, +Z up.
  const normalData = nctx.createImageData(size, size);
  const strength = smooth ? 0.6 : 1.6;
  const h = (x: number, y: number): number => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1) - h(x - 1, y - 1) - 2 * h(x - 1, y) - h(x - 1, y + 1)) * strength;
      const dy = (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1) - h(x - 1, y - 1) - 2 * h(x, y - 1) - h(x + 1, y - 1)) * strength;
      const len = Math.hypot(dx, dy, 1);
      const nx = -dx / len;
      const ny = -dy / len;
      const nz = 1 / len;
      const di = (y * size + x) * 4;
      normalData.data[di] = Math.round((nx * 0.5 + 0.5) * 255);
      normalData.data[di + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      normalData.data[di + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      normalData.data[di + 3] = 255;
    }
  }
  nctx.putImageData(normalData, 0, 0);

  // Roughness: base for the material, brighter (rougher) in crevices.
  const roughData = rctx.createImageData(size, size);
  const rr = noise(seed * 31 + 5);
  for (let i = 0; i < size * size; i++) {
    const v = Math.max(0, Math.min(1, base + (rr() - 0.5) * (smooth ? 0.04 : 0.16) - height[i] * 0.1));
    roughData.data[i * 4] = Math.round(v * 255);
    roughData.data[i * 4 + 1] = Math.round(v * 255);
    roughData.data[i * 4 + 2] = Math.round(v * 255);
    roughData.data[i * 4 + 3] = 255;
  }
  rctx.putImageData(roughData, 0, 0);
  return { color, normal, roughness: rough };
}
