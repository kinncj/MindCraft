import { describe, expect, it } from 'vitest';
import { classifyGpu, pickProfile } from '../../src/engine/core/deviceProfile';

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
