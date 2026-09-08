/**
 * Turns whatever a kid types into a building spec. No fixed blueprints:
 * the kind of building, size words, floor counts, materials, colours,
 * furniture, people, and flags all become knobs on the parametric
 * builder. "A huge hospital fully furnished with doctors and patients and
 * the Canadian flag" is a 15×13 three-floor white building with a red
 * cross, beds and lamps inside, four villagers, and a flag on a pole.
 */

import { classifyIntent, intentIsClear } from './intent';
import { CITY_PACKS, isCityName, type CityName } from '../build/monuments/cities';
import { MONUMENTS, cleanText, isMonumentKind, type MonumentKind } from '../build/monuments/index';
import { labelSubject } from './intentFeatures';
import { phonetic } from './intentFeatures';

export type BuildingType = 'house' | 'castle' | 'hospital' | 'school' | 'shop' | 'skyscraper' | 'hotel' | 'barn' | 'library' | 'restaurant' | 'firestation' | 'airport';

export type BuildSpec = {
  kind: 'house' | 'castle';
  type: BuildingType;
  width: number;
  depth: number;
  floors: number;
  /** Block ids. */
  wall: string;
  roof: string;
  trim: string | null;
  colorful: boolean;
  furnish: boolean;
  sign: 'cross' | null;
  flag: string | null;
  /** Villagers to spawn beside the building. */
  people: Array<{ job: string; name?: string; count: number }>;
  /** Rooms in order, with purposes. */
  rooms: Array<{ purpose: string; count: number }>;
  /** Outdoor features around the building. */
  features: string[];
  /** Rides to park there ("an airport for airplanes" gets a plane). */
  vehicles: string[];
  doorWidth: number;
  doorHeight: number;
  automaticDoor: boolean;
  elevator: boolean;
  pistonDoor: boolean;
  /** Words for the reply. */
  label: string;
};

const TYPE_WORDS: Array<[RegExp, BuildingType]> = [
  [/\b(hospital|clinic|doctor'?s office|medical cent(er|re))\b/, 'hospital'],
  [/\b(school|classroom|kindergarten|nursery|university)\b/, 'school'],
  [/\b(shop|store|market|supermarket|bakery|mall)\b/, 'shop'],
  [/\b(skyscraper|tower block|office tower|high[- ]?rise)\b/, 'skyscraper'],
  [/\b(hotel|motel|inn)\b/, 'hotel'],
  [/\b(barn|stable|farmhouse)\b/, 'barn'],
  [/\b(library)\b/, 'library'],
  [/\b(restaurant|cafe|café|diner|pizzeria)\b/, 'restaurant'],
  [/\b(fire ?station|firehouse)\b/, 'firestation'],
  [/\b(air ?ports?|airfields?|air ?terminals?|plane stations?)\b/, 'airport'],
  [/\b(castle|fort|fortress|keep|citadel|stronghold)\b/, 'castle'],
  [/\b(house|home|homes|cottage|hut|cabin|mansion|villa|palace|manor|bungalow|apartment|flat|building|lodge|shed|garage)\b/, 'house'],
];

/** Per type: default size class, wall, trim, roof, furniture, sign, and who works there. */
const TYPE_DEFAULTS: Record<BuildingType, { size: 'small' | 'normal' | 'big' | 'huge'; floors: number; wall: string; trim: string | null; roof: string; furnish: boolean; sign: 'cross' | null; /** Doors that open by themselves, the way they do in real public buildings. */ automatic?: boolean; people: Array<{ job: string; name?: string; count: number }> }> = {
  house: { size: 'normal', floors: 1, wall: 'planks', trim: null, roof: 'roof_tiles', furnish: false, sign: null, people: [] },
  castle: { size: 'big', floors: 2, wall: 'stone_bricks', trim: null, roof: 'stone_bricks', furnish: false, sign: null, people: [] },
  hospital: { size: 'huge', floors: 3, wall: 'color_white', trim: 'color_red', roof: 'color_white', furnish: true, sign: 'cross', automatic: true, people: [{ job: 'doctor', count: 2 }] },
  school: { size: 'big', floors: 2, wall: 'brick', trim: 'color_yellow', roof: 'roof_tiles', furnish: true, sign: null, people: [{ job: 'teacher', count: 1 }] },
  shop: { size: 'normal', floors: 1, wall: 'planks', trim: 'color_orange', roof: 'roof_tiles', furnish: true, sign: null, automatic: true, people: [{ job: 'shopkeeper', count: 1 }] },
  skyscraper: { size: 'big', floors: 6, wall: 'glass', trim: 'stone_bricks', roof: 'stone_bricks', furnish: false, sign: null, people: [] },
  hotel: { size: 'huge', floors: 4, wall: 'sandstone', trim: 'color_blue', roof: 'roof_tiles', furnish: true, sign: null, people: [{ job: 'shopkeeper', name: 'Concierge', count: 1 }] },
  barn: { size: 'big', floors: 1, wall: 'planks', trim: 'color_red', roof: 'color_red', furnish: false, sign: null, people: [{ job: 'farmer', count: 1 }] },
  library: { size: 'big', floors: 2, wall: 'stone_bricks', trim: 'planks', roof: 'roof_tiles', furnish: true, sign: null, people: [{ job: 'teacher', name: 'Librarian', count: 1 }] },
  restaurant: { size: 'normal', floors: 1, wall: 'brick', trim: 'color_red', roof: 'roof_tiles', furnish: true, sign: null, people: [{ job: 'baker', name: 'Chef', count: 1 }] },
  firestation: { size: 'big', floors: 2, wall: 'color_red', trim: 'color_white', roof: 'stone_bricks', furnish: false, sign: null, people: [{ job: 'firefighter', count: 2 }] },
  airport: { size: 'huge', floors: 2, wall: 'glass', trim: 'color_blue', roof: 'color_white', furnish: true, sign: null, automatic: true, people: [{ job: 'builder', name: 'Pilot', count: 2 }] },
};

const SIZES = { small: [5, 5, 1], normal: [7, 7, 1], big: [9, 9, 2], huge: [15, 13, 3] } as const;

const MATERIALS: Array<[RegExp, string, string]> = [
  [/\bbricks?\b|\bbrick and mortar\b|\bmortar\b/, 'brick', 'brick'],
  [/\bstone bricks?\b|\bstone\b|\brock\b/, 'stone_bricks', 'stone'],
  [/\bcobble(stone)?\b/, 'cobblestone', 'cobblestone'],
  [/\bsandstone\b|\bsand\b/, 'sandstone', 'sandstone'],
  [/\bglass\b|\bcrystal\b/, 'glass', 'glass'],
  [/\bwood(en)?\b|\bplanks?\b|\blogs?\b|\btimber\b/, 'planks', 'wooden'],
  [/\bice\b|\bicy\b|\bfrozen\b/, 'ice', 'ice'],
  [/\bsnow(y)?\b/, 'snow', 'snow'],
  [/\bgold(en)?\b/, 'color_yellow', 'golden'],
  [/\brainbow\b/, 'rainbow', 'rainbow'],
];

const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'white', 'black', 'brown'];
const NUMBER_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10 };

