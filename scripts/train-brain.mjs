// Trains the creature brain: a tiny MLP that learns a personality per
// species from a rule-based teacher with noise, then writes the weights
// into src/engine/ai/weights.ts. Run: npm run train:brain
//
// The model is deliberately small (15 → 24 → 8, ~600 weights) so it runs
// in the browser on every decision with no download.

import { writeFileSync } from 'node:fs';

const SPECIES = ['bunny', 'chick', 'butterfly', 'dog', 'cat', 'villager'];
const ACTIONS = ['wander', 'approach', 'follow', 'rest', 'play', 'shy', 'sleep', 'home'];
const INPUTS = SPECIES.length + 9;
const HIDDEN = 24;
const OUTPUTS = ACTIONS.length;

let seed = 12345;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
};

function featurize(s) {
  const f = new Array(INPUTS).fill(0);
  f[SPECIES.indexOf(s.species)] = 1;
  let i = SPECIES.length;
  f[i++] = Math.min(1, s.distance / 16);
  f[i++] = s.playerMoving ? 1 : 0;
  f[i++] = s.playerFast ? 1 : 0;
  f[i++] = s.night ? 1 : 0;
  f[i++] = s.affection;
  f[i++] = s.energy;
  f[i++] = Math.min(1, s.friendsNearby / 5);
  f[i++] = Math.min(1, s.homeDistance / 16);
  f[i++] = s.recentlyPetted ? 1 : 0;
  return f;
}

/** The teacher: what each personality tends to do. Returns a distribution. */
function teacher(s) {
  const p = Object.fromEntries(ACTIONS.map((a) => [a, 0]));
  const near = s.distance < 2.5;
  const close = s.distance < 6;
  if (s.night) {
    if (s.species === 'villager') {
      p.home += s.homeDistance > 3 ? 0.75 : 0.15;
      p.sleep += 0.6;
      p.rest += 0.2;
    } else if (s.species === 'butterfly') {
      p.rest += 0.8;
      p.wander += 0.2;
    } else {
      p.sleep += 0.6;
      p.rest += 0.3;
      p.wander += 0.1;
    }
    return normalize(p);
  }
  if (s.energy < 0.25) {
    p.rest += 0.7;
    p.sleep += 0.15;
    p.wander += 0.15;
    return normalize(p);
  }
  switch (s.species) {
    case 'bunny':
      if (near && s.playerFast) p.shy += 0.85;
      else if (near && s.affection < 0.4) p.shy += 0.5;
      if (s.recentlyPetted) p.play += 0.5;
      if (s.affection > 0.5 && close) p.approach += 0.35;
      p.wander += 0.5;
      p.rest += 0.3;
      break;
    case 'chick':
      if (near && s.playerFast) p.shy += 0.4;
      if (s.recentlyPetted) p.play += 0.5;
      if (s.affection > 0.4 && close) p.approach += 0.4;
      if (s.friendsNearby >= 2) p.rest += 0.2;
      p.wander += 0.5;
      p.rest += 0.25;
      break;
    case 'butterfly':
      p.wander += 0.7;
      if (close) p.approach += 0.2;
      p.rest += 0.1;
      break;
    case 'dog':
      if (s.distance > 6) {
        p.follow += 0.7;
        p.approach += 0.3;
      } else if (near) {
        p.play += s.energy > 0.4 ? 0.55 : 0.15;
        p.rest += 0.25;
        p.wander += 0.2;
      } else {
        p.follow += 0.4;
        p.wander += 0.3;
        p.play += 0.3;
      }
      if (s.recentlyPetted) p.play += 0.4;
      break;
    case 'cat':
      if (near) {
        p.shy += s.affection > 0.6 ? 0.1 : 0.3;
        p.rest += 0.35;
        p.play += s.affection > 0.6 ? 0.4 : 0.15;
      } else {
        p.wander += 0.45;
        p.rest += 0.4;
        p.approach += s.affection > 0.5 ? 0.25 : 0.05;
      }
      if (s.energy < 0.5) p.sleep += 0.3;
      if (s.recentlyPetted) p.play += 0.3;
      break;
    case 'villager':
      if (s.homeDistance > 10) p.home += 0.6;
      if (s.recentlyPetted) p.follow += 0.4;
      if (close) {
        p.approach += 0.3;
        p.rest += 0.25;
        p.wander += 0.35;
      } else {
        p.wander += 0.65;
        p.rest += 0.3;
      }
      break;
  }
  return normalize(p);
}

function normalize(p) {
  const total = ACTIONS.reduce((s, a) => s + p[a], 0) || 1;
  return ACTIONS.map((a) => p[a] / total);
}

