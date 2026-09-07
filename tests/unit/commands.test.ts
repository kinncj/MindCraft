import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { SetBlocksCommand } from '../../src/engine/commands/Command';
import { CommandHistory } from '../../src/engine/commands/CommandHistory';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

describe('command history', () => {
  it('undoes and redoes block edits including box contents', () => {
    const world = new VoxelWorld(blocks);
    world.addChunk(new Chunk(0, 0));
    world.setBlock(1, 1, 1, B.magic_box);
    world.setEntity(1, 1, 1, { kind: 'container', data: { name: 'Treasure', items: [{ blockType: 'star', quantity: 2 }] } });
    const history = new CommandHistory(world);
    let notified = 0;
    history.subscribe(() => notified++);

    history.run(new SetBlocksCommand('Remove box', [{ x: 1, y: 1, z: 1, id: 0, state: 0, entity: null }]));
    expect(world.getBlock(1, 1, 1)).toBe(0);
    expect(world.getEntity(1, 1, 1)).toBeUndefined();
    expect(history.canUndo).toBe(true);

    history.undo();
    expect(world.getBlock(1, 1, 1)).toBe(B.magic_box);
    expect(world.getEntity(1, 1, 1)?.data.name).toBe('Treasure');
    expect(history.canRedo).toBe(true);

    history.redo();
    expect(world.getBlock(1, 1, 1)).toBe(0);
    expect(notified).toBe(3);
  });

  it('a new command clears the redo stack and the stack is bounded', () => {
    const world = new VoxelWorld(blocks);
    world.addChunk(new Chunk(0, 0));
    const history = new CommandHistory(world, 3);
    for (let i = 0; i < 5; i++) history.run(new SetBlocksCommand('p', [{ x: i, y: 1, z: 1, id: B.stone, state: 0 }]));
    history.undo();
    expect(history.canRedo).toBe(true);
    history.run(new SetBlocksCommand('p', [{ x: 9, y: 1, z: 1, id: B.stone, state: 0 }]));
    expect(history.canRedo).toBe(false);
    let undone = 0;
    while (history.undo()) undone++;
    expect(undone).toBe(3);
  });
});
