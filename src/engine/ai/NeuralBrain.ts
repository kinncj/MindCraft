import type { Brain, BrainIntent, BrainSense } from '../entities/Brain';
import { ACTIONS, featurize, type Action, type Senses, type Species } from './features';
import { forward, sample } from './mlp';
import { BRAIN_WEIGHTS } from './weights';

/**
 * The creature brain: a tiny neural network (trained by
 * scripts/train-brain.mjs) that turns what a creature senses into what it
 * wants to do. One model, six personalities — the species is an input.
 * It runs on-device every decision; nothing is downloaded and nothing it
 * decides is text, so it is safe for the youngest player.
 */
export class NeuralBrain implements Brain {
  readonly kind = 'neural';
  /** Last action chosen, for the HUD and tests. */
  lastAction: Action = 'wander';
  /** Grows when petted, fades slowly. */
  affection = 0.3;
  /** Drops while moving, recovers while resting. */
  energy = 0.8;
  private lastPetAt = -100;

  constructor(
    readonly species: Species,
    private home?: { x: number; z: number },
    private temperature = 0.85,
  ) {}

  senses(sense: BrainSense): Senses {
    const distance = Math.hypot(sense.playerX - sense.x, sense.playerZ - sense.z);
    return {
      species: this.species,
      distance,
      playerMoving: sense.playerMoving ?? false,
      playerFast: sense.playerFast ?? false,
      night: (sense.timeOfDay ?? 0.3) > 0.55 || (sense.timeOfDay ?? 0.3) < 0.05,
      affection: this.affection,
      energy: this.energy,
      friendsNearby: sense.friendsNearby ?? 0,
      homeDistance: this.home ? Math.hypot(this.home.x - sense.x, this.home.z - sense.z) : 0,
      recentlyPetted: sense.elapsed - this.lastPetAt < 12,
    };
  }

  /** Action probabilities for the current senses. */
  think(sense: BrainSense): number[] {
    return forward(BRAIN_WEIGHTS, featurize(this.senses(sense)));
  }

  decide(sense: BrainSense): BrainIntent {
    const probs = this.think(sense);
    const action = ACTIONS[sample(probs, sense.random, this.temperature)];
    this.lastAction = action;
    this.affection = Math.max(0, this.affection - 0.01);
    const towards = (tx: number, tz: number, keep: number): { x: number; z: number } => {
      const dx = tx - sense.x;
      const dz = tz - sense.z;
      const d = Math.hypot(dx, dz) || 1;
      const t = Math.max(0, (d - keep) / d);
      return { x: Math.round(sense.x + dx * t), z: Math.round(sense.z + dz * t) };
    };
    const standableNear = (cx: number, cz: number, radius: number): { x: number; z: number } | null => {
      for (let attempt = 0; attempt < 10; attempt++) {
        const x = Math.round(cx + (sense.random() * 2 - 1) * radius);
        const z = Math.round(cz + (sense.random() * 2 - 1) * radius);
        if (sense.standable(x, z)) return { x, z };
      }
      return null;
    };
    switch (action) {
      case 'wander': {
        this.energy = Math.max(0, this.energy - 0.08);
        return { target: standableNear(sense.x, sense.z, 7), restFor: 1.5 + sense.random() * 3, mood: 'curious' };
      }
      case 'approach': {
        this.energy = Math.max(0, this.energy - 0.06);
        const t = towards(sense.playerX, sense.playerZ, 2.2);
        return { target: sense.standable(t.x, t.z) ? t : null, restFor: 1 + sense.random() * 2, mood: 'friendly' };
      }
      case 'follow': {
        this.energy = Math.max(0, this.energy - 0.05);
        const t = towards(sense.playerX, sense.playerZ, 2.5);
        return { target: sense.standable(t.x, t.z) ? t : null, restFor: 0.5, mood: 'eager' };
      }
      case 'rest':
        this.energy = Math.min(1, this.energy + 0.2);
        return { target: null, restFor: 2 + sense.random() * 4, mood: 'relaxed' };
      case 'play':
        this.energy = Math.max(0, this.energy - 0.1);
        return { target: standableNear(sense.x, sense.z, 3), restFor: 1.2, mood: 'playful', celebrate: true };
      case 'shy': {
        this.energy = Math.max(0, this.energy - 0.08);
        const dx = sense.x - sense.playerX;
        const dz = sense.z - sense.playerZ;
        const d = Math.hypot(dx, dz) || 1;
        const t = { x: Math.round(sense.x + (dx / d) * 4), z: Math.round(sense.z + (dz / d) * 4) };
        return { target: sense.standable(t.x, t.z) ? t : standableNear(sense.x, sense.z, 5), restFor: 1.5, mood: 'shy' };
      }
      case 'sleep':
        this.energy = Math.min(1, this.energy + 0.4);
        return { target: null, restFor: 6 + sense.random() * 6, mood: 'sleepy' };
      case 'home': {
        this.energy = Math.max(0, this.energy - 0.05);
        const t = this.home ? towards(this.home.x, this.home.z, 1) : null;
        return { target: t && sense.standable(t.x, t.z) ? t : standableNear(sense.x, sense.z, 4), restFor: 2 + sense.random() * 3, mood: 'homebound' };
      }
    }
  }

  onPet(sense: BrainSense): BrainIntent {
    this.affection = Math.min(1, this.affection + 0.25);
    this.lastPetAt = sense.elapsed;
    return { target: null, restFor: 1.5, mood: 'happy', celebrate: true };
  }
}
