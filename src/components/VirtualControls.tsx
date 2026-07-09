import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { isTouchDevice, touchInput } from '../game/touchControls';

const JOYSTICK_RADIUS = 52; // px the thumb can travel from center

type VirtualControlsProps = {
  /** Testing hook: render even without a touch screen. */
  forceVisible?: boolean;
};

/**
 * Tablet/phone controls: a movement joystick on the left, a big jump
 * button on the right. Looking around and placing blocks already work
 * by touching the world itself; these cover what a keyboard would do.
 */
export function VirtualControls({ forceVisible = false }: VirtualControlsProps) {
  const [visible] = useState(() => forceVisible || isTouchDevice());
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const [jumping, setJumping] = useState(false);
  const baseRef = useRef<HTMLDivElement>(null);
  const pointerId = useRef<number | null>(null);

  if (!visible) return null;

  function moveThumb(event: ReactPointerEvent<HTMLDivElement>): void {
    const base = baseRef.current;
    if (!base) return;
    const rect = base.getBoundingClientRect();
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
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
    touchInput.x = 0;
    touchInput.y = 0;
  }

  return (
    <div className="virtual-controls">
      <div
        ref={baseRef}
        className="joystick"
        data-testid="joystick"
        role="application"
        aria-label="Move around"
        onPointerDown={(event) => {
          pointerId.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          moveThumb(event);
        }}
        onPointerMove={(event) => {
          if (pointerId.current === event.pointerId) moveThumb(event);
        }}
        onPointerUp={releaseThumb}
        onPointerCancel={releaseThumb}
      >
        <div
          className="joystick-thumb"
          style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)` }}
          aria-hidden="true"
        />
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
