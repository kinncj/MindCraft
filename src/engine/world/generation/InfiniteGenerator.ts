import { B } from '../../blocks/blocks';
import type { Chunk } from '../Chunk';
import { CHUNK_SIZE, WORLD_HEIGHT } from '../coords';
import type { GeneratorConfig, WorldGenerator } from './Generator';
import { fbm2, hash2, noise3, smoothstep, type Noise2, type Noise3 } from './noise';
import { placeTree, type TreeKind } from './structures';

export const SEA_LEVEL = 40;
const MIN_HEIGHT = 24;

export type Biome = 'ocean' | 'beach' | 'meadow' | 'forest' | 'cherry' | 'desert' | 'snowy' | 'hills';

type ColumnInfo = { height: number; biome: Biome };

/**
 * Infinite terrain: continents, hills, biomes by temperature and
 * moisture, caves, lakes, and trees. Everything is a pure function of
 * (seed, x, z) so neighbors always agree at chunk borders.
 */
export class InfiniteGenerator implements WorldGenerator {
  readonly config: GeneratorConfig;
  private continent: Noise2;
  private hills: Noise2;
  private detail: Noise2;
  private temperature: Noise2;
  private moisture: Noise2;
  private grove: Noise2;
  private cave: Noise3;
  private caveB: Noise3;
  private spawnCache: { x: number; y: number; z: number } | null = null;

  constructor(readonly seed: number) {
    this.config = { kind: 'infinite', seed };
    this.continent = fbm2(seed + 1, 4);
    this.hills = fbm2(seed + 2, 3);
    this.detail = fbm2(seed + 3, 2);
    this.temperature = fbm2(seed + 4, 2);
    this.moisture = fbm2(seed + 5, 2);
    this.grove = fbm2(seed + 6, 1);
    this.cave = noise3(seed + 7);
    this.caveB = noise3(seed + 8);
  }

  /** Terrain height before any flattening. */
  private rawHeight(x: number, z: number): number {
    const c = this.continent(x / 420, z / 420); // -1..1
    const h = this.hills(x / 70, z / 70);
    const d = this.detail(x / 14, z / 14);
    const base = SEA_LEVEL + 2 + c * 18;
    // Hills only where the continent is high, so coasts stay gentle.
    const hillStrength = smoothstep(-0.2, 0.6, c);
    const height = base + h * 16 * hillStrength + d * 2.2;
    return Math.max(MIN_HEIGHT, Math.min(WORLD_HEIGHT - 10, Math.round(height)));
  }

  private column(x: number, z: number): ColumnInfo {
    let height = this.rawHeight(x, z);
    // A flat plaza around the spawn so a new world starts on open ground.
    const spawn = this.spawn();
    const d = Math.hypot(x - spawn.x, z - spawn.z);
    if (d <= 8) height = spawn.y - 1;
    else if (d <= 14) {
      const t = (d - 8) / 6;
      height = Math.round((spawn.y - 1) * (1 - t) + height * t);
    }
    return { height, biome: this.biomeAt(x, z, height) };
  }

  private biomeAt(x: number, z: number, height: number): Biome {
    if (height < SEA_LEVEL - 1) return 'ocean';
    if (height <= SEA_LEVEL + 1) return 'beach';
    const t = this.temperature(x / 320, z / 320);
    const m = this.moisture(x / 260, z / 260);
    if (t < -0.35) return 'snowy';
    if (height > SEA_LEVEL + 26) return 'hills';
    if (t > 0.38 && m < -0.05) return 'desert';
    if (m > 0.1 && t > 0.05 && t < 0.4 && this.grove(x / 90, z / 90) > 0.45) return 'cherry';
    if (m > 0.22) return 'forest';
    return 'meadow';
  }

  /** Public biome lookup for tools and the HUD. */
  biomeOf(x: number, z: number): Biome {
    return this.column(x, z).biome;
  }

  surfaceHeight(x: number, z: number): number {
    const { height } = this.column(x, z);
    return Math.max(height, SEA_LEVEL);
  }

