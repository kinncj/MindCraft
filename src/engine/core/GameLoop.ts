import type { System } from './System';

/** Runs the systems in order on requestAnimationFrame (or manually in tests). */
export class GameLoop {
  private systems: System[] = [];
  private frame = 0;
  private running = false;
  private last = 0;
  private elapsed = 0;
  /** Largest step we simulate; a background tab must not fast-forward physics. */
  maxDelta = 0.1;

  add(system: System): this {
    this.systems.push(system);
    return this;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const tick = (now: number): void => {
      if (!this.running) return;
      const dt = Math.min((now - this.last) / 1000, this.maxDelta);
      this.last = now;
      this.step(dt);
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  /** One simulation step. Public so tests can drive the loop by hand. */
  step(dt: number): void {
    this.elapsed += dt;
    for (const system of this.systems) system.update(dt, this.elapsed);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  dispose(): void {
    this.stop();
    for (const system of [...this.systems].reverse()) system.dispose?.();
    this.systems = [];
  }
}
