import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { BlockState } from '../../src/engine/blocks/BlockState';
import { BuildTools } from '../../src/engine/build/BuildTools';
import { BLUEPRINTS } from '../../src/engine/build/blueprints';
import { centeredOrigin, mirrorState, rotateStamp, stampToEdits, type Stamp } from '../../src/engine/build/Clipboard';
import { CommandHistory } from '../../src/engine/commands/CommandHistory';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

function setup() {
  const world = new VoxelWorld(blocks);
  for (let cx = -1; cx <= 2; cx++) for (let cz = -1; cz <= 2; cz++) world.addChunk(new Chunk(cx, cz));
  const history = new CommandHistory(world);
  return { world, history, build: new BuildTools(world, blocks, history) };
}

describe('clipboard', () => {
  const stamp: Stamp = {
    width: 3, height: 1, depth: 2,
    blocks: [{ x: 0, y: 0, z: 0, id: B.planks_stairs, state: BlockState.withRotation(0, 0) }, { x: 2, y: 0, z: 1, id: B.brick, state: 0 }],
  };

  it('rotates a quarter turn, swapping width and depth and turning stairs', () => {
    const r = rotateStamp(stamp, 1, blocks);
    expect(r.width).toBe(2);
    expect(r.depth).toBe(3);
    const stairs = r.blocks.find((b) => b.id === B.planks_stairs)!;
    expect(BlockState.rotation(stairs.state)).toBe(1);
    expect(stairs).toMatchObject({ x: 1, z: 0 });
    const brick = r.blocks.find((b) => b.id === B.brick)!;
    expect(brick).toMatchObject({ x: 0, z: 2 });
    // Four turns bring everything home.
    const full = rotateStamp(stamp, 4, blocks);
    expect(full.blocks.map((b) => [b.x, b.z, b.state])).toEqual(stamp.blocks.map((b) => [b.x, b.z, b.state]));
  });

  it('centers on a target and mirrors facing', () => {
    expect(centeredOrigin(stamp, 10, 5, 10)).toEqual({ x: 9, y: 5, z: 9 });
    expect(stampToEdits(stamp, 9, 5, 9)[1]).toMatchObject({ x: 11, y: 5, z: 10, id: B.brick });
    expect(BlockState.rotation(mirrorState(BlockState.withRotation(0, 1)))).toBe(3);
    expect(BlockState.rotation(mirrorState(BlockState.withRotation(0, 2)))).toBe(2);
  });
});

