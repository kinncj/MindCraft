import { describe, expect, it } from 'vitest';
import { ToolRegistry, validate } from '../../src/engine/tools/ToolRegistry';
import { exposeTools } from '../../src/engine/tools/webmcp';

describe('tool registry', () => {
  it('enforces domain_verb names and uniqueness', () => {
    const tools = new ToolRegistry();
    expect(() => tools.register({ name: 'move', description: '', inputSchema: { type: 'object' }, execute: () => 1 })).toThrow();
    expect(() => tools.register({ name: 'Player_Move', description: '', inputSchema: { type: 'object' }, execute: () => 1 })).toThrow();
    tools.register({ name: 'player_move', description: 'm', inputSchema: { type: 'object' }, execute: () => 1 });
    expect(() => tools.register({ name: 'player_move', description: 'm', inputSchema: { type: 'object' }, execute: () => 1 })).toThrow();
    expect(tools.names()).toEqual(['player_move']);
  });

  it('validates arguments before executing', async () => {
    const tools = new ToolRegistry();
    tools.register({
      name: 'world_place_block',
      description: 'p',
      inputSchema: { type: 'object', properties: { x: { type: 'integer' }, block: { type: 'string' }, mode: { type: 'string', enum: ['a', 'b'] } }, required: ['x', 'block'] },
      execute: (input: { x: number; block: string }) => `${input.block}@${input.x}`,
    });
    await expect(tools.call('world_place_block', { x: 1, block: 'grass' })).resolves.toBe('grass@1');
    await expect(tools.call('world_place_block', { x: 1.5, block: 'grass' })).rejects.toThrow('integer');
    await expect(tools.call('world_place_block', { block: 'grass' })).rejects.toThrow('missing');
    await expect(tools.call('world_place_block', { x: 1, block: 'grass', mode: 'c' })).rejects.toThrow('one of');
    await expect(tools.call('nope_nope', {})).rejects.toThrow('unknown tool');
    expect(() => validate({ type: 'object', additionalProperties: false }, { extra: 1 })).toThrow('unexpected');
  });

  it('exposes tools on window and to navigator.modelContext when present', async () => {
    const tools = new ToolRegistry();
    tools.register({ name: 'time_set', description: 't', inputSchema: { type: 'object' }, execute: () => ({ ok: true }) });
    const registered: string[] = [];
    (navigator as unknown as { modelContext: unknown }).modelContext = {
      registerTool: (tool: { name: string }) => registered.push(tool.name),
      unregisterTool: () => undefined,
    };
    const dispose = exposeTools(tools);
    expect(window.mindcraftTools?.list().map((t) => t.name)).toEqual(['time_set']);
    await expect(window.mindcraftTools?.call('time_set')).resolves.toEqual({ ok: true });
    expect(registered).toContain('time_set');
    tools.register({ name: 'weather_set', description: 'w', inputSchema: { type: 'object' }, execute: () => 1 });
    expect(registered).toContain('weather_set');
    dispose();
    expect(window.mindcraftTools).toBeUndefined();
    delete (navigator as unknown as { modelContext?: unknown }).modelContext;
  });
});
