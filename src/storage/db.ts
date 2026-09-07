import Dexie, { type EntityTable } from 'dexie';
import type { BlockTypeId, BoxItem } from '../types/game';
import type { TimeMode, VisualModeId, WeatherMode } from '../types/game';

/** v1 tables — kept only so the migration can read them. */
export type StoredBlock = { id: string; type: BlockTypeId; x: number; y: number; z: number };
export type StoredBox = { id: string; name: string; x: number; y: number; z: number; items: BoxItem[] };
export type StoredMeta = { key: string; value: unknown };

/** v2: one row per world. */
export type StoredWorld = {
  id: string;
  name: string;
  seed: number;
  generator: { kind: 'infinite' | 'flat'; surfaceY?: number; preset?: 'toyland' | 'town' };
  createdAt: string;
  updatedAt: string;
  /** Spawn point, and where the player last stood. */
  spawn: { x: number; y: number; z: number };
  player?: { x: number; y: number; z: number; yaw: number; pitch: number };
  settings: {
    selectedBlockType: string;
    hotbar: string[];
    visualMode: VisualModeId;
    timeMode: TimeMode;
    weather: WeatherMode;
    timeOfDay?: number;
    /** Dress-up colors and hat. */
    look?: { shirt?: string; pants?: string; skin?: string; hair?: string; hat?: string };
  };
  /** Pets, villagers, and vehicles living in this world. */
  entities?: Array<{
    id: string;
    kind: string;
    variant?: string;
    name?: string;
    x: number;
    y: number;
    z: number;
    brain: string;
    home?: { x: number; z: number };
    data?: Record<string, unknown>;
  }>;
  /** Block-id palette used by this world's chunk rows. */
  palette: Record<number, string>;
  thumbnail?: string;
  /** A one-time template still to be written into fresh chunks. */
  template?: Array<{ x: number; y: number; z: number; id: string; state?: number; entity?: { kind: string; data: Record<string, unknown> } }>;
};

/** v2: one row per edited chunk. Unedited chunks regenerate. */
export type StoredChunk = {
  /** `${worldId}:${cx},${cz}` */
  key: string;
  worldId: string;
  cx: number;
  cz: number;
  blocks: number[]; // RLE
  states: number[]; // RLE
  entities: Array<{ index: number; kind: string; data: Record<string, unknown> }>;
};

export type MindCraftDatabase = Dexie & {
  blocks: EntityTable<StoredBlock, 'id'>;
  boxes: EntityTable<StoredBox, 'id'>;
  meta: EntityTable<StoredMeta, 'key'>;
  worlds: EntityTable<StoredWorld, 'id'>;
  chunks: EntityTable<StoredChunk, 'key'>;
};

export function createDatabase(name = 'mindcraft'): MindCraftDatabase {
  const db = new Dexie(name) as MindCraftDatabase;
  db.version(1).stores({
    blocks: 'id, [x+y+z]',
    boxes: 'id',
    meta: 'key',
  });
  db.version(2).stores({
    blocks: 'id, [x+y+z]',
    boxes: 'id',
    meta: 'key',
    worlds: 'id, updatedAt',
    chunks: 'key, worldId',
  });
  return db;
}

/** The storage layout version this build writes. Bump with each Dexie version. */
export const STORAGE_VERSION = 2;

export type StorageInfo = {
  storageVersion: number;
  appVersion: string;
  /** When a v1 database was converted, if ever. */
  migratedFromV1At?: string;
  firstSeenAt: string;
  lastOpenedAt: string;
};

export const db = createDatabase();
