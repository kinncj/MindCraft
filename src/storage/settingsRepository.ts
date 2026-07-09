import type { MindCraftDatabase } from './db';
import type { BlockTypeId, TimeMode, VisualModeId, WeatherMode } from '../types/game';
import { isKnownBlockType } from '../game/engine/blockRegistry';
import { isVisualModeId } from '../shaders/visualModes';

export type GameSettings = {
  worldName: string;
  selectedBlockType: BlockTypeId;
  visualMode: VisualModeId;
  timeMode: TimeMode;
  weather: WeatherMode;
};

export const DEFAULT_SETTINGS: GameSettings = {
  worldName: 'My World',
  selectedBlockType: 'grass',
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

export class SettingsRepository {
  constructor(private db: MindCraftDatabase) {}

  async loadSettings(): Promise<GameSettings> {
    const row = await this.db.meta.get('settings');
    if (!row || typeof row.value !== 'object' || row.value === null) {
      return { ...DEFAULT_SETTINGS };
    }
    const raw = row.value as Partial<GameSettings>;
    return {
      worldName:
        typeof raw.worldName === 'string' && raw.worldName.trim().length > 0
          ? raw.worldName
          : DEFAULT_SETTINGS.worldName,
      selectedBlockType: isKnownBlockType(raw.selectedBlockType)
        ? raw.selectedBlockType
        : DEFAULT_SETTINGS.selectedBlockType,
      visualMode: isVisualModeId(raw.visualMode) ? raw.visualMode : DEFAULT_SETTINGS.visualMode,
      timeMode: isTimeMode(raw.timeMode) ? raw.timeMode : DEFAULT_SETTINGS.timeMode,
      weather: isWeatherMode(raw.weather) ? raw.weather : DEFAULT_SETTINGS.weather,
    };
  }

  async saveSettings(settings: GameSettings): Promise<void> {
    await this.db.meta.put({ key: 'settings', value: settings });
  }
}
