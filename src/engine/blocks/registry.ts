import { AIR_ID, type BlockDefinition } from './BlockDefinition';

/**
 * The block registry: string id ↔ numeric id ↔ definition. Numeric ids
 * are what chunks store; string ids are what files and UI use.
 */
export class BlockRegistry {
  private byNumeric: Array<BlockDefinition | undefined> = [];
  private byString = new Map<string, BlockDefinition>();

  register(def: BlockDefinition): BlockDefinition {
    if (def.numericId === AIR_ID) throw new Error(`numeric id ${AIR_ID} is reserved for air`);
    if (this.byNumeric[def.numericId]) {
      throw new Error(`numeric id ${def.numericId} already used by ${this.byNumeric[def.numericId]!.id}`);
    }
    if (this.byString.has(def.id)) throw new Error(`block id ${def.id} already registered`);
    this.byNumeric[def.numericId] = def;
    this.byString.set(def.id, def);
    return def;
  }

  get(numericId: number): BlockDefinition | undefined {
    return this.byNumeric[numericId];
  }

  byId(id: string): BlockDefinition | undefined {
    return this.byString.get(id);
  }

  numericOf(id: string): number {
    const def = this.byString.get(id);
    if (!def) throw new Error(`unknown block ${id}`);
    return def.numericId;
  }

  has(id: unknown): id is string {
    return typeof id === 'string' && this.byString.has(id);
  }

  all(): BlockDefinition[] {
    return [...this.byString.values()];
  }

  palette(): BlockDefinition[] {
    return this.all().filter((def) => def.inPalette);
  }

  isAir(numericId: number): boolean {
    return numericId === AIR_ID;
  }

  isTransparent(numericId: number): boolean {
    if (numericId === AIR_ID) return true;
    return this.byNumeric[numericId]?.transparent ?? true;
  }

  lightLevel(numericId: number): number {
    return this.byNumeric[numericId]?.lightLevel ?? 0;
  }

  /** A stable string palette: index → block id, for files. */
  toPalette(): Record<number, string> {
    const out: Record<number, string> = {};
    for (const def of this.byString.values()) out[def.numericId] = def.id;
    return out;
  }
}
