import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld, type BlockChange } from '../../src/engine/world/VoxelWorld';

function worldWithChunks(...coords: Array<[number, number]>): VoxelWorld {
  const world = new VoxelWorld(blocks);
  for (const [cx, cz] of coords) world.addChunk(new Chunk(cx, cz));
  return world;
}

describe('VoxelWorld', () => {
  it('reads air outside loaded chunks and refuses to write there', () => {
    const world = worldWithChunks([0, 0]);
    expect(world.getBlock(100, 5, 100)).toBe(0);
    expect(world.setBlock(100, 5, 100, B.stone)).toBeNull();
    expect(world.isLoaded(100, 100)).toBe(false);
  });

  it('writes blocks across chunk borders with negative coordinates', () => {
    const world = worldWithChunks([-1, -1], [0, 0]);
    expect(world.setBlock(-1, 10, -1, B.brick)).not.toBeNull();
    expect(world.getBlock(-1, 10, -1)).toBe(B.brick);
    expect(world.getChunk(-1, -1)!.get(15, 10, 15)).toBe(B.brick);
    expect(world.getChunk(-1, -1)!.modified).toBe(true);
    expect(world.getChunk(0, 0)!.modified).toBe(false);
  });

  it('keeps the height map in sync', () => {
    const world = worldWithChunks([0, 0]);
    world.setBlock(3, 4, 3, B.dirt);
    world.setBlock(3, 9, 3, B.stone);
    expect(world.height(3, 3)).toBe(9);
    world.setBlock(3, 9, 3, 0);
    expect(world.height(3, 3)).toBe(4);
    world.setBlock(3, 4, 3, 0);
    expect(world.height(3, 3)).toBe(-1);
  });

  it('notifies listeners with before/after and drops entities on replace', () => {
    const world = worldWithChunks([0, 0]);
    const changes: BlockChange[] = [];
    world.subscribe({ onBlockChanged: (c) => changes.push(c) });
    world.setBlock(1, 1, 1, B.magic_box);
    world.setEntity(1, 1, 1, { kind: 'container', data: { name: 'Box', items: [] } });
    expect(world.getEntity(1, 1, 1)?.kind).toBe('container');
    world.setBlock(1, 1, 1, B.stone);
    expect(world.getEntity(1, 1, 1)).toBeUndefined();
    expect(changes).toHaveLength(2);
    expect(changes[1]).toMatchObject({ previousId: B.magic_box, id: B.stone });
    // Same block, same state: no event.
    expect(world.setBlock(1, 1, 1, B.stone)).toBeNull();
    expect(changes).toHaveLength(2);
  });

  it('ignores y outside the world', () => {
    const world = worldWithChunks([0, 0]);
    expect(world.setBlock(1, -1, 1, B.stone)).toBeNull();
    expect(world.setBlock(1, 128, 1, B.stone)).toBeNull();
    expect(world.getSkyLight(1, 200, 1)).toBe(15);
  });
});
