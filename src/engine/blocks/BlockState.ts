/**
 * One byte of per-block state, packed:
 *   bits 0-1  rotation (quarter turns around y)
 *   bit  2    half (0 = bottom, 1 = top) — slabs and stairs
 *   bit  3    open — doors, gates, lids
 *   bits 4-7  variant — colors, growth, or anything a shape wants
 */
export type BlockStateByte = number;

export const BlockState = {
  EMPTY: 0 as BlockStateByte,

  rotation(state: BlockStateByte): number {
    return state & 0b11;
  },
  withRotation(state: BlockStateByte, rotation: number): BlockStateByte {
    return (state & ~0b11) | (rotation & 0b11);
  },

  isTopHalf(state: BlockStateByte): boolean {
    return (state & 0b100) !== 0;
  },
  withTopHalf(state: BlockStateByte, top: boolean): BlockStateByte {
    return top ? state | 0b100 : state & ~0b100;
  },

  isOpen(state: BlockStateByte): boolean {
    return (state & 0b1000) !== 0;
  },
  withOpen(state: BlockStateByte, open: boolean): BlockStateByte {
    return open ? state | 0b1000 : state & ~0b1000;
  },

  variant(state: BlockStateByte): number {
    return (state >> 4) & 0b1111;
  },
  withVariant(state: BlockStateByte, variant: number): BlockStateByte {
    return (state & 0b1111) | ((variant & 0b1111) << 4);
  },
};
