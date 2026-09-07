import { B } from '../../blocks/blocks';
import type { Chunk } from '../Chunk';
import { CHUNK_SIZE, chunkKey, toLocal } from '../coords';
import type { GeneratorConfig, WorldGenerator } from './Generator';
import { presetMap, type PresetName } from './maps';
import type { PresetMap } from './maps/MapBuilder';

/**
 * Superflat: deep stone at the bottom, dirt, grass on top. Used for
 * migrated v1 worlds and for the prebuilt maps (Toy Land, Sunny Town),
 * whose blocks are written on top of the flat base chunk by chunk.
 */
export class FlatGenerator implements WorldGenerator {
  readonly config: GeneratorConfig;
  private map: PresetMap | null = null;

  constructor(
    seed: number,
    private surfaceY: number,
    private preset?: PresetName,
  ) {
    this.config = preset ? { kind: 'flat', seed, surfaceY, preset } : { kind: 'flat', seed, surfaceY };
  }

  private presetMap(): PresetMap | null {
    if (!this.preset) return null;
    if (!this.map) this.map = presetMap(this.preset, this.surfaceY);
    return this.map;
  }

  generate(chunk: Chunk): void {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        chunk.set(lx, 0, lz, B.deep_stone);
        for (let y = 1; y < this.surfaceY; y++) chunk.set(lx, y, lz, B.dirt);
        chunk.set(lx, this.surfaceY, lz, B.grass);
      }
    }
    const map = this.presetMap();
    if (map) {
      for (const b of map.byChunk.get(chunkKey(chunk.cx, chunk.cz)) ?? []) {
        chunk.set(toLocal(b.x), b.y, toLocal(b.z), b.id, b.state);
        if (b.entity) chunk.setEntity(toLocal(b.x), b.y, toLocal(b.z), b.entity);
      }
    }
    chunk.generated = true;
  }

  surfaceHeight(x: number, z: number): number {
    const map = this.presetMap();
    return map?.heights.get(`${x},${z}`) ?? this.surfaceY;
  }

  spawn(): { x: number; y: number; z: number } {
    return this.presetMap()?.spawn ?? { x: 32, y: this.surfaceY + 1, z: 32 };
  }

  /** Pets, villagers, vehicles the map comes with. */
  presetEntities() {
    return this.presetMap()?.entities ?? [];
  }
}