describe('build tools', () => {
  it('builds a hollow room with a doorway as one undo step', () => {
    const { world, history, build } = setup();
    expect(build.room({ x: 2, y: 5, z: 2 }, { x: 8, y: 5, z: 8 }, B.planks)).toBeGreaterThan(0);
    expect(world.getBlock(5, 5, 5)).toBe(B.planks); // floor
    expect(world.getBlock(2, 7, 5)).toBe(B.planks); // wall
    expect(world.getBlock(5, 7, 5)).toBe(0); // hollow
    expect(world.getBlock(5, 9, 5)).toBe(0); // no roof
    expect(world.getBlock(5, 6, 2)).toBe(0); // doorway
    expect(world.getBlock(5, 7, 2)).toBe(0);
    expect(world.getBlock(4, 6, 2)).toBe(B.planks);
    history.undo();
    expect(world.getBlock(5, 5, 5)).toBe(0);
  });

  it('copies a region and pastes it rotated and centered', () => {
    const { world, build } = setup();
    world.setBlock(1, 1, 1, B.brick);
    world.setBlock(3, 1, 1, B.planks_stairs, BlockState.withRotation(0, 0));
    expect(build.copy({ x: 1, y: 1, z: 1 }, { x: 3, y: 1, z: 1 })).toBe(true);
    expect(build.clipboard?.blocks).toHaveLength(2);
    build.rotateClipboard();
    expect(build.paste({ x: 20, y: 10, z: 20 })).toBe(2);
    const stairs = [20, 21, 19].map((z) => world.getBlock(20, 10, z)).filter((id) => id === B.planks_stairs);
    expect(stairs).toHaveLength(1);
    const bounds = build.pasteBounds({ x: 20, y: 10, z: 20 })!;
    expect(bounds.max.z - bounds.min.z).toBe(2);
  });

  it('paints keeping state for the same shape and mirrors edits', () => {
    const { world, build } = setup();
    const rotated = BlockState.withRotation(0, 2);
    world.setBlock(4, 4, 4, B.planks_stairs, rotated);
    const hit = { x: 4, y: 4, z: 4, id: B.planks_stairs, face: 2 as const, px: 4, py: 4.5, pz: 4, distance: 1 };
    expect(build.paint(hit, B.stone_stairs)).toBe(true);
    expect(world.getBlock(4, 4, 4)).toBe(B.stone_stairs);
    expect(world.getState(4, 4, 4)).toBe(rotated);
    expect(build.paint({ ...hit, id: B.stone_stairs }, B.brick)).toBe(true);
    expect(world.getState(4, 4, 4)).toBe(0);

    build.setMirror(10);
    build.run('Place', [{ x: 12, y: 3, z: 3, id: B.brick, state: 0 }]);
    expect(world.getBlock(8, 3, 3)).toBe(B.brick);
    build.setMirror(null);
  });

  it('fills a box and refuses absurd sizes', () => {
    const { world, build } = setup();
    expect(build.fill({ x: 0, y: 2, z: 0 }, { x: 3, y: 4, z: 3 }, B.glass)).toBe(48);
    expect(world.getBlock(3, 4, 3)).toBe(B.glass);
    expect(() => build.fill({ x: 0, y: 0, z: 0 }, { x: 40, y: 40, z: 40 }, B.glass)).toThrow(/too big/);
  });
});

describe('blueprints', () => {
  it('are all valid, sized, and use known blocks', () => {
    expect(BLUEPRINTS.length).toBeGreaterThanOrEqual(5);
    for (const bp of BLUEPRINTS) {
      expect(bp.stamp.blocks.length).toBeGreaterThan(5);
      expect(bp.stamp.width * bp.stamp.height * bp.stamp.depth).toBeLessThan(2000);
      for (const b of bp.stamp.blocks) {
        expect(blocks.get(b.id), `${bp.id} uses unknown id ${b.id}`).toBeDefined();
        expect(b.x).toBeLessThan(bp.stamp.width);
        expect(b.z).toBeLessThan(bp.stamp.depth);
      }
    }
  });

  it('a stamped house has a door and a bed', () => {
    const { world, build } = setup();
    build.setClipboard(BLUEPRINTS.find((b) => b.id === 'cozy_house')!.stamp);
    const n = build.paste({ x: 10, y: 3, z: 10 });
    expect(n).toBeGreaterThan(50);
    const ids = new Set<number>();
    for (let x = 5; x < 16; x++) for (let y = 3; y < 10; y++) for (let z = 5; z < 16; z++) ids.add(world.getBlock(x, y, z));
    expect(ids.has(B.door)).toBe(true);
    expect(ids.has(B.bed)).toBe(true);
  });
});

describe('shapes', () => {
  it('plans pyramids, towers, trees, and rejects unknown shapes', () => {
    const { world, build } = setup();
    const pyramid = build.planShape('pyramid', 10, 5, 10, B.sandstone, 5);
    expect(pyramid.length).toBe(25 + 9 + 1);
    expect(pyramid.some((e) => e.y === 7 && e.x === 10 && e.z === 10)).toBe(true);
    const tower = build.planShape('tower', 20, 5, 20, B.stone_bricks, 4);
    expect(tower.some((e) => e.id === B.ladder)).toBe(true);
    expect(tower.filter((e) => e.y === 5).length).toBe(17);
    const tree = build.planShape('tree', 30, 5, 30, B.wood, 5);
    expect(tree.some((e) => e.id === B.leaves)).toBe(true);
    expect(build.planShape('spaceship', 0, 0, 0, B.brick)).toEqual([]);
    expect(build.run('Pyramid', pyramid)).toBe(35);
    expect(world.getBlock(10, 7, 10)).toBe(B.sandstone);
  });
});
