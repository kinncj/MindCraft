# ADR-0010: A tiny on-device neural brain for creatures

**Status:** accepted

## Context

The user asked for "a super tiny web AI model" driving animals, pets, and
villagers. A language model in the browser means a large download from a third
party, slow first load, and unmoderated output for a six-year-old — rejected
earlier (ADR-0006). But a *tiny* model that decides behavior, not text, fits.

## Decision

- `scripts/train-brain.mjs` trains a two-layer perceptron (15 senses → 24 tanh
  → 8 actions, ~600 weights) against a rule-based **teacher** that encodes six
  personalities (bunny, chick, butterfly, dog, cat, villager) with noise and
  soft labels. Close encounters are oversampled. The weights are written to
  `src/engine/ai/weights.ts` (4.6 KB) and committed; `npm run train:brain`
  regenerates them.
- `src/engine/ai/NeuralBrain.ts` runs inference on every decision in the
  browser: senses (distance to the player, whether they are moving or running,
  night, affection, energy, friends nearby, distance from home, recently
  petted) → action (wander, approach, follow, rest, play, shy, sleep, home) →
  a movement intent. Affection grows when petted and fades; energy drops while
  moving and recovers while resting, so the same dog behaves differently over a
  session. Sampling with temperature keeps creatures from looping.
- Explicit commands (pet "stay"/"follow", villager "let's play") temporarily
  swap in rule brains, then the neural brain resumes.
- `entity_list` reports each creature's brain and its last decision.

## Consequences

- No download, no network, no text generation: safe by construction.
- Adding a species is a teacher branch plus a retrain.
- The teacher is the spec; tests check clear-cut cases (a bunny flees a
  sprinting player, a far dog follows, everyone rests at night).
