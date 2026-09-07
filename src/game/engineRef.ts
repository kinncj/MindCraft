import type { Engine } from '../engine/core/Engine';

/**
 * The one running engine, reachable from store actions without threading
 * it through React. Set by GameCanvas on mount, cleared on unmount.
 */
let current: Engine | null = null;

export function setEngine(engine: Engine | null): void {
  current = engine;
}

export function getEngine(): Engine | null {
  return current;
}
