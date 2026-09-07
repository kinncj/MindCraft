import type { System } from '../core/System';
import { touchInput } from './touchInput';

export type Tap = {
  /** Normalized device coords, -1..1. */
  ndcX: number;
  ndcY: number;
  button: number;
};

/** What the rest of the engine reads each frame. Written only by InputSystem. */
export type InputFrame = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sneak: boolean;
  sprint: boolean;
  /** Look deltas this frame, in pixels. */
  lookDX: number;
  lookDY: number;
  /** Wheel/pinch zoom this frame; positive = zoom out. */
  zoom: number;
  /** Taps completed this frame (no drag). */
  taps: Tap[];
  /** Pointer position for hover highlight, or null. */
  hover: { ndcX: number; ndcY: number } | null;
  /** One-shot key presses this frame (lower-case key names). */
  pressed: Set<string>;
  /** Controller buttons that map to app actions, fired once per press. */
  commands: PadCommand[];
  /** A controller is connected and was used recently. */
  gamepadActive: boolean;
};

const DRAG_THRESHOLD_PX = 6;
const STICK_DEADZONE = 0.22;

/** Standard-mapping gamepad buttons (Xbox names for readability). */
const PAD = {
  A: 0, B: 1, X: 2, Y: 3,
  LB: 4, RB: 5, LT: 6, RT: 7,
  BACK: 8, START: 9, LS: 10, RS: 11,
  UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
} as const;

/** Things a controller asks the app layer to do (not world input). */
export type PadCommand = 'menu' | 'hotbar_next' | 'hotbar_prev' | 'toggle_view' | 'toggle_mode' | 'undo' | 'palette';

/**
 * Keyboard, mouse, touch, and the virtual joystick, folded into one
 * InputFrame per tick. DOM-only; no game knowledge.
 */
export class InputSystem implements System {
  readonly name = 'input';
  readonly frame: InputFrame = {
    forward: false,
    back: false,
    left: false,
    right: false,
    jump: false,
    sneak: false,
    sprint: false,
    lookDX: 0,
    lookDY: 0,
    zoom: 0,
    taps: [],
    hover: null,
    pressed: new Set(),
    commands: [],
    gamepadActive: false,
  };
  /** When true, world input is ignored (a panel is open). */
  blocked = false;

  private keys = new Set<string>();
  private pressedQueue = new Set<string>();
  private lookDX = 0;
  private lookDY = 0;
  private zoom = 0;
  private taps: Tap[] = [];
  private hover: { ndcX: number; ndcY: number } | null = null;
  private pointers = new Map<number, { x: number; y: number }>();
  private pointerDownAt: { x: number; y: number; button: number } | null = null;
  private lastPointer = { x: 0, y: 0 };
  private dragging = false;
  private pinchDistance: number | null = null;
  private padButtons = new Map<number, boolean>();
  private padActiveUntil = 0;
  private padTapQueued: Tap[] = [];
  private padCommands: PadCommand[] = [];
  private pad = { moveX: 0, moveY: 0, lookX: 0, lookY: 0, jump: false, sprint: false, sneak: false };

  constructor(private canvas: HTMLElement) {
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerLeave);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  update(dt: number): void {
    this.pollGamepads(dt);
    const f = this.frame;
    const k = this.keys;
    const p = this.pad;
    const blocked = this.blocked;
    f.forward = !blocked && (k.has('w') || k.has('arrowup') || touchInput.y < -0.3 || p.moveY < -0.3);
    f.back = !blocked && (k.has('s') || k.has('arrowdown') || touchInput.y > 0.3 || p.moveY > 0.3);
    f.left = !blocked && (k.has('a') || k.has('arrowleft') || touchInput.x < -0.3 || p.moveX < -0.3);
    f.right = !blocked && (k.has('d') || k.has('arrowright') || touchInput.x > 0.3 || p.moveX > 0.3);
    f.jump = !blocked && (k.has(' ') || touchInput.jump || p.jump);
    f.sneak = !blocked && (k.has('shift') || p.sneak);
    f.sprint = !blocked && (k.has('control') || p.sprint);
    f.lookDX = blocked ? 0 : this.lookDX + p.lookX;
    f.lookDY = blocked ? 0 : this.lookDY + p.lookY;
    f.zoom = blocked ? 0 : this.zoom;
    f.taps = blocked ? [] : [...this.taps, ...this.padTapQueued];
    f.hover = blocked ? null : this.hover;
    f.pressed = blocked ? new Set() : this.pressedQueue;
    // Menu/back must work even while a panel is open; the rest waits.
    f.commands = blocked ? this.padCommands.filter((c) => c === 'menu') : this.padCommands;
    f.gamepadActive = performance.now() < this.padActiveUntil;
    this.lookDX = 0;
    this.lookDY = 0;
    this.zoom = 0;
    this.taps = [];
    this.padTapQueued = [];
    this.padCommands = [];
    this.pressedQueue = new Set();
  }

