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
  kind: ReturnType<typeof intentKind>;
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

/**
 * Kids do not say one thing at a time: "build a school with a playground
 * and dig a big lake and then make it night". The sentence is cut where
 * one request stops and the next begins — "and", "then", "also", "plus",
 * a comma — but not inside a phrase that belongs to the thing being built
 * ("a house with a garden and a pool" is one house).
 */
export function splitClauses(raw: string): string[] {
  const text = raw.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!text) return [];
  const cut = /(, | and then | then | and also | also | plus | after that | next | and |, )/g;
  const parts: string[] = [];
  let head = text;
  let guard = 0;
  while (guard++ < 12) {
    cut.lastIndex = 0;
    let split = false;
    for (let at = cut.exec(head); at; at = cut.exec(head)) {
      const left = head.slice(0, at.index).trim();
      const right = head.slice(at.index + at[0].length).trim();
      if (!left || !right || !canSplit(left, right)) continue;
      parts.push(left);
      head = right;
      split = true;
      break;
    }
    if (!split) break;
  }
  if (head) parts.push(head);
  return parts;
}

/** Words that start a new request rather than carrying on the last one. */
const STARTS_REQUEST = /^(build|make|dig|put|place|give|add|create|construct|bring|spawn|i want|i need|i would like|can you|could you|can we|please|let'?s|lets|now|you)\b/;
const STARTS_THING = /^(a|an|the|some|one|two|three|four|five|six|seven|eight|nine|ten|\d+)\s+\S+/;
/** A phrase that describes the thing already asked for, not a new one. */
const CARRIES_ON = /\b(with|that has|which has|containing|inside|full of|made of|made out of|out of|like|next to|beside|near|by)\b[^.]*$/;

function canSplit(left: string, right: string): boolean {
  const head = classifyIntent(left);
  const tail = classifyIntent(right);
  if (!intentIsClear(head) || !intentIsClear(tail)) return false;
  // "a school with 6 classrooms and a computer room" is one school:
  // everything after "with" belongs to the thing in front of it.
  if (CARRIES_ON.test(left) && !STARTS_REQUEST.test(right)) return false;
  if (STARTS_REQUEST.test(right)) return true;
  // "a house and a castle" splits; "a beautiful and colourful mansion" does not,
  // because the second half is not a thing of its own.
  return STARTS_THING.test(right) && tail.label !== head.label;
}

/** Every request in the sentence, in the order the child said them. */
export function classifyAll(raw: string): Intent[] {
  const out: Intent[] = [];
  for (const clause of splitClauses(raw)) {
    const intent = classifyIntent(clause);
    if (intentIsClear(intent)) out.push(intent);
  }
  return out;
}
