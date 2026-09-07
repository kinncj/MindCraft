import { BLUEPRINTS, blueprintById } from '../build/blueprints';
import type { BuildTools } from '../build/BuildTools';
import type { BlockEdit } from '../commands/Command';
import type { EntitySystem } from '../entities/EntitySystem';
import { jobById } from '../entities/villagers';
import type { BlockRegistry } from '../blocks/registry';
import { resolveBlockId } from '../blocks/blocks';
import type { ToolRegistry } from '../tools/ToolRegistry';
import { BuiltInModelProvider } from './BuiltInModelProvider';
import { RuleChatProvider, rotationFromYaw } from './RuleChatProvider';
import type { WebLlmProvider } from './WebLlmProvider';
import { sharedHelper } from './helperSingleton';
import { CHAT_TOOL_ALLOWLIST, HANDS_ON_TOOLS, type ChatAction, type ChatContext, type ChatProvider, type ChatReply, type ChatTurn } from './types';

export type ChatResult = ChatReply & { provider: string; performed: string[] };

/**
 * Routes a chat message to a provider and performs the reply's actions.
 * Provider order: an external agent registered on the page (a WebMCP
 * client, a bridge to an MCP server), then the browser's built-in model
 * when the parent allowed it, then the rule provider. Hands-on tools are
 * planned into block edits and handed to the villager to lay by hand.
 */
export class ChatAgent {
  smart = false;
  private external: ChatProvider | null = null;
  private builtIn = new BuiltInModelProvider();
  /** The downloadable on-device model (WebLLM), off until a grown-up enables it. */
  readonly helper: WebLlmProvider;
  private rules = new RuleChatProvider();
  private histories = new Map<string, ChatTurn[]>();
  /** Why the last smarter provider fell back to the rules, for the UI. */
  lastError = '';

  constructor(
    private deps: {
      tools: ToolRegistry;
      entities: EntitySystem;
      build: BuildTools;
      registry: BlockRegistry;
      player: () => { x: number; y: number; z: number; yaw: number };
      surface: (x: number, z: number) => number;
      say: (villagerId: string, text: string) => void;
      helper?: WebLlmProvider;
      world?: () => { timeOfDay: number; weather: string; biome: string; worldName: string };
    },
  ) {
    this.helper = deps.helper ?? sharedHelper();
  }

  registerProvider(provider: ChatProvider | null): void {
    this.external = provider;
  }

  get providerName(): string {
    if (this.external) return this.external.name;
    if (this.helper.enabled && this.helper.ready) return 'helper';
    return this.smart ? 'built-in' : 'rules';
  }

  async builtInAvailable(): Promise<boolean> {
    return this.builtIn.available();
  }

  history(villagerId: string): ChatTurn[] {
    return this.histories.get(villagerId) ?? [];
  }

  private context(villagerId: string, message: string): ChatContext | null {
    const entity = this.deps.entities.byId(villagerId);
    if (!entity || entity.kind !== 'villager') return null;
    const job = jobById(entity.variant ?? '');
    const player = this.deps.player();
    const dx = -Math.sin(player.yaw);
    const dz = -Math.cos(player.yaw);
    const sx = Math.round(player.x + dx * 7);
    const sz = Math.round(player.z + dz * 7);
    const top = this.deps.surface(sx, sz);
    return {
      villager: { id: entity.id, name: entity.name ?? 'Friend', job: job?.id ?? 'villager', jobLabel: job?.label ?? 'Villager', emoji: job?.emoji ?? '🧑', x: entity.x, z: entity.z },
      message,
      history: this.history(villagerId),
      player,
      site: { x: sx, y: (top >= 0 ? top : Math.round(player.y) - 1) + 1, z: sz },
      blueprints: BLUEPRINTS.map((b) => ({ id: b.id, label: b.label })),
      blocks: this.deps.registry.palette().filter((d) => !d.spawns).map((d) => ({ id: d.id, label: d.label })),
      tools: this.deps.tools.list().map((t) => ({ name: t.name, description: t.description })),
      world: this.deps.world?.() ?? { timeOfDay: 0.3, weather: 'sunny', biome: 'meadow', worldName: 'My World' },
    };
  }

