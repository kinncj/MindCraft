/** String block id from the registry (e.g. "grass", "planks_stairs"). */
export type BlockTypeId = string;

export type TimeMode = 'cycle' | 'day' | 'night';
export type WeatherMode = 'sunny' | 'rain' | 'snow';
export type VisualModeId = 'classic' | 'ultraRealistic' | 'claudeDream' | 'cinema';

export type BlockPosition = { x: number; y: number; z: number };

export type BoxItem = {
  blockType: BlockTypeId;
  quantity: number;
};

export type InteractionMode = 'place' | 'interact' | 'remove' | 'room' | 'fill' | 'paint' | 'copy' | 'paste';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';
