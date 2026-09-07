import type { System } from './System';

/**
 * Runs the systems in order on requestAnimationFrame (or manually in tests).
 * A system that throws is reported and skipped for that frame; the loop
 * itself never stops, so one bug cannot freeze the whole game.
 */
export class GameLoop {
  private systems: System[] = [];
  /** Called with the failing system's name; the same message is reported at most once every few seconds. */
  onError: ((system: string, error: unknown) => void) | null = null;
  private lastReport = new Map<string, number>();
  private errorCount = 0;

  get errors(): number {
    return this.errorCount;
  }
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
      try {
        this.step(dt);
      } catch (error) {
        this.report('loop', error);
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  /** One simulation step. Public so tests can drive the loop by hand. */
  step(dt: number): void {
    this.elapsed += dt;
    for (const system of this.systems) {
      try {
        system.update(dt, this.elapsed);
      } catch (error) {
        this.report(system.name, error);
      }
    }
  }

  private report(system: string, error: unknown): void {
    this.errorCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    const key = `${system}:${message}`;
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const last = this.lastReport.get(key) ?? -Infinity;
    if (now - last < 5000) return;
    this.lastReport.set(key, now);
    console.error(`[MindCraft] ${system} hiccuped:`, error);
    this.onError?.(system, error);
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
