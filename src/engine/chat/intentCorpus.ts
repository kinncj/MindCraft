/**
 * The sentences the intent model learns from. They are generated, not
 * collected: templates a small kid might say, crossed with the words
 * they use for each kind of build, then knocked about with typos and
 * dropped words. Kept in the repo so anyone can see (and grow) exactly
 * what the model was taught. Used only by scripts/train-intent.ts.
 */

import { INTENT_LABELS, type IntentLabel } from './intentFeatures.ts';

/** How a kid names each thing. The first entry is the plain word. */
export const LABEL_WORDS: Record<IntentLabel, string[]> = {
  house: ['house', 'home', 'cottage', 'cabin', 'hut', 'mansion', 'villa', 'bungalow', 'place to live', 'place where i live', 'little home for me', 'family house', 'apartment', 'lodge'],
  castle: ['castle', 'fort', 'fortress', 'palace', 'keep', 'stronghold', 'kings castle', 'princess palace', 'big castle with towers'],
  hospital: ['hospital', 'clinic', 'doctors office', 'medical centre', 'place where sick people go', 'place with doctors', 'place where you get better', 'emergency room'],
  school: ['school', 'classroom building', 'kindergarten', 'nursery', 'university', 'place where kids learn', 'place with teachers', 'place to learn stuff'],
  shop: ['shop', 'store', 'market', 'supermarket', 'bakery', 'mall', 'place to buy things', 'place where you buy food', 'toy store'],
  skyscraper: ['skyscraper', 'high rise', 'office tower', 'tower block', 'really tall building', 'building that goes up to the clouds'],
  hotel: ['hotel', 'motel', 'inn', 'place where people sleep on holiday', 'place with lots of bedrooms'],
  barn: ['barn', 'stable', 'farmhouse', 'place for the animals', 'place where cows live', 'farm building'],
  library: ['library', 'book house', 'place full of books', 'place where you read'],
  restaurant: ['restaurant', 'cafe', 'diner', 'pizzeria', 'place where you eat dinner', 'place that sells pizza'],
  firestation: ['fire station', 'firehouse', 'place for the fire truck', 'place where firefighters work'],
  pool: ['pool', 'swimming pool', 'in ground pool', 'pool to swim in', 'place to swim'],
  raisedPool: ['above ground pool', 'raised pool', 'on ground pool', 'pool that sits on top of the grass'],
  lake: ['lake', 'big lake', 'huge lake with water', 'water like a lake'],
  pond: ['pond', 'little pond', 'small water pond', 'duck pond'],
  pit: ['pit', 'hole', 'big hole', 'trench', 'ditch', 'hole in the ground'],
  bunker: ['bunker', 'basement', 'cellar', 'underground room', 'secret base', 'hideout under the ground', 'underground den'],
  tunnel: ['tunnel', 'cave', 'mine', 'mineshaft', 'long tunnel under the ground', 'passage under the hill'],
  well: ['well', 'water well', 'wishing well', 'deep well'],
  moat: ['moat', 'water around my castle', 'ring of water around it'],
  bridge: ['bridge', 'footbridge', 'walkway', 'bridge over the water', 'way to cross the river'],
  treehouse: ['tree house', 'treehouse', 'house up in a tree', 'hut on stilts', 'little house up high with a ladder'],
  playground: ['playground', 'play structure', 'play area', 'swings', 'slide', 'climbing frame', 'jungle gym', 'place to play outside'],
  court: ['sports court', 'basketball court', 'football pitch', 'soccer field', 'tennis court', 'place to play ball'],
  garden: ['garden', 'flower bed', 'flower garden', 'place with lots of flowers'],
  fountain: ['fountain', 'water fountain', 'splashy fountain'],
  parking: ['parking lot', 'car park', 'place to park the cars'],
  fence: ['fence', 'fence around it', 'wall around the outside'],
  none: [],
};

const ASK = [
  'build me a {}', 'build a {}', 'can you build a {}', 'can you make me a {}', 'i want a {}', 'i would like a {}',
  'make a {}', 'make me a {}', 'please build a {}', 'please make a {}', 'lets build a {}', 'i wish i had a {}',
  'could you build a {} please', 'build a {} right here', 'put a {} over there', 'i need a {}', 'give me a {}',
  'build {}', 'make {}', 'a {} please', 'we need a {} here', 'build us a {}', 'do a {} for me', 'construct a {}',
  'my friend wants a {}', 'can we have a {}', 'how about a {}', 'time for a {}', 'now build a {}',
];

const DIG_ASK = [
  'dig me a {}', 'dig a {}', 'can you dig a {}', 'i want you to dig a {}', 'please dig a {}', 'dig out a {}',
  'dig {}', 'make a {}', 'build me a {}', 'i want a {}', 'can we have a {}', 'dig a big {} here',
];

