/**
 * A five-by-five block font, so a sign can say anything a kid types: their
 * name, their city, "HI MUM". Each glyph is five rows of five characters,
 * top row first; '#' is a block and anything else is a gap.
 */

const GLYPHS: Record<string, string[]> = {
  A: ['.###.', '#...#', '#####', '#...#', '#...#'],
  B: ['####.', '#...#', '####.', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '####.', '#....', '#####'],
  F: ['#####', '#....', '####.', '#....', '#....'],
  G: ['.####', '#....', '#..##', '#...#', '.###.'],
  H: ['#...#', '#...#', '#####', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '#####'],
  J: ['####.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '###..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '####.', '#....', '#....'],
  Q: ['.###.', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '####.', '#..#.', '#...#'],
  S: ['.####', '#....', '.###.', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  Y: ['#...#', '.#.#.', '..#..', '..#..', '..#..'],
  Z: ['#####', '...#.', '..#..', '.#...', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '..##.', '.#...', '#####'],
  '3': ['####.', '....#', '.###.', '....#', '####.'],
  '4': ['#..#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '####.'],
  '6': ['.###.', '#....', '####.', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..'],
  '8': ['.###.', '#...#', '.###.', '#...#', '.###.'],
  '9': ['.###.', '#...#', '.####', '....#', '.###.'],
  '!': ['..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '..##.', '.....', '..#..'],
  "'": ['..#..', '..#..', '.....', '.....', '.....'],
  '-': ['.....', '.....', '#####', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '..#..'],
};

export const GLYPH_WIDTH = 5;
export const GLYPH_HEIGHT = 5;
/** Blank columns between letters. */
export const LETTER_GAP = 1;

/** Only what the font can draw; everything else becomes a space. */
export function cleanText(raw: string, max = 12): string {
  return [...raw.toUpperCase()]
    .map((c) => (c === ' ' || GLYPHS[c] ? c : ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/** How wide the word is in blocks. */
export function textWidth(text: string): number {
  const letters = [...cleanText(text)];
  if (letters.length === 0) return 0;
  return letters.length * (GLYPH_WIDTH + LETTER_GAP) - LETTER_GAP;
}

/**
 * Calls `put` for every block of the word, with (column, row) where column
 * grows to the right and row 0 is the top of the letters.
 */
export function drawText(text: string, put: (column: number, row: number) => void): void {
  let column = 0;
  for (const character of cleanText(text)) {
    const glyph = GLYPHS[character];
    if (glyph) {
      for (let row = 0; row < GLYPH_HEIGHT; row++) {
        for (let i = 0; i < GLYPH_WIDTH; i++) {
          if (glyph[row][i] === '#') put(column + i, row);
        }
      }
    }
    column += GLYPH_WIDTH + LETTER_GAP;
  }
}