/** People words → villager jobs (patients and guests are plain neighbors with a fitting name). */
const PEOPLE_WORDS: Array<[RegExp, string, string | undefined]> = [
  [/\b(doctors?|nurses?|surgeons?)\b/, 'doctor', undefined],
  [/\b(patients?|sick people)\b/, 'random', 'Patient'],
  [/\b(teachers?|professors?)\b/, 'teacher', undefined],
  [/\b(students?|pupils?|kids|children)\b/, 'random', 'Student'],
  [/\b(shopkeepers?|cashiers?|sellers?)\b/, 'shopkeeper', undefined],
  [/\b(customers?|shoppers?|guests?|visitors?)\b/, 'random', 'Guest'],
  [/\b(firefighters?|firemen|fireman)\b/, 'firefighter', undefined],
  [/\b(bakers?|chefs?|cooks?)\b/, 'baker', undefined],
  [/\b(farmers?)\b/, 'farmer', undefined],
  [/\b(builders?|workers?)\b/, 'builder', undefined],
  [/\b(musicians?|singers?|band)\b/, 'musician', undefined],
  [/\b(people|villagers|neighbou?rs|friends|family)\b/, 'random', undefined],
];

const ROOM_WORDS: Array<[RegExp, string]> = [
  [/\b(class ?rooms?|classes)\b/, 'classroom'],
  [/\b(computer (rooms?|labs?)|it rooms?|pc rooms?)\b/, 'computer room'],
  [/\b(librar(y|ies))\b/, 'library'],
  [/\b(canteens?|cafeterias?|dining (rooms?|halls?)|lunch ?rooms?)\b/, 'canteen'],
  [/\b(gyms?|gymnasiums?|sports? halls?)\b/, 'gym'],
  [/\b(offices?|staff ?rooms?|reception)\b/, 'office'],
  [/\b(wards?|patient rooms?|surgery rooms?|operating rooms?)\b/, 'ward'],
  [/\b(bedrooms?|guest rooms?|hotel rooms?)\b/, 'bedroom'],
  [/\b(labs?|laborator(y|ies)|science rooms?)\b/, 'lab'],
  [/\b(kitchens?)\b/, 'kitchen'],
  [/\b(living rooms?|lounges?)\b/, 'living room'],
  [/\b(bathrooms?|toilets?|restrooms?)\b/, 'bathroom'],
];

const FEATURE_WORDS: Array<[RegExp, string]> = [
  [/\b(sports? (courts?|fields?|grounds?)|football (pitch|field)|soccer (pitch|field)|basketball courts?|tennis courts?|playing fields?|courts?)\b/, 'court'],
  [/\b(playgrounds?|play ?structures?|play ?areas?|slides?|swings?|climbing frames?|jungle gyms?)\b/, 'playground'],
  [/\b(swimming pools?|pools?)\b/, 'pool'],
  [/\b(gardens?|flower ?beds?)\b/, 'garden'],
  [/\b(parking( lot)?|car ?park)\b/, 'parking'],
  [/\b(fountains?)\b/, 'fountain'],
  [/\b(fenced?|fence around|wall around)\b/, 'fence'],
  [/\b(runways?|air ?strips?|landing strips?|tarmacs?)\b/, 'runway'],
];