  async send(villagerId: string, message: string): Promise<ChatResult | null> {
    const ctx = this.context(villagerId, message.trim().slice(0, 200));
    if (!ctx) return null;
    let reply: ChatReply;
    let provider = 'rules';
    const candidates: ChatProvider[] = [];
    if (this.external) candidates.push(this.external);
    candidates.push(this.helper);
    if (this.smart) candidates.push(this.builtIn);
    candidates.push(this.rules);
    reply = { say: '', actions: [] };
    this.lastError = '';
    for (const p of candidates) {
      try {
        if (!(await p.available())) continue;
        reply = await p.reply(ctx);
        provider = p.name;
        break;
      } catch (error) {
        // Try the next, plainer provider, but say why in the console.
        this.lastError = `${p.name}: ${error instanceof Error ? error.message : String(error)}`;
        console.warn('[MindCraft chat]', this.lastError);
      }
    }
    const performed = await this.perform(villagerId, reply.actions, ctx);
    const turns = this.history(villagerId);
    turns.push({ who: 'kid', text: ctx.message }, { who: 'villager', text: reply.say });
    this.histories.set(villagerId, turns.slice(-12));
    this.deps.say(villagerId, reply.say);
    return { ...reply, provider, performed };
  }

  /** Runs actions: hands-on ones become villager work, the rest are tool calls. */
  async perform(villagerId: string, actions: ChatAction[], ctx: ChatContext): Promise<string[]> {
    const performed: string[] = [];
    for (const action of actions.slice(0, 3)) {
      if (!(CHAT_TOOL_ALLOWLIST as readonly string[]).includes(action.tool)) continue;
      try {
        if ((HANDS_ON_TOOLS as readonly string[]).includes(action.tool)) {
          const plan = this.plan(action, ctx);
          if (plan && plan.edits.length > 0) {
            this.deps.entities.assignWork(villagerId, plan.label, plan.edits);
            performed.push(`${action.tool}:${plan.edits.length}`);
          }
        } else {
          const args = { ...action.args };
          if (['villager_talk', 'villager_stay', 'villager_walk_to', 'villager_say', 'villager_dance'].includes(action.tool)) args.id = villagerId;
          await this.deps.tools.call(action.tool, args);
          performed.push(action.tool);
        }
      } catch {
        // A bad argument from a provider must never break the chat.
      }
    }
    return performed;
  }

  /** Turns a hands-on tool call into a list of edits, without applying it. */
  plan(action: ChatAction, ctx: ChatContext): { label: string; edits: BlockEdit[] } | null {
    const a = action.args;
    const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback);
    const blockId = (name: unknown): number | null => {
      if (typeof name !== 'string') return null;
      if (name === 'air') return 0;
      return resolveBlockId(name)?.numericId ?? null;
    };
    switch (action.tool) {
      case 'build_stamp_blueprint': {
        const bp = blueprintById(String(a.blueprint));
        if (!bp) return null;
        const rotation = num(a.rotation, rotationFromYaw(ctx.player.yaw));
        const paint = typeof a.color === 'string' ? blockId(a.color) : null;
        const planks = this.deps.registry.numericOf('planks');
        const remap = paint ? (id: number) => (id === planks ? paint : id) : undefined;
        return { label: `Build ${bp.label}`, edits: this.deps.build.planStamp(bp.stamp, num(a.x, ctx.site.x), num(a.y, ctx.site.y), num(a.z, ctx.site.z), rotation, remap) };
      }
      case 'build_shape': {
        const id = blockId(a.block) ?? this.deps.registry.numericOf('sandstone');
        const shape = String(a.shape ?? 'pyramid');
        const edits = this.deps.build.planShape(shape, num(a.x, ctx.site.x), num(a.y, ctx.site.y), num(a.z, ctx.site.z), id, num(a.size, 5));
        return edits.length ? { label: `Build a ${shape}`, edits } : null;
      }
      case 'build_room': {
        const id = blockId(a.block) ?? this.deps.registry.numericOf('planks');
        return { label: 'Build a room', edits: this.deps.build.planRoom({ x: num(a.x1, ctx.site.x - 3), y: num(a.y1, ctx.site.y - 1), z: num(a.z1, ctx.site.z - 3) }, { x: num(a.x2, ctx.site.x + 3), y: num(a.y1, ctx.site.y - 1), z: num(a.z2, ctx.site.z + 3) }, id) };
      }
      case 'world_fill': {
        const id = blockId(a.block);
        if (id === null) return null;
        return { label: 'Fill', edits: this.deps.build.planFill({ x: num(a.x1, ctx.site.x), y: num(a.y1, ctx.site.y), z: num(a.z1, ctx.site.z) }, { x: num(a.x2, ctx.site.x), y: num(a.y2, ctx.site.y), z: num(a.z2, ctx.site.z) }, id) };
      }
      case 'world_place_block': {
        const id = blockId(a.block);
        if (id === null) return null;
        return { label: 'Place a block', edits: [{ x: num(a.x, ctx.site.x), y: num(a.y, ctx.site.y), z: num(a.z, ctx.site.z), id, state: 0 }] };
      }
      default:
        return null;
    }
  }
}
