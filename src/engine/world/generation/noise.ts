import { createNoise2D, createNoise3D } from 'simplex-noise';

/** Deterministic PRNG (mulberry32) so a seed always gives the same world. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash of integer coordinates to 0..1, for per-column decisions. */
export function hash2(x: number, z: number, seed: number): number {
  let h = (x * 374761393 + z * 668265263 + seed * 974634721) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export type Noise2 = (x: number, z: number) => number;
export type Noise3 = (x: number, y: number, z: number) => number;

/** Fractal Brownian motion over simplex noise, output roughly -1..1. */
export function fbm2(seed: number, octaves: number, lacunarity = 2, gain = 0.5): Noise2 {
  const layers = Array.from({ length: octaves }, (_, i) => createNoise2D(mulberry32(seed + i * 7919)));
  return (x, z) => {
    let amplitude = 1;
    let frequency = 1;
    let sum = 0;
    let norm = 0;
    for (const noise of layers) {
      sum += noise(x * frequency, z * frequency) * amplitude;
      norm += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return sum / norm;
  };
}

export function noise3(seed: number): Noise3 {
  return createNoise3D(mulberry32(seed));
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function smoothstep(edge0: number, edge1: number, v: number): number {
  const t = clamp01((v - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
