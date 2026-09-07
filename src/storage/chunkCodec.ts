import { CHUNK_VOLUME } from '../engine/world/coords';

/**
 * Run-length encoding for chunk arrays. Terrain is mostly long runs of
 * air and stone, so a 32k-entry chunk usually shrinks to a few hundred
 * numbers. Format: flat [value, count, value, count, ...].
 */
export function rleEncode(array: Uint16Array | Uint8Array): number[] {
  const out: number[] = [];
  let i = 0;
  while (i < array.length) {
    const value = array[i];
    let run = 1;
    while (i + run < array.length && array[i + run] === value && run < 0xffffff) run++;
    out.push(value, run);
    i += run;
  }
  return out;
}

export function rleDecode16(encoded: number[], length = CHUNK_VOLUME): Uint16Array {
  const out = new Uint16Array(length);
  fill(out, encoded);
  return out;
}

export function rleDecode8(encoded: number[], length = CHUNK_VOLUME): Uint8Array {
  const out = new Uint8Array(length);
  fill(out, encoded);
  return out;
}

function fill(out: Uint16Array | Uint8Array, encoded: number[]): void {
  let i = 0;
  for (let k = 0; k + 1 < encoded.length && i < out.length; k += 2) {
    const value = encoded[k];
    const run = Math.min(encoded[k + 1], out.length - i);
    if (value !== 0) out.fill(value, i, i + run);
    i += run;
  }
}

/**
 * Chunk ids stored in files/DB are remapped through a palette so the
 * registry can renumber without breaking saves.
 */
export function remapIds(blocks: Uint16Array, from: Record<number, string>, to: (id: string) => number | undefined): Uint16Array {
  const map = new Map<number, number>();
  const out = new Uint16Array(blocks.length);
  for (let i = 0; i < blocks.length; i++) {
    const id = blocks[i];
    if (id === 0) continue;
    let mapped = map.get(id);
    if (mapped === undefined) {
      const name = from[id];
      mapped = name ? (to(name) ?? 0) : 0;
      map.set(id, mapped);
    }
    out[i] = mapped;
  }
  return out;
}
