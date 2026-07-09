import type { BlockPosition, BlockTypeId, PlacedBlock, WorldSize } from '../../types/game';

// Big enough to feel like open country under the fog, small enough that a
// full save/export stays instant. ~10k blocks after terrain generation.
export const WORLD_SIZE: WorldSize = {
  width: 64,
  depth: 64,
  height: 32,
};

export function positionKey(pos: BlockPosition): string {
  return `${pos.x},${pos.y},${pos.z}`;
}

export function isInsideWorld(pos: BlockPosition, size: WorldSize = WORLD_SIZE): boolean {
  return (
    Number.isInteger(pos.x) &&
    Number.isInteger(pos.y) &&
    Number.isInteger(pos.z) &&
    pos.x >= 0 &&
    pos.x < size.width &&
    pos.y >= 0 &&
    pos.y < size.height &&
    pos.z >= 0 &&
    pos.z < size.depth
  );
}

let idCounter = 0;

export function newBlockId(): string {
  // crypto.randomUUID is available in every browser we target; the counter
  // fallback keeps unit tests happy in stripped-down environments.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  idCounter += 1;
  return `block-${Date.now()}-${idCounter}`;
}

export function makeBlock(type: BlockTypeId, position: BlockPosition): PlacedBlock {
  return { id: newBlockId(), type, position };
}

/**
 * The in-memory world: a map from "x,y,z" to a placed block.
 * Plain data so it is easy to persist, export, and test.
 */
export class World {
  private blocks = new Map<string, PlacedBlock>();

  constructor(public readonly size: WorldSize = WORLD_SIZE) {}

  getBlock(pos: BlockPosition): PlacedBlock | undefined {
    return this.blocks.get(positionKey(pos));
  }

  hasBlock(pos: BlockPosition): boolean {
    return this.blocks.has(positionKey(pos));
  }

  placeBlock(type: BlockTypeId, pos: BlockPosition): PlacedBlock | null {
    if (!isInsideWorld(pos, this.size)) return null;
    if (this.hasBlock(pos)) return null;
    const block = makeBlock(type, pos);
    this.blocks.set(positionKey(pos), block);
    return block;
  }

  removeBlock(pos: BlockPosition): PlacedBlock | null {
    const key = positionKey(pos);
    const block = this.blocks.get(key);
    if (!block) return null;
    this.blocks.delete(key);
    return block;
  }

  loadBlocks(blocks: PlacedBlock[]): void {
    this.blocks.clear();
    for (const block of blocks) {
      if (isInsideWorld(block.position, this.size)) {
        this.blocks.set(positionKey(block.position), block);
      }
    }
  }

  allBlocks(): PlacedBlock[] {
    return [...this.blocks.values()];
  }

  get blockCount(): number {
    return this.blocks.size;
  }

  clear(): void {
    this.blocks.clear();
  }
}
