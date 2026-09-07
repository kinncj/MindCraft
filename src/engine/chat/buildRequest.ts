/**
 * Turns whatever a kid types into a house or castle spec. No fixed
 * blueprints: size words, floor counts, materials, and colours all become
 * knobs on the parametric builder, so "a beautiful and colourful brick
 * and mortar mansion, like a massive house" is a 13×11, three-floor brick
 * house with rainbow pillars and roof.
 */

export type BuildSpec = {
  kind: 'house' | 'castle';
  width: number;
  depth: number;
  floors: number;
  /** Block ids. */
  wall: string;
  roof: string;
  colorful: boolean;
  /** Words for the reply. */
  label: string;
};

const HOUSE_WORDS = /\b(house|home|homes|cottage|hut|cabin|mansion|villa|palace|manor|bungalow|apartment|flat|hotel|shop|store|school|hospital|barn|shed|garage|lodge|inn|farmhouse|building|skyscraper|tower block)\b/;
const CASTLE_WORDS = /\b(castle|fort|fortress|keep|citadel|stronghold)\b/;

const MATERIALS: Array<[RegExp, string, string]> = [
  [/\bbricks?\b|\bbrick and mortar\b|\bmortar\b/, 'brick', 'brick'],
  [/\bstone bricks?\b|\bstone\b|\brock\b|\bcastle stone\b/, 'stone_bricks', 'stone'],
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
const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };

export function parseBuildRequest(raw: string): BuildSpec | null {
  const text = raw.toLowerCase();
  const castle = CASTLE_WORDS.test(text);
  if (!castle && !HOUSE_WORDS.test(text)) return null;

  // Size: words first, "mansion"-class nouns imply huge, numbers override.
  const huge = /\b(huge|massive|giant|enormous|gigantic|humongous|mega|biggest|largest)\b|\b(mansion|palace|manor|hotel|hospital|school|skyscraper|fortress|citadel|stronghold)\b/.test(text);
  const big = /\b(big|large|tall|grand|wide|long)\b/.test(text);
  const small = /\b(tiny|small|little|mini|cute|wee|baby)\b/.test(text);
  let width = huge ? 13 : big ? 9 : small ? 5 : 7;
  let depth = huge ? 11 : big ? 9 : small ? 5 : 7;
  let floors = huge ? 3 : big ? 2 : 1;
  if (/\bskyscraper\b/.test(text)) {
    width = 9;
    depth = 9;
    floors = 5;
  }
  const floorMatch = /\b(one|two|three|four|five|\d)\s*(floors?|stor(e)?ys?|stories|levels?)\b/.exec(text);
  if (floorMatch) floors = Math.max(1, Math.min(5, NUMBER_WORDS[floorMatch[1]] ?? floors));
  const sizeMatch = /\b(\d{1,2})\s*(x|by)\s*(\d{1,2})\b/.exec(text);
  if (sizeMatch) {
    width = Math.max(5, Math.min(25, Number(sizeMatch[1])));
    depth = Math.max(5, Math.min(25, Number(sizeMatch[3])));
  }

  // Material and colour.
  let wall = castle ? 'stone_bricks' : 'planks';
  let materialWord = castle ? 'stone' : 'wooden';
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
  if (!explicit && colors.length === 1) {
    wall = `color_${colors[0]}`;
    materialWord = colors[0];
  }
  const roof = colorful ? 'rainbow' : castle ? 'stone_bricks' : wall === 'planks' ? 'roof_tiles' : wall === 'brick' ? 'roof_tiles' : wall;

  const sizeWord = huge ? 'massive' : big ? 'big' : small ? 'little' : '';
  const noun = castle ? 'castle' : /\bmansion\b/.test(text) ? 'mansion' : /\bpalace\b/.test(text) ? 'palace' : /\bcottage\b/.test(text) ? 'cottage' : /\btower block|skyscraper\b/.test(text) ? 'skyscraper' : 'house';
  const label = [sizeWord, colorful ? 'colourful' : '', materialWord, noun].filter(Boolean).join(' ');
  return { kind: castle ? 'castle' : 'house', width, depth, floors, wall, roof, colorful, label };
}
