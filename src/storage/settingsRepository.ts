import type { TimeMode, VisualModeId, WeatherMode } from '../types/game';
import { isVisualModeId } from '../shaders/visualModes';

/** Per-world settings that ride along in the world row. */
export type GameSettings = {
  selectedBlockType: string;
  hotbar: string[];
  visualMode: VisualModeId;
  timeMode: TimeMode;
  weather: WeatherMode;
};

export const DEFAULT_HOTBAR = ['grass', 'planks', 'brick', 'glass', 'color_red', 'color_blue', 'torch', 'flower_pink', 'magic_box'];

export const DEFAULT_SETTINGS: GameSettings = {
  selectedBlockType: 'grass',
  hotbar: DEFAULT_HOTBAR,
  visualMode: 'classic',
  timeMode: 'cycle',
  weather: 'sunny',
};

export function isTimeMode(value: unknown): value is TimeMode {
  return value === 'cycle' || value === 'day' || value === 'night';
}

export function isWeatherMode(value: unknown): value is WeatherMode {
  return value === 'sunny' || value === 'rain' || value === 'snow';
}

export function normalizeSettings(raw: Partial<GameSettings> | undefined, isBlock: (id: unknown) => boolean): GameSettings {
  const hotbar = Array.isArray(raw?.hotbar) ? raw!.hotbar.filter((id) => isBlock(id)).slice(0, 9) : [];
  return {
    selectedBlockType: isBlock(raw?.selectedBlockType) ? (raw!.selectedBlockType as string) : DEFAULT_SETTINGS.selectedBlockType,
    hotbar: hotbar.length === 9 ? hotbar : DEFAULT_HOTBAR,
    visualMode: isVisualModeId(raw?.visualMode) ? raw!.visualMode : DEFAULT_SETTINGS.visualMode,
    timeMode: isTimeMode(raw?.timeMode) ? raw!.timeMode : DEFAULT_SETTINGS.timeMode,
    weather: isWeatherMode(raw?.weather) ? raw!.weather : DEFAULT_SETTINGS.weather,
  };
}
