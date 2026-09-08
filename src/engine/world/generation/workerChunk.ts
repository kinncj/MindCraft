/**
 * What crosses the boundary between the generation worker and the game.
 * Block and state arrays are transferred; everything else — a chest's
 * name and its toys — has to travel as plain data, so it lives here,
 * shared by both sides and testable without a browser.
 */

import { Chunk } from '../Chunk';

export type WorkerChunkEntity = { index: number; kind: string; data: Record<string, unknown> };

export type GenerateResponse = {
  id: number;
  cx: number;
  cz: number;
  blocks: ArrayBuffer;
  states: ArrayBuffer;
  /** Block entities the map puts in the chunk (a toy chest and its toys). */
  entities: WorkerChunkEntity[];
};

/** Packs a freshly generated chunk for the trip back to the main thread. */
export function toWorkerResponse(id: number, chunk: Chunk): GenerateResponse {
  return {
    id,
    cx: chunk.cx,
    cz: chunk.cz,
    blocks: chunk.blocks.buffer as ArrayBuffer,
    states: chunk.states.buffer as ArrayBuffer,
    entities: [...chunk.entities.entries()].map(([index, e]) => ({ index, kind: e.kind, data: e.data })),
  };
}

/** Rebuilds the chunk on the other side, entities and all. */
export function fromWorkerResponse(response: GenerateResponse, blocks?: Uint16Array, states?: Uint8Array): Chunk {
  const chunk = new Chunk(response.cx, response.cz, {
    blocks: blocks ?? new Uint16Array(response.blocks),
    states: states ?? new Uint8Array(response.states),
  });
  for (const e of response.entities ?? []) chunk.entities.set(e.index, { kind: e.kind, data: e.data });
  chunk.generated = true;
  return chunk;
}
