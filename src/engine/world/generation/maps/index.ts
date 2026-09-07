import type { PresetMap } from './MapBuilder';
import { buildSunnyTown } from './sunnyTown';
import { buildToyLand } from './toyLand';

export type PresetName = 'toyland' | 'town';

export const PRESETS: Record<PresetName, { label: string; emoji: string; description: string; build: (floorY: number) => PresetMap }> = {
  toyland: { label: 'Toy Land', emoji: '🧸', description: 'A giant bedroom full of toys', build: buildToyLand },
  town: { label: 'Sunny Town', emoji: '🏘️', description: 'Streets, shops, a park, and neighbors with jobs', build: buildSunnyTown },
};

const cache = new Map<string, PresetMap>();

/** The prebuilt map for a preset, built once per process. */
export function presetMap(name: PresetName, floorY: number): PresetMap {
  const key = `${name}:${floorY}`;
  let map = cache.get(key);
  if (!map) {
    map = PRESETS[name].build(floorY);
    cache.set(key, map);
  }
  return map;
}

export function isPresetName(value: unknown): value is PresetName {
  return value === 'toyland' || value === 'town';
}
