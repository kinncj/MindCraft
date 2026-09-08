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
  airport: ['airport', 'air port', 'airfield', 'plane station', 'terminal for airplanes', 'place where planes take off', 'place where the airplanes land', 'airport with a control tower'],
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
  runway: ['runway', 'airstrip', 'landing strip', 'air strip', 'tarmac', 'strip for planes to take off', 'long strip for the airplanes', 'runway for airplanes'],
  // Famous places: the names people really use, in English and in Portuguese.
  m_eiffel: ['eiffel tower', 'eiffel', 'the tower in paris', 'torre eiffel', 'that big iron tower in france'],
  m_cn_tower: ['cn tower', 'the tall tower in toronto', 'toronto tower', 'that needle tower with the pod'],
  m_rogers_dome: ['rogers centre', 'rogers center', 'skydome', 'the baseball stadium in toronto', 'stadium with the round roof'],
  m_peace_tower: ['peace tower', 'parliament in ottawa', 'the clock tower in ottawa', 'canadian parliament'],
  m_rideau_canal: ['rideau canal', 'the skating canal in ottawa', 'the ice canal you skate on', 'canal skateway'],
  m_niemeyer_eye: ['oscar niemeyer museum', 'the eye museum', 'museu do olho', 'museu oscar niemeyer', 'the big eye building in curitiba', 'the eye'],
  m_wire_opera: ['wire opera house', 'opera de arame', 'the glass opera house in curitiba', 'the opera in the lake'],
  m_botanical_garden: ['botanical garden', 'jardim botanico', 'the greenhouse in curitiba', 'the glass greenhouse with flowers'],
  m_masp: ['masp', 'sao paulo art museum', 'museu de arte de sao paulo', 'the museum on red beams', 'the museum you can walk under'],
  m_copan: ['copan', 'edificio copan', 'the wavy building in sao paulo', 'the building shaped like a wave'],
  m_ibirapuera: ['ibirapuera auditorium', 'auditorio ibirapuera', 'the white auditorium with the red tongue', 'ibirapuera'],
  m_niagara: ['niagara falls', 'niagara', 'the horseshoe waterfall', 'the big waterfall in canada'],
  m_iguacu: ['iguacu falls', 'iguazu falls', 'foz do iguacu', 'cataratas do iguacu', 'the waterfalls in brazil', 'the jungle waterfalls'],
  m_sign: ['big letters', 'a sign with my name', 'giant letters', 'block letters', 'a sign that says something'],
  city_curitiba: ['curitiba', 'curitiba brazil', 'the city of curitiba'],
  city_saopaulo: ['sao paulo', 'são paulo', 'sao paulo brazil', 'the city of sao paulo'],
  city_ottawa: ['ottawa', 'ottawa canada', 'the capital of canada'],
  city_toronto: ['toronto', 'toronto canada', 'the city of toronto'],
  city_paris: ['paris', 'paris france', 'the city of paris'],
  follow: [], stay: [], dance: [], gift: [], time_night: [], time_day: [], weather_rain: [], weather_snow: [],
  weather_sunny: [], pet: [], creature: [], ride: [], vehicle: [], fly: [], land: [], stop_riding: [],
  shape: [], greeting: [], question: [],
  none: [],
};

/**
 * Whole sentences for the things that are not buildings. These are not
 * crossed with the "build me a ..." templates — a kid asks for them
 * outright — so they are written out, many ways each.
 */
