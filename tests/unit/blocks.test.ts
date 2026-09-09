import { describe, expect, it } from 'vitest';
import { B, LEGACY_BLOCK_IDS, blocks, resolveBlockId } from '../../src/engine/blocks/blocks';
import { BlockState } from '../../src/engine/blocks/BlockState';
import { defineBlock } from '../../src/engine/blocks/BlockDefinition';
import { BlockRegistry } from '../../src/engine/blocks/registry';
import { PAINTERS } from '../../src/engine/blocks/textures/painters';
import { VEHICLE_KINDS } from '../../src/engine/entities/vehicles';

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

  it('every block that spawns something spawns something real', () => {
    // A card whose variant the engine does not recognise places nothing at
    // all: spawnFromCard returns false and the child sees a block vanish.
    // Vehicles are the risk — the variant has to be one the game drives.
    const bad: string[] = [];
    for (const def of blocks.all()) {
      const spawns = def.spawns;
      if (!spawns) continue;
      if (spawns.kind === 'vehicle' && !(VEHICLE_KINDS as string[]).includes(spawns.variant)) bad.push(`${def.id} spawns a ${spawns.variant}, which is not a vehicle`);
      if (spawns.kind === 'pet' && spawns.variant !== 'dog' && spawns.variant !== 'cat') bad.push(`${def.id} spawns a ${spawns.variant}, and pets are dogs and cats`);
    }
    expect(bad, bad.join('; ')).toEqual([]);
  });

  it('every B.something in the engine names a block that exists', async () => {
    // B is a Record<string, number>, so B.stone_brickss is `undefined` with no
    // compile error and no runtime complaint — it just places nothing, in a
    // generator or a blueprint, silently. Three hundred call sites deep, the
    // cheapest guard is to read them.
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const path = `${dir}/${name}`;
        if (statSync(path).isDirectory()) walk(path);
        else if (path.endsWith('.ts')) files.push(path);
      }
    };
    walk('src');
    const unknown = new Set<string>();
    for (const path of files) {
      const source = readFileSync(path, 'utf8');
      if (!/from '.*blocks\/blocks'/.test(source) && !path.endsWith('blocks/blocks.ts')) continue;
      for (const match of source.matchAll(/\bB\.([a-z][a-z0-9_]*)\b/g)) {
        if (!blocks.has(match[1])) unknown.add(`${path}: B.${match[1]}`);
      }
    }
    expect([...unknown], [...unknown].join('; ')).toEqual([]);
  });

  it('the splash screen drifts blocks that exist', async () => {
    // The first thing a child sees. blockIconDataUrl returns null for a name
    // it does not know, so a renamed block just quietly stops drifting.
    const { readFileSync } = await import('node:fs');
    const source = readFileSync('src/components/WelcomePanel.tsx', 'utf8');
    const floating = [...source.matchAll(/type: '([a-z0-9_]+)'/g)].map((m) => m[1]);
    expect(floating.length, 'no drifting blocks found — has the splash changed?').toBeGreaterThan(3);
    const gone = floating.filter((id) => !blocks.has(id));
    expect(gone, `the splash screen names blocks that are not there: ${gone.join(', ')}`).toEqual([]);
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
