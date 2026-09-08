/**
 * The runtime side of the intent model. Reads the weights trained by
 * scripts/train-intent.ts and answers one question: which of the things
 * the generator can build is this child asking for? It never chats and
 * never invents an action — the parsers own the numbers, colours and
 * rooms; this only recognises the kind of thing.
 */

import { FEATURE_BUCKETS, INTENT_LABELS, featurize, intentKind, type IntentLabel } from './intentFeatures';
import { INTENT_WEIGHTS } from './intentWeights';

export type IntentWeights = {
  buckets: number;
  labels: number;
  /** Multiplier for the quantised bytes. */
  scale: number;
  bias: number[];
  /** labels × buckets, row-major, base64 of (weight / scale) + 128. */
  weights: string;
};

export type Intent = {
  label: IntentLabel;
  kind: 'building' | 'earthwork' | 'feature' | 'none';
  confidence: number;
  /** How likely it is that this is not a building request at all. */
  none: number;
};

/**
 * Whether a guess is worth acting on. A second misspelling in the same
 * sentence spreads the probability around without changing the ranking,
 * so what matters is not the raw score but how far the guess is ahead of
 * "this is just chatting".
 */
export function intentIsClear(intent: Intent): boolean {
  if (intent.kind === 'none') return false;
  return intent.confidence >= 0.25 && intent.confidence > intent.none * 6;
}

let matrix: Float32Array | null = null;

function weights(): Float32Array {
  if (matrix) return matrix;
  const w = INTENT_WEIGHTS;
  const binary = typeof atob === 'function' ? atob(w.weights) : Buffer.from(w.weights, 'base64').toString('binary');
  const out = new Float32Array(w.labels * w.buckets);
  for (let i = 0; i < out.length; i++) out[i] = (binary.charCodeAt(i) - 128) * w.scale;
  matrix = out;
  return out;
}

/**
 * The model's best guess, with how sure it is (0..1). Callers should only
 * act on it above a threshold: a shrug is better than a wrong building.
 */
export function classifyIntent(text: string): Intent {
  const w = INTENT_WEIGHTS;
  if (w.buckets !== FEATURE_BUCKETS || w.labels !== INTENT_LABELS.length) return { label: 'none', kind: 'none', confidence: 0, none: 1 };
  const features = featurize(text);
  const m = weights();
  const scores = new Float64Array(w.labels);
  for (let l = 0; l < w.labels; l++) {
    let sum = w.bias[l];
    const row = l * w.buckets;
    for (const [bucket, value] of features) sum += m[row + bucket] * value;
    scores[l] = sum;
  }
  let best = 0;
  let max = -Infinity;
  for (let l = 0; l < scores.length; l++) if (scores[l] > max) ((max = scores[l]), (best = l));
  let total = 0;
  for (const s of scores) total += Math.exp(s - max);
  const label = INTENT_LABELS[best];
  const noneAt = INTENT_LABELS.indexOf('none');
  return { label, kind: intentKind(label), confidence: 1 / total, none: Math.exp(scores[noneAt] - max) / total };
}
