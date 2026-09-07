/**
 * What the creature brain sees, as a fixed-size feature vector, and what
 * it can decide. Shared by the training script and the runtime so both
 * agree on the layout. Keep the order stable: the weights depend on it.
 */

export const SPECIES = ['bunny', 'chick', 'butterfly', 'dog', 'cat', 'villager'] as const;
export type Species = (typeof SPECIES)[number];

export const ACTIONS = ['wander', 'approach', 'follow', 'rest', 'play', 'shy', 'sleep', 'home'] as const;
export type Action = (typeof ACTIONS)[number];

export type Senses = {
  species: Species;
  /** Blocks to the player. */
  distance: number;
  playerMoving: boolean;
  playerFast: boolean;
  night: boolean;
  /** 0..1, grows when petted. */
  affection: number;
  /** 0..1, drops while moving, recovers while resting. */
  energy: number;
  /** Other creatures within a few blocks. */
  friendsNearby: number;
  /** Blocks from home (villagers), 0 for others. */
  homeDistance: number;
  recentlyPetted: boolean;
};

export const FEATURE_COUNT = SPECIES.length + 9;

export function featurize(s: Senses): number[] {
  const f = new Array<number>(FEATURE_COUNT).fill(0);
  f[SPECIES.indexOf(s.species)] = 1;
  let i = SPECIES.length;
  f[i++] = Math.min(1, s.distance / 16);
  f[i++] = s.playerMoving ? 1 : 0;
  f[i++] = s.playerFast ? 1 : 0;
  f[i++] = s.night ? 1 : 0;
  f[i++] = Math.max(0, Math.min(1, s.affection));
  f[i++] = Math.max(0, Math.min(1, s.energy));
  f[i++] = Math.min(1, s.friendsNearby / 5);
  f[i++] = Math.min(1, s.homeDistance / 16);
  f[i++] = s.recentlyPetted ? 1 : 0;
  return f;
}
