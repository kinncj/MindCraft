import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { InputSystem } from '../../src/engine/input/InputSystem';
import { PlayerController } from '../../src/engine/physics/PlayerController';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

function flat(): VoxelWorld {
  const world = new VoxelWorld(blocks);
  for (let cx = -2; cx <= 2; cx++) for (let cz = -2; cz <= 2; cz++) {
    const chunk = new Chunk(cx, cz);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= 10; y++) chunk.set(x, y, z, y < 10 ? B.dirt : B.grass);
    world.addChunk(chunk);
  }
  return world;
}

const STILL = { forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false } as Parameters<PlayerController['update']>[1];

describe('the mouse works like a block game', () => {
  function grabbed(): { input: InputSystem; canvas: HTMLCanvasElement } {
    const canvas = document.createElement('canvas');
    const input = new InputSystem(canvas);
    input.mouseMode = 'game';
    input.pointerLocked = true;
    return { input, canvas };
  }

  it('holding the left button keeps breaking, and letting go stops it', () => {
    const { input, canvas } = grabbed();
    canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerType: 'mouse' }));
    input.update(1 / 60);
    expect(input.frame.taps, 'the click itself').toHaveLength(1);
    expect(input.frame.taps[0].button, 'left breaks').toBe(2);
    // Held down for a second: several more, at a steady rate, all at the crosshair.
    let repeats = 0;
    for (let i = 0; i < 60; i++) {
      input.update(1 / 60);
      repeats += input.frame.taps.length;
      expect(input.frame.taps.every((t) => t.ndcX === 0 && t.ndcY === 0)).toBe(true);
    }
    expect(repeats, `holding for a second gave ${repeats} blocks`).toBeGreaterThanOrEqual(3);
    expect(repeats).toBeLessThanOrEqual(8);
    canvas.dispatchEvent(new PointerEvent('pointerup', { button: 0, pointerType: 'mouse' }));
    let after = 0;
    for (let i = 0; i < 60; i++) {
      input.update(1 / 60);
      after += input.frame.taps.length;
    }
    expect(after, 'it kept going after the button came up').toBe(0);
    input.dispose();
  });

  it('holding the right button keeps placing', () => {
    const { input, canvas } = grabbed();
    canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 2, pointerType: 'mouse' }));
    let placements = 0;
    for (let i = 0; i < 60; i++) {
      input.update(1 / 60);
      placements += input.frame.taps.filter((t) => t.button === 0).length;
    }
    expect(placements).toBeGreaterThanOrEqual(3);
    input.dispose();
  });

  it('the middle button asks for the block under the crosshair', () => {
    const { input, canvas } = grabbed();
    canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 1, pointerType: 'mouse' }));
    input.update(1 / 60);
    expect(input.frame.taps.map((t) => t.button)).toEqual([1]);
    // A pick is one block, never a stream.
    let more = 0;
    for (let i = 0; i < 30; i++) {
      input.update(1 / 60);
      more += input.frame.taps.length;
    }
    expect(more).toBe(0);
    input.dispose();
  });

  it('letting go of the mouse stops the stream even without a button up', () => {
    const { input, canvas } = grabbed();
    canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerType: 'mouse' }));
    input.update(1 / 60);
    input.pointerLocked = false; // Esc
    let after = 0;
    for (let i = 0; i < 30; i++) {
      input.update(1 / 60);
      after += input.frame.taps.length;
    }
    expect(after).toBe(0);
    input.dispose();
  });
});

describe('nobody gets built into a wall', () => {
  it('a blueprint stamped where the kid stands lifts them out of it', () => {
    const world = flat();
    const player = new PlayerController(world, blocks, { x: 8, y: 11, z: 8 });
    // Somebody stamps a solid block of house right through the player.
    for (let x = 6; x <= 10; x++) for (let z = 6; z <= 10; z++) for (let y = 11; y <= 14; y++) world.setBlock(x, y, z, B.planks);
    player.update(1 / 60, STILL, 0);
    expect(player.y, `still buried at ${player.y.toFixed(2)}`).toBeGreaterThan(14);
    // And standing, not falling through the roof.
    for (let i = 0; i < 60; i++) player.update(1 / 60, STILL, 0);
    expect(player.y).toBeGreaterThan(14);
  });

  it('leaves a kid alone when the world is not on top of them', () => {
    const world = flat();
    const player = new PlayerController(world, blocks, { x: 8, y: 11, z: 8 });
    for (let i = 0; i < 30; i++) player.update(1 / 60, STILL, 0);
    // Blocks are centred on their coordinates, so standing on the grass at y = 10
    // puts the feet at 10.5. What matters is that nothing lifted them.
    expect(player.y).toBeCloseTo(10.5, 1);
  });
});
