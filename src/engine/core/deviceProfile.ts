/**
 * What kind of graphics chip is drawing, and the budgets that fit it.
 * Integrated GPUs (a 2022 Ryzen laptop, an Intel Iris ultrabook) are fine
 * at 60 fps when the canvas is not 4K, the shadow map is 2K, and the draw
 * distance is moderate; discrete cards get everything. The adaptive
 * ladder in the engine can still step down from here.
 */

export type GpuClass = 'software' | 'integrated' | 'discrete' | 'apple' | 'unknown';

export function classifyGpu(renderer: string): GpuClass {
  const name = renderer.toLowerCase();
  if (!name) return 'unknown';
  if (/swiftshader|llvmpipe|softpipe|software|basic render/.test(name)) return 'software';
  if (/apple (m\d|gpu|a\d+)/.test(name) || /apple/.test(name)) return 'apple';
  if (/nvidia|geforce|rtx|gtx|quadro/.test(name)) return 'discrete';
  if (/radeon (rx|pro|r9|r7 3|vii)|radeon\(tm\) rx|arc a\d|intel\(r\) arc/.test(name)) return 'discrete';
  if (/intel|iris|uhd|hd graphics|radeon\(tm\) graphics|radeon graphics|radeon vega|vega \d|renoir|cezanne|rembrandt|phoenix|raphael|mali|adreno|powervr|xclipse/.test(name)) return 'integrated';
  if (/amd|ati|radeon/.test(name)) return 'discrete';
  return 'unknown';
}

export type DeviceProfile = {
  name: string;
  /** Cap on devicePixelRatio. Fill rate is the first thing an integrated GPU runs out of. */
  pixelRatioCap: number;
  /** Largest sun shadow map. */
  shadowMap: number;
  /** Refresh the shadow map every N frames. */
  shadowEvery: number;
  /** Chunks of draw distance around the player. */
  viewRadius: number;
  /** Extra chunks Cinema may add. */
  cinemaBonus: number;
  /** Post-processing allowed in Cinema. */
  postFx: boolean;
  /** Material atlas scale (8 = 128px tiles) and anisotropy. */
  hiResScale: number;
  anisotropy: number;
  /** Seconds between sky bakes in Cinema. */
  bakeSeconds: number;
};

/**
 * How far the fine detail reaches, in chunks. Plants and lamps are the
 * most expensive thing an integrated GPU draws (many small transparent
 * quads), and shadow casting costs a second pass over the same geometry,
 * so both stop well before the draw distance ends on weak hardware.
 */
export function detailRadii(profile: DeviceProfile, viewRadius: number): { foliage: number; shadow: number } {
  const strong = profile.pixelRatioCap >= 2 && profile.shadowEvery === 1;
  return {
    foliage: strong ? viewRadius : Math.max(2, viewRadius - 2),
    shadow: strong ? Math.max(3, viewRadius - 1) : Math.max(2, Math.min(3, viewRadius)),
  };
}

export function pickProfile(gpu: GpuClass, mobile: boolean): DeviceProfile {
  if (mobile) return { name: 'phone or tablet', pixelRatioCap: 1.5, shadowMap: 2048, shadowEvery: 3, viewRadius: 5, cinemaBonus: 0, postFx: false, hiResScale: 4, anisotropy: 1, bakeSeconds: 6 };
  switch (gpu) {
    case 'software':
      return { name: 'software renderer', pixelRatioCap: 0.5, shadowMap: 1024, shadowEvery: 4, viewRadius: 4, cinemaBonus: 0, postFx: false, hiResScale: 4, anisotropy: 1, bakeSeconds: 10 };
    case 'integrated':
      return { name: 'integrated graphics', pixelRatioCap: 1.25, shadowMap: 2048, shadowEvery: 2, viewRadius: 6, cinemaBonus: 0, postFx: false, hiResScale: 8, anisotropy: 2, bakeSeconds: 4 };
    case 'apple':
      return { name: 'Apple graphics', pixelRatioCap: 2, shadowMap: 4096, shadowEvery: 1, viewRadius: 7, cinemaBonus: 2, postFx: true, hiResScale: 8, anisotropy: 4, bakeSeconds: 2 };
    case 'discrete':
      return { name: 'graphics card', pixelRatioCap: 2, shadowMap: 4096, shadowEvery: 1, viewRadius: 7, cinemaBonus: 2, postFx: true, hiResScale: 8, anisotropy: 4, bakeSeconds: 2 };
    default:
      return { name: 'unknown graphics', pixelRatioCap: 1.5, shadowMap: 2048, shadowEvery: 2, viewRadius: 6, cinemaBonus: 1, postFx: false, hiResScale: 8, anisotropy: 2, bakeSeconds: 4 };
  }
}

/**
 * One look at the graphics chip: its name and whether WebGL exists. The probe
 * context is released at once; Safari on iPhone keeps only a handful of WebGL
 * contexts alive and would otherwise drop the game's own.
 */
export function probeGraphics(): { name: string; webgl: boolean } {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return { name: '', webgl: false };
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return { name, webgl: true };
  } catch {
    return { name: '', webgl: false };
  }
}
