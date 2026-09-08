import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { VirtualControls } from '../../src/components/VirtualControls';
import { touchInput, resetTouchInput, resetPointerKind, notePointerKind } from '../../src/engine/input/touchInput';

beforeEach(() => {
  window.HTMLElement.prototype.setPointerCapture = () => {};
  resetTouchInput();
  resetPointerKind();
});

afterEach(() => {
  resetTouchInput();
});

/** A real pointerdown on the page, of the kind jsdom will carry. */
function touchTheScreen(pointerType: 'mouse' | 'touch'): void {
  const event = new Event('pointerdown', { bubbles: true });
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  act(() => {
    document.body.dispatchEvent(event);
  });
}

function joystickRect(): void {
  const joystick = screen.getByTestId('joystick');
  joystick.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 136, height: 136, right: 136, bottom: 136, x: 0, y: 0 }) as DOMRect;
}

describe('VirtualControls', () => {
  it('is hidden on devices without a touch screen', () => {
    render(<VirtualControls />);
    expect(screen.queryByTestId('joystick')).not.toBeInTheDocument();
  });

  it('stays out of the way of a mouse, and comes back for a finger', () => {
    // A touchscreen laptop: the hardware has touch, but the child is using a mouse.
    render(<VirtualControls />);
    expect(screen.queryByTestId('joystick'), 'a mouse should get no joystick').not.toBeInTheDocument();
    touchTheScreen('touch');
    expect(screen.getByTestId('joystick'), 'a finger should bring it back').toBeInTheDocument();
    touchTheScreen('mouse');
    expect(screen.queryByTestId('joystick'), 'the mouse should send it away again').not.toBeInTheDocument();
  });

  it('lets go of the joystick when a mouse takes over, so the kid stops walking', () => {
    render(<VirtualControls forceVisible />);
    joystickRect();
    const joystick = screen.getByTestId('joystick');
    fireEvent.pointerDown(joystick, { pointerId: 3, pointerType: 'touch', clientX: 60, clientY: 60 });
    fireEvent.pointerMove(joystick, { pointerId: 3, pointerType: 'touch', clientX: 110, clientY: 60 });
    expect(touchInput.x).toBeGreaterThan(0.5);
    notePointerKind('mouse');
    expect(touchInput.x, 'a stuck joystick would walk on its own').toBe(0);
    expect(touchInput.y).toBe(0);
  });

  it('drives movement through the joystick and snaps back', () => {
    render(<VirtualControls forceVisible />);
    joystickRect();
    const joystick = screen.getByTestId('joystick');
    fireEvent.pointerDown(joystick, { pointerId: 1, clientX: 68, clientY: 68 });
    fireEvent.pointerMove(joystick, { pointerId: 1, clientX: 108, clientY: 28 });
    expect(touchInput.x).toBeGreaterThan(0.5);
    expect(touchInput.y).toBeLessThan(-0.5);
    fireEvent.pointerUp(joystick, { pointerId: 1 });
    expect(touchInput.x).toBe(0);
    expect(touchInput.y).toBe(0);
  });

  it('holds jump while the button is pressed', () => {
    render(<VirtualControls forceVisible />);
    const jump = screen.getByRole('button', { name: 'Jump' });
    fireEvent.pointerDown(jump, { pointerId: 2 });
    expect(touchInput.jump).toBe(true);
    fireEvent.pointerUp(jump, { pointerId: 2 });
    expect(touchInput.jump).toBe(false);
  });
});
