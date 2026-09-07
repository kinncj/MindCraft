/** A two-layer perceptron: tanh hidden layer, softmax output. */
export type MlpWeights = {
  inputs: number;
  hidden: number;
  outputs: number;
  /** hidden × inputs, row-major. */
  w1: number[];
  b1: number[];
  /** outputs × hidden, row-major. */
  w2: number[];
  b2: number[];
};

export function forward(w: MlpWeights, x: number[]): number[] {
  const h = new Array<number>(w.hidden);
  for (let j = 0; j < w.hidden; j++) {
    let sum = w.b1[j];
    const row = j * w.inputs;
    for (let i = 0; i < w.inputs; i++) sum += w.w1[row + i] * x[i];
    h[j] = Math.tanh(sum);
  }
  const logits = new Array<number>(w.outputs);
  for (let k = 0; k < w.outputs; k++) {
    let sum = w.b2[k];
    const row = k * w.hidden;
    for (let j = 0; j < w.hidden; j++) sum += w.w2[row + j] * h[j];
    logits[k] = sum;
  }
  return softmax(logits);
}

export function softmax(logits: number[], temperature = 1): number[] {
  const max = Math.max(...logits);
  const exps = logits.map((l) => Math.exp((l - max) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

/** Samples an index from a probability vector; temperature < 1 sharpens. */
export function sample(probs: number[], random: () => number, temperature = 1): number {
  const adjusted = temperature === 1 ? probs : softmax(probs.map((p) => Math.log(Math.max(p, 1e-9))), temperature);
  let r = random();
  for (let i = 0; i < adjusted.length; i++) {
    r -= adjusted[i];
    if (r <= 0) return i;
  }
  return adjusted.length - 1;
}

export function argmax(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i++) if (values[i] > values[best]) best = i;
  return best;
}
