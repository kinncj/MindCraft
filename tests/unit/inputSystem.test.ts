import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InputSystem } from '../../src/engine/input/InputSystem';

type FakePad = { connected: boolean; axes: number[]; buttons: Array<{ pressed: boolean }> };

let pad: FakePad;
let input: InputSystem;

beforeEach(() => {
  pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
  (navigator as unknown as { getGamepads: () => unknown[] }).getGamepads = () => [pad];
  input = new InputSystem(document.createElement('div'));
});

afterEach(() => {
  input.dispose();
  delete (navigator as unknown as { getGamepads?: unknown }).getGamepads;
});

describe('controller input', () => {
  it('walks with the left stick and looks with the right stick', () => {
    pad.axes = [0, -1, 0.8, 0];
    input.update(1 / 60);
    expect(input.frame.forward).toBe(true);
    expect(input.frame.lookDX).toBeGreaterThan(0);
    expect(input.frame.gamepadActive).toBe(true);
  });

  it('ignores stick drift inside the dead zone', () => {
    pad.axes = [0.1, -0.1, 0.05, 0];
    input.update(1 / 60);
    expect(input.frame.forward).toBe(false);
    expect(input.frame.lookDX).toBe(0);
  });

  it('fires buttons once per press: RT taps, bumpers cycle, Start opens the menu', () => {
    pad.buttons[7].pressed = true; // RT
    pad.buttons[5].pressed = true; // RB
    pad.buttons[9].pressed = true; // Start
    pad.buttons[0].pressed = true; // A
    input.update(1 / 60);
    expect(input.frame.taps).toEqual([{ ndcX: 0, ndcY: 0, button: 0 }]);
    expect(input.frame.commands).toEqual(expect.arrayContaining(['hotbar_next', 'menu']));
    expect(input.frame.jump).toBe(true);
    input.update(1 / 60); // still held: nothing new
    expect(input.frame.taps).toEqual([]);
    expect(input.frame.commands).toEqual([]);
    expect(input.frame.jump).toBe(true);
  });

  it('only lets the menu button through while a panel is open', () => {
    input.blocked = true;
    pad.buttons[9].pressed = true;
    pad.buttons[7].pressed = true;
    pad.axes = [0, -1, 0, 0];
    input.update(1 / 60);
    expect(input.frame.commands).toEqual(['menu']);
    expect(input.frame.taps).toEqual([]);
    expect(input.frame.forward).toBe(false);
  });
});

describe('keyboard input', () => {
  it('tracks held keys and one-shot presses', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'V' }));
    input.update(1 / 60);
    expect(input.frame.forward).toBe(true);
    expect(input.frame.pressed.has('v')).toBe(true);
    input.update(1 / 60);
    expect(input.frame.pressed.has('v')).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w' }));
    input.update(1 / 60);
    expect(input.frame.forward).toBe(false);
  });
});
