import { FlatGenerator } from './FlatGenerator';
import type { GeneratorConfig, WorldGenerator } from './Generator';
import { InfiniteGenerator } from './InfiniteGenerator';

export function createGenerator(config: GeneratorConfig): WorldGenerator {
  if (config.kind === 'flat') return new FlatGenerator(config.seed, config.surfaceY);
  return new InfiniteGenerator(config.seed);
}
