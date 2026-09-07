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
      expect(mode.lighting.sunIntensity).toBeGreaterThan(0);
      expect(mode.fog.far).toBeGreaterThan(mode.fog.near);
      expect(mode.sky.night).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('only dream mode sparkles and ids validate', () => {
    expect(VISUAL_MODES.claudeDream.effects.sparkles).toBe(true);
    expect(VISUAL_MODES.classic.effects.sparkles).toBe(false);
    expect(isVisualModeId('noir')).toBe(false);
    expect(isVisualModeId('classic')).toBe(true);
  });
});
