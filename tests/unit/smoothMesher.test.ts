import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { ChunkMesher } from '../../src/engine/render/ChunkMesher';
import { SmoothMesher } from '../../src/engine/render/SmoothMesher';
import { TextureAtlas } from '../../src/engine/render/TextureAtlas';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

function world(): { world: VoxelWorld; chunk: Chunk } {
  const w = new VoxelWorld(blocks);
  let center!: Chunk;
  for (let cx = -1; cx <= 1; cx++) for (let cz = -1; cz <= 1; cz++) {
    const chunk = new Chunk(cx, cz);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) {
      chunk.set(x, 0, z, B.stone);
      chunk.set(x, 1, z, B.dirt);
      chunk.set(x, 2, z, B.grass);
    }
    w.addChunk(chunk);
    if (cx === 0 && cz === 0) center = chunk;
  }
  return { world: w, chunk: center };
}

describe('smooth mesher (Cinema round world)', () => {
  const atlas = new TextureAtlas();

  it('pulls a flat grass top out of a flat world, facing up, textured as grass', () => {
    const { world: w, chunk } = world();
    const meshes = new SmoothMesher(w, blocks, atlas).build(chunk);
    const terrain = meshes.terrain!;
    expect(terrain).toBeDefined();
    expect(meshes.water).toBeUndefined();
    expect(meshes.foliage).toBeUndefined();
    const count = terrain.positions.length / 3;
    expect(count).toBeGreaterThan(200);
    // The top surface sits at the top of the grass blocks (y = 2.5), give or take the soft blur.
    let tops = 0;
    for (let i = 0; i < count; i++) {
      const y = terrain.positions[i * 3 + 1];
      if (y > 2 && y < 3.2) {
        tops++;
        expect(terrain.normals[i * 3 + 1]).toBeGreaterThan(0.9);
        expect(terrain.skylight[i]).toBeGreaterThanOrEqual(0);
      }
    }
    expect(tops).toBeGreaterThan(200);
    const grassTop = atlas.rect('grass_top');
    expect(terrain.tileTop[0]).toBeCloseTo(grassTop.u0, 5);
    expect(terrain.tileSide[0]).toBeCloseTo(atlas.rect('grass_side').u0, 5);
    // Every triangle winds with its normal (no inside-out faces).
    for (let t = 0; t < terrain.indices.length; t += 3) {
      const [a, b, c] = [terrain.indices[t], terrain.indices[t + 1], terrain.indices[t + 2]];
      const p = (i: number, k: number): number => terrain.positions[i * 3 + k];
      const ux = p(b, 0) - p(a, 0), uy = p(b, 1) - p(a, 1), uz = p(b, 2) - p(a, 2);
      const vx = p(c, 0) - p(a, 0), vy = p(c, 1) - p(a, 1), vz = p(c, 2) - p(a, 2);
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const dot = nx * terrain.normals[a * 3] + ny * terrain.normals[a * 3 + 1] + nz * terrain.normals[a * 3 + 2];
      expect(dot).toBeGreaterThanOrEqual(-1e-6);
    }
  });

  it('turns a lone leaf block into a small round blob and water into its own surface', () => {
    const { world: w, chunk } = world();
    w.setBlock(8, 6, 8, B.leaves);
    w.setBlock(4, 2, 4, B.water);
    w.setBlock(5, 2, 4, B.water);
    const meshes = new SmoothMesher(w, blocks, atlas).build(chunk);
    expect(meshes.foliage).toBeDefined();
    expect(meshes.water).toBeDefined();
    const f = meshes.foliage!;
    const n = f.positions.length / 3;
    for (let i = 0; i < n; i++) {
      expect(Math.abs(f.positions[i * 3] - 8)).toBeLessThan(1.2);
      expect(Math.abs(f.positions[i * 3 + 1] - 6)).toBeLessThan(1.2);
    }
  });

  it('only leaves the cube mesh when the mesher is in smooth mode', () => {
    const { world: w, chunk } = world();
    w.setBlock(8, 3, 8, B.planks);
    const mesher = new ChunkMesher(w, blocks, atlas);
    const cubes = mesher.build(chunk);
    expect(cubes.smooth).toBeUndefined();
    expect(cubes.opaque!.positions.length).toBeGreaterThan(1000);
    mesher.smooth = true;
    const smooth = mesher.build(chunk);
    expect(smooth.smooth?.terrain).toBeDefined();
    // Only the plank is left as a cube: five visible faces, four vertices each.
    expect(smooth.opaque!.positions.length).toBe(5 * 4 * 3);
  });

  it('meets its neighbor chunk exactly at the border', () => {
    const { world: w, chunk } = world();
    const mesher = new SmoothMesher(w, blocks, atlas);
    const a = mesher.build(chunk).terrain!;
    const b = mesher.build(w.getChunk(1, 0)!).terrain!;
    const key = (p: Float32Array, i: number): string => `${p[i * 3].toFixed(3)},${p[i * 3 + 1].toFixed(3)},${p[i * 3 + 2].toFixed(3)}`;
    const setA = new Set<string>();
    for (let i = 0; i < a.positions.length / 3; i++) setA.add(key(a.positions, i));
    let shared = 0;
    for (let i = 0; i < b.positions.length / 3; i++) if (setA.has(key(b.positions, i))) shared++;
    expect(shared).toBeGreaterThan(10);
  });
});
