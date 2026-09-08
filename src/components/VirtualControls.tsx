import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { currentPointerKind, touchInput, watchPointerKind } from '../engine/input/touchInput';

const JOYSTICK_RADIUS = 52; // px the thumb can travel from center

type VirtualControlsProps = {
  /** Testing hook: render even without a touch screen. */
  forceVisible?: boolean;
};

/**
 * Phone and tablet controls. The joystick appears wherever a finger
 * lands in the lower-left move zone (so it never sits on top of a menu
 * or a button) and fades away on release; a big Jump button sits on the
 * right. Looking around and placing blocks already work by touching the
 * world itself; these cover what a keyboard would do.
 */
export function VirtualControls({ forceVisible = false }: VirtualControlsProps) {
  // Follows the pointer in use, not the hardware: a touchscreen laptop played
  // with a mouse gets no joystick, and the first tap brings it back.
  const [touching, setTouching] = useState(() => currentPointerKind() === 'touch');
  useEffect(() => watchPointerKind((kind) => setTouching(kind === 'touch')), []);
  const visible = forceVisible || touching;
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const [base, setBase] = useState<{ x: number; y: number } | null>(null);
  const [jumping, setJumping] = useState(false);
  const pointerId = useRef<number | null>(null);
  const origin = useRef({ x: 0, y: 0 });

  if (!visible) return null;

  function moveThumb(event: ReactPointerEvent<HTMLDivElement>): void {
    let dx = event.clientX - origin.current.x;
    let dy = event.clientY - origin.current.y;
    const length = Math.hypot(dx, dy);
    if (length > JOYSTICK_RADIUS) {
      dx = (dx / length) * JOYSTICK_RADIUS;
      dy = (dy / length) * JOYSTICK_RADIUS;
    }
    setThumb({ x: dx, y: dy });
    touchInput.x = dx / JOYSTICK_RADIUS;
    touchInput.y = dy / JOYSTICK_RADIUS;
  }

  function releaseThumb(): void {
    pointerId.current = null;
    setThumb({ x: 0, y: 0 });
    setBase(null);
    touchInput.x = 0;
    touchInput.y = 0;
  }

  return (
    <div className="virtual-controls">
      <div
        className="move-zone"
        data-testid="joystick"
        role="application"
        aria-label="Move around: touch and drag here"
        onPointerDown={(event) => {
          if (pointerId.current !== null) return;
          pointerId.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          const zone = event.currentTarget.getBoundingClientRect();
          origin.current = { x: event.clientX, y: event.clientY };
          setBase({ x: event.clientX - zone.left, y: event.clientY - zone.top });
          moveThumb(event);
        }}
        onPointerMove={(event) => {
          if (pointerId.current === event.pointerId) moveThumb(event);
        }}
        onPointerUp={releaseThumb}
        onPointerCancel={releaseThumb}
      >
        <div className={`joystick ${base ? 'joystick-live' : 'joystick-ghost'}`} style={base ? { left: base.x, top: base.y } : undefined} aria-hidden="true">
          <div className="joystick-thumb" style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)` }} />
        </div>
      </div>
      <button
        type="button"
        className={`jump-button ${jumping ? 'jump-button-active' : ''}`}
        aria-label="Jump"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setJumping(true);
          touchInput.jump = true;
        }}
        onPointerUp={() => {
          setJumping(false);
          touchInput.jump = false;
        }}
        onPointerCancel={() => {
          setJumping(false);
          touchInput.jump = false;
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        ⬆️
        <span className="jump-label">Jump</span>
      </button>
    </div>
  );
}
