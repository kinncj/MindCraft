import { BlockState } from '../BlockState';
import {
  DIR_NX,
  DIR_NY,
  DIR_NZ,
  DIR_PX,
  DIR_PY,
  DIR_PZ,
  type Direction,
} from '../../world/coords';
import type { BlockShapeId } from '../BlockDefinition';
import type { AABB, FaceSlot, ShapeDefinition, ShapeQuad } from './types';

export type { AABB, FaceSlot, ShapeDefinition, ShapeQuad } from './types';

type V = [number, number, number];

/**
 * Emits the six faces of an axis-aligned box. Faces flush with the cell
 * boundary get a cull direction; inset faces never cull.
 */
export function boxQuads(box: AABB, slotFor: (dir: Direction) => FaceSlot = defaultSlot): ShapeQuad[] {
  const { minX: x0, minY: y0, minZ: z0, maxX: x1, maxY: y1, maxZ: z1 } = box;
  const face = (
    normal: Direction,
    corners: V[],
    flush: boolean,
    uv: [number, number, number, number],
  ): ShapeQuad => ({
    corners,
    normal,
    slot: slotFor(normal),
    cull: flush ? normal : null,
    uv,
  });
  return [
    // +x: seen from +x, CCW: (x1,y0,z1) (x1,y0,z0) (x1,y1,z0) (x1,y1,z1)
    face(DIR_PX, [[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]], x1 === 1, [1 - z1, y0, 1 - z0, y1]),
    face(DIR_NX, [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], x0 === 0, [z0, y0, z1, y1]),
    face(DIR_PY, [[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], y1 === 1, [x0, 1 - z1, x1, 1 - z0]),
    face(DIR_NY, [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], y0 === 0, [x0, z0, x1, z1]),
    face(DIR_PZ, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], z1 === 1, [x0, y0, x1, y1]),
    face(DIR_NZ, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], z0 === 0, [1 - x1, y0, 1 - x0, y1]),
  ];
}

function defaultSlot(dir: Direction): FaceSlot {
  if (dir === DIR_PY) return 'top';
  if (dir === DIR_NY) return 'bottom';
  return 'side';
}

const FULL: AABB = { minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 };