  spawn(): { x: number; y: number; z: number } {
    if (this.spawnCache) return this.spawnCache;
    // Spiral out from the origin until we find dry, low ground.
    let best = { x: 8, y: 0, z: 8 };
    for (let radius = 0; radius < 400; radius += 16) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
        const x = Math.round(8 + Math.cos(angle) * radius);
        const z = Math.round(8 + Math.sin(angle) * radius);
        const h = this.rawHeight(x, z);
        if (h >= SEA_LEVEL + 3 && h <= SEA_LEVEL + 14) {
          best = { x, y: h + 1, z };
          this.spawnCache = best;
          return best;
        }
        if (radius === 0) break;
      }
    }
    best = { x: 8, y: this.rawHeight(8, 8) + 1, z: 8 };
    this.spawnCache = best;
    return best;
  }

  private isCave(x: number, y: number, z: number, height: number): boolean {
    if (y < 4 || y > height - 5) return false;
    const a = this.cave(x / 26, y / 18, z / 26);
    const b = this.caveB(x / 34, y / 22, z / 34);
    return Math.abs(a) < 0.07 && Math.abs(b) < 0.11;
  }

  generate(chunk: Chunk): void {
    const baseX = chunk.cx * CHUNK_SIZE;
    const baseZ = chunk.cz * CHUNK_SIZE;
    const columns: ColumnInfo[] = new Array(CHUNK_SIZE * CHUNK_SIZE);

    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const x = baseX + lx;
        const z = baseZ + lz;
        const info = this.column(x, z);
        columns[lz * CHUNK_SIZE + lx] = info;
        const { height, biome } = info;
        const { top, under, underDepth } = surfaceBlocks(biome);

        chunk.set(lx, 0, lz, B.deep_stone);
        chunk.set(lx, 1, lz, B.deep_stone);
        for (let y = 2; y <= height; y++) {
          if (this.isCave(x, y, z, height)) {
            // Occasional glow crystals on cave floors so caves feel magical.
            if (!this.isCave(x, y - 1, z, height) && hash2(x, z, this.seed + y) < 0.035) {
              chunk.set(lx, y, lz, B.glow_crystal);
            }
            continue;
          }
          let id: number;
          if (y === height) id = top;
          else if (y > height - 1 - underDepth) id = under;
          else id = B.stone;
          chunk.set(lx, y, lz, id);
        }
        // Lakes and seas.
        for (let y = height + 1; y <= SEA_LEVEL; y++) {
          chunk.set(lx, y, lz, biome === 'snowy' && y === SEA_LEVEL ? B.ice : B.water);
        }
      }
    }

    this.decorate(chunk, columns);
    chunk.generated = true;
  }

  /**
   * Trees, flowers, grass. Decorations near borders spill into neighbor
   * chunks, so we consider a margin of columns around this chunk and only
   * write the blocks that land inside it. Same seed → neighbors agree.
   */
  private decorate(chunk: Chunk, columns: ColumnInfo[]): void {
    const baseX = chunk.cx * CHUNK_SIZE;
    const baseZ = chunk.cz * CHUNK_SIZE;
    const MARGIN = 4;
    const spawn = this.spawn();

    const write = (x: number, y: number, z: number, id: number, onlyAir = true): void => {
      const lx = x - baseX;
      const lz = z - baseZ;
      if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE || y < 0 || y >= WORLD_HEIGHT) return;
      if (onlyAir && chunk.get(lx, y, lz) !== 0) return;
      chunk.set(lx, y, lz, id);
    };

    for (let lz = -MARGIN; lz < CHUNK_SIZE + MARGIN; lz++) {
      for (let lx = -MARGIN; lx < CHUNK_SIZE + MARGIN; lx++) {
        const x = baseX + lx;
        const z = baseZ + lz;
        const inside = lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE;
        const info = inside ? columns[lz * CHUNK_SIZE + lx] : this.column(x, z);
        const { height, biome } = info;
        if (height < SEA_LEVEL + 1) continue;
        if (Math.hypot(x - spawn.x, z - spawn.z) <= 11) continue;
        // Skip columns whose surface got carved by a cave.
        if (inside && chunk.get(lx, height, lz) === 0) continue;

        const roll = hash2(x, z, this.seed + 777);
        const tree = treeFor(biome, roll);
        if (tree) {
          placeTree(tree, x, height, z, hash2(x, z, this.seed + 91), write);
          continue;
        }
        if (!inside) continue;

        const y = height + 1;
        if (biome === 'desert') {
          if (roll > 0.985) {
            const h = 2 + Math.floor(hash2(x, z, this.seed + 5) * 2);
            for (let i = 0; i < h; i++) write(x, y + i, z, B.cactus);
          }
          continue;
        }
        if (biome === 'snowy') continue;
        if (roll > 0.97) write(x, y, z, flowerFor(hash2(x, z, this.seed + 13)));
        else if (roll > 0.86) write(x, y, z, B.tall_grass);
        else if (biome === 'forest' && roll > 0.83) write(x, y, z, B.mushroom);
        else if (biome === 'meadow' && roll < 0.004) write(x, y, z, B.pumpkin);
      }
    }
  }
}

function surfaceBlocks(biome: Biome): { top: number; under: number; underDepth: number } {
  switch (biome) {
    case 'ocean':
      return { top: B.gravel, under: B.sand, underDepth: 2 };
    case 'beach':
    case 'desert':
      return { top: B.sand, under: B.sand, underDepth: 3 };
    case 'snowy':
      return { top: B.snow, under: B.dirt, underDepth: 3 };
    case 'hills':
      return { top: B.stone, under: B.stone, underDepth: 0 };
    default:
      return { top: B.grass, under: B.dirt, underDepth: 3 };
  }
}

function treeFor(biome: Biome, roll: number): TreeKind | null {
  switch (biome) {
    case 'forest':
      return roll < 0.05 ? (roll < 0.012 ? 'birch' : 'oak') : null;
    case 'cherry':
      return roll < 0.03 ? 'cherry' : null;
    case 'meadow':
      return roll < 0.006 ? 'oak' : null;
    case 'snowy':
      return roll < 0.012 ? 'pine' : null;
    default:
      return null;
  }
}

function flowerFor(roll: number): number {
  if (roll < 0.3) return B.flower_pink;
  if (roll < 0.55) return B.flower_yellow;
  if (roll < 0.8) return B.flower_blue;
  return B.flower_red;
}
