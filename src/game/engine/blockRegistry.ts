import type { BlockTypeId } from '../../types/game';

export type BlockDefinition = {
  id: BlockTypeId;
  label: string;
  color: string;
  // A second color used for a simple two-tone pattern (top face / accent).
  accentColor: string;
  emoji: string;
  transparent: boolean;
  opacity: number;
  // Blocks the player can pick from the hotbar. The magic box is special:
  // it is placeable but also opens a storage panel when tapped.
  inHotbar: boolean;
};

export const BLOCK_DEFINITIONS: Record<BlockTypeId, BlockDefinition> = {
  grass: {
    id: 'grass',
    label: 'Grass',
    color: '#67c23a',
    accentColor: '#8ed75f',
    emoji: '🌱',
    transparent: false,
    opacity: 1,
    inHotbar: true,
  },
  dirt: {
    id: 'dirt',
    label: 'Dirt',
    color: '#a0703c',
    accentColor: '#b8854e',
    emoji: '🟫',
    transparent: false,
    opacity: 1,
    inHotbar: true,
  },
  stone: {
    id: 'stone',
    label: 'Stone',
    color: '#9aa2ab',
    accentColor: '#b4bcc4',
    emoji: '🪨',
    transparent: false,
    opacity: 1,
    inHotbar: true,
  },
  wood: {
    id: 'wood',
    label: 'Wood',
    color: '#c98d4b',
    accentColor: '#dba362',
    emoji: '🪵',
    transparent: false,
    opacity: 1,
    inHotbar: true,
  },
  leaves: {
    id: 'leaves',
    label: 'Leaves',
    color: '#3faf5c',
    accentColor: '#5cc878',
    emoji: '🍃',
    transparent: false,
    opacity: 1,
    inHotbar: true,
  },
  water: {
    id: 'water',
    label: 'Water',
    color: '#4fa8e8',
    accentColor: '#7cc2f2',
    emoji: '💧',
    transparent: true,
    opacity: 0.75,
    inHotbar: true,
  },
  cloud: {
    id: 'cloud',
    label: 'Cloud',
    color: '#f4f8fc',
    accentColor: '#ffffff',
    emoji: '☁️',
    transparent: true,
    opacity: 0.9,
    inHotbar: true,
  },
  rainbow: {
    id: 'rainbow',
    label: 'Rainbow',
    color: '#e85fa8',
    accentColor: '#ffd166',
    emoji: '🌈',
    transparent: false,
    opacity: 1,
    inHotbar: true,
  },
  star: {
    id: 'star',
    label: 'Star',
    color: '#ffd94a',
    accentColor: '#fff3b0',
    emoji: '⭐',
    transparent: false,
    opacity: 1,
    inHotbar: true,
  },
  light: {
    id: 'light',
    label: 'Light',
    color: '#fff2a8',
    accentColor: '#fffbe0',
    emoji: '💡',
    transparent: false,
    opacity: 1,
    inHotbar: true,
  },
  brick: {
    id: 'brick',
    label: 'Brick',
    color: '#d0614e',
    accentColor: '#e4826f',
    emoji: '🧱',
    transparent: false,
    opacity: 1,
    inHotbar: true,
  },
  glass: {
    id: 'glass',
    label: 'Glass',
    color: '#bfe6f5',
    accentColor: '#e2f5fc',
    emoji: '🔷',
    transparent: true,
    opacity: 0.45,
    inHotbar: true,
  },
  'magic-box': {
    id: 'magic-box',
    label: 'Magic Delivery Box',
    color: '#c99a63',
    accentColor: '#8a6238',
    emoji: '📦',
    transparent: false,
    opacity: 1,
    inHotbar: true,
  },
};

export const ALL_BLOCK_TYPES = Object.keys(BLOCK_DEFINITIONS) as BlockTypeId[];

export const HOTBAR_BLOCK_TYPES: BlockTypeId[] = ALL_BLOCK_TYPES.filter(
  (id) => BLOCK_DEFINITIONS[id].inHotbar,
);

export function isKnownBlockType(value: unknown): value is BlockTypeId {
  return typeof value === 'string' && value in BLOCK_DEFINITIONS;
}

export function getBlockDefinition(id: BlockTypeId): BlockDefinition {
  return BLOCK_DEFINITIONS[id];
}
