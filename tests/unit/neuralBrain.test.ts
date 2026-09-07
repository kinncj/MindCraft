import { describe, expect, it } from 'vitest';
import { ACTIONS, FEATURE_COUNT, featurize } from '../../src/engine/ai/features';
import { argmax, forward, sample, softmax } from '../../src/engine/ai/mlp';
import { NeuralBrain } from '../../src/engine/ai/NeuralBrain';
import { BRAIN_WEIGHTS } from '../../src/engine/ai/weights';
import type { BrainSense } from '../../src/engine/entities/Brain';

function sense(over: Partial<BrainSense> = {}): BrainSense {
  return {
    x: 0, y: 0, z: 0, playerX: 10, playerZ: 0, dt: 0.1, elapsed: 50, timeOfDay: 0.3,
    playerMoving: false, playerFast: false, friendsNearby: 0,
    standable: () => true, random: () => 0.5, ...over,
  };
}

const top = (brain: NeuralBrain, s: BrainSense) => ACTIONS[argmax(brain.think(s))];

describe('the tiny creature brain', () => {
  it('has the shape the features expect and outputs a distribution', () => {
    expect(BRAIN_WEIGHTS.inputs).toBe(FEATURE_COUNT);
    expect(BRAIN_WEIGHTS.outputs).toBe(ACTIONS.length);
    expect(BRAIN_WEIGHTS.w1).toHaveLength(BRAIN_WEIGHTS.hidden * BRAIN_WEIGHTS.inputs);
    const probs = forward(BRAIN_WEIGHTS, featurize({ species: 'dog', distance: 3, playerMoving: false, playerFast: false, night: false, affection: 0.5, energy: 0.8, friendsNearby: 0, homeDistance: 0, recentlyPetted: false }));
    expect(probs).toHaveLength(ACTIONS.length);
    expect(probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(softmax([1, 1]).every((p) => Math.abs(p - 0.5) < 1e-9)).toBe(true);
    expect(sample([0, 0, 1], () => 0.3)).toBe(2);
  });

  it('gives every species a personality', () => {
    // A bunny near a sprinting player is shy; a far-away dog follows.
    const bunny = new NeuralBrain('bunny');
    expect(top(bunny, sense({ playerX: 1.5, playerFast: true, playerMoving: true }))).toBe('shy');
    const dog = new NeuralBrain('dog');
    expect(['follow', 'approach']).toContain(top(dog, sense({ playerX: 12 })));
    // Everyone sleeps or rests at night; villagers head home when far from it.
    for (const species of ['bunny', 'dog', 'cat'] as const) {
      expect(['sleep', 'rest']).toContain(top(new NeuralBrain(species), sense({ timeOfDay: 0.8 })));
    }
    const villager = new NeuralBrain('villager', { x: 30, z: 30 });
    expect(top(villager, sense({ timeOfDay: 0.8 }))).toBe('home');
    // Butterflies mostly wander.
    expect(top(new NeuralBrain('butterfly'), sense({ playerX: 14 }))).toBe('wander');
    // A tired creature rests.
    const cat = new NeuralBrain('cat');
    cat.energy = 0.1;
    expect(['rest', 'sleep']).toContain(top(cat, sense({ playerX: 8 })));
  });

  it('turns actions into intents, celebrates when petted, and tracks affection', () => {
    const dog = new NeuralBrain('dog');
    const before = dog.affection;
    const pet = dog.onPet(sense());
    expect(pet.celebrate).toBe(true);
    expect(dog.affection).toBeGreaterThan(before);
    const intent = dog.decide(sense({ playerX: 12 }));
    expect(ACTIONS).toContain(dog.lastAction);
    expect(typeof intent.restFor).toBe('number');
    if (intent.target) expect(Number.isInteger(intent.target.x)).toBe(true);
  });
});
