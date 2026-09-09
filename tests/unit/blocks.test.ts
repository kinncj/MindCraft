import { describe, expect, it } from 'vitest';
import { B, LEGACY_BLOCK_IDS, blocks, resolveBlockId } from '../../src/engine/blocks/blocks';
import { BlockState } from '../../src/engine/blocks/BlockState';
import { defineBlock } from '../../src/engine/blocks/BlockDefinition';
import { BlockRegistry } from '../../src/engine/blocks/registry';
import { PAINTERS } from '../../src/engine/blocks/textures/painters';

describe('block catalog', () => {
  it('has unique numeric ids and string ids', () => {
    const all = blocks.all();
    expect(new Set(all.map((d) => d.numericId)).size).toBe(all.length);
    expect(new Set(all.map((d) => d.id)).size).toBe(all.length);
    expect(all.length).toBeGreaterThanOrEqual(60);
  });

  it('never uses 0, which is air', () => {
    for (const def of blocks.all()) expect(def.numericId).toBeGreaterThan(0);
  });

  it('references only textures that exist, variants included', () => {
    // Variants are the faces a block wears when it is powered or open, and
    // they were not checked: a missing painter there ships a broken texture
    // that nothing fails on, because the block looks fine until it lights up.
    for (const def of blocks.all()) {
      for (const key of Object.values(def.textures)) expect(PAINTERS[key], `${def.id} → ${key}`).toBeDefined();
      for (const [variant, faces] of Object.entries(def.variants ?? {})) {
        for (const key of Object.values(faces)) expect(PAINTERS[key], `${def.id} variant ${variant} → ${key}`).toBeDefined();
      }
    }
  });

  it('keeps the well-known blocks from v1 reachable, including renamed ones', () => {
    for (const id of ['grass', 'dirt', 'stone', 'planks', 'water', 'torch', 'star', 'rainbow', 'magic_box']) {
      expect(blocks.byId(id)).toBeDefined();
    }
    expect(resolveBlockId('magic-box')?.id).toBe('magic_box');
    expect(resolveBlockId('flower')?.id).toBe('flower_pink');
    expect(Object.keys(LEGACY_BLOCK_IDS).length).toBeGreaterThan(0);
    expect(resolveBlockId('tnt')).toBeUndefined();
  });

  it('gives glowing blocks the glow bucket and non-cubes transparency', () => {
    expect(blocks.byId('light')?.bucket).toBe('glow');
    expect(blocks.byId('torch')?.transparent).toBe(true);
    expect(blocks.byId('planks_slab')?.transparent).toBe(true);
    expect(blocks.byId('stone')?.transparent).toBe(false);
    expect(blocks.lightLevel(B.torch)).toBe(13);
    expect(blocks.isTransparent(0)).toBe(true);
  });

  it('exposes a palette that excludes internal blocks', () => {
    const ids = blocks.palette().map((d) => d.id);
    expect(ids).not.toContain('deep_stone');
    expect(ids).toContain('color_red');
  });

  it('rejects duplicate registrations', () => {
    const registry = new BlockRegistry();
    registry.register(defineBlock({ id: 'a', numericId: 1, label: 'A', color: '#000' }));
    expect(() => registry.register(defineBlock({ id: 'b', numericId: 1, label: 'B', color: '#000' }))).toThrow();
    expect(() => registry.register(defineBlock({ id: 'a', numericId: 2, label: 'A', color: '#000' }))).toThrow();
    expect(() => registry.register(defineBlock({ id: 'air', numericId: 0, label: 'Air', color: '#000' }))).toThrow();
  });
});

describe('block state byte', () => {
  it('packs and unpacks every field independently', () => {
    let s = BlockState.EMPTY;
    s = BlockState.withRotation(s, 3);
    s = BlockState.withTopHalf(s, true);
    s = BlockState.withOpen(s, true);
    s = BlockState.withVariant(s, 9);
    expect(BlockState.rotation(s)).toBe(3);
    expect(BlockState.isTopHalf(s)).toBe(true);
    expect(BlockState.isOpen(s)).toBe(true);
    expect(BlockState.variant(s)).toBe(9);
    s = BlockState.withOpen(s, false);
    expect(BlockState.isOpen(s)).toBe(false);
    expect(BlockState.rotation(s)).toBe(3);
    expect(s).toBeLessThan(256);
  });
});
