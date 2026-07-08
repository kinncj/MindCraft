import Dexie, { type EntityTable } from 'dexie';
import type { BlockPosition, BlockTypeId, BoxItem } from '../types/game';

export type StoredBlock = {
  id: string;
  type: BlockTypeId;
  x: number;
  y: number;
  z: number;
};

export type StoredBox = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  items: BoxItem[];
};

export type StoredMeta = {
  key: string;
  value: unknown;
};

export type MindCraftDatabase = Dexie & {
  blocks: EntityTable<StoredBlock, 'id'>;
  boxes: EntityTable<StoredBox, 'id'>;
  meta: EntityTable<StoredMeta, 'key'>;
};

export function createDatabase(name = 'mindcraft'): MindCraftDatabase {
  const db = new Dexie(name) as MindCraftDatabase;
  db.version(1).stores({
    blocks: 'id, [x+y+z]',
    boxes: 'id',
    meta: 'key',
  });
  return db;
}

export const db = createDatabase();

export function blockPositionOf(stored: StoredBlock | StoredBox): BlockPosition {
  return { x: stored.x, y: stored.y, z: stored.z };
}
