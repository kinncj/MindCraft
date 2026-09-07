import * as THREE from 'three';
import { PAINTERS, TILE_SIZE, paintTile, textureKeys } from '../blocks/textures/painters';
import { HI_RES_SCALE, enhanceTile } from './atlasEnhance';

export type UVRect = { u0: number; v0: number; u1: number; v1: number };

/**
 * Every texture tile packed into one canvas. UV rectangles are computed
 * even when the canvas cannot paint (jsdom), so meshing stays testable.
 * `hiRes` builds 64px material atlases (color, normal, roughness) for
 * Cinema mode; the UV layout is identical so meshes need no rebuild.
 */
export class TextureAtlas {
  readonly texture: THREE.CanvasTexture | null;
  normalTexture: THREE.CanvasTexture | null = null;
  roughnessTexture: THREE.CanvasTexture | null = null;
  hiResTexture: THREE.CanvasTexture | null = null;
  private rects = new Map<string, UVRect>();
  readonly columns = 16;
  readonly rows: number;
  private keys: string[];

  constructor(keys: string[] = textureKeys()) {
    this.keys = keys;
    this.rows = Math.max(1, Math.ceil(keys.length / this.columns));
    const width = this.columns * TILE_SIZE;
    const height = this.rows * TILE_SIZE;
    let canvas: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    if (typeof document !== 'undefined') {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      ctx = canvas.getContext('2d');
    }

    keys.forEach((key, index) => {
      const col = index % this.columns;
      const row = Math.floor(index / this.columns);
      if (ctx) {
        const tile = paintTile(key);
        if (tile) ctx.drawImage(tile, col * TILE_SIZE, row * TILE_SIZE);
      }
      const inset = 0.5; // half a texel so neighbors never bleed
      this.rects.set(key, {
        u0: (col * TILE_SIZE + inset) / width,
        v0: 1 - (row * TILE_SIZE + TILE_SIZE - inset) / height,
        u1: (col * TILE_SIZE + TILE_SIZE - inset) / width,
        v1: 1 - (row * TILE_SIZE + inset) / height,
      });
    });

    if (canvas && ctx) {
      this.texture = new THREE.CanvasTexture(canvas);
      this.texture.magFilter = THREE.NearestFilter;
      this.texture.minFilter = THREE.NearestFilter;
      this.texture.generateMipmaps = false;
      this.texture.colorSpace = THREE.SRGBColorSpace;
    } else {
      this.texture = null;
    }
  }

  /** Builds the 64px material atlases once (a few hundred ms). */
  /** Scale used for the material atlases (8 = 128px on desktops, 4 = 64px on phones and tablets). */
  hiResScale = HI_RES_SCALE;
  anisotropy = 4;

  buildHiRes(): boolean {
    if (this.hiResTexture) return true;
    if (typeof document === 'undefined') return false;
    const tile = TILE_SIZE * this.hiResScale;
    const width = this.columns * tile;
    const height = this.rows * tile;
    const make = (): [HTMLCanvasElement, CanvasRenderingContext2D] | null => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const g = c.getContext('2d');
      return g ? [c, g] : null;
    };
    const color = make();
    const normal = make();
    const rough = make();
    if (!color || !normal || !rough) return false;
    this.keys.forEach((key, index) => {
      const small = paintTile(key);
      if (!small) return;
      const tiles = enhanceTile(small, key, PAINTERS[key]?.seed ?? index, this.hiResScale);
      if (!tiles) return;
      const col = index % this.columns;
      const row = Math.floor(index / this.columns);
      color[1].drawImage(tiles.color, col * tile, row * tile);
      normal[1].drawImage(tiles.normal, col * tile, row * tile);
      rough[1].drawImage(tiles.roughness, col * tile, row * tile);
    });
    const tex = (c: HTMLCanvasElement, srgb: boolean): THREE.CanvasTexture => {
      const t = new THREE.CanvasTexture(c);
      t.magFilter = THREE.LinearFilter;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.generateMipmaps = true;
      t.anisotropy = this.anisotropy;
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    this.hiResTexture = tex(color[0], true);
    this.normalTexture = tex(normal[0], false);
    this.roughnessTexture = tex(rough[0], false);
    return true;
  }

  rect(key: string): UVRect {
    return this.rects.get(key) ?? { u0: 0, v0: 0, u1: 1, v1: 1 };
  }

  dispose(): void {
    this.texture?.dispose();
    this.hiResTexture?.dispose();
    this.normalTexture?.dispose();
    this.roughnessTexture?.dispose();
  }
}
