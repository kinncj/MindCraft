import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { DOUBLE_TAP_SECONDS, InputSystem } from '../../src/engine/input/InputSystem';
import { PlayerController } from '../../src/engine/physics/PlayerController';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

function flat(): VoxelWorld {
  const world = new VoxelWorld(blocks);
  for (let cx = -1; cx <= 1; cx++) for (let cz = -1; cz <= 1; cz++) {
    const chunk = new Chunk(cx, cz);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= 3; y++) chunk.set(x, y, z, B.stone);
    world.addChunk(chunk);
  }
  return world;
}

const frame = (over: Partial<Parameters<PlayerController['update']>[1]>) =>
  ({ forward: false, back: false, left: false, right: false, jump: false, sprint: false, sneak: false, ...over }) as Parameters<PlayerController['update']>[1];

describe('creative flight', () => {
  it('rises with jump, hangs in the air, sinks with sneak, and lands', () => {
    const world = flat();
    const player = new PlayerController(world, blocks, { x: 8, y: 4, z: 8 });
    for (let i = 0; i < 30; i++) player.update(1 / 60, frame({}), 0);
    const ground = player.y;
    player.setFlying(true);
    for (let i = 0; i < 90; i++) player.update(1 / 60, frame({ jump: true }), 0);
    expect(player.y).toBeGreaterThan(ground + 4);
    const high = player.y;
    for (let i = 0; i < 90; i++) player.update(1 / 60, frame({}), 0);
    expect(player.y).toBeGreaterThanOrEqual(high - 0.01); // no gravity while flying
    expect(player.y).toBeLessThan(high + 1.5);
    for (let i = 0; i < 60; i++) player.update(1 / 60, frame({ forward: true }), 0);
    expect(player.z).toBeLessThan(8); // moves at fly speed
    for (let i = 0; i < 240 && player.flying; i++) player.update(1 / 60, frame({ sneak: true }), 0);
    expect(player.flying).toBe(false);
    expect(player.y).toBeCloseTo(ground, 0);
  });

  it('a double jump toggles flying from any input source', () => {
    const input = new InputSystem(document.createElement('div'));
    const press = (down: boolean) => {
      window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key: ' ' }));
    };
    press(true); input.update(0.016); press(false); input.update(0.016);
    expect(input.frame.commands).not.toContain('fly_toggle');
    press(true); input.update(0.016);
    expect(input.frame.commands).toContain('fly_toggle');
    press(false); input.update(DOUBLE_TAP_SECONDS + 0.1);
    press(true); input.update(0.016);
    expect(input.frame.commands).not.toContain('fly_toggle');
    input.dispose();
  });
});
