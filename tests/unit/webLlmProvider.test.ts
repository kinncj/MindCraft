import { describe, expect, it } from 'vitest';
import { DEFAULT_HELPER_MODEL, WebLlmProvider, type HelperEngine, type HelperRequest } from '../../src/engine/chat/WebLlmProvider';
import type { ChatContext } from '../../src/engine/chat/types';

function ctx(message: string): ChatContext {
  return {
    villager: { id: 'v1', name: 'Mia', job: 'baker', jobLabel: 'Baker', emoji: '🥖', x: 5, z: 5 },
    message,
    history: [{ who: 'kid', text: 'hi' }, { who: 'villager', text: 'Hello!' }],
    player: { x: 8, y: 3, z: 8, yaw: 0 },
    site: { x: 8, y: 3, z: 1 },
    blueprints: [{ id: 'cozy_house', label: 'Cozy House' }],
    blocks: [{ id: 'brick', label: 'Brick' }],
    tools: [{ name: 'build_stamp_blueprint', description: 'stamp' }, { name: 'world_save', description: 'save' }],
    world: { timeOfDay: 0.3, weather: 'sunny', biome: 'meadow', worldName: 'W' },
  };
}

function fakeEngine(answer: string, seen: HelperRequest[]): HelperEngine {
  return {
    chat: { completions: { create: async (request) => { seen.push(request); return { choices: [{ message: { content: answer } }] }; } } },
    unload: async () => undefined,
  };
}

describe('the downloadable helper model', () => {
  it('is off and unavailable until loaded and enabled', async () => {
    const provider = new WebLlmProvider(DEFAULT_HELPER_MODEL, async () => fakeEngine('{}', []));
    expect(await provider.available()).toBe(false);
    expect(provider.ready).toBe(false);
    expect(WebLlmProvider.supported()).toBe(false); // jsdom has no WebGPU
  });

  it('reports progress while loading, then answers with JSON forced through the filter', async () => {
    const seen: HelperRequest[] = [];
    const progress: number[] = [];
    const provider = new WebLlmProvider('test-model', async (modelId, onProgress) => {
      expect(modelId).toBe('test-model');
      onProgress({ progress: 0.5, text: 'half' });
      onProgress({ progress: 1, text: 'done' });
      return fakeEngine('{"say":"On it! 🏠","actions":[{"tool":"build_stamp_blueprint","args":{"blueprint":"cozy_house"}},{"tool":"world_save","args":{}}]}', seen);
    });
    provider.onProgress = (p) => progress.push(p.progress);
    await provider.load();
    expect(progress).toEqual([0.5, 1]);
    expect(provider.status).toBe('ready');
    provider.enabled = true;
    expect(await provider.available()).toBe(true);

    const reply = await provider.reply(ctx('build me a house'));
    expect(reply.say).toBe('On it! 🏠');
    expect(reply.actions).toEqual([{ tool: 'build_stamp_blueprint', args: { blueprint: 'cozy_house' } }]); // world_save is not allowed
    const request = seen[0];
    expect(request.response_format).toEqual({ type: 'json_object' });
    expect(request.messages[0].role).toBe('system');
    expect(request.messages[0].content).toContain('build_stamp_blueprint');
    expect(request.messages[0].content).not.toContain('world_save');
    expect(request.messages.map((m) => m.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(request.max_tokens).toBeLessThanOrEqual(160);
  });

  it('rejects unsafe or malformed answers so the agent falls back to rules', async () => {
    const provider = new WebLlmProvider('test-model', async () => fakeEngine('I am not JSON', []));
    await provider.load();
    provider.enabled = true;
    await expect(provider.reply(ctx('hi'))).rejects.toThrow();
    const scary = new WebLlmProvider('test-model', async () => fakeEngine('{"say":"the monster will kill you"}', []));
    await scary.load();
    await expect(scary.reply(ctx('hi'))).rejects.toThrow();
  });

  it('records a load failure and can unload', async () => {
    const provider = new WebLlmProvider('test-model', async () => {
      throw new Error('no gpu');
    });
    await expect(provider.load()).rejects.toThrow('no gpu');
    expect(provider.status).toBe('error');
    expect(provider.error).toBe('no gpu');
    const ok = new WebLlmProvider('test-model', async () => fakeEngine('{}', []));
    await ok.load();
    await ok.unload();
    expect(ok.ready).toBe(false);
  });
});
