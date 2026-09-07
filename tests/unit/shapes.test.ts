import { describe, expect, it } from 'vitest';
import { BlockState } from '../../src/engine/blocks/BlockState';
import { SHAPES, rotateBox } from '../../src/engine/blocks/shapes';
import { DIR_NX, DIR_NY, DIR_NZ, DIR_PX, DIR_PY, DIR_PZ } from '../../src/engine/world/coords';

describe('block shapes', () => {
  it('a cube has six culled quads and occludes every face', () => {
    const quads = SHAPES.cube.quads(0);
    expect(quads).toHaveLength(6);
    expect(quads.every((q) => q.cull !== null)).toBe(true);
    for (const face of [DIR_PX, DIR_NX, DIR_PY, DIR_NY, DIR_PZ, DIR_NZ]) expect(SHAPES.cube.occludes(face, 0)).toBe(true);
  });

  it('a bottom slab only occludes downward and its top face is not culled', () => {
    const top = SHAPES.slab.quads(0).find((q) => q.normal === DIR_PY);
    expect(top?.cull).toBeNull();
    expect(SHAPES.slab.occludes(DIR_NY, 0)).toBe(true);
    expect(SHAPES.slab.occludes(DIR_PY, 0)).toBe(false);
    const topSlab = BlockState.withTopHalf(0, true);
    expect(SHAPES.slab.occludes(DIR_PY, topSlab)).toBe(true);
    expect(SHAPES.slab.boxes(topSlab)[0].minY).toBe(0.5);
  });

  it('stairs rotate their high step with the rotation state', () => {
    const north = SHAPES.stairs.boxes(0);
    // The step (upper box) sits on the -z side.
    const step = north.find((b) => b.minY === 0.5)!;
    expect(step.maxZ).toBe(0.5);
    const east = SHAPES.stairs.boxes(BlockState.withRotation(0, 1));
    const stepEast = east.find((b) => b.minY === 0.5)!;
    expect(stepEast.minX).toBe(0.5);
    expect(SHAPES.stairs.occludes(DIR_NZ, 0)).toBe(true);
    expect(SHAPES.stairs.occludes(DIR_PX, BlockState.withRotation(0, 1))).toBe(true);
  });

  it('crosses are double sided with no collision', () => {
    const quads = SHAPES.cross.quads(0);
    expect(quads).toHaveLength(2);
    expect(quads.every((q) => q.doubleSided && q.cull === null)).toBe(true);
    expect(SHAPES.cross.boxes(0)).toHaveLength(0);
  });

  it('doors swing open', () => {
    const closed = SHAPES.door.boxes(0)[0];
    const open = SHAPES.door.boxes(BlockState.withOpen(0, true))[0];
    expect(closed.maxZ).toBeCloseTo(0.125);
    expect(open.maxX).toBeCloseTo(0.125);
  });

  it('rotateBox is a proper quarter turn (four turns is identity)', () => {
    const box = { minX: 0.1, minY: 0, minZ: 0.2, maxX: 0.4, maxY: 1, maxZ: 0.9 };
    let out = box;
    for (let i = 0; i < 4; i++) out = rotateBox(out, 1);
    expect(out.minX).toBeCloseTo(box.minX);
    expect(out.maxZ).toBeCloseTo(box.maxZ);
    expect(rotateBox(box, 2)).toEqual(rotateBox(rotateBox(box, 1), 1));
  });

  it('every quad is counter-clockwise from outside (positive area along its normal)', () => {
    const dirs = [
      [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
    ];
    for (const shape of Object.values(SHAPES)) {
      for (const state of [0, BlockState.withRotation(0, 1), BlockState.withTopHalf(0, true)]) {
        for (const q of shape.quads(state)) {
          const [a, b, c] = q.corners;
          const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
          const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
          const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
          const n = dirs[q.normal];
          const dot = cross[0] * n[0] + cross[1] * n[1] + cross[2] * n[2];
          expect(dot, `${shape.id} state ${state}`).toBeGreaterThan(0);
        }
      }
    }
  });
});
