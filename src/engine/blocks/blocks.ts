import { BlockState } from './BlockState';
import {
  defineBlock,
  type BlockBehavior,
  type BlockDefinition,
  type BlockDefinitionInput,
  type PlaceContext,
} from './BlockDefinition';
import { BlockRegistry } from './registry';
import { DIR_NY, DIR_PY } from '../world/coords';
import { KID_COLORS } from './textures/painters';

/**
 * The MindCraft block catalog. Numeric ids are permanent: never renumber,
 * never reuse. Add new blocks at the end of their range.
 */

export const blocks = new BlockRegistry();

// --- Shared behaviors -----------------------------------------------------

/** Slabs: bottom when placed on top of something, top when placed under. */
function halfFromPlacement(ctx: PlaceContext): boolean {
  if (ctx.face === DIR_PY) return false;
  if (ctx.face === DIR_NY) return true;
  return ctx.hitHeight > 0.5;
}

const slabBehavior: BlockBehavior = {
  onPlace: (ctx) => BlockState.withTopHalf(0, halfFromPlacement(ctx)),
};

const stairsBehavior: BlockBehavior = {
  onPlace: (ctx) =>
    BlockState.withTopHalf(BlockState.withRotation(0, ctx.playerRotation), halfFromPlacement(ctx)),
};

const facingBehavior: BlockBehavior = {
  onPlace: (ctx) => BlockState.withRotation(0, ctx.playerRotation),
};

const doorBehavior: BlockBehavior = {
  onPlace: (ctx) => {
    const state = BlockState.withRotation(0, ctx.playerRotation);
    const { x, y, z } = ctx.position;
    // The top half goes in the cell above (only if it is free).
    if (ctx.world.getBlock(x, y + 1, z) === 0) {
      ctx.place(x, y + 1, z, B.door, BlockState.withTopHalf(state, true));
    }
    return state;
  },
  onInteract: (ctx) => {
    const { x, y, z } = ctx.position;
    const open = !BlockState.isOpen(ctx.state);
    const otherY = BlockState.isTopHalf(ctx.state) ? y - 1 : y + 1;
    ctx.world.setBlock(x, y, z, ctx.blockId, BlockState.withOpen(ctx.state, open));
    if (ctx.world.getBlock(x, otherY, z) === ctx.blockId) {
      ctx.world.setBlock(x, otherY, z, ctx.blockId, BlockState.withOpen(ctx.world.getState(x, otherY, z), open));
    }
    return true;
  },
  onRemove: (ctx) => {
    const { x, y, z } = ctx.position;
    const otherY = BlockState.isTopHalf(ctx.state) ? y - 1 : y + 1;
    if (ctx.world.getBlock(x, otherY, z) === B.door) ctx.world.setBlock(x, otherY, z, 0, 0);
  },
};

const containerBehavior: BlockBehavior = {
  onInteract: (ctx) => {
    ctx.openPanel('container', { position: ctx.position });
    return true;
  },
};

const bedBehavior: BlockBehavior = {
  onPlace: (ctx) => BlockState.withRotation(0, ctx.playerRotation),
  onInteract: (ctx) => {
    ctx.openPanel('sleep', { position: ctx.position });
    return true;
  },
};

// --- Definitions ----------------------------------------------------------

