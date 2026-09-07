import { describe, expect, it } from 'vitest';
import { roughnessFor } from '../../src/engine/render/atlasEnhance';
import { TextureAtlas } from '../../src/engine/render/TextureAtlas';

describe('material enhancement', () => {
  it('assigns roughness by what a block is made of', () => {
    expect(roughnessFor('glass')).toBeLessThan(0.2);
    expect(roughnessFor('water')).toBeLessThan(0.1);
    expect(roughnessFor('planks')).toBeGreaterThan(0.5);
    expect(roughnessFor('stone_bricks')).toBeGreaterThan(0.8);
    expect(roughnessFor('grass_top')).toBeGreaterThan(0.9);
    expect(roughnessFor('something_new')).toBe(0.75);
  });

  it('keeps the same UV layout for hi-res and, without canvas, reports it cannot build', () => {
    const atlas = new TextureAtlas();
    const before = atlas.rect('grass_top');
    expect(atlas.buildHiRes()).toBe(false); // jsdom has no 2D canvas
    expect(atlas.rect('grass_top')).toEqual(before);
    expect(atlas.hiResTexture).toBeNull();
  });
});
