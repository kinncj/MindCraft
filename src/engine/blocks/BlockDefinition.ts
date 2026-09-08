import type { Direction, Vec3i } from '../world/coords';
import type { BlockStateByte } from './BlockState';

/**
 * Everything the engine needs to know about a block lives here. Engine
 * code reads these fields; it never compares block ids to strings.
 */

export type BlockShapeId =
  | 'cube'
  | 'ladder'
  | 'slab'
  | 'stairs'
  | 'cross'
  | 'pane'
  | 'fence'
  | 'door'
  | 'carpet'
  | 'torch'
  | 'flat'
  | 'fluid';

export type BlockCategory =
  | 'friends'
  | 'ground'
  | 'building'
  | 'nature'
  | 'decoration'
  | 'light'
  | 'furniture'
  | 'special';

/** 'plants' is alpha too, drawn separately so weak GPUs can drop it in the distance. */
export type RenderBucket = 'opaque' | 'water' | 'alpha' | 'plants' | 'glow';

export type Collision = 'solid' | 'none' | 'fluid';

export type FaceTextures = {
  top: string;
  side: string;
  bottom: string;
};

/** What a behavior can see and do when a block is interacted with. */
export type BlockAccess = {
  getBlock(x: number, y: number, z: number): number;
  getState(x: number, y: number, z: number): BlockStateByte;
  setBlock(x: number, y: number, z: number, id: number, state?: BlockStateByte): void;
};

export type InteractContext = {
  world: BlockAccess;
  position: Vec3i;
  blockId: number;
  state: BlockStateByte;
  /** Which face of the block was tapped. */
  face: Direction;
  /** Ask the UI layer to open something (a container, a dialog). */
  openPanel(kind: string, payload: unknown): void;
  /** Ask the engine to do something physical (sit, sizzle, spawn). */
  perform(action: string, payload?: unknown): void;
};

export type PlaceContext = {
  world: BlockAccess;
  position: Vec3i;
  /** Player yaw in quarter turns (0..3), for facing the player. */
  playerRotation: number;
  /** Camera pitch in radians, positive looking down; pistons face up or down when placed steeply. */
  playerPitch?: number;
  /** Which face of the neighbor was clicked to place here. */
  face: Direction;
  /** Height within the clicked face (0..1), for top/bottom slab choice. */
  hitHeight: number;
  /** Queue another block into the same undoable edit (a door's top half). */
  place(x: number, y: number, z: number, id: number, state?: BlockStateByte): void;
};

export type PowerContext = {
  world: BlockAccess;
  position: Vec3i;
  blockId: number;
  state: BlockStateByte;
  powered: boolean;
};

export type BlockBehavior = {
  /** Return true when the interaction was handled (no block placement). */
  onInteract?(ctx: InteractContext): boolean;
  /** Logic layer: called when the power reaching this block changes. */
  onPowerChanged?(ctx: PowerContext): void;
  /** Logic layer: called every logic tick while the block is scheduled. */
  tick?(ctx: PowerContext): void;
  /** Decide the state to place with; return undefined for the default. */
  onPlace?(ctx: PlaceContext): BlockStateByte | undefined;
  /** Called after the block was removed, e.g. to clean up a paired block. */
  onRemove?(ctx: { world: BlockAccess; position: Vec3i; state: BlockStateByte }): void;
};

/** Which smooth surface a natural block joins in Cinema mode. */
export type SmoothKind = 'terrain' | 'foliage' | 'water' | 'wood';

export type BlockDefinition = {
  /** Human-stable string id used in files and code. */
  id: string;
  /** Storage id. Never reuse or renumber; the palette in saved files maps it. */
  numericId: number;
  label: string;
  category: BlockCategory;
  emoji: string;
  color: string;
  accentColor: string;
  shape: BlockShapeId;
  collision: Collision;
  /** Does light pass through? Drives sky-light and block-light flood fill. */
  transparent: boolean;
  /** Can you see through its texture (glass, water)? Drives face culling. */
  seeThrough: boolean;
  opacity: number;
  /** 0..15 emitted light. */
  lightLevel: number;
  bucket: RenderBucket;
  textures: FaceTextures;
  /** Alternate textures by state variant (a TV that is on). */
  variants?: Record<number, FaceTextures>;
  /** Placing this "block" spawns a creature, vehicle, or robot instead. */
  spawns?: { kind: 'vehicle' | 'pet' | 'villager' | 'robot'; variant: string };
  /** Part of the logic layer: emits, carries, or reacts to power. */
  logic?: { role: 'source' | 'wire' | 'consumer' | 'repeater'; kind?: 'lever' | 'button' | 'plate' | 'wire' | 'lamp' | 'piston' | 'sticky_piston' | 'note' | 'door' | 'head' | 'repeater' };
  /** Pistons cannot move it. */
  immovable: boolean;
  /** Shown in the block palette? */
  inPalette: boolean;
  /** Rotate to face the player on placement. */
  facesPlayer: boolean;
  /** Placing into this block replaces it (tall grass, flowers). */
  replaceable: boolean;
  /** The player can climb while inside this block (ladders, vines). */
  climbable: boolean;
  /** Natural stuff Cinema mode draws as a smooth, rounded surface instead of cubes. */
  smooth?: SmoothKind;
  behavior?: BlockBehavior;
};

export const AIR_ID = 0;

export type BlockDefinitionInput = Partial<BlockDefinition> &
  Pick<BlockDefinition, 'id' | 'numericId' | 'label' | 'color'>;

const DEFAULTS: Omit<BlockDefinition, 'id' | 'numericId' | 'label' | 'color' | 'textures'> = {
  category: 'building',
  emoji: '🧱',
  accentColor: '#ffffff',
  shape: 'cube',
  collision: 'solid',
  transparent: false,
  seeThrough: false,
  opacity: 1,
  lightLevel: 0,
  bucket: 'opaque',
  inPalette: true,
  facesPlayer: false,
  replaceable: false,
  climbable: false,
  immovable: false,
};

/** Fills in defaults so definitions stay short. Textures default to the id. */
export function defineBlock(input: BlockDefinitionInput): BlockDefinition {
  const textures: FaceTextures = input.textures ?? { top: input.id, side: input.id, bottom: input.id };
  const def: BlockDefinition = {
    ...DEFAULTS,
    accentColor: input.accentColor ?? input.color,
    ...input,
    textures,
  };
  if (def.lightLevel > 0 && input.bucket === undefined) def.bucket = 'glow';
  if (def.shape !== 'cube' && input.transparent === undefined) def.transparent = true;
  if (input.seeThrough === undefined && (def.bucket === 'alpha' || def.bucket === 'plants' || def.bucket === 'water') && (def.shape === 'cube' || def.shape === 'fluid')) {
    def.seeThrough = true;
  }
  return def;
}