const FLAGS: Array<[RegExp, string]> = [
  [/\b(canada|canadian)\b/, 'canada'],
  [/\b(brazil|brazilian|brasil)\b/, 'brazil'],
  [/\b(usa|america|american|united states|stars and stripes)\b/, 'usa'],
  [/\b(uk|britain|british|england|english|union jack)\b/, 'uk'],
  [/\b(france|french)\b/, 'france'],
  [/\b(italy|italian)\b/, 'italy'],
  [/\b(germany|german)\b/, 'germany'],
  [/\b(japan|japanese)\b/, 'japan'],
  [/\b(portugal|portuguese)\b/, 'portugal'],
  [/\b(spain|spanish)\b/, 'spain'],
  [/\b(mexico|mexican)\b/, 'mexico'],
  [/\b(ireland|irish)\b/, 'ireland'],
  [/\b(rainbow|pride)\b/, 'rainbow'],
];

/**
 * The words this parser reads. A misspelled word that sounds like one of
 * these is corrected before any pattern runs, so "6 clasrooms" and "a
 * computr room" land in the right place.
 */
const VOCABULARY = [
  'classroom', 'classrooms', 'computer', 'library', 'canteen', 'cafeteria', 'gym', 'office', 'reception', 'ward', 'bedroom', 'bedrooms',
  'laboratory', 'kitchen', 'lounge', 'bathroom', 'toilet', 'playground', 'basketball', 'football', 'soccer', 'tennis', 'garden', 'flowers',
  'fountain', 'parking', 'fence', 'bridge', 'treehouse', 'hospital', 'clinic', 'school', 'kindergarten', 'university', 'house', 'cottage',
  'mansion', 'castle', 'palace', 'fortress', 'skyscraper', 'hotel', 'restaurant', 'pizzeria', 'library', 'firestation', 'firehouse', 'barn',
  'stable', 'market', 'supermarket', 'bakery', 'elevator', 'stairs', 'staircase', 'ladder', 'doors', 'windows', 'floors', 'storeys', 'stories',
  'doctors', 'teachers', 'students', 'patients', 'nurses', 'firefighters', 'builders', 'farmers', 'musicians', 'shopkeeper',
  'lake', 'pond', 'pool', 'swimming', 'bunker', 'basement', 'tunnel', 'moat', 'trench', 'underground',
  'airport', 'airfield', 'runway', 'airstrip', 'tarmac', 'airplane', 'airplanes', 'aeroplane', 'helicopter', 'hangar', 'terminal',
  'eiffel', 'niagara', 'iguacu', 'iguazu', 'toronto', 'ottawa', 'curitiba', 'paris', 'rideau', 'copan', 'masp', 'ibirapuera',
  'niemeyer', 'botanical', 'opera', 'parliament', 'stadium', 'museum', 'canal', 'waterfall', 'waterfalls', 'monument', 'tower',
  'colourful', 'colorful', 'rainbow', 'beautiful', 'yellow', 'purple', 'orange', 'green', 'brown', 'white', 'black', 'brick', 'stone', 'wooden',
  'glass', 'furnished', 'furniture', 'automatic', 'piston', 'flag', 'canada', 'brazil', 'america', 'france', 'italy', 'germany', 'japan',
  'portugal', 'spain', 'mexico', 'ireland', 'massive', 'giant', 'little', 'small', 'huge',
];

/**
 * Ordinary words a kid uses that must never be "corrected": they are
 * spelled right, and some of them sound like a word in the vocabulary
 * ("long" sounds like "lounge").
 */
const NEVER_CORRECT = new Set([
  'long', 'wide', 'tall', 'high', 'over', 'under', 'water', 'river', 'grass', 'ground', 'here', 'there',
  'that', 'this', 'them', 'they', 'with', 'without', 'please', 'thanks', 'thank', 'want', 'like', 'love',
  'make', 'made', 'build', 'built', 'give', 'have', 'need', 'come', 'lets', 'look', 'show', 'play',
  'jump', 'walk', 'talk', 'help', 'find', 'take', 'know', 'think', 'much', 'many', 'more', 'most',
  'some', 'from', 'into', 'onto', 'next', 'near', 'side', 'back', 'front', 'left', 'right', 'good',
  'nice', 'cool', 'best', 'super', 'friend', 'friends', 'mummy', 'mommy', 'daddy', 'sister', 'brother', 'family',
  'people', 'again', 'really', 'very', 'today', 'night', 'morning', 'sunny', 'rainy', 'snowy', 'cloud', 'clouds',
  'stars', 'moon', 'trees', 'tree', 'blocks', 'block', 'world', 'what', 'when', 'where', 'which', 'while',
  'would', 'could', 'should', 'about', 'after', 'because', 'been', 'before', 'both', 'came', 'does', 'done',
  'down', 'each', 'even', 'every', 'first', 'going', 'gone', 'great', 'just', 'last', 'little', 'name',
  'never', 'only', 'other', 'said', 'same', 'says', 'seen', 'such', 'tell', 'than', 'then', 'these',
  'thing', 'things', 'those', 'time', 'told', 'took', 'turn', 'until', 'upon', 'went', 'were', 'will',
  'work', 'year', 'your', 'yours', 'mine', 'ours', 'dont', 'cant', 'wont', 'didnt', 'isnt', 'open',
  'close', 'inside', 'outside', 'above', 'below', 'around', 'away', 'back', 'down', 'together', 'maybe', 'okay',
  'sure', 'another', 'anything', 'something', 'nothing', 'everyone', 'anyone', 'myself', 'yourself', 'himself', 'herself', 'happy',
  'funny', 'silly', 'sleepy', 'hungry', 'thirsty', 'tired', 'scared', 'brave', 'kind', 'mean', 'loud', 'quiet',
]);

