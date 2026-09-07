import type { BlockStateByte } from '../blocks/BlockState';
import type { BlockEntity } from '../world/Chunk';
import type { VoxelWorld } from '../world/VoxelWorld';

export type BlockEdit = {
  x: number;
  y: number;
  z: number;
  id: number;
  state: BlockStateByte;
  entity?: BlockEntity | null;
};

/** Something that changed the world and knows how to undo itself. */
export interface Command {
  readonly label: string;
  execute(world: VoxelWorld): void;
  undo(world: VoxelWorld): void;
}

/**
 * Sets any number of blocks. Captures what was there first so undo is
 * exact, including block entities (box contents).
 */
export class SetBlocksCommand implements Command {
  private before: BlockEdit[] = [];
  private captured = false;

  constructor(
    readonly label: string,
    private edits: BlockEdit[],
  ) {}

  get size(): number {
    return this.edits.length;
  }

  execute(world: VoxelWorld): void {
    if (!this.captured) {
      this.before = this.edits.map(({ x, y, z }) => ({
        x,
        y,
        z,
        id: world.getBlock(x, y, z),
        state: world.getState(x, y, z),
        entity: world.getEntity(x, y, z) ?? null,
      }));
      this.captured = true;
    }
    apply(world, this.edits);
  }

  undo(world: VoxelWorld): void {
    apply(world, this.before);
  }
}

function apply(world: VoxelWorld, edits: BlockEdit[]): void {
  for (const edit of edits) {
    world.setBlock(edit.x, edit.y, edit.z, edit.id, edit.state);
    if (edit.entity !== undefined) world.setEntity(edit.x, edit.y, edit.z, edit.entity);
  }
}
