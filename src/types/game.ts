export type BlockTypeId =
  | 'grass'
  | 'dirt'
  | 'stone'
  | 'wood'
  | 'leaves'
  | 'water'
  | 'cloud'
  | 'rainbow'
  | 'star'
  | 'light'
  | 'brick'
  | 'glass'
  | 'magic-box';

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
