import { CHAT_TOOL_ALLOWLIST, type ChatAction, type ChatContext, type ChatProvider, type ChatReply } from './types';

/**
 * Uses the browser's own on-device language model when it exists (the
 * Prompt API, `LanguageModel`, shipped in some Chromium builds). Nothing
 * leaves the device and nothing is downloaded by us: we only use a model
 * the browser already has. Replies are forced into a small JSON shape,
 * validated, trimmed, and filtered before a child sees them.
 */

type LanguageModelSession = { prompt(text: string): Promise<string>; destroy?(): void };
type LanguageModelApi = {
  availability(): Promise<'available' | 'downloadable' | 'downloading' | 'unavailable' | string>;
  create(options?: { initialPrompts?: Array<{ role: string; content: string }>; temperature?: number; topK?: number }): Promise<LanguageModelSession>;
};

declare global {
  interface Window {
    LanguageModel?: LanguageModelApi;
  }
}

const MAX_SAY = 220;
const BLOCKED = /\b(kill|die|dead|blood|gun|knife|shoot|hate|stupid|dumb|scary|monster|zombie)\b/i;

export class BuiltInModelProvider implements ChatProvider {
  readonly name = 'built-in';
  private session: LanguageModelSession | null = null;
  private lastVillager = '';

  static api(): LanguageModelApi | undefined {
    return typeof window !== 'undefined' ? window.LanguageModel : undefined;
  }

  async available(): Promise<boolean> {
    try {
      const api = BuiltInModelProvider.api();
      if (!api) return false;
      return (await api.availability()) === 'available';
    } catch {
      return false;
    }
  }

  private systemPrompt(ctx: ChatContext): string {
    const v = ctx.villager;
    return [
      `You are ${v.name}, a friendly ${v.jobLabel} villager in a block-building game played by a six-year-old.`,
      'Reply ONLY with JSON: {"say": string, "actions": [{"tool": string, "args": object}]}.',
      '"say" is one or two short, cheerful sentences with an emoji. Never scary, never rude, no links, no numbers longer than 3 digits.',
      'Use actions only when the child asks you to do something. Allowed tools:',
      ...ctx.tools.filter((t) => (CHAT_TOOL_ALLOWLIST as readonly string[]).includes(t.name)).map((t) => `- ${t.name}: ${t.description}`),
      `Blueprints for build_stamp_blueprint: ${ctx.blueprints.map((b) => b.id).join(', ')}.`,
      `Build at x=${ctx.site.x}, y=${ctx.site.y}, z=${ctx.site.z} unless told otherwise. Your id is "${v.id}".`,
      `Block ids you may place: ${ctx.blocks.slice(0, 60).map((b) => b.id).join(', ')}.`,
    ].join('\n');
  }

  async reply(ctx: ChatContext): Promise<ChatReply> {
    const api = BuiltInModelProvider.api();
    if (!api) throw new Error('no built-in model');
    if (!this.session || this.lastVillager !== ctx.villager.id) {
      this.session?.destroy?.();
      this.session = await api.create({ initialPrompts: [{ role: 'system', content: this.systemPrompt(ctx) }], temperature: 0.7, topK: 3 });
      this.lastVillager = ctx.villager.id;
    }
    const recent = ctx.history.slice(-4).map((t) => `${t.who === 'kid' ? 'Child' : ctx.villager.name}: ${t.text}`).join('\n');
    const raw = await this.session.prompt(`${recent ? recent + '\n' : ''}Child: ${ctx.message}\nReply as JSON.`);
    return parseModelReply(raw);
  }
}

/** Pulls a {say, actions} object out of a model reply, strictly. */
export function parseModelReply(raw: string): ChatReply {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no JSON in reply');
  const parsed = JSON.parse(raw.slice(start, end + 1)) as { say?: unknown; actions?: unknown };
  let say = typeof parsed.say === 'string' ? parsed.say : '';
  say = say.replace(/https?:\/\/\S+|www\.\S+|\S+@\S+/gi, '').replace(/[<>]/g, '').trim().slice(0, MAX_SAY);
  if (!say || BLOCKED.test(say)) throw new Error('reply not suitable');
  const actions: ChatAction[] = [];
  if (Array.isArray(parsed.actions)) {
    for (const a of parsed.actions.slice(0, 3)) {
      if (!a || typeof a !== 'object') continue;
      const tool = (a as { tool?: unknown }).tool;
      const args = (a as { args?: unknown }).args;
      if (typeof tool === 'string' && (CHAT_TOOL_ALLOWLIST as readonly string[]).includes(tool)) {
        actions.push({ tool, args: args && typeof args === 'object' ? (args as Record<string, unknown>) : {} });
      }
    }
  }
  return { say, actions };
}