const DEFINITIONS: BlockDefinitionInput[] = [
  // Ground 1..19
  { id: 'grass', numericId: 1, label: 'Grass', category: 'ground', emoji: '🌱', color: '#67c23a', accentColor: '#8ed75f', textures: { top: 'grass_top', side: 'grass_side', bottom: 'dirt' } },
  { id: 'dirt', numericId: 2, label: 'Dirt', category: 'ground', emoji: '🟫', color: '#a0703c', accentColor: '#b8854e' },
  { id: 'stone', numericId: 3, label: 'Stone', category: 'ground', emoji: '🪨', color: '#9aa2ab', accentColor: '#b4bcc4' },
  { id: 'cobblestone', numericId: 4, label: 'Cobble', category: 'building', emoji: '🪨', color: '#848b93', accentColor: '#a0a7af' },
  { id: 'sand', numericId: 5, label: 'Sand', category: 'ground', emoji: '🏖️', color: '#ecd9a3', accentColor: '#f5e6b8' },
  { id: 'gravel', numericId: 6, label: 'Gravel', category: 'ground', emoji: '⚪', color: '#a8a39c' },
  { id: 'snow', numericId: 7, label: 'Snow', category: 'ground', emoji: '❄️', color: '#f4f7fb', accentColor: '#ffffff', textures: { top: 'snow', side: 'snow_side', bottom: 'dirt' } },
  { id: 'ice', numericId: 8, label: 'Ice', category: 'ground', emoji: '🧊', color: '#bfe0f5', accentColor: '#e0f2fd', transparent: true, opacity: 0.85, bucket: 'alpha' },
  { id: 'clay', numericId: 9, label: 'Clay', category: 'ground', emoji: '🩶', color: '#a9a5b8' },
  { id: 'moss', numericId: 10, label: 'Moss', category: 'ground', emoji: '🟩', color: '#4f8f3a' },
  { id: 'deep_stone', numericId: 11, label: 'Deep Stone', category: 'ground', emoji: '⬛', color: '#6f7680', inPalette: false },
  { id: 'sandstone', numericId: 12, label: 'Sandstone', category: 'building', emoji: '🟨', color: '#e2cf96', textures: { top: 'sandstone_top', side: 'sandstone', bottom: 'sandstone_top' } },
  { id: 'hay', numericId: 13, label: 'Hay', category: 'nature', emoji: '🌾', color: '#d9b53c', textures: { top: 'hay_top', side: 'hay', bottom: 'hay_top' } },

  // Building 20..39
  { id: 'planks', numericId: 20, label: 'Planks', category: 'building', emoji: '🪚', color: '#d3a35e', accentColor: '#e0b26d' },
  { id: 'birch_planks', numericId: 21, label: 'Pale Planks', category: 'building', emoji: '🪵', color: '#e8d9b0' },
  { id: 'wood', numericId: 22, label: 'Wood', category: 'building', emoji: '🪵', color: '#c98d4b', accentColor: '#dba362', textures: { top: 'wood_top', side: 'wood_side', bottom: 'wood_top' } },
  { id: 'birch_wood', numericId: 23, label: 'Pale Wood', category: 'building', emoji: '🪵', color: '#ecebe4', textures: { top: 'birch_top', side: 'birch_side', bottom: 'birch_top' } },
  { id: 'brick', numericId: 24, label: 'Brick', category: 'building', emoji: '🧱', color: '#d0614e', accentColor: '#e4826f' },
  { id: 'stone_bricks', numericId: 25, label: 'Stone Bricks', category: 'building', emoji: '🧱', color: '#8e969f' },
  { id: 'glass', numericId: 26, label: 'Glass', category: 'building', emoji: '🔷', color: '#bfe6f5', accentColor: '#e2f5fc', transparent: true, opacity: 0.45, bucket: 'alpha' },
  { id: 'glass_pane', numericId: 27, label: 'Window', category: 'building', emoji: '🪟', color: '#bfe6f5', shape: 'pane', bucket: 'alpha', seeThrough: true, facesPlayer: true, textures: { top: 'glass', side: 'glass', bottom: 'glass' }, behavior: facingBehavior },
  { id: 'fence', numericId: 28, label: 'Fence', category: 'building', emoji: '🪵', color: '#d3a35e', shape: 'fence', textures: { top: 'planks', side: 'planks', bottom: 'planks' } },
  { id: 'door', numericId: 29, label: 'Door', category: 'building', emoji: '🚪', color: '#c98d4b', shape: 'door', facesPlayer: true, textures: { top: 'planks', side: 'planks', bottom: 'planks' }, behavior: doorBehavior },
  { id: 'planks_stairs', numericId: 30, label: 'Wood Stairs', category: 'building', emoji: '🪜', color: '#d3a35e', shape: 'stairs', facesPlayer: true, textures: { top: 'planks', side: 'planks', bottom: 'planks' }, behavior: stairsBehavior },
  { id: 'planks_slab', numericId: 31, label: 'Wood Slab', category: 'building', emoji: '▬', color: '#d3a35e', shape: 'slab', textures: { top: 'planks', side: 'planks', bottom: 'planks' }, behavior: slabBehavior },
  { id: 'stone_stairs', numericId: 32, label: 'Stone Stairs', category: 'building', emoji: '🪜', color: '#8e969f', shape: 'stairs', facesPlayer: true, textures: { top: 'stone_bricks', side: 'stone_bricks', bottom: 'stone_bricks' }, behavior: stairsBehavior },
  { id: 'stone_slab', numericId: 33, label: 'Stone Slab', category: 'building', emoji: '▬', color: '#8e969f', shape: 'slab', textures: { top: 'stone_bricks', side: 'stone_bricks', bottom: 'stone_bricks' }, behavior: slabBehavior },
  { id: 'roof_tiles', numericId: 34, label: 'Roof', category: 'building', emoji: '🏠', color: '#c85a47' },
  { id: 'ladder', numericId: 36, label: 'Ladder', category: 'building', emoji: '🪜', color: '#c98d4b', shape: 'ladder', collision: 'none', climbable: true, facesPlayer: true, bucket: 'alpha', textures: { top: 'ladder', side: 'ladder', bottom: 'ladder' }, behavior: facingBehavior },
  { id: 'cobble_wall', numericId: 37, label: 'Stone Wall', category: 'building', emoji: '🧱', color: '#848b93', shape: 'fence', textures: { top: 'cobblestone', side: 'cobblestone', bottom: 'cobblestone' } },
  { id: 'roof_stairs', numericId: 35, label: 'Roof Stairs', category: 'building', emoji: '🏠', color: '#c85a47', shape: 'stairs', facesPlayer: true, textures: { top: 'roof_tiles', side: 'roof_tiles', bottom: 'roof_tiles' }, behavior: stairsBehavior },

  // Nature 60..79
  { id: 'leaves', numericId: 60, label: 'Leaves', category: 'nature', emoji: '🍃', color: '#3faf5c', accentColor: '#5cc878' },
  { id: 'birch_leaves', numericId: 61, label: 'Bright Leaves', category: 'nature', emoji: '🍃', color: '#7fcf5c' },
  { id: 'pink_leaves', numericId: 62, label: 'Blossoms', category: 'nature', emoji: '🌸', color: '#f4a6c8' },
  { id: 'flower_pink', replaceable: true, numericId: 63, label: 'Pink Flower', category: 'nature', emoji: '🌸', color: '#f291bb', shape: 'cross', collision: 'none', bucket: 'alpha' },
  { id: 'flower_yellow', replaceable: true, numericId: 64, label: 'Yellow Flower', category: 'nature', emoji: '🌼', color: '#ffd94a', shape: 'cross', collision: 'none', bucket: 'alpha' },
  { id: 'flower_blue', replaceable: true, numericId: 65, label: 'Blue Flower', category: 'nature', emoji: '💠', color: '#6aa8f0', shape: 'cross', collision: 'none', bucket: 'alpha' },
  { id: 'flower_red', replaceable: true, numericId: 66, label: 'Red Flower', category: 'nature', emoji: '🌹', color: '#e8574f', shape: 'cross', collision: 'none', bucket: 'alpha' },
  { id: 'tall_grass', replaceable: true, numericId: 67, label: 'Tall Grass', category: 'nature', emoji: '🌾', color: '#67c23a', shape: 'cross', collision: 'none', bucket: 'alpha' },
  { id: 'mushroom', replaceable: true, numericId: 68, label: 'Mushroom', category: 'nature', emoji: '🍄', color: '#e8574f', shape: 'cross', collision: 'none', bucket: 'alpha' },
  { id: 'cactus', numericId: 69, label: 'Cactus', category: 'nature', emoji: '🌵', color: '#4f9c3a', textures: { top: 'cactus_top', side: 'cactus_side', bottom: 'cactus_top' } },
  { id: 'pumpkin', numericId: 70, label: 'Pumpkin', category: 'nature', emoji: '🎃', color: '#f2903c', facesPlayer: true, textures: { top: 'pumpkin_top', side: 'pumpkin_side', bottom: 'pumpkin_side' }, behavior: facingBehavior },
  { id: 'water', numericId: 71, label: 'Water', category: 'nature', emoji: '💧', color: '#4fa8e8', accentColor: '#7cc2f2', transparent: true, opacity: 0.75, bucket: 'water', collision: 'fluid' },
  { id: 'cloud', numericId: 72, label: 'Cloud', category: 'nature', emoji: '☁️', color: '#f4f8fc', accentColor: '#ffffff', transparent: true, opacity: 0.9, bucket: 'alpha', collision: 'none' },
  { id: 'rainbow', numericId: 73, label: 'Rainbow', category: 'decoration', emoji: '🌈', color: '#e85fa8', accentColor: '#ffd166' },
  { id: 'star', numericId: 74, label: 'Star', category: 'light', emoji: '⭐', color: '#ffd94a', accentColor: '#fff3b0', lightLevel: 9 },

  // Light 80..89
  { id: 'light', numericId: 80, label: 'Light', category: 'light', emoji: '💡', color: '#fff2a8', accentColor: '#fffbe0', lightLevel: 14 },
  { id: 'torch', numericId: 81, label: 'Torch', category: 'light', emoji: '🕯️', color: '#ffb03c', accentColor: '#8a6238', shape: 'torch', collision: 'none', lightLevel: 13, textures: { top: 'torch_top', side: 'torch_side', bottom: 'torch_top' } },
  { id: 'lantern', numericId: 82, label: 'Lantern', category: 'light', emoji: '🏮', color: '#ffd94a', lightLevel: 13, shape: 'torch', collision: 'none', textures: { top: 'lantern', side: 'lantern', bottom: 'lantern' } },
  { id: 'campfire', numericId: 83, label: 'Campfire', category: 'light', emoji: '🏕️', color: '#e07b39', accentColor: '#6b4a26', lightLevel: 12, textures: { top: 'campfire_top', side: 'campfire_side', bottom: 'dirt' } },
  { id: 'glow_crystal', numericId: 84, label: 'Glow Crystal', category: 'light', emoji: '💎', color: '#b8f0ff', lightLevel: 11 },

  // Furniture 90..99
  { id: 'bed', numericId: 90, label: 'Bed', category: 'furniture', emoji: '🛏️', color: '#e8574f', shape: 'slab', facesPlayer: true, textures: { top: 'bed_top', side: 'bed_side', bottom: 'planks' }, behavior: bedBehavior },
  { id: 'table', numericId: 91, label: 'Table', category: 'furniture', emoji: '🪑', color: '#d3a35e', shape: 'slab', textures: { top: 'planks', side: 'table', bottom: 'planks' }, behavior: { onPlace: () => BlockState.withTopHalf(0, true) } },
  { id: 'chair', numericId: 92, label: 'Chair', category: 'furniture', emoji: '🪑', color: '#4a7fd6', shape: 'stairs', facesPlayer: true, textures: { top: 'chair', side: 'chair', bottom: 'planks' }, behavior: facingBehavior },
  { id: 'bookshelf', numericId: 93, label: 'Bookshelf', category: 'furniture', emoji: '📚', color: '#8a6238', textures: { top: 'planks', side: 'bookshelf', bottom: 'planks' } },
  { id: 'tv', numericId: 94, label: 'TV', category: 'furniture', emoji: '📺', color: '#2b2b2b', facesPlayer: true, textures: { top: 'tv', side: 'tv', bottom: 'tv' }, behavior: facingBehavior },
  { id: 'painting', numericId: 95, label: 'Painting', category: 'furniture', emoji: '🖼️', color: '#c98d4b', facesPlayer: true, textures: { top: 'planks', side: 'painting', bottom: 'planks' }, behavior: facingBehavior },
  { id: 'cake', numericId: 96, label: 'Cake', category: 'furniture', emoji: '🎂', color: '#f8e5c8', shape: 'slab', textures: { top: 'cake', side: 'cake', bottom: 'cake' } },
  { id: 'flower_pot', numericId: 97, label: 'Flower Pot', category: 'furniture', emoji: '🪴', color: '#c96f25', shape: 'cross', collision: 'none', bucket: 'alpha', textures: { top: 'flower_pot', side: 'flower_pot', bottom: 'flower_pot' } },

  // Special 100..109
  { id: 'magic_box', numericId: 100, label: 'Magic Delivery Box', category: 'special', emoji: '📦', color: '#c99a63', accentColor: '#8a6238', textures: { top: 'box_top', side: 'box_side', bottom: 'box_bottom' }, behavior: containerBehavior },
];

