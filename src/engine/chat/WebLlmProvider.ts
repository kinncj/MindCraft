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

/** The sizes a grown-up can pick. Bigger understands more and needs more memory. */
export const HELPER_MODELS: Array<{ id: string; label: string; downloadMB: number; memoryMB: number; hint: string }> = [
  { id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC', label: 'Fast', downloadMB: 400, memoryMB: 1000, hint: 'Phones and tablets. Simple requests.' },
  { id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC', label: 'Smart', downloadMB: 1000, memoryMB: 1700, hint: 'Laptops, iPad Pro. Understands long requests.' },
  { id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC', label: 'Smartest', downloadMB: 2000, memoryMB: 2600, hint: 'Desktops with a graphics card.' },
];

export function helperModelInfo(id: string): (typeof HELPER_MODELS)[number] {
  return HELPER_MODELS.find((m) => m.id === id) ?? HELPER_MODELS[0];
}
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

/** What the loader decided, for the debug overlay. */
export type HelperInfo = { model: string; runtime: 'worker' | 'main'; hasF16: boolean; maxBufferMB: number | null; adapter: string };

export type HelperEngineFactory = (modelId: string, onProgress: (p: HelperProgress) => void, onInfo?: (info: HelperInfo) => void) => Promise<HelperEngine>;

/** Everything the debug overlay wants to know about the helper. */
export type HelperDiagnostics = {
  status: string;
  error: string;
  info: HelperInfo | null;
  jsonMode: boolean;
  busySince: number | null;
  lastPrompt: string;
  lastRaw: string;
  lastLatencyMs: number | null;
  replies: number;
};

/** Room for the prompt, six turns of history, and the reply. */
export const HELPER_CONTEXT_TOKENS = 2048;
/** A reply slower than this falls back to the rules so the kid is never left waiting. */
export const HELPER_TIMEOUT_MS = 25000;

/** Safari (iPhone, iPad, Mac): no WebGPU in workers, and JSON-grammar decoding stalls. */
export function isSafari(): boolean {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return /safari/i.test(ua) && !/chrome|chromium|crios|fxios|android/i.test(ua);
}

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${what} took longer than ${Math.round(ms / 1000)}s`)), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

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

async function probeGpu(): Promise<GpuProbe & { adapter: string }> {
  const out: GpuProbe & { adapter: string } = { hasF16: false, maxBuffer: Infinity, workerOk: true, adapter: 'none' };
  try {
    type Adapter = { features: Set<string>; limits: { maxStorageBufferBindingSize?: number; maxBufferSize?: number }; info?: { vendor?: string; architecture?: string; device?: string } };
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<Adapter | null> } }).gpu;
    const adapter = await gpu?.requestAdapter();
    out.hasF16 = adapter?.features.has('shader-f16') ?? false;
    out.maxBuffer = Math.min(adapter?.limits.maxStorageBufferBindingSize ?? Infinity, adapter?.limits.maxBufferSize ?? Infinity);
    out.adapter = adapter ? [adapter.info?.vendor, adapter.info?.architecture, adapter.info?.device].filter(Boolean).join(' ') || 'webgpu' : 'none';
  } catch {
    // No adapter: WebLLM will say so with a clearer message.
  }
  // Safari (iPhone, iPad, Mac) has no WebGPU inside workers: run the model on the main thread there.
  if (isSafari()) out.workerOk = false;
  return out;
}

/** The model a device will actually get, for the UI. */
export async function helperModelForDevice(modelId = DEFAULT_HELPER_MODEL): Promise<string> {
  const probe = await probeGpu();
  return pickHelperModel(modelId, probe.hasF16, probe.maxBuffer);
}

/** Loads WebLLM lazily (it is a big chunk) and builds a worker-backed engine. */
export const createWebLlmEngine: HelperEngineFactory = async (modelId, onProgress, onInfo) => {
  const webllm = await import('@mlc-ai/web-llm');
  const probe = await probeGpu();
  const model = pickHelperModel(modelId, probe.hasF16, probe.maxBuffer);
  const info = (runtime: 'worker' | 'main'): void =>
    onInfo?.({ model, runtime, hasF16: probe.hasF16, maxBufferMB: Number.isFinite(probe.maxBuffer) ? Math.round(probe.maxBuffer / 1048576) : null, adapter: probe.adapter });
  const progress = { initProgressCallback: (report: { progress: number; text: string }) => onProgress({ progress: report.progress, text: report.text }) };
  const config = { context_window_size: HELPER_CONTEXT_TOKENS };
  if (probe.workerOk) {
    try {
      info('worker');
      const worker = new Worker(new URL('./webllm.worker.ts', import.meta.url), { type: 'module' });
      const engine = await webllm.CreateWebWorkerMLCEngine(worker, model, progress, config);
      return engine as unknown as HelperEngine;
    } catch (error) {
      onProgress({ progress: 0, text: `Worker could not run the model (${error instanceof Error ? error.message : String(error)}); trying on the main thread…` });
    }
  }
  info('main');
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

/**
 * Exact JSON templates for every tool the model may call, matching the
 * real tool schemas. Positions are optional: without x, y, z the villager
 * builds in front of the child. Kept short for a 0.5B model.
 */
export const TOOL_TEMPLATES: Record<string, string> = {
  build_house: '{"tool":"build_house","args":{"type":"hospital","width":15,"depth":13,"floors":3,"wall":"color_white","trim":"color_red","colorful":false,"furnish":true,"sign":"cross","flag":"canada"}}  (ANY building: type house|hospital|school|shop|skyscraper|hotel|barn|library|restaurant|firestation|castle; width/depth 5-25; floors 1-10; wall/trim: brick|stone_bricks|planks|glass|sandstone|ice|snow|color_red|color_pink...; doors, stairs, windows, lamps always included)',
  villager_spawn: '{"tool":"villager_spawn","args":{"job":"doctor","name":"Patient Pat"}}  (job: doctor|teacher|shopkeeper|firefighter|baker|farmer|builder|musician|random)',
  build_stamp_blueprint: '{"tool":"build_stamp_blueprint","args":{"blueprint":"bridge","color":"color_pink"}}  (only for bridge, pool, garden, treehouse; color optional)',
  build_shape: '{"tool":"build_shape","args":{"shape":"pyramid","block":"sandstone","size":6}}  (shape: pyramid|tower|cube|platform|wall|ring|line|tree|arch; size 2-16)',
  build_room: '{"tool":"build_room","args":{"block":"planks"}}  (a small room with a doorway)',
  world_place_block: '{"tool":"world_place_block","args":{"block":"brick"}}',
  world_fill: '{"tool":"world_fill","args":{"block":"water","x1":0,"y1":1,"z1":0,"x2":4,"y2":1,"z2":4}}',
  villager_talk: '{"tool":"villager_talk","args":{"choice":"play"}}  (play = follow the child; gift = hand over a present)',
  villager_walk_to: '{"tool":"villager_walk_to","args":{"x":10,"z":10}}',
  villager_stay: '{"tool":"villager_stay","args":{}}',
  villager_dance: '{"tool":"villager_dance","args":{}}  (you dance)',
  player_dance: '{"tool":"player_dance","args":{}}  (the child dances)',
  player_fly: '{"tool":"player_fly","args":{"on":true}}  (the child flies; on:false lands)',
  vehicle_ride: '{"tool":"vehicle_ride","args":{"kind":"plane"}}  (YOU drive or fly it around; kind: car|motorcycle|boat|plane|helicopter; one appears if none is near)',
  vehicle_stop: '{"tool":"vehicle_stop","args":{}}  (you hop off)',
  time_set: '{"tool":"time_set","args":{"mode":"night"}}  (mode: day|night|cycle)',
  weather_set: '{"tool":"weather_set","args":{"weather":"rain"}}  (sunny|rain|snow)',
  pet_adopt: '{"tool":"pet_adopt","args":{"kind":"dog"}}  (dog|cat)',
  vehicle_spawn: '{"tool":"vehicle_spawn","args":{"kind":"car"}}  (a ride for the CHILD; car|motorcycle|boat|plane|helicopter)',
  entity_spawn: '{"tool":"entity_spawn","args":{"kind":"bunny"}}  (bunny|chick|butterfly)',
  audio_play: '{"tool":"audio_play","args":{"sound":"happy"}}  (happy|pop|vroom|splash|gift|click)',
};

/** Worked examples shown to the model before the child's message. */
export const PROMPT_EXAMPLES: Array<{ user: string; say: string; actions: string }> = [
  { user: 'hi there', say: "Hi! I'm {name}, the {job}. What shall we make? 😊", actions: '[]' },
  { user: 'go fly an airplane', say: 'Watch me take off! ✈️ Wheee!', actions: '[{"tool":"vehicle_ride","args":{"kind":"plane"}}]' },
  { user: 'build a massive pink mansion', say: 'A massive pink mansion! 🏠 Watch me build it!', actions: '[{"tool":"build_house","args":{"type":"house","width":15,"depth":13,"floors":3,"wall":"color_pink","furnish":true}}]' },
  { user: 'a huge hospital with doctors and patients and the canadian flag', say: 'A big hospital with a red cross! 🏥', actions: '[{"tool":"build_house","args":{"type":"hospital","width":15,"depth":13,"floors":3,"wall":"color_white","trim":"color_red","furnish":true,"sign":"cross","flag":"canada"}},{"tool":"villager_spawn","args":{"job":"doctor"}},{"tool":"villager_spawn","args":{"job":"random","name":"Patient Pat"}}]' },
  { user: 'build a skyscraper', say: 'Up, up, up! 🏙️', actions: '[{"tool":"build_house","args":{"type":"skyscraper","width":9,"depth":9,"floors":6,"wall":"glass","trim":"stone_bricks"}}]' },
  { user: 'make it rain and give me a puppy', say: 'Rain and a puppy! 🌧️🐶', actions: '[{"tool":"weather_set","args":{"weather":"rain"}},{"tool":"pet_adopt","args":{"kind":"dog"}}]' },
];

export class WebLlmProvider implements ChatProvider {
  readonly name = 'helper';
  private engine: HelperEngine | null = null;
  private loading: Promise<void> | null = null;
  enabled = false;
  /** Progress while loading, for the UI. */
  onProgress: ((p: HelperProgress) => void) | null = null;
  status: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
  error = '';
  /** Ask for JSON-constrained decoding (off on Safari, where it stalls). */
  jsonMode = !isSafari();
  /** Reply time limit, milliseconds. */
  timeoutMs = HELPER_TIMEOUT_MS;
  info: HelperInfo | null = null;
  private busySince: number | null = null;
  private lastPrompt = '';
  private lastRaw = '';
  private lastLatencyMs: number | null = null;
  private replies = 0;

  diagnostics(): HelperDiagnostics {
    return { status: this.status, error: this.error, info: this.info, jsonMode: this.jsonMode, busySince: this.busySince, lastPrompt: this.lastPrompt, lastRaw: this.lastRaw, lastLatencyMs: this.lastLatencyMs, replies: this.replies };
  }

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

  get model(): string {
    return this.modelId;
  }

  /** Switch sizes; a loaded model is unloaded and must be loaded again. */
  async setModel(id: string): Promise<void> {
    if (id === this.modelId) return;
    this.modelId = id;
    this.info = null;
    await this.unload();
  }

  /** Downloads (first time) or loads from the cache. Safe to call again. */
  load(): Promise<void> {
    if (this.engine) return Promise.resolve();
    if (this.loading) return this.loading;
    this.status = 'loading';
    this.loading = this.factory(this.modelId, (p) => this.onProgress?.(p), (info) => { this.info = info; })
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
      '"actions": a list of tool calls, empty unless the child asks you to do something. Copy these templates exactly and change only the values:',
      ...tools.map((name) => `- ${TOOL_TEMPLATES[name] ?? `{"tool":"${name}","args":{}}`}`),
      `Blueprints: ${ctx.blueprints.map((b) => b.id).join(', ')}. Blocks: ${ctx.blocks.slice(0, 28).map((b) => b.id).join(', ')}.`,
      `Leave out x, y, z to build right in front of the child (that spot is x=${ctx.site.x}, y=${ctx.site.y}, z=${ctx.site.z}).`,
    ].join('\n');
  }

  async reply(ctx: ChatContext): Promise<ChatReply> {
    if (!this.engine) throw new Error('helper not loaded');
    const messages: HelperRequest['messages'] = [{ role: 'system', content: this.systemPrompt(ctx) }];
    for (const ex of PROMPT_EXAMPLES) {
      messages.push({ role: 'user', content: ex.user });
      messages.push({ role: 'assistant', content: `{"say":"${ex.say.replace('{name}', ctx.villager.name).replace('{job}', ctx.villager.jobLabel)}","actions":${ex.actions}}` });
    }
    for (const turn of ctx.history.slice(-4)) messages.push({ role: turn.who === 'kid' ? 'user' : 'assistant', content: turn.text.slice(0, 160) });
    messages.push({ role: 'user', content: ctx.message });
    this.lastPrompt = messages.map((m) => `[${m.role}]\n${m.content}`).join('\n\n');
    this.busySince = Date.now();
    const ask = async (json: boolean): Promise<ChatReply> => {
      const request = this.engine!.chat.completions.create({ messages, temperature: 0.5, max_tokens: 160, ...(json ? { response_format: { type: 'json_object' as const } } : {}) });
      try {
        const result = await withTimeout(request, this.timeoutMs, 'The helper');
        this.lastRaw = result.choices[0]?.message.content ?? '';
        this.lastLatencyMs = Date.now() - (this.busySince ?? Date.now());
        this.replies += 1;
        return parseModelReply(this.lastRaw);
      } finally {
        this.busySince = null;
      }
    };
    if (!this.jsonMode) return ask(false);
    try {
      return await ask(true);
    } catch (error) {
      // JSON mode can fail on some builds; a plain answer is usually still parseable.
      this.error = error instanceof Error ? error.message : String(error);
      if (/took longer/.test(this.error)) throw error;
      return ask(false);
    }
  }
}
