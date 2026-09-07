/**
 * How a creature decides what to do. Rule-based brains ship with the
 * game; a model-backed brain could implement the same contract later
 * (behind a parent toggle) without touching the entity system.
 */
export type BrainSense = {
  /** Where the creature is. */
  x: number;
  y: number;
  z: number;
  /** Where the player is. */
  playerX: number;
  playerZ: number;
  /** Seconds since the last decision. */
  dt: number;
  elapsed: number;
  /** Is this column walkable ground (grass/flowers)? */
  standable(x: number, z: number): boolean;
  random(): number;
};

export type BrainIntent = {
  /** Where to head next, or null to rest. */
  target: { x: number; z: number } | null;
  /** Seconds to wait before deciding again. */
  restFor: number;
  /** A short mood word the UI can show (happy, sleepy, curious). */
  mood?: string;
};

export interface Brain {
  readonly kind: string;
  decide(sense: BrainSense): BrainIntent;
  /** The player tapped the creature. */
  onPet?(sense: BrainSense): BrainIntent;
}

/** Wanders a few blocks, rests, repeats. Bunnies, chicks, butterflies. */
export class WanderBrain implements Brain {
  readonly kind = 'wander';
  constructor(private radius = 8) {}

  decide(sense: BrainSense): BrainIntent {
    for (let attempt = 0; attempt < 12; attempt++) {
      const x = Math.round(sense.x + (sense.random() * 2 - 1) * this.radius);
      const z = Math.round(sense.z + (sense.random() * 2 - 1) * this.radius);
      if (sense.standable(x, z)) return { target: { x, z }, restFor: 1.5 + sense.random() * 3, mood: 'curious' };
    }
    return { target: null, restFor: 2, mood: 'sleepy' };
  }

  onPet(): BrainIntent {
    return { target: null, restFor: 2.5, mood: 'happy' };
  }
}

/** Stays near the player: pets and friendly villagers. */
export class FollowBrain implements Brain {
  readonly kind = 'follow';
  constructor(private keepDistance = 3) {}

  decide(sense: BrainSense): BrainIntent {
    const dx = sense.playerX - sense.x;
    const dz = sense.playerZ - sense.z;
    const d = Math.hypot(dx, dz);
    if (d > this.keepDistance + 1) {
      const t = (d - this.keepDistance) / d;
      const x = Math.round(sense.x + dx * t);
      const z = Math.round(sense.z + dz * t);
      return { target: { x, z }, restFor: 0.4, mood: 'eager' };
    }
    return { target: null, restFor: 0.8, mood: 'content' };
  }

  onPet(): BrainIntent {
    return { target: null, restFor: 2, mood: 'happy' };
  }
}
