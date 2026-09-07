import { describe, expect, it } from 'vitest';
import { blocks } from '../../src/engine/blocks/blocks';
import { InputSystem } from '../../src/engine/input/InputSystem';
import { ChunkManager } from '../../src/engine/world/ChunkManager';
import { LightEngine } from '../../src/engine/lighting/LightEngine';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';
import { FlatGenerator } from '../../src/engine/world/generation/FlatGenerator';
import { ChunkMesher } from '../../src/engine/render/ChunkMesher';
import { TextureAtlas } from '../../src/engine/render/TextureAtlas';
import { pickHelperModel, SMALL_HELPER_MODEL } from '../../src/engine/chat/WebLlmProvider';

describe('desktop mouse like a real block game', () => {
  it('with the mouse grabbed: left breaks, right places, wheel flips the hotbar, movement looks', () => {
    const canvas = document.createElement('canvas');
    const input = new InputSystem(canvas);
    input.mouseMode = 'game';
    input.pointerLocked = true;
    canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerType: 'mouse', clientX: 10, clientY: 10 }));
    canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 2, pointerType: 'mouse', clientX: 10, clientY: 10 }));
    canvas.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'mouse', movementX: 12, movementY: -4 } as PointerEventInit));
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
    input.update(1 / 60);
    expect(input.frame.taps.map((t) => t.button)).toEqual([2, 0]); // break, then place
    expect(input.frame.taps[0]).toMatchObject({ ndcX: 0, ndcY: 0 });
    expect(input.frame.commands).toContain('hotbar_next');
    expect(input.frame.pointerLocked).toBe(true);
    input.dispose();
  });

  it('in tap mode a plain click still places', () => {
    const canvas = document.createElement('canvas');
    const input = new InputSystem(canvas);
    input.mouseMode = 'tap';
    canvas.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerType: 'mouse', clientX: 10, clientY: 10, pointerId: 1 }));
    canvas.dispatchEvent(new PointerEvent('pointerup', { button: 0, pointerType: 'mouse', clientX: 10, clientY: 10, pointerId: 1 }));
    input.update(1 / 60);
    expect(input.frame.taps.map((t) => t.button)).toEqual([0]);
    input.dispose();
  });
});

describe('a photo can be taken from any input', () => {
  it('the keyboard P key and the controller Back button both ask for a photo', () => {
    const canvas = document.createElement('canvas');
    const input = new InputSystem(canvas);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p' }));
    const pad = { id: 'test pad', connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: i === 8, touched: false, value: i === 8 ? 1 : 0 })) };
    const getGamepads = (): unknown[] => [pad];
    (navigator as unknown as { getGamepads: () => unknown[] }).getGamepads = getGamepads;
    input.update(1 / 60);
    expect(input.frame.pressed.has('p')).toBe(true);
    expect(input.frame.commands).toContain('photo');
    input.dispose();
  });
});

describe('chunks in front of the camera come first', () => {
  it('ranks a chunk ahead before one behind at the same distance', () => {
    const world = new VoxelWorld(blocks);
    const chunks = new ChunkManager(world, new FlatGenerator(1, 4), new LightEngine(world, blocks), new ChunkMesher(world, blocks, new TextureAtlas()), null, { useWorker: false, viewRadius: 3 });
    chunks.setFocus(0, 0);
    chunks.setViewDirection(0, -1); // looking toward -z
    const p = (chunks as unknown as { priority(cx: number, cz: number): number }).priority.bind(chunks);
    expect(p(0, -2)).toBeLessThan(p(0, 2));
    expect(p(0, -2)).toBeLessThan(p(2, 0));
    expect(p(0, 0)).toBe(0);
  });
});

describe('helper model choice', () => {
  it('uses the small model when the GPU cannot bind a big buffer', () => {
    expect(pickHelperModel('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', true, 256 * 1024 * 1024)).toBe(SMALL_HELPER_MODEL);
    expect(pickHelperModel('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', false, 256 * 1024 * 1024)).toBe('SmolLM2-360M-Instruct-q4f32_1-MLC');
    expect(pickHelperModel('Qwen2.5-0.5B-Instruct-q4f16_1-MLC', true, 2 ** 31)).toBe('Qwen2.5-0.5B-Instruct-q4f16_1-MLC');
  });
});
