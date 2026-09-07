/**
 * Turns whatever a kid types into a building spec. No fixed blueprints:
 * the kind of building, size words, floor counts, materials, colours,
 * furniture, people, and flags all become knobs on the parametric
 * builder. "A huge hospital fully furnished with doctors and patients and
 * the Canadian flag" is a 15×13 three-floor white building with a red
 * cross, beds and lamps inside, four villagers, and a flag on a pole.
 */

export type BuildingType = 'house' | 'castle' | 'hospital' | 'school' | 'shop' | 'skyscraper' | 'hotel' | 'barn' | 'library' | 'restaurant' | 'firestation';

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
  [/\b(castle|fort|fortress|keep|citadel|stronghold)\b/, 'castle'],
  [/\b(house|home|homes|cottage|hut|cabin|mansion|villa|palace|manor|bungalow|apartment|flat|building|lodge|shed|garage)\b/, 'house'],
];

/** Per type: default size class, wall, trim, roof, furniture, sign, and who works there. */
const TYPE_DEFAULTS: Record<BuildingType, { size: 'small' | 'normal' | 'big' | 'huge'; floors: number; wall: string; trim: string | null; roof: string; furnish: boolean; sign: 'cross' | null; people: Array<{ job: string; name?: string; count: number }> }> = {
  house: { size: 'normal', floors: 1, wall: 'planks', trim: null, roof: 'roof_tiles', furnish: false, sign: null, people: [] },
  castle: { size: 'big', floors: 2, wall: 'stone_bricks', trim: null, roof: 'stone_bricks', furnish: false, sign: null, people: [] },
  hospital: { size: 'huge', floors: 3, wall: 'color_white', trim: 'color_red', roof: 'color_white', furnish: true, sign: 'cross', people: [{ job: 'doctor', count: 2 }] },
  school: { size: 'big', floors: 2, wall: 'brick', trim: 'color_yellow', roof: 'roof_tiles', furnish: true, sign: null, people: [{ job: 'teacher', count: 1 }] },
  shop: { size: 'normal', floors: 1, wall: 'planks', trim: 'color_orange', roof: 'roof_tiles', furnish: true, sign: null, people: [{ job: 'shopkeeper', count: 1 }] },
  skyscraper: { size: 'big', floors: 6, wall: 'glass', trim: 'stone_bricks', roof: 'stone_bricks', furnish: false, sign: null, people: [] },
  hotel: { size: 'huge', floors: 4, wall: 'sandstone', trim: 'color_blue', roof: 'roof_tiles', furnish: true, sign: null, people: [{ job: 'shopkeeper', name: 'Concierge', count: 1 }] },
  barn: { size: 'big', floors: 1, wall: 'planks', trim: 'color_red', roof: 'color_red', furnish: false, sign: null, people: [{ job: 'farmer', count: 1 }] },
  library: { size: 'big', floors: 2, wall: 'stone_bricks', trim: 'planks', roof: 'roof_tiles', furnish: true, sign: null, people: [{ job: 'teacher', name: 'Librarian', count: 1 }] },
  restaurant: { size: 'normal', floors: 1, wall: 'brick', trim: 'color_red', roof: 'roof_tiles', furnish: true, sign: null, people: [{ job: 'baker', name: 'Chef', count: 1 }] },
  firestation: { size: 'big', floors: 2, wall: 'color_red', trim: 'color_white', roof: 'stone_bricks', furnish: false, sign: null, people: [{ job: 'firefighter', count: 2 }] },
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

export function parseBuildRequest(raw: string): BuildSpec | null {
  const text = raw.toLowerCase();
  let type: BuildingType | null = null;
  for (const [pattern, t] of TYPE_WORDS) {
    if (pattern.test(text)) {
      type = t;
      break;
    }
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
  // Grow the building until the rooms fit: two rooms per 4-block section per floor.
  const wanted = rooms.reduce((n, r) => n + r.count, 0);
  if (wanted > 0) {
    const perFloor = (w: number): number => 2 * Math.floor((w - 3) / 4);
    if (depth < 13) depth = 13; // rooms three deep hold real furniture
    while (perFloor(width) * floors < wanted && width < 25) width += 4;
    while (perFloor(width) * floors < wanted && floors < 10) floors += 1;
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
  return { kind: type === 'castle' ? 'castle' : 'house', type, width, depth, floors, wall, roof, trim, colorful, furnish: furnish || rooms.length > 0, sign: d.sign, flag, people, rooms, features, doorWidth: pistonDoor ? 2 : doorWidth, doorHeight, automaticDoor: automaticDoor && !pistonDoor, elevator, pistonDoor, label };
}

import type { ChatAction, ChatContext } from './types';

/** The tool calls that make a spec real: the building, then its people beside it. */
export function buildActionsFor(spec: BuildSpec, ctx: ChatContext): ChatAction[] {
  const at = ctx.site;
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
  const text = raw.toLowerCase();
  let kind: EarthworkSpec['kind'] | null = null;
  for (const [pattern, k] of EARTHWORK_WORDS) {
    if (pattern.test(text)) {
      kind = k;
      break;
    }
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
