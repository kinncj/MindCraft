import { BlockState } from '../blocks/BlockState';
import type { BlockRegistry } from '../blocks/registry';
import type { BlockEdit } from '../commands/Command';
import type { BlockEntity } from '../world/Chunk';

/** A relative block pattern: what copy/paste and blueprints move around. */
export type Stamp = {
  width: number;
  height: number;
  depth: number;
  blocks: Array<{ x: number; y: number; z: number; id: number; state: number; entity?: BlockEntity }>;
};

/** Rotates a stamp a quarter turn clockwise (seen from above), repeatedly. */
export function rotateStamp(stamp: Stamp, turns: number, registry: BlockRegistry): Stamp {
  let out = stamp;
  for (let i = 0; i < (((turns % 4) + 4) % 4); i++) {
    out = {
      width: out.depth,
      height: out.height,
      depth: out.width,
      blocks: out.blocks.map((b) => {
        const def = registry.get(b.id);
        const rotates = def ? def.facesPlayer || def.shape === 'stairs' || def.shape === 'door' || def.shape === 'pane' || def.shape === 'ladder' : false;
        const state = rotates ? BlockState.withRotation(b.state, BlockState.rotation(b.state) + 1) : b.state;
        // (x, z) → (depth - 1 - z, x), matching the shape rotation (x, z) → (1 - z, x).
        return { ...b, x: out.depth - 1 - b.z, z: b.x, state };
      }),
    };
  }
  return out;
}

/** Mirrors a stamp across its own x axis (left-right). */
export function mirrorStampX(stamp: Stamp): Stamp {
  return {
    ...stamp,
    blocks: stamp.blocks.map((b) => ({ ...b, x: stamp.width - 1 - b.x, state: mirrorState(b.state) })),
  };
}

/** Left-right mirror flips east/west facing. */
export function mirrorState(state: number): number {
  const r = BlockState.rotation(state);
  return r === 1 || r === 3 ? BlockState.withRotation(state, 4 - r) : state;
}

/** Edits that place a stamp with its min corner at (ox, oy, oz). */
export function stampToEdits(stamp: Stamp, ox: number, oy: number, oz: number): BlockEdit[] {
  return stamp.blocks.map((b) => ({
    x: ox + b.x,
    y: oy + b.y,
    z: oz + b.z,
    id: b.id,
    state: b.state,
    entity: b.entity ? { kind: b.entity.kind, data: JSON.parse(JSON.stringify(b.entity.data)) } : null,
  }));
}

/** The origin that centers a stamp's footprint on a target cell. */
export function centeredOrigin(stamp: Stamp, x: number, y: number, z: number): { x: number; y: number; z: number } {
  return { x: x - Math.floor(stamp.width / 2), y, z: z - Math.floor(stamp.depth / 2) };
}
