export type BlockTypeId =
  | 'grass'
  | 'dirt'
  | 'stone'
  | 'cobblestone'
  | 'sand'
  | 'snow'
  | 'ice'
  | 'wood'
  | 'planks'
  | 'leaves'
  | 'flower'
  | 'water'
  | 'cloud'
  | 'rainbow'
  | 'star'
  | 'light'
  | 'torch'
  | 'campfire'
  | 'brick'
  | 'glass'
  | 'magic-box';

export type TimeMode = 'cycle' | 'day' | 'night';
export type WeatherMode = 'sunny' | 'rain' | 'snow';
export type VisualModeId = 'classic' | 'ultraRealistic' | 'claudeDream';

export type BlockPosition = {
  x: number;
  y: number;
  z: number;
};

export type PlacedBlock = {
  id: string;
  type: BlockTypeId;
  position: BlockPosition;
};

export type BoxItem = {
  blockType: BlockTypeId;
  quantity: number;
};

export type MagicDeliveryBox = {
  id: string;
  name: string;
  position: BlockPosition;
  items: BoxItem[];
};

export type WorldSize = {
  width: number;
  depth: number;
  height: number;
};

export type InteractionMode = 'place' | 'remove';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
