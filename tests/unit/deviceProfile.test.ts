import { describe, expect, it } from 'vitest';
import { classifyGpu, detailRadii, pickProfile } from '../../src/engine/core/deviceProfile';

describe('device profiles', () => {
  it('tells integrated chips from graphics cards by their names', () => {
    expect(classifyGpu('ANGLE (AMD, AMD Radeon(TM) Graphics (0x00001638) Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('integrated'); // a 2022 Ryzen laptop
    expect(classifyGpu('ANGLE (AMD, Radeon RX 6700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('discrete');
    expect(classifyGpu('ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('integrated');
    expect(classifyGpu('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)')).toBe('discrete');
    expect(classifyGpu('ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)')).toBe('apple');
    expect(classifyGpu('Google SwiftShader')).toBe('software');
    expect(classifyGpu('AMD Radeon Vega 8 Graphics (renoir, LLVM 15.0.7, DRM 3.49, 6.1.0)')).toBe('integrated');
    expect(classifyGpu('')).toBe('unknown');
  });

  it('gives integrated graphics a balanced budget and cards the full one', () => {
    const laptop = pickProfile('integrated', false);
    expect(laptop.pixelRatioCap).toBeLessThanOrEqual(1.25);
    expect(laptop.shadowMap).toBeLessThanOrEqual(2048);
    expect(laptop.postFx).toBe(false);
    const card = pickProfile('discrete', false);
    expect(card.pixelRatioCap).toBe(2);
    expect(card.postFx).toBe(true);
    expect(pickProfile('discrete', true).name).toBe('phone or tablet');
  });
});

describe('detail falls off with distance', () => {
  it('keeps plants and shadows all the way out on a graphics card, and pulls both in on an integrated GPU', () => {
    const card = pickProfile('discrete', false);
    const igpu = pickProfile('integrated', false);
    const phone = pickProfile('unknown', true);
    expect(detailRadii(card, 7)).toEqual({ foliage: 7, shadow: 6 });
    expect(detailRadii(igpu, 6).foliage).toBe(4);
    expect(detailRadii(igpu, 6).shadow).toBe(3);
    expect(detailRadii(phone, 5).foliage).toBe(3);
    // Never smaller than the chunk the player stands in plus one.
    expect(detailRadii(igpu, 2)).toEqual({ foliage: 2, shadow: 2 });
  });
});