const SOUNDS_LIKE = ((): Map<string, string> => {
  const known = new Set(VOCABULARY);
  const bySound = new Map<string, string | null>();
  for (const word of VOCABULARY) {
    const key = phonetic(word);
    // Two vocabulary words that sound alike are ambiguous: correct neither.
    bySound.set(key, bySound.has(key) && bySound.get(key) !== word ? null : word);
  }
  const out = new Map<string, string>();
  for (const [key, word] of bySound) if (word && !known.has(key)) out.set(key, word);
  return out;
})();

/**
 * Rewrites words that sound like something the parser knows. Real words
 * are left alone, and so is the punctuation: a comma is what keeps "6
 * classrooms, a computer room" from reading as six computer rooms.
 */
export function correctSpelling(raw: string): string {
  const known = new Set(VOCABULARY);
  return raw.replace(/[a-z']{4,}/g, (word) => {
    if (known.has(word) || NEVER_CORRECT.has(word)) return word;
    const sounded = SOUNDS_LIKE.get(phonetic(word));
    // Sounding alike is not enough: a typo is also a near miss in spelling.
    if (sounded && editDistance(word, sounded) <= 2) return sounded;
    // One letter out from a word the parser knows, and long enough that the
    // near miss cannot be a coincidence: "iffel" is the Eiffel Tower.
    return word.length >= 5 ? (nearest(word) ?? word) : word;
  });
}

/** The one vocabulary word a single slip away, if exactly one is that close. */
function nearest(word: string): string | null {
  let best: string | null = null;
  for (const candidate of VOCABULARY) {
    if (candidate.length < 5 || Math.abs(candidate.length - word.length) > 1) continue;
    if (editDistance(word, candidate) > 1) continue;
    if (best && best !== candidate) return null; // ambiguous: leave it alone
    best = candidate;
  }
  return best;
}

/** Levenshtein distance, stopped early: only small distances matter here. */
function editDistance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost);
      best = Math.min(best, row[j]);
    }
    if (best > 2) return 3;
    prev = row;
  }
  return prev[b.length];
}