function box(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): AABB {
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

/** Rotate a box around the vertical axis by quarter turns. */
export function rotateBox(b: AABB, rotation: number): AABB {
  let out = b;
  for (let i = 0; i < (rotation & 3); i++) {
    // 90° clockwise seen from above: (x, z) → (1 - z, x)
    out = box(1 - out.maxZ, out.minY, out.minX, 1 - out.minZ, out.maxY, out.maxX);
  }
  return out;
}

function rotateDirection(dir: Direction, rotation: number): Direction {
  if (dir === DIR_PY || dir === DIR_NY) return dir;
  const ring: Direction[] = [DIR_NZ, DIR_PX, DIR_PZ, DIR_NX];
  const index = ring.indexOf(dir);
  return ring[(index + (rotation & 3)) % 4];
}

function rotateQuads(quads: ShapeQuad[], rotation: number): ShapeQuad[] {
  if ((rotation & 3) === 0) return quads;
  return quads.map((q) => {
    let corners = q.corners as V[];
    for (let i = 0; i < (rotation & 3); i++) {
      corners = corners.map(([x, y, z]) => [1 - z, y, x] as V);
    }
    return {
      ...q,
      corners,
      normal: rotateDirection(q.normal, rotation),
      cull: q.cull === null ? null : rotateDirection(q.cull, rotation),
    };
  });
}

function boxesToQuads(boxes: AABB[]): ShapeQuad[] {
  return boxes.flatMap((b) => boxQuads(b));
}

// --- Shapes ---------------------------------------------------------------

const cube: ShapeDefinition = {
  id: 'cube',
  quads: () => boxQuads(FULL),
  boxes: () => [FULL],
  occludes: () => true,
};

const slab: ShapeDefinition = {
  id: 'slab',
  quads: (state) => boxQuads(slabBox(state)),
  boxes: (state) => [slabBox(state)],
  occludes: (face, state) =>
    BlockState.isTopHalf(state) ? face === DIR_PY : face === DIR_NY,
};

function slabBox(state: number): AABB {
  return BlockState.isTopHalf(state) ? box(0, 0.5, 0, 1, 1, 1) : box(0, 0, 0, 1, 0.5, 1);
}

/** Stairs: a bottom slab plus a back step; rotation faces the step. */
const stairs: ShapeDefinition = {
  id: 'stairs',
  quads: (state) => rotateQuads(boxesToQuads(stairBoxes(state)), BlockState.rotation(state)),
  boxes: (state) => stairBoxes(state).map((b) => rotateBox(b, BlockState.rotation(state))),
  occludes: (face, state) => {
    const top = BlockState.isTopHalf(state);
    if (top && face === DIR_PY) return true;
    if (!top && face === DIR_NY) return true;
    return face === rotateDirection(DIR_NZ, BlockState.rotation(state));
  },
};

function stairBoxes(state: number): AABB[] {
  // The high step sits on the -z side; rotation turns it to face away
  // from the player, so a stair placed while walking forward climbs.
  if (BlockState.isTopHalf(state)) {
    return [box(0, 0.5, 0, 1, 1, 1), box(0, 0, 0, 1, 0.5, 0.5)];
  }
  return [box(0, 0, 0, 1, 0.5, 1), box(0, 0.5, 0, 1, 1, 0.5)];
}

/** Two diagonal planes — flowers, saplings, grass tufts. */
const cross: ShapeDefinition = {
  id: 'cross',
  quads: () => {
    const q = (corners: V[], normal: Direction): ShapeQuad => ({
      corners,
      normal,
      slot: 'side',
      cull: null,
      uv: [0, 0, 1, 1],
      doubleSided: true,
    });
    // Diagonal planes have no axis normal; the closest axis keeps Lambert
    // shading sane and the winding counter-clockwise for that normal.
    return [
      q([[0, 0, 0], [1, 0, 1], [1, 1, 1], [0, 1, 0]], DIR_NX),
      q([[1, 0, 0], [0, 0, 1], [0, 1, 1], [1, 1, 0]], DIR_NZ),
    ];
  },
  boxes: () => [],
  occludes: () => false,
};

/** A thin pane through the middle, rotation picks the axis. */
const pane: ShapeDefinition = {
  id: 'pane',
  quads: (state) => rotateQuads(boxQuads(box(0, 0, 0.4375, 1, 1, 0.5625)), BlockState.rotation(state)),
  boxes: (state) => [rotateBox(box(0, 0, 0.4375, 1, 1, 0.5625), BlockState.rotation(state))],
  occludes: () => false,
};

/** A post with two rails; simple and sturdy. */
const fence: ShapeDefinition = {
  id: 'fence',
  quads: () =>
    boxesToQuads([
      box(0.375, 0, 0.375, 0.625, 1, 0.625),
      box(0, 0.75, 0.4375, 1, 0.9, 0.5625),
      box(0, 0.35, 0.4375, 1, 0.5, 0.5625),
      box(0.4375, 0.75, 0, 0.5625, 0.9, 1),
      box(0.4375, 0.35, 0, 0.5625, 0.5, 1),
    ]),
  boxes: () => [box(0.375, 0, 0.375, 0.625, 1.5, 0.625)],
  occludes: () => false,
};

/**
 * Door: a panel on the -z edge; open swings it to the -x edge. Rotation
 * turns the whole thing. Top half is a second block with the same state.
 */
const door: ShapeDefinition = {
  id: 'door',
  quads: (state) => rotateQuads(boxQuads(doorBox(state)), BlockState.rotation(state)),
  boxes: (state) => [rotateBox(doorBox(state), BlockState.rotation(state))],
  occludes: () => false,
};

function doorBox(state: number): AABB {
  return BlockState.isOpen(state) ? box(0, 0, 0, 0.125, 1, 1) : box(0, 0, 0, 1, 1, 0.125);
}

const carpet: ShapeDefinition = {
  id: 'carpet',
  quads: () => boxQuads(box(0, 0, 0, 1, 0.0625, 1)),
  boxes: () => [box(0, 0, 0, 1, 0.0625, 1)],
  occludes: (face) => face === DIR_NY,
};

/** A small post with the block's side texture; no collision. */
const torch: ShapeDefinition = {
  id: 'torch',
  quads: () => boxQuads(box(0.4, 0, 0.4, 0.6, 0.65, 0.6), () => 'side'),
  boxes: () => [],
  occludes: () => false,
};

/** Flat decal on the floor with full-block collision-free footprint (paint, tiles). */
const flat: ShapeDefinition = {
  id: 'flat',
  quads: () => boxQuads(box(0, 0, 0, 1, 0.02, 1)),
  boxes: () => [],
  occludes: (face) => face === DIR_NY,
};

export const SHAPES: Record<BlockShapeId, ShapeDefinition> = {
  cube,
  slab,
  stairs,
  cross,
  pane,
  fence,
  door,
  carpet,
  torch,
  flat,
};

export function shapeOf(id: BlockShapeId): ShapeDefinition {
  return SHAPES[id];
}
