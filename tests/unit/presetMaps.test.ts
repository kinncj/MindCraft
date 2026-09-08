import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { Chunk } from '../../src/engine/world/Chunk';
import { toChunkCoord, toLocal } from '../../src/engine/world/coords';
import { FlatGenerator } from '../../src/engine/world/generation/FlatGenerator';
import { PRESETS, presetMap } from '../../src/engine/world/generation/maps';
import { createWorldRecord } from '../../src/game/store/worldRecords';

describe('prebuilt maps', () => {
  for (const name of ['toyland', 'town'] as const) {
    it(`${name} is a big, valid map with friends in it`, () => {
      const map = presetMap(name, 4);
      expect(map.blockCount).toBeGreaterThan(3000);
      for (const list of map.byChunk.values()) for (const b of list) {
        expect(b.id === 0 || blocks.get(b.id) !== undefined, `unknown id ${b.id}`).toBe(true);
        expect(b.y).toBeGreaterThanOrEqual(0);
      }
      expect(map.entities.filter((e) => e.kind === 'villager').length).toBeGreaterThanOrEqual(2);
      expect(map.entities.some((e) => e.kind === 'pet')).toBe(true);
      expect(map.entities.some((e) => e.kind === 'vehicle')).toBe(true);
      // The spawn stands on something, in the open.
      expect(map.heights.get(`${map.spawn.x},${map.spawn.z}`) ?? 4).toBeLessThan(map.spawn.y);
      expect(PRESETS[name].label.length).toBeGreaterThan(0);
    });
  }

  it('toy land has the toy chest, the train, the dinosaur, and the rocket', () => {
    const map = presetMap('toyland', 4);
    const all = [...map.byChunk.values()].flat();
    const chest = all.find((b) => b.id === B.magic_box);
    expect(chest?.entity?.data.name).toBe('Toy Chest');
    expect(all.filter((b) => b.id === B.color_green).length).toBeGreaterThan(80); // dinosaur + soldiers
    expect(all.some((b) => b.id === B.star && b.y > 15)).toBe(true); // rocket tip
    expect(all.filter((b) => b.id === B.bookshelf).length).toBeGreaterThan(100);
    expect(all.some((b) => b.id === B.ice)).toBe(true); // the slide
    expect(all.some((b) => b.id === B.door)).toBe(true);
  });

  it('sunny town has streets, houses with doors, a school, a pool, and eight jobs', () => {
    const map = presetMap('town', 4);
    const all = [...map.byChunk.values()].flat();
    expect(all.filter((b) => b.id === B.color_black && b.y === 4).length).toBeGreaterThan(2000); // asphalt
    expect(all.filter((b) => b.id === B.door).length).toBeGreaterThanOrEqual(20);
    expect(all.filter((b) => b.id === B.brick).length).toBeGreaterThan(100); // school
    expect(all.some((b) => b.id === B.water)).toBe(true);
    expect(all.some((b) => b.id === B.note_block)).toBe(true);
    const jobs = new Set(map.entities.filter((e) => e.kind === 'villager').map((e) => e.variant));
    expect(jobs.size).toBe(8);
    expect(map.entities.filter((e) => e.kind === 'vehicle').length).toBeGreaterThanOrEqual(4);
  });

  it('the flat generator writes the map into chunks and reports its heights', () => {
    const gen = new FlatGenerator(7, 4, 'toyland');
    const spawn = gen.spawn();
    const chunk = new Chunk(toChunkCoord(47), toChunkCoord(47));
    gen.generate(chunk);
    expect(chunk.get(toLocal(47), 6, toLocal(47))).toBe(B.magic_box);
    expect(chunk.getEntity(toLocal(47), 6, toLocal(47))?.kind).toBe('container');
    expect(gen.surfaceHeight(47, 47)).toBe(6);
    expect(gen.surfaceHeight(2, 2)).toBe(4);
    expect(spawn).toEqual(presetMap('toyland', 4).spawn);
    expect(gen.presetEntities().length).toBeGreaterThan(3);
    expect(gen.config).toEqual({ kind: 'flat', seed: 7, surfaceY: 4, preset: 'toyland' });
  });

  it('a chunk generated in the worker still carries the toy chest and its toys', async () => {
    // The worker cannot transfer a Map, so it sends block entities as plain data and
    // the chunk manager puts them back. Without that, every prebuilt container arrives
    // empty and a kid taps the toy chest to find nothing inside.
    const { toWorkerResponse, fromWorkerResponse } = await import('../../src/engine/world/generation/workerChunk');
    const gen = new FlatGenerator(7, 4, 'toyland');
    const source = new Chunk(toChunkCoord(47), toChunkCoord(47));
    gen.generate(source);
    const response = toWorkerResponse(1, source);
    expect(response.entities.length).toBeGreaterThan(0);
    // Cross the worker boundary the way structured cloning does: only plain data survives.
    const delivered = fromWorkerResponse(JSON.parse(JSON.stringify(response)) as typeof response, source.blocks, source.states);
    expect(delivered.get(toLocal(47), 6, toLocal(47))).toBe(B.magic_box);
    const chest = delivered.getEntity(toLocal(47), 6, toLocal(47));
    expect(chest?.kind).toBe('container');
    expect((chest?.data as { name: string }).name).toBe('Toy Chest');
    expect((chest?.data as { items: unknown[] }).items.length).toBeGreaterThan(0);
  });

  it('world records for presets carry the preset and its entities', () => {
    const town = createWorldRecord('T', 'town');
    expect(town.generator).toEqual({ kind: 'flat', surfaceY: 4, preset: 'town' });
    expect(town.entities?.length).toBeGreaterThan(10);
    expect(town.template).toBeUndefined();
    const toy = createWorldRecord('T', 'toyland');
    expect(toy.generator.preset).toBe('toyland');
  });
});