export function parseBuildRequest(raw: string): BuildSpec | null {
  // "tree house" and "dog house" are things of their own, not houses for people:
  // the word "house" in them must not build a bungalow.
  const text = correctSpelling(raw.toLowerCase().replace(/\btree ?house(s)?\b/g, 'treehouse').replace(/\b(dog|puppy|pet|doggy|kitty|cat) ?house(s)?\b/g, 'doghouse'));
  let type: BuildingType | null = null;
  for (const [pattern, t] of TYPE_WORDS) {
    if (pattern.test(text)) {
      type = t;
      break;
    }
  }
  if (!type) {
    // Nothing we wrote down matched. Ask the model that was trained on how kids
    // really type: it reads misspellings and roundabout phrasings ("somewhere
    // for sick people to go") the way the word list cannot.
    const guess = classifyIntent(text);
    if (guess.kind === 'building' && intentIsClear(guess)) type = guess.label as BuildingType;
  }
  if (!type) return null;
  const d = TYPE_DEFAULTS[type];

  // Size: the type's default, then words, then numbers.
  const huge = /\b(huge|massive|giant|enormous|gigantic|humongous|mega|biggest|largest)\b|\b(mansion|palace|manor)\b/.test(text);
  const big = /\b(big|large|tall|grand|wide|long)\b/.test(text);
  const small = /\b(tiny|small|little|mini|cute|wee|baby)\b/.test(text);
  const sizeClass = huge ? 'huge' : big && d.size !== 'huge' ? 'big' : small ? 'small' : d.size;
  const sized = SIZES[sizeClass];
  let width: number = sized[0];
  let depth: number = sized[1];
  const floorsBySize: number = sized[2];
  let floors = Math.max(d.floors, huge ? 3 : big ? 2 : floorsBySize);
  if (type === 'skyscraper') floors = Math.max(6, floors);
  const floorMatch = /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\s*(floors?|stor(e)?ys?|stories|levels?)\b/.exec(text);
  if (floorMatch) floors = Math.max(1, Math.min(10, NUMBER_WORDS[floorMatch[1]] ?? Number(floorMatch[1]) ?? floors));
  const sizeMatch = /\b(\d{1,2})\s*(x|by)\s*(\d{1,2})\b/.exec(text);
  if (sizeMatch) {
    width = Math.max(5, Math.min(25, Number(sizeMatch[1])));
    depth = Math.max(5, Math.min(25, Number(sizeMatch[3])));
  }

  // Material and colour.
  let wall = d.wall;
  let materialWord = '';
  let explicit = false;
  for (const [pattern, id, word] of MATERIALS) {
    if (pattern.test(text)) {
      wall = id;
      materialWord = word;
      explicit = true;
      break;
    }
  }
  const colors = COLORS.filter((c) => new RegExp(`\\b${c}\\b`).test(text));
  const colorful = /\b(colou?rful|colou?rs|colored|coloured|multicolou?r(ed)?|rainbow|bright|sparkly|fancy|beautiful|pretty|magical)\b/.test(text) || colors.length > 1;
  let trim = d.trim;
  if (!explicit && colors.length === 1) {
    wall = `color_${colors[0]}`;
    materialWord = colors[0];
    if (trim === wall) trim = 'color_white';
  }
  const roof = colorful ? 'rainbow' : explicit ? (wall === 'planks' || wall === 'brick' ? 'roof_tiles' : wall) : d.roof;

  // Furniture, people, flag.
  const furnish = d.furnish || /\b(furnish|furnished|furniture|beds?|tables?|chairs?|inside|interior|decorat)/.test(text);
  const people: BuildSpec['people'] = [];
  for (const [pattern, job, name] of PEOPLE_WORDS) {
    const m = new RegExp(`\\b(a|an|one|two|three|four|five|six|\\d)\\s+(?:\\w+\\s+){0,2}?${pattern.source.slice(2, -2)}`).exec(text);
    if (!pattern.test(text)) continue;
    const count = m ? (NUMBER_WORDS[m[1]] ?? Number(m[1]) ?? 2) : 2;
    people.push({ job, name, count: Math.max(1, Math.min(6, count)) });
  }
  if (people.length === 0 && /\b(with|and)\b/.test(text) === false) people.push(...d.people);
  else if (people.length === 0) people.push(...d.people);
  // Rooms with purposes and counts ("6 classrooms, a computer room").
  const rooms: BuildSpec['rooms'] = [];
  for (const [pattern, purpose] of ROOM_WORDS) {
    if (!pattern.test(text)) continue;
    const m = new RegExp(`\\b(a|an|one|two|three|four|five|six|seven|eight|nine|ten|\\d{1,2})\\s+(?:\\w+\\s+){0,2}?(?:${pattern.source.slice(2, -2)})`).exec(text);
    const count = m ? (NUMBER_WORDS[m[1]] ?? Number(m[1]) ?? 1) : 1;
    rooms.push({ purpose, count: Math.max(1, Math.min(24, count)) });
  }
  const features: string[] = [];
  for (const [pattern, feature] of FEATURE_WORDS) if (pattern.test(text) && !features.includes(feature)) features.push(feature);
  // An airport without a runway is just a shed: planes need somewhere to take off.
  if (type === 'airport' && !features.includes('runway')) features.push('runway');
  // Grow the building until the rooms fit. A floor has one room per 4-block section on the
  // front side and one on the back side, except that a multi-floor building's stairwell takes
  // the three back sections nearest the left wall.
  const wanted = rooms.reduce((n, r) => n + r.count, 0);
  if (wanted > 0) {
    const perFloor = (w: number, f: number): number => {
      const sections = Math.floor((w - 5) / 4) + 1;
      const back = f > 1 ? Math.max(0, sections - 3) : sections;
      return sections + back;
    };
    if (depth < 13) depth = 13; // rooms three deep hold real furniture
    while (perFloor(width, floors) * floors < wanted && width < 25) width += 4;
    while (perFloor(width, floors) * floors < wanted && floors < 10) floors += 1;
  }
  // Doors and vertical transport.
  const doorWidth = /\b(wide|double|big|large|huge|giant|grand|massive) (front )?doors?\b|\bdouble doors?\b|\bwide entrance\b/.test(text) ? 2 : 1;
  const doorHeight = /\b(tall|high|giant|huge|massive) (front )?doors?\b/.test(text) ? 3 : 2;
  const automaticDoor = /\b(automatic|auto|magic|sensor|pressure plate) doors?\b|\bdoors? that opens? (by (itself|themselves)|automatically|when)\b/.test(text);
  const pistonDoor = /\b(piston|redstone|secret|hidden|sliding) doors?\b/.test(text);
  const elevator = /\b(elevators?|lifts?)\b/.test(text);
  if (elevator && floors < 2) floors = 2;
  let flag: string | null = null;
  if (/\bflag\b/.test(text)) {
    for (const [pattern, name] of FLAGS) if (pattern.test(text)) flag = name;
    if (!flag) flag = 'rainbow';
  }

  const sizeWord = huge ? 'massive' : big ? 'big' : small ? 'little' : '';
  const noun = type === 'house' ? (/\bmansion\b/.test(text) ? 'mansion' : /\bpalace\b/.test(text) ? 'palace' : /\bcottage\b/.test(text) ? 'cottage' : 'house') : type === 'firestation' ? 'fire station' : type;
  const label = [sizeWord, colorful ? 'colourful' : '', materialWord, noun].filter(Boolean).join(' ');
  const vehicles: string[] = [];
  for (const [pattern, kind] of [
    [/\b(airplanes?|aeroplanes?|planes?|jets?)\b/, 'plane'],
    [/\b(helicopters?|choppers?)\b/, 'helicopter'],
    [/\b(boats?|ships?|yachts?)\b/, 'boat'],
    [/\b(cars?|trucks?)\b/, 'car'],
  ] as Array<[RegExp, string]>) {
    if (pattern.test(text) && !vehicles.includes(kind)) vehicles.push(kind);
  }
  return { kind: type === 'castle' ? 'castle' : 'house', type, width, depth, floors, wall, roof, trim, colorful, furnish: furnish || rooms.length > 0, sign: d.sign, flag, people, rooms, features, vehicles, doorWidth: pistonDoor ? 2 : doorWidth, doorHeight, automaticDoor: (automaticDoor || d.automatic === true) && !pistonDoor, elevator, pistonDoor, label };
}

