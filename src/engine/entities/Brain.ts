import { NeuralBrain } from '../ai/NeuralBrain';
import { SPECIES, type Species } from '../ai/features';
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
  /** 0..1 time of day (0.3 morning, 0.8 night). */
  timeOfDay?: number;
  playerMoving?: boolean;
  playerFast?: boolean;
  /** Other creatures within a few blocks. */
  friendsNearby?: number;
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
  /** Do a little happy hop. */
  celebrate?: boolean;
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

/** Wanders, but never far from home: villagers. */
export class HomeBrain implements Brain {
  readonly kind = 'home';
  constructor(
    private home: { x: number; z: number },
    private radius = 7,
  ) {}

  decide(sense: BrainSense): BrainIntent {
    for (let attempt = 0; attempt < 12; attempt++) {
      const x = Math.round(this.home.x + (sense.random() * 2 - 1) * this.radius);
      const z = Math.round(this.home.z + (sense.random() * 2 - 1) * this.radius);
      if (sense.standable(x, z)) return { target: { x, z }, restFor: 2 + sense.random() * 4, mood: 'busy' };
    }
    return { target: null, restFor: 3, mood: 'relaxed' };
  }

  onPet(): BrainIntent {
    return { target: null, restFor: 3, mood: 'happy' };
  }
}

/** Sits still: a pet told to stay. */
export class StayBrain implements Brain {
  readonly kind = 'stay';
  decide(): BrainIntent {
    return { target: null, restFor: 5, mood: 'patient' };
  }
  onPet(): BrainIntent {
    return { target: null, restFor: 2, mood: 'happy' };
  }
}

export function createBrain(name: string, home?: { x: number; z: number }, species?: string): Brain {
  if (name === 'follow') return new FollowBrain();
  if (name === 'stay') return new StayBrain();
  if (name === 'home' && home) return new HomeBrain(home);
  if (name === 'wander') return new WanderBrain();
  if (species && (SPECIES as readonly string[]).includes(species)) return new NeuralBrain(species as Species, home);
  return new WanderBrain();
}
