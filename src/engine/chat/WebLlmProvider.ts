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
/** Phones and tablets get a smaller model that fits their GPU memory limits. */
export const SMALL_HELPER_MODEL = 'SmolLM2-360M-Instruct-q4f16_1-MLC';
/** Below this storage-buffer limit the 0.5B model cannot load. */
const BIG_MODEL_MIN_BUFFER = 1024 * 1024 * 1024;
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

/** Room for the prompt, six turns of history, and the reply. */
export const HELPER_CONTEXT_TOKENS = 2048;

/**
 * The f16 build is smaller and faster, but some GPUs (Linux Chrome, older
 * Android) have no shader-f16. Those get the f32 build of the same model.
 */
export function pickHelperModel(modelId: string, hasF16: boolean, maxBufferBytes = Infinity): string {
  let id = modelId;
  if (id === DEFAULT_HELPER_MODEL && maxBufferBytes < BIG_MODEL_MIN_BUFFER) id = SMALL_HELPER_MODEL;
  return hasF16 ? id : id.replace('q4f16_1', 'q4f32_1');
}

type GpuProbe = { hasF16: boolean; maxBuffer: number; workerOk: boolean };

async function probeGpu(): Promise<GpuProbe> {
  const out: GpuProbe = { hasF16: false, maxBuffer: Infinity, workerOk: true };
  try {
    type Adapter = { features: Set<string>; limits: { maxStorageBufferBindingSize?: number; maxBufferSize?: number } };
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<Adapter | null> } }).gpu;
    const adapter = await gpu?.requestAdapter();
    out.hasF16 = adapter?.features.has('shader-f16') ?? false;
    out.maxBuffer = Math.min(adapter?.limits.maxStorageBufferBindingSize ?? Infinity, adapter?.limits.maxBufferSize ?? Infinity);
  } catch {
    // No adapter: WebLLM will say so with a clearer message.
  }
  // Safari (iPhone, iPad, Mac) has no WebGPU inside workers: run the model on the main thread there.
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  if (/safari/i.test(ua) && !/chrome|chromium|crios|fxios|android/i.test(ua)) out.workerOk = false;
  return out;
}

/** The model a device will actually get, for the UI. */
export async function helperModelForDevice(modelId = DEFAULT_HELPER_MODEL): Promise<string> {
  const probe = await probeGpu();
  return pickHelperModel(modelId, probe.hasF16, probe.maxBuffer);
}

/** Loads WebLLM lazily (it is a big chunk) and builds a worker-backed engine. */
export const createWebLlmEngine: HelperEngineFactory = async (modelId, onProgress) => {
  const webllm = await import('@mlc-ai/web-llm');
  const probe = await probeGpu();
  const model = pickHelperModel(modelId, probe.hasF16, probe.maxBuffer);
  const progress = { initProgressCallback: (report: { progress: number; text: string }) => onProgress({ progress: report.progress, text: report.text }) };
  const config = { context_window_size: HELPER_CONTEXT_TOKENS };
  if (probe.workerOk) {
    try {
      const worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' });
      const engine = await webllm.CreateWebWorkerMLCEngine(worker, model, progress, config);
      return engine as unknown as HelperEngine;
    } catch (error) {
      onProgress({ progress: 0, text: `Worker could not run the model (${error instanceof Error ? error.message : String(error)}); trying on the main thread…` });
    }
  }
  const engine = await webllm.CreateMLCEngine(model, progress, config);
  return engine as unknown as HelperEngine;
};

