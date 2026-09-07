import { describe, expect, it } from 'vitest';
import {
  CHUNK_SIZE,
  chunkKey,
  localIndex,
  oppositeDirection,
  parseChunkKey,
  rotationToDirection,
  toChunkCoord,
  toLocal,
  DIR_NX,
  DIR_NZ,
  DIR_PX,
  DIR_PZ,
} from '../../src/engine/world/coords';

describe('chunk coordinates', () => {
  it('floors negative coordinates into the right chunk', () => {
    expect(toChunkCoord(0)).toBe(0);
    expect(toChunkCoord(15)).toBe(0);
    expect(toChunkCoord(16)).toBe(1);
    expect(toChunkCoord(-1)).toBe(-1);
    expect(toChunkCoord(-16)).toBe(-1);
    expect(toChunkCoord(-17)).toBe(-2);
  });

  it('wraps local coordinates for negatives', () => {
    expect(toLocal(-1)).toBe(15);
    expect(toLocal(-16)).toBe(0);
    expect(toLocal(17)).toBe(1);
  });

  it('round-trips chunk keys', () => {
    expect(parseChunkKey(chunkKey(-3, 7))).toEqual({ cx: -3, cz: 7 });
  });

  it('indexes every cell of a chunk uniquely', () => {
    const seen = new Set<number>();
    for (let y = 0; y < 128; y += 17) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) seen.add(localIndex(x, y, z));
      }
    }
    expect(seen.size).toBe(8 * CHUNK_SIZE * CHUNK_SIZE);
  });

  it('knows opposite and rotated directions', () => {
    expect(oppositeDirection(DIR_PX)).toBe(DIR_NX);
    expect(oppositeDirection(DIR_NZ)).toBe(DIR_PZ);
    expect(rotationToDirection(0)).toBe(DIR_NZ);
    expect(rotationToDirection(1)).toBe(DIR_PX);
    expect(rotationToDirection(2)).toBe(DIR_PZ);
    expect(rotationToDirection(3)).toBe(DIR_NX);
  });
});