// Color blocks 40..49 and carpets 50..59, one per kid color.
const COLOR_NAMES = Object.keys(KID_COLORS);
COLOR_NAMES.forEach((name, i) => {
  const hex = KID_COLORS[name];
  const label = name[0].toUpperCase() + name.slice(1);
  DEFINITIONS.push({
    id: `color_${name}`,
    numericId: 40 + i,
    label: `${label} Block`,
    category: 'building',
    emoji: '🟥',
    color: hex,
    textures: { top: `color_${name}`, side: `color_${name}`, bottom: `color_${name}` },
  });
  DEFINITIONS.push({
    id: `carpet_${name}`,
    numericId: 50 + i,
    label: `${label} Carpet`,
    category: 'furniture',
    emoji: '🟥',
    color: hex,
    shape: 'carpet',
    collision: 'none',
    textures: { top: `color_${name}`, side: `color_${name}`, bottom: `color_${name}` },
  });
});

for (const input of DEFINITIONS) blocks.register(defineBlock(input));

/** Numeric ids by string id, for engine code that needs a few well-known blocks. */
export const B = Object.fromEntries(blocks.all().map((d) => [d.id, d.numericId])) as Record<string, number>;

/** v1 block ids that were renamed. Import and migration consult this. */
export const LEGACY_BLOCK_IDS: Record<string, string> = {
  'magic-box': 'magic_box',
  flower: 'flower_pink',
};

export function resolveBlockId(id: string): BlockDefinition | undefined {
  return blocks.byId(id) ?? blocks.byId(LEGACY_BLOCK_IDS[id] ?? '');
}
