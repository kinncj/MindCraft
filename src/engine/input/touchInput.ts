/**
 * Shared state between the on-screen touch controls (React) and the
 * input system's per-frame sampling. A plain mutable singleton: the
 * joystick writes it on pointer events, the game loop reads it every
 * frame. No store round-trips at 60fps.
 */
export type TouchInputState = {
  /** Joystick, -1..1. x: strafe (right positive), y: forward (up negative). */
  x: number;
  y: number;
  jump: boolean;
};

export const touchInput: TouchInputState = { x: 0, y: 0, jump: false };

export function resetTouchInput(): void {
  touchInput.x = 0;
  touchInput.y = 0;
  touchInput.jump = false;
}

/**
 * Which kind of pointer the child is actually using. A touchscreen laptop
 * reports touch points while somebody plays with a mouse, so what matters is
 * not what the device *has* — it is what was last touched. The on-screen
 * joystick appears and disappears with this: on a desktop it must never sit
 * over the buttons, and on a tablet it must always be there.
 */
export type PointerKind = 'mouse' | 'touch';

function coarsePrimary(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

let pointerKind: PointerKind = coarsePrimary() ? 'touch' : 'mouse';
const watchers = new Set<(kind: PointerKind) => void>();
let listening = false;

/** What the last real pointer event came from. */
export function currentPointerKind(): PointerKind {
  return pointerKind;
}

/** Records what the child just used. Called for every real pointer event. */
export function notePointerKind(kind: PointerKind): void {
  // Any mouse event lets go of the joystick, even if nothing else changes:
  // a thumb that left the screen mid-drag must not keep the kid walking.
  if (kind === 'mouse' && (touchInput.x !== 0 || touchInput.y !== 0 || touchInput.jump)) resetTouchInput();
  if (kind === pointerKind) return;
  pointerKind = kind;
  for (const watch of watchers) watch(kind);
}

function onPointerDown(event: PointerEvent): void {
  notePointerKind(event.pointerType === 'touch' || event.pointerType === 'pen' ? 'touch' : 'mouse');
}

/** Tells you when the child switches between a mouse and a finger. */
export function watchPointerKind(watch: (kind: PointerKind) => void): () => void {
  watchers.add(watch);
  if (!listening && typeof window !== 'undefined') {
    listening = true;
    window.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true });
  }
  return () => {
    watchers.delete(watch);
    if (watchers.size === 0 && listening && typeof window !== 'undefined') {
      listening = false;
      window.removeEventListener('pointerdown', onPointerDown, { capture: true });
    }
  };
}

/** Test seam: forget what was seen and start again from the device's primary pointer. */
export function resetPointerKind(): void {
  pointerKind = coarsePrimary() ? 'touch' : 'mouse';
}

/**
 * Does this device have a touchscreen at all? Only for guards that must be
 * safe on a hybrid laptop (a sheet swallowing a ghost tap). To decide what to
 * draw, use `currentPointerKind`.
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return navigator.maxTouchPoints > 0 || coarsePrimary();
}
