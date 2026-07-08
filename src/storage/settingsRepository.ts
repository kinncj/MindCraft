import type { MindCraftDatabase } from './db';
import type { BlockTypeId } from '../types/game';
import { isKnownBlockType } from '../game/engine/blockRegistry';

export type GameSettings = {
  worldName: string;
  selectedBlockType: BlockTypeId;
};

export const DEFAULT_SETTINGS: GameSettings = {
  worldName: 'My World',
  selectedBlockType: 'grass',
};

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
    };
  }

  async saveSettings(settings: GameSettings): Promise<void> {
    await this.db.meta.put({ key: 'settings', value: settings });
  }
}
