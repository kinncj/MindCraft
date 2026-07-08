import type { MindCraftDatabase, StoredBlock, StoredBox } from './db';
import type { MagicDeliveryBox, PlacedBlock } from '../types/game';

export class WorldRepository {
  constructor(private db: MindCraftDatabase) {}

  async saveWorld(blocks: PlacedBlock[], boxes: MagicDeliveryBox[]): Promise<void> {
    const storedBlocks: StoredBlock[] = blocks.map((b) => ({
      id: b.id,
      type: b.type,
      x: b.position.x,
      y: b.position.y,
      z: b.position.z,
    }));
    const storedBoxes: StoredBox[] = boxes.map((box) => ({
      id: box.id,
      name: box.name,
      x: box.position.x,
      y: box.position.y,
      z: box.position.z,
      items: box.items,
    }));
    await this.db.transaction('rw', this.db.blocks, this.db.boxes, this.db.meta, async () => {
      await this.db.blocks.clear();
      await this.db.blocks.bulkAdd(storedBlocks);
      await this.db.boxes.clear();
      await this.db.boxes.bulkAdd(storedBoxes);
      await this.db.meta.put({ key: 'lastSavedAt', value: new Date().toISOString() });
    });
  }

  async loadWorld(): Promise<{ blocks: PlacedBlock[]; boxes: MagicDeliveryBox[] } | null> {
    const storedBlocks = await this.db.blocks.toArray();
    if (storedBlocks.length === 0) return null;
    const storedBoxes = await this.db.boxes.toArray();
    return {
      blocks: storedBlocks.map((b) => ({
        id: b.id,
        type: b.type,
        position: { x: b.x, y: b.y, z: b.z },
      })),
      boxes: storedBoxes.map((box) => ({
        id: box.id,
        name: box.name,
        position: { x: box.x, y: box.y, z: box.z },
        items: box.items,
      })),
    };
  }

  async clearWorld(): Promise<void> {
    await this.db.transaction('rw', this.db.blocks, this.db.boxes, this.db.meta, async () => {
      await this.db.blocks.clear();
      await this.db.boxes.clear();
      await this.db.meta.clear();
    });
  }

  async getLastSavedAt(): Promise<string | null> {
    const row = await this.db.meta.get('lastSavedAt');
    return typeof row?.value === 'string' ? row.value : null;
  }
}
