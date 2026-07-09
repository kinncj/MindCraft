import { describe, expect, it } from 'vitest';
import { VISUAL_MODES, VISUAL_MODE_IDS, isVisualModeId } from '../../src/shaders/visualModes';

describe('visual modes', () => {
  it('offers exactly the three promised modes', () => {
    expect([...VISUAL_MODE_IDS].sort()).toEqual(['classic', 'claudeDream', 'ultraRealistic']);
  });

  it('every mode is complete and sane', () => {
    for (const id of VISUAL_MODE_IDS) {
      const mode = VISUAL_MODES[id];
      expect(mode.id).toBe(id);
      expect(mode.name.length).toBeGreaterThan(0);
      expect(mode.description.length).toBeGreaterThan(0);
      expect(mode.lighting.sunIntensity).toBeGreaterThan(0);
      expect(mode.lighting.hemisphereIntensity).toBeGreaterThan(0);
      expect(mode.exposure).toBeGreaterThan(0);
      expect(mode.fog.far).toBeGreaterThan(mode.fog.near);
      expect(mode.sky.day).toMatch(/^#[0-9a-f]{6}$/i);
      expect(mode.sky.night).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('only dream mode sparkles', () => {
    expect(VISUAL_MODES.claudeDream.effects.sparkles).toBe(true);
    expect(VISUAL_MODES.classic.effects.sparkles).toBe(false);
    expect(VISUAL_MODES.ultraRealistic.effects.sparkles).toBe(false);
  });

  it('validates mode ids', () => {
    expect(isVisualModeId('classic')).toBe(true);
    expect(isVisualModeId('claudeDream')).toBe(true);
    expect(isVisualModeId('noir')).toBe(false);
    expect(isVisualModeId(42)).toBe(false);
  });
});
