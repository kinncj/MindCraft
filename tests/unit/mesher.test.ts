import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { BlockState } from '../../src/engine/blocks/BlockState';
import { LightEngine } from '../../src/engine/lighting/LightEngine';
import { ChunkMesher } from '../../src/engine/render/ChunkMesher';
import { TextureAtlas } from '../../src/engine/render/TextureAtlas';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

function setup(): { world: VoxelWorld; mesher: ChunkMesher; chunk: Chunk; light: LightEngine } {
  const world = new VoxelWorld(blocks);
  const chunk = new Chunk(0, 0);
  world.addChunk(chunk);
  const light = new LightEngine(world, blocks);
  const atlas = new TextureAtlas();
  return { world, mesher: new ChunkMesher(world, blocks, atlas), chunk, light };
}

const quadsOf = (data: { indices: Uint32Array } | null): number => (data ? data.indices.length / 6 : 0);

describe('chunk mesher', () => {
  it('a lone cube has six faces; two touching cubes share a hidden one', () => {
    const { world, mesher, chunk, light } = setup();
    world.setBlock(5, 5, 5, B.stone);
    light.initChunk(chunk);
    expect(quadsOf(mesher.build(chunk).opaque)).toBe(6);
    world.setBlock(6, 5, 5, B.stone);
    expect(quadsOf(mesher.build(chunk).opaque)).toBe(10);
  });

  it('faces against the chunk edge look into unloaded space and are drawn', () => {
    const { world, mesher, chunk, light } = setup();
    world.setBlock(0, 5, 0, B.stone);
    light.initChunk(chunk);
    expect(quadsOf(mesher.build(chunk).opaque)).toBe(6);
  });

  it('glass next to glass hides shared faces, glass next to stone does not', () => {
    const { world, mesher, chunk, light } = setup();
    world.setBlock(5, 5, 5, B.glass);
    world.setBlock(6, 5, 5, B.glass);
    world.setBlock(7, 5, 5, B.stone);
    light.initChunk(chunk);
    const meshes = mesher.build(chunk);
    expect(quadsOf(meshes.alpha)).toBe(10 - 1); // stone hides one glass face
    expect(quadsOf(meshes.opaque)).toBe(6); // glass does not hide the stone face
  });

  it('a slab under a cube keeps the cube bottom visible, a cube on a slab hides the slab top', () => {
    const { world, mesher, chunk, light } = setup();
    world.setBlock(5, 5, 5, B.planks_slab); // bottom slab
    world.setBlock(5, 6, 5, B.stone);
    light.initChunk(chunk);
    const meshes = mesher.build(chunk);
    // slab: 6 quads, its top is inset (not culled); stone: 6 faces, bottom not hidden by half slab.
    expect(quadsOf(meshes.alpha) + quadsOf(meshes.opaque)).toBe(12);
    world.setBlock(5, 5, 5, B.planks_slab, BlockState.withTopHalf(0, true));
    const meshes2 = mesher.build(chunk);
    // top slab occludes +y: stone bottom hidden; stone occludes -y of... slab top is flush: hidden too.
    expect(quadsOf(meshes2.alpha) + quadsOf(meshes2.opaque)).toBe(10);
  });

  it('flowers emit double-sided crosses in their own plants bucket, apart from glass', () => {
    const { world, mesher, chunk, light } = setup();
    world.setBlock(5, 5, 5, B.flower_pink);
    world.setBlock(9, 5, 5, B.glass);
    light.initChunk(chunk);
    const meshes = mesher.build(chunk);
    // Plants are drawn separately so a weak GPU can drop them in the distance
    // without leaving holes where the windows are.
    expect(quadsOf(meshes.plants)).toBe(4);
    expect(quadsOf(meshes.alpha)).toBe(6);
    expect(meshes.opaque).toBeNull();
  });

  it('glowing blocks go to the glow bucket and carry full block light', () => {
    const { world, mesher, chunk, light } = setup();
    world.setBlock(5, 5, 5, B.light);
    light.initChunk(chunk);
    const glow = mesher.build(chunk).glow!;
    expect(quadsOf(glow)).toBe(6);
    expect(Math.min(...glow.blocklight)).toBeGreaterThan(0.85);
  });

  it('a covered face is darker than an open one', () => {
    const { world, mesher, chunk, light } = setup();
    for (let x = 4; x <= 6; x++) for (let z = 4; z <= 6; z++) world.setBlock(x, 5, z, B.stone);
    for (let x = 4; x <= 6; x++) for (let z = 4; z <= 6; z++) world.setBlock(x, 8, z, B.stone);
    light.initChunk(chunk);
    const opaque = mesher.build(chunk).opaque!;
    expect(Math.min(...opaque.skylight)).toBeLessThan(1);
    expect(Math.max(...opaque.skylight)).toBe(1);
  });
});
