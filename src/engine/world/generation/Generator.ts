import type { Chunk } from '../Chunk';

export type GeneratorKind = 'infinite' | 'flat';

export type GeneratorConfig =
  | { kind: 'infinite'; seed: number }
  | { kind: 'flat'; seed: number; surfaceY: number };

/**
 * Fills chunks with terrain. Deterministic for a config: the same chunk
 * always comes out identical, which is what lets us persist only edits.
 */
export interface WorldGenerator {
  readonly config: GeneratorConfig;
  generate(chunk: Chunk): void;
  /** Surface height (y of the top solid block) for a column. */
  surfaceHeight(x: number, z: number): number;
  /** A safe place to start: on land, in the open. */
  spawn(): { x: number; y: number; z: number };
}
