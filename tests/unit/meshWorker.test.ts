import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { ChunkMesher } from '../../src/engine/render/ChunkMesher';
import { RegionWorld, packRegion } from '../../src/engine/render/meshRegion';
import { TextureAtlas } from '../../src/engine/render/TextureAtlas';
import { LightEngine } from '../../src/engine/lighting/LightEngine';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

function world(): VoxelWorld {
  const w = new VoxelWorld(blocks);
  for (let cx = -1; cx <= 1; cx++) for (let cz = -1; cz <= 1; cz++) {
    const chunk = new Chunk(cx, cz);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
      const top = 2 + ((x + z) % 3);
      for (let y = 0; y <= top; y++) chunk.set(x, y, z, y === top ? B.grass : B.dirt);
    }
    chunk.set(8, 6, 8, B.leaves);
    chunk.set(4, 3, 4, B.water);
    chunk.set(5, 3, 4, B.torch);
    w.addChunk(chunk);
  }
  const lighting = new LightEngine(w, blocks);
  for (const c of w.allChunks()) lighting.initChunk(c);
  return w;
}

describe('meshing from a packed region (what the worker does)', () => {
  it('produces the same cube and smooth meshes as meshing the live world', () => {
    const w = world();
    const atlas = new TextureAtlas();
    const chunk = w.getChunk(0, 0)!;
    for (const smooth of [false, true]) {
      const direct = new ChunkMesher(w, blocks, atlas);
      direct.smooth = smooth;
      const expected = direct.build(chunk);
      const view = new RegionWorld(packRegion(w, 0, 0));
      const worker = new ChunkMesher(view, blocks, atlas);
      worker.smooth = smooth;
      const actual = worker.build(view.chunk());
      for (const bucket of ['opaque', 'water', 'alpha', 'glow'] as const) {
        expect(actual[bucket]?.positions.length ?? 0).toBe(expected[bucket]?.positions.length ?? 0);
        expect(Array.from(actual[bucket]?.skylight ?? [])).toEqual(Array.from(expected[bucket]?.skylight ?? []));
      }
      if (smooth) {
        expect(actual.smooth?.terrain?.positions.length).toBe(expected.smooth?.terrain?.positions.length);
        expect(actual.smooth?.foliage?.positions.length).toBe(expected.smooth?.foliage?.positions.length);
        expect(Array.from(actual.smooth!.terrain!.positions)).toEqual(Array.from(expected.smooth!.terrain!.positions));
      }
    }
  });

  it('reads outside the region as air and open sky', () => {
    const view = new RegionWorld(packRegion(world(), 0, 0));
    expect(view.getBlock(40, 3, 40)).toBe(0);
    expect(view.getSkyLight(40, 3, 40)).toBe(15);
    expect(view.height(40, 40)).toBe(-1);
    expect(view.getBlock(-1, 2, -1)).not.toBe(0); // the border column from the neighbor chunk
  });
});
