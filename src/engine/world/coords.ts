/**
 * Chunk math. The world is an unbounded grid of 16×16 column chunks, each
 * WORLD_HEIGHT blocks tall. Everything here is integer arithmetic on
 * world coordinates; no Three.js, no DOM.
 */

export const CHUNK_BITS = 4;
export const CHUNK_SIZE = 1 << CHUNK_BITS; // 16
export const CHUNK_MASK = CHUNK_SIZE - 1;
export const WORLD_HEIGHT = 128;
export const CHUNK_VOLUME = CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT;

export type ChunkCoord = { cx: number; cz: number };
export type Vec3i = { x: number; y: number; z: number };

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export function parseChunkKey(key: string): ChunkCoord {
  const [cx, cz] = key.split(',').map(Number);
  return { cx, cz };
}

/** World x (or z) → chunk coordinate. Floors correctly for negatives. */
export function toChunkCoord(v: number): number {
  return v >> CHUNK_BITS;
}

/** World x (or z) → 0..15 inside its chunk. */
export function toLocal(v: number): number {
  return v & CHUNK_MASK;
}

/** Index into a chunk's flat arrays. Layout: y-major, then z, then x. */
export function localIndex(lx: number, y: number, lz: number): number {
  return (y << (CHUNK_BITS * 2)) | (lz << CHUNK_BITS) | lx;
}

export function isValidY(y: number): boolean {
  return y >= 0 && y < WORLD_HEIGHT;
}

export function positionKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/** The six axis directions, index-stable: +x, -x, +y, -y, +z, -z. */
export const DIRECTIONS: ReadonlyArray<Readonly<Vec3i>> = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
];

export type Direction = 0 | 1 | 2 | 3 | 4 | 5;
export const DIR_PX: Direction = 0;
export const DIR_NX: Direction = 1;
export const DIR_PY: Direction = 2;
export const DIR_NY: Direction = 3;
export const DIR_PZ: Direction = 4;
export const DIR_NZ: Direction = 5;

export function oppositeDirection(dir: Direction): Direction {
  return (dir ^ 1) as Direction;
}

/** Yaw rotation 0..3 (quarter turns) → the horizontal direction it faces. */
export function rotationToDirection(rotation: number): Direction {
  switch (rotation & 3) {
    case 0:
      return DIR_NZ;
    case 1:
      return DIR_PX;
    case 2:
      return DIR_PZ;
    default:
      return DIR_NX;
  }
}
