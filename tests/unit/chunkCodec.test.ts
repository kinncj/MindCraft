import { describe, expect, it } from 'vitest';
import { remapIds, rleDecode16, rleDecode8, rleEncode } from '../../src/storage/chunkCodec';
import { CHUNK_VOLUME } from '../../src/engine/world/coords';

describe('chunk codec', () => {
  it('round-trips typed arrays through RLE', () => {
    const blocks = new Uint16Array(CHUNK_VOLUME);
    blocks.fill(3, 0, 5000);
    blocks[7000] = 99;
    blocks[CHUNK_VOLUME - 1] = 1;
    const encoded = rleEncode(blocks);
    expect(encoded.length).toBeLessThan(20);
    expect(rleDecode16(encoded)).toEqual(blocks);
    const states = new Uint8Array(CHUNK_VOLUME);
    states[10] = 7;
    expect(rleDecode8(rleEncode(states))).toEqual(states);
  });

  it('remaps ids through a palette, dropping unknown blocks to air', () => {
    const blocks = new Uint16Array([0, 5, 5, 9, 2]);
    const out = remapIds(blocks, { 5: 'grass', 9: 'lava', 2: 'stone' }, (id) => ({ grass: 1, stone: 3 })[id]);
    expect([...out]).toEqual([0, 1, 1, 0, 3]);
  });
});
