import type { Direction } from '../../world/coords';
import type { BlockStateByte } from '../BlockState';

/** Which texture a quad takes from the block's face textures. */
export type FaceSlot = 'top' | 'side' | 'bottom';

/** Axis-aligned box in block-local space, coordinates 0..1. */
export type AABB = {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
};

/**
 * A quad the mesher emits. Corners are block-local (0..1), listed
 * counter-clockwise seen from outside. `cull` names the neighbor
 * direction whose occluder hides this quad, or null for never-culled
 * interior faces.
 */
export type ShapeQuad = {
  corners: [number, number, number][];
  normal: Direction;
  slot: FaceSlot;
  cull: Direction | null;
  /** UV rectangle within the tile, 0..1. Lets slabs show half a texture. */
  uv: [number, number, number, number];
  /** Render both sides (leaves, panes, crosses). */
  doubleSided?: boolean;
};

export type ShapeDefinition = {
  id: string;
  quads(state: BlockStateByte): ShapeQuad[];
  boxes(state: BlockStateByte): AABB[];
  /** Does this shape fully cover the given face of its cell? */
  occludes(face: Direction, state: BlockStateByte): boolean;
};
