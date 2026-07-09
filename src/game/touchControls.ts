/**
 * Shared state between the on-screen touch controls (React) and the
 * renderer's per-frame input sampling. A plain mutable singleton: the
 * joystick writes it on pointer events, the game loop reads it every
 * frame. No store round-trips at 60fps.
 */
export type TouchInputState = {
  /** Joystick, -1..1. x: strafe (right positive), y: forward (up negative). */
  x: number;
  y: number;
  jump: boolean;
};

export const touchInput: TouchInputState = {
  x: 0,
  y: 0,
  jump: false,
};

export function resetTouchInput(): void {
  touchInput.x = 0;
  touchInput.y = 0;
  touchInput.jump = false;
}

/** Should the virtual controls be on screen at all? */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    navigator.maxTouchPoints > 0 ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches)
  );
}
