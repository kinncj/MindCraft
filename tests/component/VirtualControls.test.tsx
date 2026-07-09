import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { VirtualControls } from '../../src/components/VirtualControls';
import { touchInput, resetTouchInput } from '../../src/game/touchControls';

// jsdom has no pointer capture; the component calls it on pointerdown.
beforeEach(() => {
  window.HTMLElement.prototype.setPointerCapture = () => {};
  resetTouchInput();
});

afterEach(() => {
  resetTouchInput();
});

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

  it('drives movement through the joystick', () => {
    render(<VirtualControls forceVisible />);
    joystickRect();
    const joystick = screen.getByTestId('joystick');
    // Center is (68, 68); push up and to the right.
    fireEvent.pointerDown(joystick, { pointerId: 1, clientX: 68, clientY: 68 });
    fireEvent.pointerMove(joystick, { pointerId: 1, clientX: 108, clientY: 28 });
    expect(touchInput.x).toBeGreaterThan(0.5);
    expect(touchInput.y).toBeLessThan(-0.5);
    // Releasing snaps back to neutral.
    fireEvent.pointerUp(joystick, { pointerId: 1 });
    expect(touchInput.x).toBe(0);
    expect(touchInput.y).toBe(0);
  });

  it('clamps the joystick to its radius', () => {
    render(<VirtualControls forceVisible />);
    joystickRect();
    const joystick = screen.getByTestId('joystick');
    fireEvent.pointerDown(joystick, { pointerId: 1, clientX: 68, clientY: 68 });
    fireEvent.pointerMove(joystick, { pointerId: 1, clientX: 500, clientY: 68 });
    expect(touchInput.x).toBeCloseTo(1, 1);
    expect(Math.abs(touchInput.y)).toBeLessThan(0.05);
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
