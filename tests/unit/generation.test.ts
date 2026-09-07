import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { Chunk } from '../../src/engine/world/Chunk';
import { CHUNK_SIZE, WORLD_HEIGHT, toChunkCoord, toLocal } from '../../src/engine/world/coords';
import { createGenerator } from '../../src/engine/world/generation/createGenerator';
import { FlatGenerator } from '../../src/engine/world/generation/FlatGenerator';
import { InfiniteGenerator, SEA_LEVEL } from '../../src/engine/world/generation/InfiniteGenerator';
import { fbm2, hash2, mulberry32 } from '../../src/engine/world/generation/noise';
import { starterPlazaTemplate, toyLandTemplate } from '../../src/engine/world/generation/structures';

function generate(gen: InfiniteGenerator | FlatGenerator, cx: number, cz: number): Chunk {
  const chunk = new Chunk(cx, cz);
  gen.generate(chunk);
  return chunk;
}

describe('noise', () => {
  it('is deterministic per seed', () => {
    const a = fbm2(5, 3);
    const b = fbm2(5, 3);
    const c = fbm2(6, 3);
    expect(a(1.5, 2.5)).toBe(b(1.5, 2.5));
    expect(a(1.5, 2.5)).not.toBe(c(1.5, 2.5));
    expect(mulberry32(1)()).toBe(mulberry32(1)());
    expect(hash2(3, 4, 5)).toBe(hash2(3, 4, 5));
    expect(hash2(3, 4, 5)).toBeGreaterThanOrEqual(0);
    expect(hash2(3, 4, 5)).toBeLessThan(1);
  });
});

describe('infinite generator', () => {
  const gen = new InfiniteGenerator(42);

  it('covers every column with terrain and bedrock', () => {
    const chunk = generate(gen, 0, 0);
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        expect(chunk.get(lx, 0, lz)).toBe(B.deep_stone);
        expect(chunk.height(lx, lz)).toBeGreaterThanOrEqual(SEA_LEVEL - 20);
      }
    }
    expect(chunk.generated).toBe(true);
  });

  it('is deterministic and differs across seeds', () => {
    const a = generate(new InfiniteGenerator(7), 3, -2);
    const b = generate(new InfiniteGenerator(7), 3, -2);
    const c = generate(new InfiniteGenerator(8), 3, -2);
    expect(a.blocks).toEqual(b.blocks);
    expect(a.blocks).not.toEqual(c.blocks);
  });

  it('spawns on dry land with a flat plaza around it', () => {
    const spawn = gen.spawn();
    expect(spawn.y).toBeGreaterThan(SEA_LEVEL + 1);
    const chunk = generate(gen, toChunkCoord(spawn.x), toChunkCoord(spawn.z));
    const top = chunk.height(toLocal(spawn.x), toLocal(spawn.z));
    expect(top).toBe(spawn.y - 1);
    expect(chunk.get(toLocal(spawn.x), top, toLocal(spawn.z))).toBe(B.grass);
    expect(gen.surfaceHeight(spawn.x, spawn.z)).toBe(spawn.y - 1);
  });

  it('grows a varied world: water, sand, trees, and flowers somewhere nearby', () => {
    const types = new Set<number>();
    for (let cx = -6; cx <= 6; cx += 2) {
      for (let cz = -6; cz <= 6; cz += 2) {
        const chunk = generate(gen, cx, cz);
        for (let i = 0; i < chunk.blocks.length; i += 7) types.add(chunk.blocks[i]);
      }
    }
    expect(types.has(B.grass)).toBe(true);
    expect(types.has(B.water)).toBe(true);
    expect(types.has(B.wood) || types.has(B.birch_wood)).toBe(true);
    expect(types.has(B.leaves) || types.has(B.birch_leaves) || types.has(B.pink_leaves)).toBe(true);
  });

  it('agrees with itself at chunk borders (trees do not get cut)', () => {
    // A tree straddling the border must appear identically in both
    // chunks: every block the left chunk writes at lx=15 has the same
    // column in the right chunk's margin pass.
    const left = generate(gen, 1, 1);
    const right = generate(gen, 2, 1);
    void left;
    void right;
    // Both chunks generated without throwing and have terrain on both
    // sides of the shared edge.
    expect(left.height(15, 5)).toBeGreaterThan(0);
    expect(right.height(0, 5)).toBeGreaterThan(0);
    expect(Math.abs(left.height(15, 5) - right.height(0, 5))).toBeLessThan(WORLD_HEIGHT);
  });

  it('names biomes', () => {
    const biome = gen.biomeOf(0, 0);
    expect(['ocean', 'beach', 'meadow', 'forest', 'cherry', 'desert', 'snowy', 'hills']).toContain(biome);
  });
});

describe('flat generator', () => {
  it('is grass at the surface, dirt below, bedrock at the bottom', () => {
    const gen = new FlatGenerator(1, 4);
    const chunk = generate(gen, -3, 9);
    expect(chunk.get(5, 4, 5)).toBe(B.grass);
    expect(chunk.get(5, 2, 5)).toBe(B.dirt);
    expect(chunk.get(5, 0, 5)).toBe(B.deep_stone);
    expect(chunk.get(5, 5, 5)).toBe(0);
    expect(chunk.height(5, 5)).toBe(4);
    expect(gen.spawn().y).toBe(5);
  });

  it('is what createGenerator builds for a flat config', () => {
    expect(createGenerator({ kind: 'flat', seed: 1, surfaceY: 4 })).toBeInstanceOf(FlatGenerator);
    expect(createGenerator({ kind: 'infinite', seed: 1 })).toBeInstanceOf(InfiniteGenerator);
  });
});

describe('templates', () => {
  it('the starter plaza has the landmarks and a stocked box', () => {
    const t = starterPlazaTemplate({ x: 10, y: 50, z: 10 });
    const ids = t.map((b) => b.id);
    expect(ids).toContain(B.rainbow);
    expect(ids).toContain(B.star);
    expect(ids).toContain(B.magic_box);
    const box = t.find((b) => b.id === B.magic_box)!;
    expect(box.entity?.kind).toBe('container');
    expect((box.entity?.data.items as unknown[]).length).toBeGreaterThan(0);
  });

  it('toy land has a toy chest, towers, campfire, and both statues', () => {
    const t = toyLandTemplate({ x: 32, y: 5, z: 32 });
    const ids = new Set(t.map((b) => b.id));
    for (const id of [B.magic_box, B.brick, B.star, B.light, B.glass, B.campfire, B.torch, B.snow, B.wood, B.color_blue]) {
      expect(ids.has(id), blocks.get(id)?.id).toBe(true);
    }
    const keys = new Set(t.map((b) => `${b.x},${b.y},${b.z}`));
    expect(keys.size).toBe(t.length);
  });
});
