import { B, blocks } from '../blocks/blocks';

/**
 * The picture recipe book. Crafting is playful in a creative game: it
 * teaches "this is made of that" and rewards the kid with sparkles and
 * the result in the hotbar. Grids are 3×3, read left-to-right, top-down.
 */
export type Recipe = {
  id: string;
  label: string;
  emoji: string;
  /** Block id of the result. */
  result: string;
  count: number;
  /** Nine cells of block ids or null; shape matters unless `shapeless`. */
  grid: Array<string | null>;
  shapeless?: boolean;
  hint: string;
};

const _ = null;

export const RECIPES: Recipe[] = [
  { id: 'planks', label: 'Planks', emoji: '🪚', result: 'planks', count: 4, grid: ['wood', _, _, _, _, _, _, _, _], shapeless: true, hint: 'One log makes four planks.' },
  { id: 'birch_planks', label: 'Pale Planks', emoji: '🪵', result: 'birch_planks', count: 4, grid: ['birch_wood', _, _, _, _, _, _, _, _], shapeless: true, hint: 'Pale wood makes pale planks.' },
  { id: 'stairs', label: 'Wood Stairs', emoji: '🪜', result: 'planks_stairs', count: 4, grid: ['planks', _, _, 'planks', 'planks', _, 'planks', 'planks', 'planks'], hint: 'Planks in a staircase shape.' },
  { id: 'slab', label: 'Wood Slab', emoji: '▬', result: 'planks_slab', count: 6, grid: [_, _, _, _, _, _, 'planks', 'planks', 'planks'], hint: 'Three planks in a row.' },
  { id: 'door', label: 'Door', emoji: '🚪', result: 'door', count: 1, grid: ['planks', 'planks', _, 'planks', 'planks', _, 'planks', 'planks', _], hint: 'Two columns of planks.' },
  { id: 'fence', label: 'Fence', emoji: '🪵', result: 'fence', count: 3, grid: [_, _, _, 'planks', 'planks', 'planks', 'planks', 'planks', 'planks'], hint: 'Two rows of planks.' },
  { id: 'ladder', label: 'Ladder', emoji: '🪜', result: 'ladder', count: 3, grid: ['planks', _, 'planks', 'planks', 'planks', 'planks', 'planks', _, 'planks'], hint: 'Rungs between two rails.' },
  { id: 'table', label: 'Table', emoji: '🪑', result: 'table', count: 1, grid: ['planks', 'planks', 'planks', 'fence', _, 'fence', _, _, _], hint: 'A plank top on fence legs.' },
  { id: 'chair', label: 'Chair', emoji: '🪑', result: 'chair', count: 1, grid: ['planks', _, _, 'planks', 'planks', _, 'fence', 'fence', _], hint: 'A back, a seat, and legs.' },
  { id: 'bed', label: 'Bed', emoji: '🛏️', result: 'bed', count: 1, grid: [_, _, _, 'color_red', 'color_red', 'color_red', 'planks', 'planks', 'planks'], hint: 'A red blanket on planks.' },
  { id: 'bookshelf', label: 'Bookshelf', emoji: '📚', result: 'bookshelf', count: 1, grid: ['planks', 'planks', 'planks', 'color_blue', 'color_red', 'color_green', 'planks', 'planks', 'planks'], hint: 'Colorful books between planks.' },
  { id: 'glass', label: 'Glass', emoji: '🔷', result: 'glass', count: 1, grid: ['sand', 'sand', _, 'sand', 'sand', _, _, _, _], hint: 'Sand melts into glass.' },
  { id: 'glass_pane', label: 'Window', emoji: '🪟', result: 'glass_pane', count: 6, grid: [_, _, _, 'glass', 'glass', 'glass', 'glass', 'glass', 'glass'], hint: 'Two rows of glass.' },
  { id: 'stone_bricks', label: 'Stone Bricks', emoji: '🧱', result: 'stone_bricks', count: 4, grid: ['stone', 'stone', _, 'stone', 'stone', _, _, _, _], hint: 'Four stones squared up.' },
  { id: 'brick', label: 'Brick', emoji: '🧱', result: 'brick', count: 1, grid: ['clay', 'clay', _, 'clay', 'clay', _, _, _, _], hint: 'Four clay lumps baked.' },
  { id: 'sandstone', label: 'Sandstone', emoji: '🟨', result: 'sandstone', count: 1, grid: ['sand', 'sand', _, 'sand', 'sand', _, _, _, _], hint: 'Four sands pressed together.' },
  { id: 'torch', label: 'Torch', emoji: '🕯️', result: 'torch', count: 4, grid: ['glow_crystal', _, _, 'wood', _, _, _, _, _], hint: 'A glow crystal on a stick.' },
  { id: 'lantern', label: 'Lantern', emoji: '🏮', result: 'lantern', count: 1, grid: ['fence', 'fence', 'fence', 'fence', 'torch', 'fence', 'fence', 'fence', 'fence'], hint: 'A torch in a little cage.' },
  { id: 'campfire', label: 'Campfire', emoji: '🏕️', result: 'campfire', count: 1, grid: [_, 'torch', _, 'wood', 'wood', 'wood', _, _, _], hint: 'Logs under a flame.' },
  { id: 'cake', label: 'Cake', emoji: '🎂', result: 'cake', count: 1, grid: ['color_white', 'color_white', 'color_white', 'flower_pink', 'hay', 'flower_pink', 'hay', 'hay', 'hay'], hint: 'Cream, flowers, and wheat.' },
  { id: 'tv', label: 'TV', emoji: '📺', result: 'tv', count: 1, grid: ['color_black', 'color_black', 'color_black', 'color_black', 'glass', 'color_black', 'color_black', 'color_black', 'color_black'], hint: 'A glass screen in a black box.' },
  { id: 'lamp', label: 'Lamp', emoji: '🛋️', result: 'lamp', count: 1, grid: ['color_white', 'color_white', 'color_white', _, 'torch', _, _, 'planks', _], hint: 'A shade over a light.' },
  { id: 'star', label: 'Star', emoji: '⭐', result: 'star', count: 1, grid: [_, 'color_yellow', _, 'color_yellow', 'glow_crystal', 'color_yellow', _, 'color_yellow', _], hint: 'Yellow around a glow crystal.' },
  { id: 'rainbow', label: 'Rainbow', emoji: '🌈', result: 'rainbow', count: 2, grid: ['color_red', 'color_yellow', 'color_blue', _, _, _, _, _, _], hint: 'Three colors in a row.' },
  { id: 'roof_tiles', label: 'Roof', emoji: '🏠', result: 'roof_tiles', count: 4, grid: ['brick', 'clay', _, 'clay', 'brick', _, _, _, _], hint: 'Brick and clay, checkered.' },
  { id: 'carpet', label: 'Carpet', emoji: '🟥', result: 'carpet_red', count: 3, grid: [_, _, _, _, _, _, 'color_red', 'color_red', _], hint: 'Two red blocks side by side.' },
  { id: 'crafting_table', label: 'Crafting Table', emoji: '🔨', result: 'crafting_table', count: 1, grid: ['planks', 'planks', _, 'planks', 'planks', _, _, _, _], hint: 'Four planks make a workbench.' },
  { id: 'wire', label: 'Wire', emoji: '🔴', result: 'wire', count: 8, grid: ['glow_crystal', _, _, _, _, _, _, _, _], shapeless: true, hint: 'A glow crystal crushed into wire.' },
  { id: 'lever', label: 'Lever', emoji: '🎚️', result: 'lever', count: 1, grid: ['wood', _, _, 'cobblestone', _, _, _, _, _], hint: 'A stick on a stone.' },
  { id: 'button', label: 'Button', emoji: '🔘', result: 'button', count: 1, grid: ['stone', _, _, _, _, _, _, _, _], shapeless: true, hint: 'A little stone button.' },
  { id: 'pressure_plate', label: 'Pressure Plate', emoji: '⬜', result: 'pressure_plate', count: 1, grid: ['stone', 'stone', _, _, _, _, _, _, _], hint: 'Two stones side by side.' },
  { id: 'logic_lamp', label: 'Logic Lamp', emoji: '💡', result: 'logic_lamp', count: 1, grid: [_, 'wire', _, 'wire', 'glow_crystal', 'wire', _, 'wire', _], hint: 'Wire around a glow crystal.' },
  { id: 'piston', label: 'Piston', emoji: '🔩', result: 'piston', count: 1, grid: ['planks', 'planks', 'planks', 'cobblestone', 'glow_crystal', 'cobblestone', 'cobblestone', 'wire', 'cobblestone'], hint: 'A wooden face, stone, and a spark.' },
  { id: 'sticky_piston', label: 'Sticky Piston', emoji: '🔩', result: 'sticky_piston', count: 1, grid: ['hay', _, _, 'piston', _, _, _, _, _], hint: 'A piston with a sticky top.' },
  { id: 'repeater', label: 'Repeater', emoji: '🔁', result: 'repeater', count: 1, grid: [_, _, _, 'glow_crystal', 'wire', 'glow_crystal', 'stone', 'stone', 'stone'], hint: 'Two little lights on a stone slab: it passes power on, full strength.' },
  { id: 'note_block', label: 'Note Block', emoji: '🎵', result: 'note_block', count: 1, grid: ['planks', 'planks', 'planks', 'planks', 'wire', 'planks', 'planks', 'planks', 'planks'], hint: 'Wire inside a wooden box.' },
  { id: 'robot', label: 'Robot', emoji: '🤖', result: 'robot', count: 1, grid: ['glow_crystal', 'stone_bricks', 'glow_crystal', 'stone_bricks', 'wire', 'stone_bricks', 'piston', 'stone_bricks', 'piston'], hint: 'Eyes, a heart of wire, piston legs.' },
];