  /**
   * Controllers (standard mapping): left stick walks, right stick looks,
   * A jumps, RT places / uses, LT removes, bumpers change hotbar slot,
   * Y switches camera, X switches place/remove, Start opens the menu,
   * B undoes, D-pad up opens the block palette.
   */
  private pollGamepads(dt: number): void {
    const p = this.pad;
    p.moveX = p.moveY = p.lookX = p.lookY = 0;
    p.jump = p.sprint = p.sneak = false;
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return;
    let pads: (Gamepad | null)[] = [];
    try {
      pads = navigator.getGamepads();
    } catch {
      return;
    }
    const pad = pads.find((g) => g && g.connected);
    if (!pad) return;
    const axis = (i: number): number => {
      const v = pad.axes[i] ?? 0;
      return Math.abs(v) < STICK_DEADZONE ? 0 : v;
    };
    const down = (i: number): boolean => Boolean(pad.buttons[i]?.pressed);
    const pressedNow = (i: number): boolean => {
      const now = down(i);
      const was = this.padButtons.get(i) ?? false;
      this.padButtons.set(i, now);
      return now && !was;
    };

    p.moveX = axis(0) || (down(PAD.LEFT) ? -1 : down(PAD.RIGHT) ? 1 : 0);
    p.moveY = axis(1);
    // Right stick: pixels-per-second scaled by dt so speed is frame independent.
    p.lookX = axis(2) * 900 * dt;
    p.lookY = axis(3) * 700 * dt;
    p.jump = down(PAD.A);
    p.sprint = down(PAD.LS);
    p.sneak = down(PAD.RS);

    if (pressedNow(PAD.RT)) this.padTapQueued.push({ ndcX: 0, ndcY: 0, button: 0 });
    if (pressedNow(PAD.LT)) this.padTapQueued.push({ ndcX: 0, ndcY: 0, button: 2 });
    if (pressedNow(PAD.RB)) this.padCommands.push('hotbar_next');
    if (pressedNow(PAD.LB)) this.padCommands.push('hotbar_prev');
    if (pressedNow(PAD.Y)) this.padCommands.push('toggle_view');
    if (pressedNow(PAD.X)) this.padCommands.push('toggle_mode');
    if (pressedNow(PAD.B)) this.padCommands.push('undo');
    if (pressedNow(PAD.START)) this.padCommands.push('menu');
    if (pressedNow(PAD.UP)) this.padCommands.push('palette');
    // Track the other buttons too so a held button never re-fires.
    for (const i of [PAD.A, PAD.BACK, PAD.LS, PAD.RS, PAD.DOWN, PAD.LEFT, PAD.RIGHT]) pressedNow(i);

    const anyInput = p.moveX !== 0 || p.moveY !== 0 || p.lookX !== 0 || p.lookY !== 0 || pad.buttons.some((b) => b.pressed);
    if (anyInput) this.padActiveUntil = performance.now() + 5000;
  }

  private ndc(clientX: number, clientY: number): { ndcX: number; ndcY: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      ndcX: ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
      ndcY: -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1,
    };
  }

  private pinchSpread(): number {
    const [a, b] = [...this.pointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      // jsdom and some browsers throw for synthetic pointers.
    }
    if (this.pointers.size === 2) {
      this.pinchDistance = this.pinchSpread();
      this.pointerDownAt = null;
      this.dragging = false;
      return;
    }
    if (this.pointers.size > 2) return;
    this.pointerDownAt = { x: event.clientX, y: event.clientY, button: event.button };
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.dragging = false;
  };

  private onPointerMove = (event: PointerEvent): void => {
    const tracked = this.pointers.get(event.pointerId);
    if (tracked) {
      tracked.x = event.clientX;
      tracked.y = event.clientY;
    }
    if (this.pointers.size >= 2 && this.pinchDistance !== null) {
      const spread = this.pinchSpread();
      this.zoom += (this.pinchDistance - spread) * 0.06;
      this.pinchDistance = spread;
      return;
    }
    if (this.pointerDownAt) {
      const dx = event.clientX - this.pointerDownAt.x;
      const dy = event.clientY - this.pointerDownAt.y;
      if (!this.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) this.dragging = true;
      if (this.dragging) {
        this.lookDX += event.clientX - this.lastPointer.x;
        this.lookDY += event.clientY - this.lastPointer.y;
      }
    }
    this.hover = this.ndc(event.clientX, event.clientY);
    this.lastPointer = { x: event.clientX, y: event.clientY };
  };

  private onPointerUp = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinchDistance = null;
    const start = this.pointerDownAt;
    this.pointerDownAt = null;
    if (!start || this.dragging) {
      this.dragging = false;
      return;
    }
    this.taps.push({ ...this.ndc(event.clientX, event.clientY), button: start.button });
  };

  private onPointerLeave = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.pinchDistance = null;
    this.pointerDownAt = null;
    this.dragging = false;
    this.hover = null;
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.zoom += event.deltaY * 0.02;
  };

  private onContextMenu = (event: Event): void => event.preventDefault();

  private onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    if (target instanceof HTMLButtonElement && (event.key === ' ' || event.key === 'Enter')) return;
    if (event.key === ' ') event.preventDefault();
    const key = event.key.toLowerCase();
    if (!this.keys.has(key)) this.pressedQueue.add(key);
    this.keys.add(key);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.key.toLowerCase());
  };

  private onBlur = (): void => {
    this.keys.clear();
  };

  dispose(): void {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this.onPointerDown);
    c.removeEventListener('pointermove', this.onPointerMove);
    c.removeEventListener('pointerup', this.onPointerUp);
    c.removeEventListener('pointercancel', this.onPointerLeave);
    c.removeEventListener('pointerleave', this.onPointerLeave);
    c.removeEventListener('wheel', this.onWheel);
    c.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
