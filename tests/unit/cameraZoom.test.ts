import { describe, expect, it } from 'vitest';
import { blocks } from '../../src/engine/blocks/blocks';
import { CameraSystem } from '../../src/engine/input/CameraSystem';
import type { InputFrame } from '../../src/engine/input/InputSystem';
import { PlayerController } from '../../src/engine/physics/PlayerController';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

function camera() {
  const world = new VoxelWorld(blocks);
  world.addChunk(new Chunk(0, 0));
  const player = new PlayerController(world, blocks, { x: 8, y: 10, z: 8 });
  const frame = { lookDX: 0, lookDY: 0, zoom: 0, pressed: new Set<string>(), taps: [], hover: null, commands: [] } as unknown as InputFrame;
  return { cam: new CameraSystem(player, frame, world, blocks), frame };
}

describe('camera zoom', () => {
  it('zooms out and in with the wheel/pinch delta and switches to first person all the way in', () => {
    const { cam, frame } = camera();
    const start = cam.distanceTarget;
    frame.zoom = 4;
    cam.update();
    expect(cam.distanceTarget).toBeGreaterThan(start);
    frame.zoom = -40;
    cam.update();
    expect(cam.viewMode).toBe('first');
    frame.zoom = 3;
    cam.update();
    expect(cam.viewMode).toBe('third');
  });

  it('the zoom buttons and the D-pad cycle work without a wheel', () => {
    const { cam } = camera();
    cam.zoom(3);
    const out = cam.distanceTarget;
    cam.zoom(-3);
    expect(cam.distanceTarget).toBeLessThan(out);
    const seen: Array<string | number> = [];
    for (let i = 0; i < 6; i++) {
      cam.cycleZoom();
      seen.push(cam.viewMode === 'first' ? 'first' : cam.distanceTarget);
    }
    expect(seen).toContain('first');
    expect(seen).toContain(24);
    expect(seen.filter((v) => v !== 'first').length).toBeGreaterThan(2);
  });
});

describe('camera and water', () => {
  it('the chase camera ignores water so you can see under it', async () => {
    const { raycastBlocks } = await import('../../src/engine/physics/raycast');
    const { Chunk } = await import('../../src/engine/world/Chunk');
    const { VoxelWorld } = await import('../../src/engine/world/VoxelWorld');
    const { B, blocks } = await import('../../src/engine/blocks/blocks');
    const world = new VoxelWorld(blocks);
    const chunk = new Chunk(0, 0);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) { chunk.set(x, 0, z, B.sand); for (let y = 1; y <= 4; y++) chunk.set(x, y, z, B.water); }
    world.addChunk(chunk);
    const ray = { ox: 8, oy: 8, oz: 8, dx: 0, dy: -1, dz: 0 };
    expect(raycastBlocks(world, blocks, ray, 20)?.id).toBe(B.water);
    expect(raycastBlocks(world, blocks, ray, 20, (def) => def.collision === 'solid')?.id).toBe(B.sand);
  });
});