const ADJECTIVES = ['', 'big ', 'huge ', 'massive ', 'little ', 'tiny ', 'small ', 'giant ', 'beautiful ', 'colourful ', 'colorful ', 'pink ', 'blue ', 'red ', 'green ', 'yellow ', 'purple ', 'brick ', 'wooden ', 'stone ', 'glass ', 'shiny ', 'cool ', 'super ', 'really big ', 'nice '];

const EXTRAS = [
  '', ' with a red door', ' with lots of windows', ' with three floors', ' with two floors', ' with wide doors',
  ' with an elevator', ' and a flag', ' with stairs', ' next to my house', ' over there', ' right now', ' please',
  ' for my friends', ' with lights inside', ' near the water', ' with furniture', ' and make it colourful',
  ' 15 by 11', ' 30 by 20', ' with doctors and patients', ' with 6 classrooms', ' with a sports court',
];

/** Things that are not building requests at all. */
const CHIT_CHAT = [
  'hello', 'hi there', 'how are you', 'what is your name', 'what colour is the sky', 'whats the weather',
  'lets dance', 'dance with me', 'follow me', 'stay here', 'come with me', 'what time is it', 'make it night',
  'make it day', 'make it rain', 'make it snow', 'can i have a puppy', 'i want a kitten', 'give me a pet',
  'tell me a joke', 'sing a song', 'what is your favourite colour', 'what is your favourite food',
  'do you like cake', 'i am six years old', 'good morning', 'good night', 'see you later', 'thank you',
  'fly the airplane', 'go fly a plane', 'drive the car', 'ride the motorcycle', 'hop in the helicopter',
  'lets play a game', 'where are we', 'what is this place', 'can you jump', 'how old are you', 'i love you',
  'give me a red block', 'place a block here', 'undo that', 'save my world', 'i am hungry', 'lets go swimming',
  'do you like my house', 'that is pretty', 'wow that is cool', 'what should we do', 'help me',
  'make a pyramid', 'build a tower', 'make a big cube', 'build a wall', 'plant a tree', 'make a rainbow arch',
];

const KEY_NEIGHBOURS: Record<string, string> = { a: 's', b: 'v', c: 'x', d: 'f', e: 'r', f: 'g', g: 'h', h: 'j', i: 'o', j: 'k', k: 'l', l: 'k', m: 'n', n: 'm', o: 'p', p: 'o', q: 'w', r: 't', s: 'd', t: 'y', u: 'i', v: 'b', w: 'e', x: 'z', y: 'u', z: 'x' };

export type Sample = { text: string; label: IntentLabel };

/** A deterministic little random number generator, so training is repeatable. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** How a six-year-old types: swapped letters, doubled letters, dropped letters, near misses. */
export function typo(word: string, rand: () => number): string {
  if (word.length < 4) return word;
  const i = 1 + Math.floor(rand() * (word.length - 2));
  const roll = rand();
  if (roll < 0.3) return word.slice(0, i) + word.slice(i + 1); // dropped
  if (roll < 0.55) return word.slice(0, i) + word[i] + word.slice(i); // doubled
  if (roll < 0.8) return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2); // swapped
  const near = KEY_NEIGHBOURS[word[i]] ?? word[i];
  return word.slice(0, i) + near + word.slice(i + 1);
}

function noisy(sentence: string, rand: () => number): string {
  const words = sentence.split(' ').filter(Boolean);
  const out: string[] = [];
  for (const word of words) {
    if (rand() < 0.06) continue; // a dropped word
    out.push(rand() < 0.3 ? typo(word, rand) : word);
  }
  return (out.length ? out : words).join(' ');
}

/** The whole training set: every label, every phrasing, with and without noise. */
export function buildCorpus(seed = 20260907): Sample[] {
  const rand = rng(seed);
  const samples: Sample[] = [];
  const push = (text: string, label: IntentLabel): void => {
    samples.push({ text, label });
    // Two knocked-about copies: most of what a small kid types is misspelled.
    samples.push({ text: noisy(text, rand), label });
    samples.push({ text: noisy(text, rand), label });
  };
  for (const label of INTENT_LABELS) {
    if (label === 'none') continue;
    const digs = ['pool', 'raisedPool', 'lake', 'pond', 'pit', 'bunker', 'tunnel', 'well', 'moat'].includes(label);
    const asks = digs ? [...DIG_ASK, ...ASK.slice(0, 8)] : ASK;
    for (const word of LABEL_WORDS[label]) {
      for (const ask of asks) {
        const adjective = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)];
        const extra = EXTRAS[Math.floor(rand() * EXTRAS.length)];
        push(ask.replace('{}', `${adjective}${word}`) + extra, label);
        if (rand() < 0.3) push(ask.replace('{}', word), label);
      }
      push(word, label);
      push(`${word} please`, label);
    }
  }
  // "none" needs as much weight as the rest, or everything looks like a building.
  const chitChatCopies = Math.max(1, Math.round(samples.length / (CHIT_CHAT.length * 6)));
  for (let i = 0; i < chitChatCopies; i++) {
    for (const line of CHIT_CHAT) push(line, 'none');
  }
  return samples;
}