import type { ChatAction, ChatContext } from './types';

/** The tool calls that make a spec real: the building, then its people beside it. */
/** Rough width of the widest outdoor feature, so the plot leaves room for it. */
function widestFeature(features: string[]): number {
  if (features.includes('runway')) return 45;
  return features.length > 0 ? 16 : 0;
}

export function buildActionsFor(spec: BuildSpec, ctx: ChatContext): ChatAction[] {
  // Its own patch of open ground, clear of whatever was built a moment ago.
  const at = ctx.plot?.(spec.width + widestFeature(spec.features), spec.depth) ?? ctx.site;
  const actions: ChatAction[] = [
    {
      tool: 'build_house',
      args: {
        x: at.x, y: at.y, z: at.z,
        type: spec.type, width: spec.width, depth: spec.depth, floors: spec.floors,
        wall: spec.wall, roof: spec.roof, trim: spec.trim, colorful: spec.colorful, castle: spec.kind === 'castle',
        furnish: spec.furnish, sign: spec.sign, flag: spec.flag,
        roomPlan: spec.rooms, features: spec.features,
        doorWidth: spec.doorWidth, doorHeight: spec.doorHeight, automaticDoor: spec.automaticDoor, elevator: spec.elevator, pistonDoor: spec.pistonDoor,
      },
    },
  ];
  for (const kind of spec.vehicles) actions.push({ tool: 'vehicle_spawn', args: { kind, x: at.x, z: at.z + 6 } });
  let i = 0;
  for (const person of spec.people) {
    for (let n = 0; n < person.count; n++) {
      const angle = (i++ / 6) * Math.PI * 2;
      const name = person.name ? `${person.name} ${String.fromCharCode(65 + (i % 26))}` : undefined;
      actions.push({ tool: 'villager_spawn', args: { job: person.job, ...(name ? { name } : {}), x: Math.round(at.x + Math.cos(angle) * (spec.width / 2 + 2)), z: Math.round(at.z - spec.depth / 2 - 3 + Math.sin(angle) * 2) } });
    }
  }
  return actions;
}

/** Things built beside a building, asked for on their own: a bridge, a treehouse, a playground. */
export type FeatureSpec = {
  kind: 'court' | 'playground' | 'garden' | 'parking' | 'fountain' | 'fence' | 'bridge' | 'treehouse' | 'runway' | 'doghouse';
  width?: number;
  length?: number;
  color?: string;
  /** A name to put on it: the dog's, over its door. */
  text?: string;
  /** Extras the child named. */
  extras?: { fence?: boolean; bowl?: boolean; light?: boolean; bed?: boolean };
  label: string;
};

const STANDALONE_FEATURES: Array<[RegExp, FeatureSpec['kind'], string]> = [
  [/\b(doghouses?|kennels?|dog ?house(s)?|house for (my |the )?(dog|puppy|doggy)|puppy house)\b/, 'doghouse', 'dog house'],
  [/\b(runways?|air ?strips?|landing strips?|tarmacs?)\b/, 'runway', 'runway'],
  [/\b(tree ?house(s)?)\b/, 'treehouse', 'treehouse'],
  [/\b(bridges?|walkways?|footbridges?)\b/, 'bridge', 'bridge'],
  [/\b(playgrounds?|play ?structures?|play ?areas?|swings?|slides?|climbing frames?|jungle gyms?)\b/, 'playground', 'playground'],
  [/\b(sports? (courts?|fields?|grounds?)|football (pitch|field)|soccer (pitch|field)|basketball courts?|tennis courts?|courts?)\b/, 'court', 'sports court'],
  [/\b(gardens?|flower ?beds?)\b/, 'garden', 'flower garden'],
  [/\b(fountains?)\b/, 'fountain', 'fountain'],
  [/\b(parking( lots?)?|car ?parks?)\b/, 'parking', 'car park'],
];