export const ACTION_SENTENCES: Partial<Record<IntentLabel, string[]>> = {
  follow: [
    'follow me', 'come with me', 'come along', 'walk with me', 'lets go together', 'come here', 'come on lets go',
    'can you come with me', 'i want you to follow me', 'stay with me', 'walk beside me', 'come and see this',
    'lets explore together', 'come look at my house', 'you can come too', 'follow me please', 'this way',
  ],
  stay: [
    'stay here', 'wait here', 'stop walking', 'stay right there', 'dont move', 'wait for me', 'stop following me',
    'stay put', 'stand still please', 'wait right here until i come back', 'hold on stay there', 'you stay',
    'wait here until i come back', 'stay there until i come back', 'dont come with me', 'wait for me to come back',
    'stay while i go and look', 'you wait, i will come back', 'nobody move', 'freeze right there', 'park yourself here',
  ],
  dance: [
    'lets dance', 'dance with me', 'do a dance', 'show me your dance moves', 'can you dance', 'party time',
    'sing a song', 'lets have a party', 'boogie', 'wiggle around', 'dance dance dance', 'put on some music',
  ],
  gift: [
    'give me a present', 'can i have a gift', 'do you have something for me', 'i want a present', 'surprise me',
    'give me something nice', 'whats in your pocket', 'can you give me a treat', 'present please',
  ],
  time_night: [
    'make it night', 'i want it to be dark', 'turn on the stars', 'bedtime now', 'can we see the moon',
    'make it dark outside', 'night time please', 'lets look at the stars', 'turn the sky dark', 'make the sun go down',
  ],
  time_day: [
    'make it day', 'i want the sun back', 'make it morning', 'turn the sun on', 'daytime please', 'wake up the sun',
    'make it light again', 'no more night', 'i dont like the dark turn it back to day', 'morning time now',
    'can we have the daytime again', 'the night is over', 'time to wake up',
  ],
  weather_rain: [
    'make it rain', 'i want rain', 'can we have a storm', 'rain please', 'make the rain come', 'turn on the rain',
    'can we have rain', 'i want a storm', 'lets have a storm', 'make a big storm', 'bring the rain', 'rainy day please',
    'i like the rain, make it rain', 'can it rain now', 'make the sky rain', 'storm time',
  ],
  weather_snow: ['make it snow', 'i want snow', 'snow please', 'can we have snow to play in', 'turn on the snow', 'let it snow'],
  weather_sunny: ['make it sunny', 'stop the rain', 'no more snow', 'i want sunshine', 'clear the sky', 'make the weather nice'],
  pet: [
    'can i have a puppy', 'i want a dog', 'give me a kitten', 'i want a cat please', 'a little puppy for me',
    'can you get me a kitty', 'i would love a doggy', 'my own pet please', 'a pet cat',
  ],
  creature: [
    'i want a bunny', 'can we have a rabbit', 'a little chick please', 'i want to see a butterfly',
    'send me a butterfly', 'a baby chicken', 'bunnies please', 'a birdie',
  ],
  ride: [
    'fly that airplane', 'go fly the plane', 'drive the car', 'you drive the car', 'ride the motorcycle',
    'take the helicopter for a spin', 'hop in the boat and go', 'can you fly the helicopter', 'go for a drive',
    'get in the plane and fly it', 'you take the bike', 'drive that car around for me',
  ],
  vehicle: [
    'i want a car', 'give me a boat', 'can i have a motorcycle', 'i want an airplane', 'make me a helicopter',
    'a car for me please', 'i need a boat to go on the water', 'can we get a plane', 'i want a car of my own',
    'my own car please', 'can i drive a car', 'i want to drive something', 'get me a fast car', 'i want a red car',
    'a boat for me', 'my own motorbike', 'i would like a helicopter of my own', 'bring me a car',
  ],
  fly: ['i want to fly', 'let me fly', 'can i fly please', 'give me wings', 'i want to go up in the air', 'turn on flying'],
  land: ['stop flying', 'i want to land', 'take me down', 'no more flying', 'turn off flying', 'put me on the ground'],
  stop_riding: ['hop off', 'get out of the car', 'stop driving', 'get off the bike', 'land the plane and get out', 'stop riding'],
  shape: [
    'build a pyramid', 'make a big tower', 'build a huge cube', 'make a wall of bricks', 'build an arch',
    'make a rainbow arch', 'build a tall tower of stone', 'a pyramid of sand please', 'make a ring',
    'build a road', 'make a path', 'build me a platform', 'a big box of blocks',
    // A tree is a shape you plant; a tree house is a place you climb into.
    'plant a tree', 'plant a tree please', 'plant some trees', 'grow a tree', 'grow me a big tree',
    'put a tree here', 'i want a tree', 'make a tree', 'build a tree', 'a big tree please', 'plant an apple tree',
  ],
  greeting: [
    'hi there', 'hello', 'hey you', 'good morning', 'good night', 'bye bye', 'see you later', 'thank you so much',
    'you are the best', 'i love you', 'that was awesome', 'nice job', 'wow that is cool', 'howdy',
  ],
  question: [
    'what is your name', 'who are you', 'what do you do', 'how are you', 'what colour is the sky',
    'whats the weather like', 'what time is it', 'where are we', 'what is your favourite food',
    'do you like cake', 'how old are you', 'what can you do', 'what should we do', 'tell me a joke',
    'can you swim', 'what is this place', 'why is the sky blue',
  ],
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
  // The thing being asked for is the one at the front: what comes after "with" belongs to it.
  ' with a garden', ' with a swimming pool', ' with a playground', ' with a fence around it',
  ' with a fountain outside', ' with a car park', ' with a bridge to the front door', ' with a treehouse in the garden',
  ' with a garden and a pool', ' with a playground and a sports court', ' with a pond and some flowers',
  ' next to the lake', ' by the bridge', ' near the playground', ' beside the tree house',
  ' with lots of rooms', ' with lots of classrooms', ' with lots of windows', ' with lots of beds',
  ' with lots of books inside', ' with lots of lights', ' with loads of floors', ' full of furniture',
  ' with a red roof', ' with big windows', ' with a tall door', ' that is really tall',
];