function sampleSenses() {
  return {
    species: SPECIES[Math.floor(rand() * SPECIES.length)],
    // Close encounters matter most; sample them more often.
    distance: Math.pow(rand(), 1.6) * 16,
    playerMoving: rand() < 0.5,
    playerFast: rand() < 0.25,
    night: rand() < 0.3,
    affection: rand(),
    energy: rand(),
    friendsNearby: Math.floor(rand() * 5),
    homeDistance: rand() * 16,
    recentlyPetted: rand() < 0.2,
  };
}

function pick(dist) {
  let r = rand();
  for (let i = 0; i < dist.length; i++) {
    r -= dist[i];
    if (r <= 0) return i;
  }
  return dist.length - 1;
}

// --- Model ---------------------------------------------------------------
const init = (n, scale) => Array.from({ length: n }, () => (rand() * 2 - 1) * scale);
const w1 = init(HIDDEN * INPUTS, 0.5);
const b1 = new Array(HIDDEN).fill(0);
const w2 = init(OUTPUTS * HIDDEN, 0.5);
const b2 = new Array(OUTPUTS).fill(0);

function forward(x) {
  const h = new Array(HIDDEN);
  for (let j = 0; j < HIDDEN; j++) {
    let s = b1[j];
    for (let i = 0; i < INPUTS; i++) s += w1[j * INPUTS + i] * x[i];
    h[j] = Math.tanh(s);
  }
  const logits = new Array(OUTPUTS);
  for (let k = 0; k < OUTPUTS; k++) {
    let s = b2[k];
    for (let j = 0; j < HIDDEN; j++) s += w2[k * HIDDEN + j] * h[j];
    logits[k] = s;
  }
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return { h, p: exps.map((e) => e / sum) };
}

// Train against the teacher's full distribution (soft labels): the model
// learns the personality mix, not just the most likely action.
const N = 60000;
const data = Array.from({ length: N }, () => {
  const s = sampleSenses();
  return { x: featurize(s), y: teacher(s), s };
});

const EPOCHS = 60;
for (let epoch = 0; epoch < EPOCHS; epoch++) {
  const lr = epoch < 30 ? 0.05 : epoch < 50 ? 0.02 : 0.008;
  let loss = 0;
  for (const { x, y } of data) {
    const { h, p } = forward(x);
    for (let k = 0; k < OUTPUTS; k++) loss -= y[k] * Math.log(Math.max(p[k], 1e-9));
    const dLogits = p.map((pk, k) => pk - y[k]);
    const dh = new Array(HIDDEN).fill(0);
    for (let k = 0; k < OUTPUTS; k++) {
      for (let j = 0; j < HIDDEN; j++) {
        dh[j] += dLogits[k] * w2[k * HIDDEN + j];
        w2[k * HIDDEN + j] -= lr * dLogits[k] * h[j];
      }
      b2[k] -= lr * dLogits[k];
    }
    for (let j = 0; j < HIDDEN; j++) {
      const g = dh[j] * (1 - h[j] * h[j]);
      for (let i = 0; i < INPUTS; i++) w1[j * INPUTS + i] -= lr * g * x[i];
      b1[j] -= lr * g;
    }
  }
  if (epoch % 10 === 9 || epoch === 0) console.log(`epoch ${epoch + 1} loss ${(loss / N).toFixed(4)}`);
}

// Agreement with the teacher's most likely action on fresh samples.
let agree = 0;
const TEST = 4000;
for (let i = 0; i < TEST; i++) {
  const s = sampleSenses();
  const y = teacher(s);
  const { p } = forward(featurize(s));
  const am = (v) => v.indexOf(Math.max(...v));
  if (am(p) === am(y)) agree++;
  void pick;
}
console.log(`top-1 agreement with teacher: ${((agree / TEST) * 100).toFixed(1)}%`);

const round = (arr) => arr.map((v) => Number(v.toFixed(4)));
const out = `// Generated by scripts/train-brain.mjs — do not edit by hand.
// Tiny creature brain: ${INPUTS} senses → ${HIDDEN} hidden (tanh) → ${OUTPUTS} actions (softmax).
import type { MlpWeights } from './mlp';

export const BRAIN_WEIGHTS: MlpWeights = {
  inputs: ${INPUTS},
  hidden: ${HIDDEN},
  outputs: ${OUTPUTS},
  w1: ${JSON.stringify(round(w1))},
  b1: ${JSON.stringify(round(b1))},
  w2: ${JSON.stringify(round(w2))},
  b2: ${JSON.stringify(round(b2))},
};
`;
writeFileSync(new URL('../src/engine/ai/weights.ts', import.meta.url), out);
console.log('wrote src/engine/ai/weights.ts');
