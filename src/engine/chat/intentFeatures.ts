/**
 * What the intent model sees and what it can answer. Shared by the
 * training script and the runtime so both agree exactly; the weights
 * depend on this layout, so keep it stable.
 *
 * The model is a plain multinomial logistic regression over hashed
 * character n-grams. That is deliberately small (it ships inside the
 * bundle, no download, works on every device) and it is good at exactly
 * the job it has: mapping a small kid's phrasing — misspelled, in any
 * word order — onto the knobs the building generator already has. It
 * does not chat; the helper model and the rules do that.
 */

export const BUILDING_LABELS = ['house', 'castle', 'hospital', 'school', 'shop', 'skyscraper', 'hotel', 'barn', 'library', 'restaurant', 'firestation', 'airport'] as const;
export const EARTHWORK_LABELS = ['pool', 'raisedPool', 'lake', 'pond', 'pit', 'bunker', 'tunnel', 'well', 'moat'] as const;
export const FEATURE_LABELS = ['bridge', 'treehouse', 'playground', 'court', 'garden', 'fountain', 'parking', 'fence', 'runway', 'doghouse'] as const;

/** Famous places a kid can ask for by name, and cities that bring a few at once. */
export const MONUMENT_LABELS = [
  'm_eiffel', 'm_cn_tower', 'm_rogers_dome', 'm_peace_tower', 'm_rideau_canal', 'm_niemeyer_eye',
  'm_wire_opera', 'm_botanical_garden', 'm_masp', 'm_copan', 'm_ibirapuera', 'm_niagara', 'm_iguacu', 'm_sign',
  'm_tokyo_tower', 'm_skytree', 'm_sensoji', 'm_canada_place', 'm_science_world', 'm_lions_gate',
  'm_christ_redeemer', 'm_sugarloaf',
] as const;

export const CITY_LABELS = ['city_curitiba', 'city_saopaulo', 'city_ottawa', 'city_toronto', 'city_paris', 'city_tokyo', 'city_vancouver', 'city_rio'] as const;

/**
 * The rest of what a villager can be asked to do. The label says what
 * kind of thing; which pet, which ride, which shape is read out of the
 * words themselves, where it is exact.
 */
export const ACTION_LABELS = [
  'follow', 'stay', 'dance', 'gift', 'time_night', 'time_day', 'weather_rain', 'weather_snow', 'weather_sunny',
  'pet', 'creature', 'ride', 'vehicle', 'fly', 'land', 'stop_riding', 'shape', 'greeting', 'question',
] as const;

/** Every answer the model can give. 'none' means "nothing to do, just chatting". */
export const INTENT_LABELS = [...BUILDING_LABELS, ...EARTHWORK_LABELS, ...FEATURE_LABELS, ...MONUMENT_LABELS, ...CITY_LABELS, ...ACTION_LABELS, 'none'] as const;
export type IntentLabel = (typeof INTENT_LABELS)[number];

/** Which family a label belongs to, so callers know which parser to fill in. */
export function intentKind(label: IntentLabel): 'building' | 'earthwork' | 'feature' | 'monument' | 'city' | 'action' | 'none' {
  if ((BUILDING_LABELS as readonly string[]).includes(label)) return 'building';
  if ((EARTHWORK_LABELS as readonly string[]).includes(label)) return 'earthwork';
  if ((FEATURE_LABELS as readonly string[]).includes(label)) return 'feature';
  if ((MONUMENT_LABELS as readonly string[]).includes(label)) return 'monument';
  if ((CITY_LABELS as readonly string[]).includes(label)) return 'city';
  if ((ACTION_LABELS as readonly string[]).includes(label)) return 'action';
  return 'none';
}

/** The monument or city behind a label, without its prefix. */
export function labelSubject(label: IntentLabel): string {
  return label.replace(/^(m|city)_/, '');
}

/** Hashed feature space. Small enough to ship, big enough to keep collisions rare. */
export const FEATURE_BUCKETS = 8192;

/** FNV-1a, folded into the bucket count. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h % FEATURE_BUCKETS;
}

export function tokenize(raw: string): string[] {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9' ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * A rough sound of a word, so a kid's spelling still finds the right
 * shelf: "skool" and "school" both become "skl", "hosptial" and
 * "hospital" both become "hosptl". Letters that sound the same collapse,
 * doubles collapse, and vowels after the first letter go away.
 */
export function phonetic(word: string): string {
  const spelled = word
    .replace(/ck/g, 'k')
    .replace(/ph/g, 'f')
    .replace(/sch/g, 'sk')
    .replace(/c/g, 'k')
    .replace(/q/g, 'k')
    .replace(/x/g, 'ks')
    .replace(/z/g, 's')
    .replace(/([bdfgklmnprstv])h/g, '$1')
    .replace(/y/g, 'i');
  let out = '';
  for (let i = 0; i < spelled.length; i++) {
    const ch = spelled[i];
    if (ch === out[out.length - 1]) continue; // doubled letters
    if (i > 0 && 'aeiou'.includes(ch)) continue; // vowels only lead
    out += ch;
  }
  return out;
}

/**
 * Word unigrams, word bigrams, character 4-grams, the first letters, and
 * the sound of each word.
 * The character grams are what survive a kid's spelling: "hosptial" and
 * "hospital" still share most of them.
 */
export function featurize(raw: string): Map<number, number> {
  const words = tokenize(raw);
  const counts = new Map<number, number>();
  const add = (key: string): void => {
    const b = hash(key);
    counts.set(b, (counts.get(b) ?? 0) + 1);
  };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    add(`w:${w}`);
    // Where the word sits matters: "a house with a garden" is a house, and
    // "a garden next to the house" is a garden. The thing asked for comes first.
    add(i < 5 ? `e:${w}` : `l:${w}`);
    if (i + 1 < words.length) add(`b:${w} ${words[i + 1]}`);
    const padded = `<${w}>`;
    for (let n = 3; n <= 4; n++) {
      for (let j = 0; j + n <= padded.length; j++) add(`c:${padded.slice(j, j + n)}`);
    }
    if (w.length >= 4) add(`p:${w.slice(0, 4)}`);
    const sound = phonetic(w);
    if (sound.length >= 2) {
      add(`k:${sound}`);
      if (i + 1 < words.length) add(`kb:${sound} ${phonetic(words[i + 1])}`);
    }
  }
  // L2 normalise so a long sentence does not shout over a short one.
  let norm = 0;
  for (const v of counts.values()) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  for (const [k, v] of counts) counts.set(k, v / norm);
  return counts;
}
