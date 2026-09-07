/**
 * Every capability of the game, defined once as a tool with a JSON
 * schema. Adapters expose the same registry to WebMCP
 * (navigator.modelContext), to the window for tests and external agents,
 * and later to the in-game robot programmer.
 *
 * Naming: <domain>_<verb>, e.g. player_move, world_place_block,
 * villager_spawn, pet_follow.
 */

export type JsonSchema = {
  type: 'object';
  properties?: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
};

export type ToolDefinition<Input = Record<string, unknown>, Output = unknown> = {
  name: string;
  description: string;
  inputSchema: JsonSchema;
  execute(input: Input): Output | Promise<Output>;
};

export class ToolRegistry {
  private tools = new Map<string, ToolDefinition>();
  private listeners = new Set<() => void>();

  register<I extends Record<string, unknown>, O>(tool: ToolDefinition<I, O>): () => void {
    if (!/^[a-z]+(_[a-z0-9]+)+$/.test(tool.name)) {
      throw new Error(`tool name must look like domain_verb: ${tool.name}`);
    }
    if (this.tools.has(tool.name)) throw new Error(`tool ${tool.name} already registered`);
    this.tools.set(tool.name, tool as unknown as ToolDefinition);
    this.notify();
    return () => {
      this.tools.delete(tool.name);
      this.notify();
    };
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()];
  }

  names(): string[] {
    return [...this.tools.keys()];
  }

  async call(name: string, input: Record<string, unknown> = {}): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`unknown tool ${name}`);
    validate(tool.inputSchema, input);
    return tool.execute(input);
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }
}

/** Minimal schema check: required keys and primitive types. */
export function validate(schema: JsonSchema, input: Record<string, unknown>): void {
  for (const key of schema.required ?? []) {
    if (!(key in input)) throw new Error(`missing required argument "${key}"`);
  }
  const props = schema.properties ?? {};
  for (const [key, value] of Object.entries(input)) {
    const spec = props[key] as { type?: string; enum?: unknown[] } | undefined;
    if (!spec) {
      if (schema.additionalProperties === false) throw new Error(`unexpected argument "${key}"`);
      continue;
    }
    if (spec.enum && !spec.enum.includes(value)) {
      throw new Error(`"${key}" must be one of ${spec.enum.join(', ')}`);
    }
    if (spec.type === 'number' && typeof value !== 'number') throw new Error(`"${key}" must be a number`);
    if (spec.type === 'integer' && !Number.isInteger(value)) throw new Error(`"${key}" must be an integer`);
    if (spec.type === 'string' && typeof value !== 'string') throw new Error(`"${key}" must be a string`);
    if (spec.type === 'boolean' && typeof value !== 'boolean') throw new Error(`"${key}" must be a boolean`);
  }
}
