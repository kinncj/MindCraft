import type { VisualModeId } from '../types/game';

/**
 * The visual mode package: each mode is pure data the renderer applies —
 * sky palettes for the day/night cycle, lighting levels, tone mapping,
 * and gentle effects. No mode is ever dark-scary; night is a cozy navy.
 */

export type SkyPalette = {
  day: string;
  dawn: string;
  night: string;
};

export type VisualModeDefinition = {
  id: VisualModeId;
  name: string;
  description: string;
  lighting: {
    sunIntensity: number;
    hemisphereIntensity: number;
    shadowsEnabled: boolean;
  };
  sky: SkyPalette;
  toneMapping: 'none' | 'aces';
  exposure: number;
  fog: {
    near: number;
    far: number;
  };
  effects: {
    sparkles: boolean;
  };
  /** How the world is drawn. Cinema turns everything on. */
  rendering: {
    /** Physically based materials with generated normal and roughness maps. */
    pbr: boolean;
    /** A procedural sky baked into an environment map for reflections and fill light. */
    envMap: boolean;
    /** 64px enhanced textures instead of 16px. */
    hiRes: boolean;
    /** Post-processing (ambient occlusion, bloom, vignette). */
    postFx: boolean;
    /** Natural terrain, tree canopies, and water drawn as smooth rounded surfaces. */
    smooth: boolean;
    /** Sun shadow map size. */
    shadowMap: number;
    /** Extra chunks of draw distance. */
    viewRadiusBonus: number;
  };
};

const FLAT_RENDERING: VisualModeDefinition['rendering'] = { pbr: false, envMap: false, hiRes: false, postFx: false, smooth: false, shadowMap: 2048, viewRadiusBonus: 0 };

export const VISUAL_MODES: Record<VisualModeId, VisualModeDefinition> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Bright, simple, and blocky. The way home looks.',
    lighting: {
      sunIntensity: 1.6,
      hemisphereIntensity: 1.1,
      shadowsEnabled: true,
    },
    sky: {
      day: '#aee3ff',
      dawn: '#ffcf9e',
      night: '#232f52',
    },
    toneMapping: 'none',
    exposure: 1,
    fog: { near: 70, far: 170 },
    effects: { sparkles: false },
    rendering: FLAT_RENDERING,
  },
  ultraRealistic: {
    id: 'ultraRealistic',
    name: 'Ultra',
    description: 'Deeper sky, richer light, and long soft shadows.',
    lighting: {
      sunIntensity: 2.2,
      hemisphereIntensity: 0.9,
      shadowsEnabled: true,
    },
    sky: {
      day: '#8ecdf5',
      dawn: '#ffb877',
      night: '#141d3d',
    },
    toneMapping: 'aces',
    exposure: 1.18,
    fog: { near: 90, far: 220 },
    effects: { sparkles: false },
    rendering: FLAT_RENDERING,
  },
  claudeDream: {
    id: 'claudeDream',
    name: 'Claude Dream',
    description: 'A magical world imagined by code. Sparkles included.',
    lighting: {
      sunIntensity: 1.4,
      hemisphereIntensity: 1.3,
      shadowsEnabled: false,
    },
    sky: {
      day: '#d8bff5',
      dawn: '#ffb8d9',
      night: '#3a2a5e',
    },
    toneMapping: 'aces',
    exposure: 1.05,
    fog: { near: 60, far: 150 },
    effects: { sparkles: true },
    rendering: FLAT_RENDERING,
  },
  cinema: {
    id: 'cinema',
    name: 'Cinema',
    description: 'Real light and materials, a living sky, deep shadows. Needs a good device.',
    lighting: {
      sunIntensity: 2.4,
      hemisphereIntensity: 0.5,
      shadowsEnabled: true,
    },
    sky: {
      day: '#6fb3ec',
      dawn: '#ff9f5e',
      night: '#0b1128',
    },
    toneMapping: 'aces',
    exposure: 0.85,
    fog: { near: 140, far: 320 },
    effects: { sparkles: false },
    rendering: { pbr: true, envMap: true, hiRes: true, postFx: true, smooth: true, shadowMap: 4096, viewRadiusBonus: 2 },
  },
};

export const VISUAL_MODE_IDS = Object.keys(VISUAL_MODES) as VisualModeId[];

export function isVisualModeId(value: unknown): value is VisualModeId {
  return typeof value === 'string' && value in VISUAL_MODES;
}