export type Grid = Array<string | null>;

/** Trims empty rows/columns so a shape can sit anywhere in the grid. */
function normalize(grid: Grid): { cells: Grid; w: number; h: number } {
  let minR = 3, maxR = -1, minC = 3, maxC = -1;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (grid[r * 3 + c]) {
    minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  }
  if (maxR < 0) return { cells: [], w: 0, h: 0 };
  const cells: Grid = [];
  for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) cells.push(grid[r * 3 + c]);
  return { cells, w: maxC - minC + 1, h: maxR - minR + 1 };
}

function sameMultiset(a: Grid, b: Grid): boolean {
  const count = (g: Grid) => {
    const m = new Map<string, number>();
    for (const id of g) if (id) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  };
  const ma = count(a);
  const mb = count(b);
  if (ma.size !== mb.size) return false;
  for (const [k, v] of ma) if (mb.get(k) !== v) return false;
  return true;
}

/** The recipe a 3×3 grid makes, if any. */
export function matchRecipe(grid: Grid): Recipe | null {
  if (grid.every((c) => !c)) return null;
  const g = normalize(grid);
  for (const recipe of RECIPES) {
    if (recipe.shapeless) {
      if (sameMultiset(grid, recipe.grid)) return recipe;
      continue;
    }
    const r = normalize(recipe.grid);
    if (r.w === g.w && r.h === g.h && r.cells.every((c, i) => c === g.cells[i])) return recipe;
  }
  return null;
}

export function recipeById(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

/** Every block that appears in any recipe, for the ingredient strip. */
export function ingredientIds(): string[] {
  const set = new Set<string>();
  for (const r of RECIPES) for (const c of r.grid) if (c) set.add(c);
  return [...set].filter((id) => blocks.has(id));
}

/** Sanity: every recipe result and ingredient exists in the registry. */
export function validateRecipes(): string[] {
  const problems: string[] = [];
  for (const r of RECIPES) {
    if (!blocks.has(r.result)) problems.push(`${r.id}: result ${r.result}`);
    for (const c of r.grid) if (c && !blocks.has(c)) problems.push(`${r.id}: ingredient ${c}`);
    if (r.grid.length !== 9) problems.push(`${r.id}: grid must have 9 cells`);
  }
  return problems;
}

export { B as BLOCK_IDS };
