/**
 * Photo-like materials for Cinema mode, generated in code: seamless
 * fractal noise, cell noise, and a few pattern rules per material. Each
 * generator fills a color tile and a height field; normals and roughness
 * come from the height. No image files, no downloads, all original.
 */

export type RealTile = { color: Uint8ClampedArray; height: Float32Array; size: number };
type RGB = [number, number, number];

function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

/** Value noise on a torus of the given period, so tiles wrap seamlessly. */
function noise(x: number, y: number, period: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = smooth(x - xi);
  const fy = smooth(y - yi);
  const w = (ix: number, iy: number): number => hash(((ix % period) + period) % period, ((iy % period) + period) % period, seed);
  const a = w(xi, yi);
  const b = w(xi + 1, yi);
  const c = w(xi, yi + 1);
  const d = w(xi + 1, yi + 1);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

/** Fractal noise, 0..1, seamless with `period` lattice cells at the base octave. */
function fbm(u: number, v: number, seed: number, octaves = 5, base = 4, gain = 0.5, lacunarity = 2): number {
  let sum = 0;
  let amp = 1;
  let norm = 0;
  let freq = base;
  for (let i = 0; i < octaves; i++) {
    sum += noise(u * freq, v * freq, freq, seed + i * 17) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

/** Cell (Worley) noise on a torus: distance to the nearest feature point and its id. */
function cells(u: number, v: number, count: number, seed: number): { d: number; d2: number; id: number } {
  const x = u * count;
  const y = v * count;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  let d = Infinity;
  let d2 = Infinity;
  let id = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx;
      const cy = yi + dy;
      const wx = ((cx % count) + count) % count;
      const wy = ((cy % count) + count) % count;
      const px = cx + hash(wx, wy, seed);
      const py = cy + hash(wx, wy, seed + 99);
      const dist = Math.hypot(px - x, py - y);
      if (dist < d) {
        d2 = d;
        d = dist;
        id = hash(wx, wy, seed + 7);
      } else if (dist < d2) d2 = dist;
    }
  }
  return { d, d2, id };
}

function mix(a: RGB, b: RGB, t: number): RGB {
  const k = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

function rgb(hex: string): RGB {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

type Generator = (u: number, v: number, seed: number) => { color: RGB; height: number };

const grassTop: Generator = (u, v, seed) => {
  const patch = fbm(u, v, seed, 4, 3);
  const blades = fbm(u * 1 + 0.13, v * 3, seed + 5, 4, 16, 0.55); // streaky, like blades
  const fine = fbm(u, v, seed + 9, 3, 32, 0.5);
  const dark = rgb('#3f8a2c');
  const light = rgb('#7ec850');
  const yellow = rgb('#b9c95a');
  let c = mix(dark, light, patch * 0.7 + blades * 0.5 - 0.2);
  c = mix(c, yellow, Math.max(0, fine - 0.72) * 2.5);
  return { color: c, height: blades * 0.6 + fine * 0.4 };
};

const dirt: Generator = (u, v, seed) => {
  const clumps = fbm(u, v, seed, 5, 4, 0.55);
  const grain = fbm(u, v, seed + 3, 3, 40);
  const pebble = cells(u, v, 14, seed + 4);
  const dark = rgb('#5b3d22');
  const light = rgb('#9a6a3d');
  let c = mix(dark, light, clumps * 0.9 + grain * 0.25 - 0.1);
  let h = clumps * 0.8 + grain * 0.2;
  if (pebble.d < 0.22 && pebble.id > 0.7) {
    c = mix(c, rgb('#8c8375'), 0.7);
    h += (0.22 - pebble.d) * 2;
  }
  return { color: c, height: h };
};

const grassSide: Generator = (u, v, seed) => {
  const base = dirt(u, v, seed);
  const moss = fbm(u, v, seed + 21, 3, 6);
  return { color: mix(base.color, rgb('#4e8f34'), Math.max(0, moss - 0.55) * 1.4 * (1 - v)), height: base.height };
};

const stoneLike =
  (dark: string, light: string, crackDepth = 1): Generator =>
  (u, v, seed) => {
    const body = fbm(u, v, seed, 5, 3, 0.55);
    const cell = cells(u, v, 5, seed + 2);
    const crack = Math.max(0, 0.06 - (cell.d2 - cell.d)) / 0.06; // thin lines between cells
    const grain = fbm(u, v, seed + 6, 3, 48);
    let c = mix(rgb(dark), rgb(light), body * 0.8 + grain * 0.3 - 0.1 + (cell.id - 0.5) * 0.25);
    c = mix(c, rgb(dark), crack * 0.7);
    return { color: c, height: body * 0.7 + grain * 0.3 - crack * 0.5 * crackDepth };
  };

const sand: Generator = (u, v, seed) => {
  const ripple = Math.sin((v + fbm(u, v, seed, 3, 2) * 0.35) * Math.PI * 2 * 6) * 0.5 + 0.5;
  const grain = fbm(u, v, seed + 1, 3, 48);
  const c = mix(rgb('#d7b978'), rgb('#f2e0aa'), ripple * 0.45 + grain * 0.6);
  return { color: c, height: ripple * 0.5 + grain * 0.5 };
};

const snow: Generator = (u, v, seed) => {
  const drift = fbm(u, v, seed, 4, 3, 0.5);
  const sparkle = hash(Math.floor(u * 128), Math.floor(v * 128), seed) > 0.985 ? 1 : 0;
  const c = mix(rgb('#c9d6e4'), rgb('#f2f6fb'), drift * 0.8 + sparkle);
  return { color: c, height: drift };
};

const gravel: Generator = (u, v, seed) => {
  const cell = cells(u, v, 12, seed);
  const tone = mix(rgb('#6d6a63'), rgb('#b5b0a5'), cell.id);
  const edge = Math.min(1, cell.d * 3);
  return { color: mix(tone, rgb('#4d4a45'), edge * 0.5), height: 1 - cell.d * 2.2 };
};

const leaves =
  (dark: string, light: string, accent: string): Generator =>
  (u, v, seed) => {
    const cell = cells(u, v, 9, seed);
    const body = fbm(u, v, seed + 3, 4, 6);
    let c = mix(rgb(dark), rgb(light), cell.id * 0.6 + body * 0.5 - 0.2);
    const vein = Math.max(0, 0.05 - Math.abs(cell.d - 0.32)) / 0.05;
    c = mix(c, rgb(accent), vein * 0.4 + Math.max(0, body - 0.75) * 2);
    return { color: c, height: (1 - Math.min(1, cell.d * 2)) * 0.7 + body * 0.3 };
  };

const barkSide: Generator = (u, v, seed) => {
  const streak = fbm(u * 6, v * 0.5, seed, 5, 8, 0.6);
  const knot = cells(u, v, 3, seed + 4);
  const ring = Math.sin(knot.d * 40) * 0.5 + 0.5;
  let c = mix(rgb('#4c3117'), rgb('#8a5a30'), streak);
  let h = streak;
  if (knot.d < 0.18) {
    c = mix(c, rgb('#3a2510'), (0.18 - knot.d) * 4 * ring);
    h -= (0.18 - knot.d) * 1.5;
  }
  return { color: c, height: h };
};

const woodTop: Generator = (u, v, seed) => {
  const cx = u - 0.5;
  const cy = v - 0.5;
  const r = Math.hypot(cx, cy) + fbm(u, v, seed, 3, 4) * 0.08;
  const ring = Math.sin(r * Math.PI * 2 * 9) * 0.5 + 0.5;
  const c = mix(rgb('#b98352'), rgb('#7a4d25'), ring * 0.8);
  return { color: c, height: ring };
};

const planks: Generator = (u, v, seed) => {
  const row = Math.floor(v * 4);
  const offset = (row % 2) * 0.5;
  const uu = (u + offset) % 1;
  const gapV = Math.abs(v * 4 - Math.round(v * 4)) < 0.035 ? 1 : 0;
  const gapU = Math.abs(uu - Math.round(uu)) < 0.02 && row >= 0 ? 1 : 0;
  const grain = fbm(u * 5, v * 0.6 + row * 0.37, seed + row, 5, 8, 0.6);
  let c = mix(rgb('#a8763f'), rgb('#e0b06c'), grain);
  const gap = Math.max(gapU, gapV);
  c = mix(c, rgb('#5c3d1c'), gap * 0.85);
  return { color: c, height: grain * 0.6 - gap * 0.6 };
};

const brick: Generator = (u, v, seed) => {
  const rows = 6;
  const row = Math.floor(v * rows);
  const uu = (u + (row % 2) * 0.5) % 1;
  const col = Math.floor(uu * 3);
  const fy = v * rows - row;
  const fx = uu * 3 - col;
  const mortar = fy < 0.14 || fx < 0.07 ? 1 : 0;
  const tone = hash(col, row, seed);
  const grain = fbm(u, v, seed + 2, 3, 40);
  let c = mix(rgb('#9c3f2f'), rgb('#c8664c'), tone * 0.7 + grain * 0.3);
  c = mix(c, rgb('#c9c2b4'), mortar);
  return { color: c, height: mortar ? 0.15 : 0.7 + grain * 0.3 };
};

const water: Generator = (u, v, seed) => {
  const wave = fbm(u + 0.2, v, seed, 4, 3, 0.6);
  const ripple = fbm(u, v, seed + 1, 3, 12);
  const c = mix(rgb('#2f7fc4'), rgb('#6cb8ec'), wave * 0.6 + ripple * 0.4);
  return { color: c, height: wave * 0.7 + ripple * 0.3 };
};

const clay: Generator = (u, v, seed) => {
  const body = fbm(u, v, seed, 4, 3, 0.45);
  return { color: mix(rgb('#8f8aa0'), rgb('#b9b5c7'), body), height: body * 0.4 };
};

const moss: Generator = (u, v, seed) => {
  const body = fbm(u, v, seed, 5, 5, 0.6);
  const fine = fbm(u, v, seed + 4, 3, 40);
  return { color: mix(rgb('#2f6b28'), rgb('#6db34a'), body * 0.8 + fine * 0.3), height: body * 0.6 + fine * 0.4 };
};

/** Texture keys with a photo-like generator; everything else keeps the pixel art, enhanced. */
export const REAL_MATERIALS: Record<string, Generator> = {
  grass_top: grassTop,
  grass_side: grassSide,
  dirt,
  stone: stoneLike('#6f7379', '#b3b8be'),
  deep_stone: stoneLike('#3f444b', '#7a8088'),
  cobblestone: stoneLike('#5d6166', '#a7aaae', 1.6),
  stone_bricks: (u, v, seed) => {
    const rows = 4;
    const row = Math.floor(v * rows);
    const uu = (u + (row % 2) * 0.5) % 1;
    const fy = v * rows - row;
    const fx = uu * 2 - Math.floor(uu * 2);
    const mortar = fy < 0.09 || fx < 0.05 ? 1 : 0;
    const s = stoneLike('#767a80', '#b8bcc2', 0.5)(u, v, seed + row);
    return { color: mix(s.color, rgb('#4f5358'), mortar * 0.8), height: mortar ? 0.1 : s.height };
  },
  sandstone: (u, v, seed) => {
    const s = sand(u, v * 0.5, seed);
    const layer = Math.sin(v * Math.PI * 2 * 5) * 0.5 + 0.5;
    return { color: mix(s.color, rgb('#c9a768'), layer * 0.35), height: layer * 0.5 + s.height * 0.5 };
  },
  sand,
  snow,
  snow_side: (u, v, seed) => (v < 0.35 ? snow(u, v, seed) : dirt(u, v, seed)),
  gravel,
  clay,
  moss,
  leaves: leaves('#1f5f2a', '#4fae4a', '#8fd35c'),
  birch_leaves: leaves('#3f8b2e', '#8fd05a', '#d5ef8a'),
  pink_leaves: leaves('#c2618f', '#f4a6c8', '#ffe1ee'),
  wood_side: barkSide,
  birch_side: (u, v, seed) => {
    const b = barkSide(u, v, seed);
    const streak = fbm(u * 4, v, seed + 8, 3, 6);
    return { color: mix(rgb('#e9e6dc'), rgb('#2b2622'), Math.max(0, streak - 0.62) * 3), height: b.height * 0.5 };
  },
  wood_top: woodTop,
  birch_top: woodTop,
  planks,
  birch_planks: (u, v, seed) => {
    const p = planks(u, v, seed);
    return { color: mix(p.color, rgb('#f1e3c2'), 0.55), height: p.height };
  },
  brick,
  water,
};

export function hasRealMaterial(key: string): boolean {
  return key in REAL_MATERIALS;
}

/** Renders a seamless photo-like tile of `size` pixels for a texture key. */
export function paintRealTile(key: string, size: number, seed: number): RealTile | null {
  const generator = REAL_MATERIALS[key];
  if (!generator) return null;
  const color = new Uint8ClampedArray(size * size * 4);
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const { color: c, height: h } = generator(x / size, y / size, seed);
      const i = y * size + x;
      color[i * 4] = c[0];
      color[i * 4 + 1] = c[1];
      color[i * 4 + 2] = c[2];
      color[i * 4 + 3] = 255;
      height[i] = h;
    }
  }
  return { color, height, size };
}
