import { useGameStore } from '../../src/game/gameStore';

/** Puts the store back to a clean slate between tests. */
export function resetGameStore(): void {
  useGameStore.setState(useGameStore.getInitialState(), true);
}
