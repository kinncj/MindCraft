import * as THREE from 'three';
import { TILE_SIZE, paintTile, textureKeys } from '../blocks/textures/painters';

export type UVRect = { u0: number; v0: number; u1: number; v1: number };

/**
 * Every texture tile packed into one canvas. UV rectangles are computed
 * even when the canvas cannot paint (jsdom), so meshing stays testable.
 */
export class TextureAtlas {
  readonly texture: THREE.CanvasTexture | null;
  private rects = new Map<string, UVRect>();
  readonly columns = 16;
  readonly rows: number;

  constructor(keys: string[] = textureKeys()) {
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

  rect(key: string): UVRect {
    return this.rects.get(key) ?? { u0: 0, v0: 0, u1: 1, v1: 1 };
  }

  dispose(): void {
    this.texture?.dispose();
  }
}
