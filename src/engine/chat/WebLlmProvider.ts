import { parseModelReply } from './BuiltInModelProvider';
import { CHAT_TOOL_ALLOWLIST, type ChatContext, type ChatProvider, type ChatReply } from './types';

/**
 * A real small language model, downloaded once with a grown-up's say-so
 * and then kept on the device: Qwen 2.5 0.5B Instruct, 4-bit, run by
 * WebLLM on WebGPU in a worker. Replies are forced into JSON, checked
 * against the tool allowlist, capped, and filtered like every provider.
 *
 * This is the one place the game reaches the network on purpose, and
 * only when the parent taps "Download".
 */

export const DEFAULT_HELPER_MODEL = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC';
export const HELPER_DOWNLOAD_MB = 400;

export type HelperProgress = { progress: number; text: string };

/** The slice of a WebLLM engine we use, so tests can hand in a fake. */
export type HelperEngine = {
  chat: { completions: { create(request: HelperRequest): Promise<{ choices: Array<{ message: { content?: string | null } }> }> } };
  unload(): Promise<void>;
};

export type HelperRequest = {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
};

export type HelperEngineFactory = (modelId: string, onProgress: (p: HelperProgress) => void) => Promise<HelperEngine>;

/** Loads WebLLM lazily (it is a big chunk) and builds a worker-backed engine. */
export const createWebLlmEngine: HelperEngineFactory = async (modelId, onProgress) => {
  const webllm = await import('@mlc-ai/web-llm');
  const worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' });
  const engine = await webllm.CreateWebWorkerMLCEngine(worker, modelId, {
    initProgressCallback: (report) => onProgress({ progress: report.progress, text: report.text }),
  }, { context_window_size: 1024 });
  return engine as unknown as HelperEngine;
};

export async function helperModelIsCached(modelId = DEFAULT_HELPER_MODEL): Promise<boolean> {
  try {
    const webllm = await import('@mlc-ai/web-llm');
    return await webllm.hasModelInCache(modelId);
  } catch {
    return false;
  }
}

export async function deleteHelperModel(modelId = DEFAULT_HELPER_MODEL): Promise<void> {
  const webllm = await import('@mlc-ai/web-llm');
  await webllm.deleteModelAllInfoInCache(modelId);
}

export class WebLlmProvider implements ChatProvider {
  readonly name = 'helper';
  private engine: HelperEngine | null = null;
  private loading: Promise<void> | null = null;
  enabled = false;
  /** Progress while loading, for the UI. */
  onProgress: ((p: HelperProgress) => void) | null = null;
  status: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  error = '';

  constructor(
    private modelId: string = DEFAULT_HELPER_MODEL,
    private factory: HelperEngineFactory = createWebLlmEngine,
  ) {}

  static supported(): boolean {
    return typeof navigator !== 'undefined' && 'gpu' in navigator;
  }

  get ready(): boolean {
    return this.engine !== null;
  }

  /** Downloads (first time) or loads from the cache. Safe to call again. */
  load(): Promise<void> {
    if (this.engine) return Promise.resolve();
    if (this.loading) return this.loading;
    this.status = 'loading';
    this.loading = this.factory(this.modelId, (p) => this.onProgress?.(p))
      .then((engine) => {
        this.engine = engine;
        this.status = 'ready';
      })
      .catch((error: unknown) => {
        this.status = 'error';
        this.error = error instanceof Error ? error.message : String(error);
        throw error;
      })
      .finally(() => {
        this.loading = null;
      });
    return this.loading;
  }

  async unload(): Promise<void> {
    const engine = this.engine;
    this.engine = null;
    this.status = 'idle';
    await engine?.unload().catch(() => undefined);
  }

  async available(): Promise<boolean> {
    return this.enabled && this.engine !== null;
  }

  private systemPrompt(ctx: ChatContext): string {
    const v = ctx.villager;
    const tools = ctx.tools.filter((t) => (CHAT_TOOL_ALLOWLIST as readonly string[]).includes(t.name));
    return [
      `You are ${v.name}, a cheerful ${v.jobLabel} in a friendly block-building game for a six-year-old child.`,
      'Answer with ONE JSON object only: {"say": "...", "actions": [{"tool": "...", "args": {...}}]}.',
      '"say": one or two short, kind sentences with an emoji. Never scary, never mean, no links.',
      '"actions": empty unless the child asks you to do something. Tools you may use:',
      ...tools.map((t) => `- ${t.name}: ${t.description}`),
      `build_stamp_blueprint blueprints: ${ctx.blueprints.map((b) => b.id).join(', ')}. Build at x=${ctx.site.x}, y=${ctx.site.y}, z=${ctx.site.z}.`,
      `Blocks for world_place_block/world_fill: ${ctx.blocks.slice(0, 40).map((b) => b.id).join(', ')}.`,
      `Your id is "${v.id}". Example: {"say":"On it! 🏠","actions":[{"tool":"build_stamp_blueprint","args":{"blueprint":"cozy_house","x":${ctx.site.x},"y":${ctx.site.y},"z":${ctx.site.z}}}]}`,
    ].join('\n');
  }

  async reply(ctx: ChatContext): Promise<ChatReply> {
    if (!this.engine) throw new Error('helper not loaded');
    const messages: HelperRequest['messages'] = [{ role: 'system', content: this.systemPrompt(ctx) }];
    for (const turn of ctx.history.slice(-6)) messages.push({ role: turn.who === 'kid' ? 'user' : 'assistant', content: turn.text });
    messages.push({ role: 'user', content: ctx.message });
    const result = await this.engine.chat.completions.create({ messages, temperature: 0.6, max_tokens: 120, response_format: { type: 'json_object' } });
    const content = result.choices[0]?.message.content ?? '';
    return parseModelReply(content);
  }
}
