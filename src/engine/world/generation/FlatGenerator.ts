import { B } from '../../blocks/blocks';
import type { Chunk } from '../Chunk';
import { CHUNK_SIZE } from '../coords';
import type { GeneratorConfig, WorldGenerator } from './Generator';

/**
 * Superflat: deep stone at the bottom, dirt, grass on top. Used for
 * migrated v1 worlds and for Toy Land, where the fun is what you build.
 */
export class FlatGenerator implements WorldGenerator {
  readonly config: GeneratorConfig;

  constructor(seed: number, private surfaceY: number) {
    this.config = { kind: 'flat', seed, surfaceY };
  }

  generate(chunk: Chunk): void {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        chunk.set(lx, 0, lz, B.deep_stone);
        for (let y = 1; y < this.surfaceY; y++) chunk.set(lx, y, lz, B.dirt);
        chunk.set(lx, this.surfaceY, lz, B.grass);
      }
    }
    chunk.generated = true;
  }

  surfaceHeight(): number {
    return this.surfaceY;
  }

  spawn(): { x: number; y: number; z: number } {
    return { x: 32, y: this.surfaceY + 1, z: 32 };
  }
}