export async function helperModelIsCached(modelId = DEFAULT_HELPER_MODEL): Promise<boolean> {
  try {
    const webllm = await import('@mlc-ai/web-llm');
    for (const id of new Set([modelId, pickHelperModel(modelId, false), SMALL_HELPER_MODEL, pickHelperModel(SMALL_HELPER_MODEL, false)])) {
      if (await webllm.hasModelInCache(id)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function deleteHelperModel(modelId = DEFAULT_HELPER_MODEL): Promise<void> {
  const webllm = await import('@mlc-ai/web-llm');
  for (const id of new Set([modelId, pickHelperModel(modelId, false), SMALL_HELPER_MODEL, pickHelperModel(SMALL_HELPER_MODEL, false)])) {
    await webllm.deleteModelAllInfoInCache(id).catch(() => undefined);
  }
}

/** Short one-line hints for the tools the model may call; descriptions from the registry are too long for a 0.5B model. */
const TOOL_HINTS: Record<string, string> = {
  build_stamp_blueprint: 'build a blueprint {blueprint, x, y, z, color?}',
  build_shape: 'build a shape {shape: pyramid|tower|cube|wall|platform|ring|line|tree|arch, block, size, x, y, z}',
  build_room: 'build a room {x, y, z, width, height, depth, block}',
  world_place_block: 'place one block {block, x, y, z}',
  world_fill: 'fill a box {block, x1, y1, z1, x2, y2, z2}',
  villager_talk: 'react {choice: play|gift|work}',
  villager_walk_to: 'walk {x, z}',
  villager_stay: 'stay put {}',
  villager_dance: 'you dance {}',
  player_dance: 'the child dances {}',
  player_fly: 'the child flies {on: true|false}',
  time_set: 'set time {mode: day|night|sunset}',
  weather_set: 'set weather {weather: sunny|rain|snow}',
  pet_adopt: 'give a pet {kind: dog|cat|bunny}',
  vehicle_spawn: 'give a ride {kind: car|motorcycle|boat|plane|helicopter}',
  entity_spawn: 'spawn an animal {kind: chick|butterfly|cow|sheep}',
  audio_play: 'play a sound {sound}',
};

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

  systemPrompt(ctx: ChatContext): string {
    const v = ctx.villager;
    const available = new Set(ctx.tools.map((t) => t.name));
    const tools = CHAT_TOOL_ALLOWLIST.filter((name) => available.size === 0 || available.has(name));
    const time = ctx.world.timeOfDay > 0.55 || ctx.world.timeOfDay < 0.05 ? 'night' : ctx.world.timeOfDay > 0.45 ? 'sunset' : 'day';
    return [
      `You are ${v.name}, a cheerful ${v.jobLabel} in a friendly block-building game for small kids.`,
      `It is ${time}, the weather is ${ctx.world.weather}, we are in a ${ctx.world.biome} in the world "${ctx.world.worldName}".`,
      'Reply with ONE JSON object: {"say": "...", "actions": []}.',
      '"say": one or two short, kind, simple sentences with an emoji. Never scary, never mean, no links.',
      '"actions": a list of {"tool", "args"}; empty unless the child asks you to do something. Tools:',
      ...tools.map((name) => `- ${name}: ${TOOL_HINTS[name] ?? ''}`),
      `Blueprints: ${ctx.blueprints.map((b) => b.id).join(', ')}. Blocks: ${ctx.blocks.slice(0, 28).map((b) => b.id).join(', ')}.`,
      `Build at x=${ctx.site.x}, y=${ctx.site.y}, z=${ctx.site.z}. Example: {"say":"On it! 🏠","actions":[{"tool":"build_stamp_blueprint","args":{"blueprint":"cozy_house","x":${ctx.site.x},"y":${ctx.site.y},"z":${ctx.site.z}}}]}`,
    ].join('\n');
  }

  async reply(ctx: ChatContext): Promise<ChatReply> {
    if (!this.engine) throw new Error('helper not loaded');
    const messages: HelperRequest['messages'] = [{ role: 'system', content: this.systemPrompt(ctx) }];
    for (const turn of ctx.history.slice(-4)) messages.push({ role: turn.who === 'kid' ? 'user' : 'assistant', content: turn.text.slice(0, 160) });
    messages.push({ role: 'user', content: ctx.message });
    const ask = async (json: boolean): Promise<ChatReply> => {
      const result = await this.engine!.chat.completions.create({ messages, temperature: 0.5, max_tokens: 200, ...(json ? { response_format: { type: 'json_object' as const } } : {}) });
      return parseModelReply(result.choices[0]?.message.content ?? '');
    };
    try {
      return await ask(true);
    } catch (error) {
      // JSON mode can fail on some builds; a plain answer is usually still parseable.
      this.error = error instanceof Error ? error.message : String(error);
      return ask(false);
    }
  }
}