/** A feature asked for on its own. Null when the words are about something else. */
export function parseFeature(raw: string): FeatureSpec | null {
  const text = correctSpelling(raw.toLowerCase());
  const guess = classifyIntent(text);
  const known = STANDALONE_FEATURES.map(([pattern, kind, label]): [RegExp | null, FeatureSpec['kind'], string] => [pattern, kind, label]);
  // "plant a tree" is a tree, not a tree house: the model may only pick a
  // treehouse when the child actually said something about a house up there.
  const treehouseWithoutHouse = guess.label === 'treehouse' && !/\b(house|hut|cabin|stilts|up in a tree|ladder)\b/.test(text);
  if (guess.kind === 'feature' && intentIsClear(guess) && !treehouseWithoutHouse && !known.some(([pattern]) => pattern?.test(text))) {
    const row = known.find(([, kind]) => kind === guess.label);
    if (row) known.unshift([null, row[1], row[2]]); // the model's guess, tried first
  }
  for (const [pattern, kind, label] of known) {
    if (pattern && !pattern.test(text)) continue;
    const spec: FeatureSpec = { kind, label };
    const sizeMatch = /\b(\d{1,2})\s*(x|by)\s*(\d{1,2})\b/.exec(text);
    if (sizeMatch) {
      spec.width = Math.max(3, Math.min(48, Number(sizeMatch[1])));
      spec.length = Math.max(3, Math.min(48, Number(sizeMatch[3])));
    } else if (/\b(huge|massive|giant|enormous|gigantic|biggest|long)\b/.test(text)) {
      spec.width = kind === 'bridge' ? 21 : 15;
      spec.length = kind === 'bridge' ? 5 : 11;
    } else if (/\b(big|large|wide)\b/.test(text)) {
      spec.width = kind === 'bridge' ? 15 : 13;
      spec.length = kind === 'bridge' ? 5 : 9;
    } else if (/\b(tiny|small|little|mini)\b/.test(text)) {
      spec.width = 5;
      spec.length = 5;
    }
    const color = COLORS.find((c) => new RegExp(`\\b${c}\\b`).test(text));
    if (color) spec.color = `color_${color}`;
    if (kind === 'doghouse') {
      // "called Rex" and "named Rex" say it outright; "for Rex" only counts when
      // the word after it is not another way of saying "the dog".
      const NOT_A_NAME = new Set(['my', 'the', 'a', 'an', 'me', 'us', 'him', 'her', 'it', 'them', 'dog', 'dogs', 'puppy', 'puppies', 'doggy', 'pet', 'cat', 'kitty', 'called', 'named', 'name', 'with', 'and', 'that', 'who', 'she', 'he']);
      const patterns = [
        /\b(?:called|named|name is|name's)\s+([a-z][a-z'-]{1,14})\b/,
        /\bfor\s+(?:my\s+|the\s+)?(?:dog\s+|puppy\s+|doggy\s+|pet\s+)?([a-z][a-z'-]{1,14})\b/,
      ];
      for (const pattern of patterns) {
        const name = pattern.exec(text)?.[1];
        if (name && !NOT_A_NAME.has(name)) {
          spec.text = name.charAt(0).toUpperCase() + name.slice(1);
          break;
        }
      }
      spec.extras = {
        fence: /\b(fence|yard|garden|gate|pen|run)\b/.test(text),
        light: /\b(light|lamp|lantern|so (he|she|it) can see)\b/.test(text),
        bowl: !/\bno (water|bowl)\b/.test(text),
        bed: !/\bno bed\b/.test(text),
      };
    }
    return spec;
  }
  return null;
}

/** Digging jobs: what kind, how big, how deep. Null when the words are not about digging. */
export type EarthworkSpec = { kind: 'pool' | 'raisedPool' | 'lake' | 'pond' | 'pit' | 'bunker' | 'tunnel' | 'well' | 'moat'; width?: number; length?: number; depth?: number; label: string };

const EARTHWORK_WORDS: Array<[RegExp, EarthworkSpec['kind']]> = [
  [/\b(above[- ]?ground|on[- ]?ground|raised) (swimming )?pools?\b/, 'raisedPool'],
  [/\b(in[- ]?ground |underground |swimming |dig (a |an |me a )?)?pools?\b/, 'pool'],
  [/\blakes?\b/, 'lake'],
  [/\bponds?\b/, 'pond'],
  [/\b(bunkers?|basements?|cellars?|underground (rooms?|dens?|bases?|hideouts?)|secret bases?)\b/, 'bunker'],
  [/\b(tunnels?|caves?|mines?|mineshafts?)\b/, 'tunnel'],
  [/\bwells?\b/, 'well'],
  [/\bmoats?\b/, 'moat'],
  [/\b(pits?|holes?|trench(es)?|ditch(es)?|dig (a |an )?holes?)\b/, 'pit'],
];

export function parseEarthwork(raw: string): EarthworkSpec | null {
  const text = correctSpelling(raw.toLowerCase());
  let kind: EarthworkSpec['kind'] | null = null;
  for (const [pattern, k] of EARTHWORK_WORDS) {
    if (pattern.test(text)) {
      kind = k;
      break;
    }
  }
  if (!kind) {
    const guess = classifyIntent(text);
    if (guess.kind === 'earthwork' && intentIsClear(guess)) kind = guess.label as EarthworkSpec['kind'];
  }
  if (!kind) return null;
  const spec: EarthworkSpec = { kind, label: kind === 'raisedPool' ? 'above-ground pool' : kind };
  const sizeMatch = /\b(\d{1,2})\s*(x|by)\s*(\d{1,2})\b/.exec(text);
  if (sizeMatch) {
    spec.width = Math.max(3, Math.min(48, Number(sizeMatch[1])));
    spec.length = Math.max(3, Math.min(48, Number(sizeMatch[3])));
  } else if (/\b(huge|massive|giant|enormous|gigantic|biggest)\b/.test(text)) {
    spec.width = kind === 'lake' ? 30 : 12;
    spec.length = kind === 'lake' ? 20 : 9;
  } else if (/\b(big|large|long|wide)\b/.test(text)) {
    spec.width = kind === 'lake' ? 22 : 9;
    spec.length = kind === 'lake' ? 16 : 7;
  } else if (/\b(tiny|small|little|mini)\b/.test(text)) {
    spec.width = 4;
    spec.length = 4;
  }
  const depthMatch = /\b(\d{1,2})\s*(blocks? )?deep\b/.exec(text);
  if (depthMatch) spec.depth = Math.max(1, Math.min(12, Number(depthMatch[1])));
  else if (/\b(very deep|really deep|super deep)\b/.test(text)) spec.depth = 8;
  else if (/\bdeep\b/.test(text)) spec.depth = 5;
  else if (/\bshallow\b/.test(text)) spec.depth = 1;
  if (kind === 'tunnel' && /\b(\d{1,2})\s*(blocks? )?long\b/.test(text)) spec.length = Math.max(3, Math.min(48, Number(/\b(\d{1,2})\s*(blocks? )?long\b/.exec(text)![1])));
  return spec;
}

/** A famous place asked for by name. */
export type MonumentSpec = { kind: MonumentKind; label: string; text?: string };

/** The words people use for each monument, checked before the model is asked. */
const MONUMENT_WORDS: Array<[RegExp, MonumentKind]> = [
  [/\b(eiffel|eifel|iffel|torre eiffel)\b/, 'eiffel'],
  [/\b(cn tower|c n tower|toronto tower)\b/, 'cn_tower'],
  [/\b(rogers (centre|center)|skydome|sky dome)\b/, 'rogers_dome'],
  [/\b(peace tower|parliament)\b/, 'peace_tower'],
  [/\b(rideau|skating canal|skateway)\b/, 'rideau_canal'],
  [/\b(niemeyer|museu do olho|eye museum|the eye)\b/, 'niemeyer_eye'],
  [/\b(wire opera|opera de arame|ópera de arame)\b/, 'wire_opera'],
  [/\b(botanical garden|jardim bot[aâ]nico|greenhouse)\b/, 'botanical_garden'],
  [/\b(masp|sao paulo art museum|s[aã]o paulo art museum)\b/, 'masp'],
  [/\b(copan|edif[ií]cio copan)\b/, 'copan'],
  [/\b(ibirapuera)\b/, 'ibirapuera'],
  [/\b(niagara|niagra)( falls)?\b/, 'niagara'],
  [/\b(igua[cç]u|iguazu|foz do igua[cç]u|cataratas)( falls)?\b/, 'iguacu'],
  [/\b(big letters|block letters|giant letters|a sign that says|sign saying|letters that say)\b/, 'sign'],
];

/** The word a sign should spell, when the child says one. */
function signText(text: string): string | undefined {
  const match = /\b(?:says?|saying|spells?|reads?)\s+["']?([a-z0-9 '!?-]{1,20})["']?/.exec(text);
  const word = cleanText(match ? match[1] : '');
  return word.length > 0 ? word : undefined;
}

export function parseMonument(raw: string): MonumentSpec | null {
  const text = correctSpelling(raw.toLowerCase());
  let kind: MonumentKind | null = null;
  for (const [pattern, k] of MONUMENT_WORDS) {
    if (pattern.test(text)) {
      kind = k;
      break;
    }
  }
  if (!kind) {
    const guess = classifyIntent(text);
    if (guess.kind === 'monument' && intentIsClear(guess)) {
      const subject = labelSubject(guess.label);
      if (isMonumentKind(subject)) kind = subject;
    }
  }
  if (!kind) return null;
  const spec: MonumentSpec = { kind, label: MONUMENTS[kind].label };
  if (kind === 'sign') spec.text = signText(text) ?? 'HELLO';
  return spec;
}

/** A whole city: a few of its landmarks, and a sign with its name. */
export type CitySpec = { city: CityName; label: string; monuments: MonumentKind[]; sign: string };

const CITY_WORDS: Array<[RegExp, CityName]> = [
  [/\bcuritiba\b/, 'curitiba'],
  [/\b(s[aã]o paulo|sao paolo|sampa)\b/, 'saopaulo'],
  [/\bottawa\b/, 'ottawa'],
  [/\btoronto\b/, 'toronto'],
  [/\bparis\b/, 'paris'],
];

export function parseCity(raw: string): CitySpec | null {
  const text = correctSpelling(raw.toLowerCase());
  let city: CityName | null = null;
  for (const [pattern, c] of CITY_WORDS) {
    if (pattern.test(text)) {
      city = c;
      break;
    }
  }
  if (!city) {
    const guess = classifyIntent(text);
    if (guess.kind === 'city' && intentIsClear(guess)) {
      const subject = labelSubject(guess.label);
      if (isCityName(subject)) city = subject;
    }
  }
  if (!city) return null;
  const pack = CITY_PACKS[city];
  return { city, label: pack.label, monuments: [...pack.monuments], sign: pack.sign };
}