/** Things that mean nothing in particular: no action, no answer to look up. */
const CHIT_CHAT = [
  'okay', 'yes please', 'no thank you', 'maybe later', 'i dont know', 'hmm let me think', 'thats funny',
  'my mum said hello', 'i had pizza for lunch', 'my brother is six', 'we went to the park today',
  'i am hungry', 'i am tired', 'my favourite colour is pink', 'i like your hat', 'this is my world',
  'look at that over there', 'oops', 'watch this', 'again again', 'one more time', 'i did it',
  'undo that', 'save my world', 'give me a red block', 'place a block here', 'lets play a game',
  'i lost my dog somewhere', 'the sky is very pretty today', 'nothing', 'blah blah blah', 'la la la',
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
  // Kids drop the first letter too — "iffel" for "eiffel", "ospital" for "hospital".
  if (rand() < 0.12) return word.slice(1);
  const i = 1 + Math.floor(rand() * (word.length - 2));
  const roll = rand();
  if (roll < 0.3) return word.slice(0, i) + word.slice(i + 1); // dropped
  if (roll < 0.55) return word.slice(0, i) + word[i] + word.slice(i); // doubled
  if (roll < 0.8) return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2); // swapped
  const near = KEY_NEIGHBOURS[word[i]] ?? word[i];
  return word.slice(0, i) + near + word.slice(i + 1);
}

/** Misspells the word that carries the meaning, which is the one kids get wrong. */
export function typoPhrase(phrase: string, rand: () => number): string {
  const words = phrase.split(' ');
  let at = 0;
  for (let i = 1; i < words.length; i++) if (words[i].length > words[at].length) at = i;
  words[at] = typo(words[at], rand);
  return words.join(' ');
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
  for (const [label, sentences] of Object.entries(ACTION_SENTENCES) as Array<[IntentLabel, string[]]>) {
    for (const sentence of sentences) {
      // Actions are asked for outright, so the sentences carry their own weight.
      for (let i = 0; i < 3; i++) push(sentence, label);
      push(`${sentence} please`, label);
      if (rand() < 0.5) push(`can you ${sentence}`, label);
    }
  }
  for (const label of INTENT_LABELS) {
    if (label === 'none' || LABEL_WORDS[label].length === 0) continue;
    const digs = ['pool', 'raisedPool', 'lake', 'pond', 'pit', 'bunker', 'tunnel', 'well', 'moat'].includes(label);
    const asks = digs ? [...DIG_ASK, ...ASK.slice(0, 8)] : ASK;
    for (const word of LABEL_WORDS[label]) {
      for (const ask of asks) {
        const adjective = ADJECTIVES[Math.floor(rand() * ADJECTIVES.length)];
        const extra = EXTRAS[Math.floor(rand() * EXTRAS.length)];
        push(ask.replace('{}', `${adjective}${word}`) + extra, label);
        if (rand() < 0.3) push(ask.replace('{}', word), label);
        // The word that carries the meaning, spelled the way a kid spells it.
        for (let i = 0; i < 2; i++) push(ask.replace('{}', `${adjective}${typoPhrase(word, rand)}`) + extra, label);
      }
      push(word, label);
      push(`${word} please`, label);
      for (let i = 0; i < 3; i++) push(typoPhrase(word, rand), label);
    }
  }
  // "none" needs as much weight as the rest, or everything looks like a building.
  const chitChatCopies = Math.max(1, Math.round(samples.length / (CHIT_CHAT.length * 6)));
  for (let i = 0; i < chitChatCopies; i++) {
    for (const line of CHIT_CHAT) push(line, 'none');
  }
  return samples;
}
