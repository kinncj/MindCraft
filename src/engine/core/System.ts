/**
 * A system is one responsibility ticked once per frame. Systems talk to
 * each other through the world, the event bus, and small shared state
 * objects — never by reaching into another system's internals.
 */
export interface System {
  readonly name: string;
  /** Called once per frame with the clamped delta in seconds. */
  update(dt: number, elapsed: number): void;
  dispose?(): void;
}
