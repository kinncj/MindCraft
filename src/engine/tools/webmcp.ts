import type { ToolRegistry } from './ToolRegistry';
import type { ChatAgent } from '../chat/ChatAgent';
import type { ChatProvider } from '../chat/types';

/**
 * Exposes the tool registry to agents.
 *
 * 1. WebMCP: browsers that implement `navigator.modelContext` get every
 *    tool registered natively, so a browser agent can call
 *    `player_move` or `world_place_block` directly.
 * 2. `window.mindcraftTools`: always present. Playwright, bookmarklets,
 *    and bridges to external MCP servers use it. The game is fully local
 *    and has no secrets, so exposing this costs nothing.
 */

type ModelContextTool = {
  name: string;
  description: string;
  inputSchema: unknown;
  execute(input: Record<string, unknown>): unknown;
};

type ModelContext = {
  registerTool?(tool: ModelContextTool): unknown;
  unregisterTool?(name: string): unknown;
  provideContext?(context: { tools: ModelContextTool[] }): unknown;
};

export type ToolBridge = {
  list(): Array<{ name: string; description: string; inputSchema: unknown }>;
  call(name: string, input?: Record<string, unknown>): Promise<unknown>;
};

/**
 * `window.mindcraftChat`: an outside agent (a WebMCP client, a bridge to
 * an MCP server) can answer villager chats by registering a provider:
 * `{ name, available: async () => true, reply: async (ctx) => ({ say, actions }) }`.
 */
export type ChatBridge = {
  register(provider: ChatProvider): () => void;
  provider(): string;
};

declare global {
  interface Window {
    mindcraftChat?: ChatBridge;
  }
}

declare global {
  interface Navigator {
    modelContext?: ModelContext;
  }
  interface Window {
    mindcraftTools?: ToolBridge;
  }
}

export function exposeTools(registry: ToolRegistry, chat?: ChatAgent): () => void {
  const bridge: ToolBridge = {
    list: () => registry.list().map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
    call: (name, input) => registry.call(name, input),
  };
  window.mindcraftTools = bridge;
  if (chat) {
    window.mindcraftChat = {
      register: (provider) => {
        chat.registerProvider(provider);
        return () => chat.registerProvider(null);
      },
      provider: () => chat.providerName,
    };
  }

  const sync = (): void => publishToModelContext(registry);
  sync();
  const unsubscribe = registry.subscribe(sync);

  return () => {
    unsubscribe();
    delete window.mindcraftTools;
    delete window.mindcraftChat;
    const mc = navigator.modelContext;
    if (mc?.unregisterTool) for (const name of registry.names()) mc.unregisterTool(name);
    else mc?.provideContext?.({ tools: [] });
  };
}

const registeredNames = new Set<string>();

function publishToModelContext(registry: ToolRegistry): void {
  const mc = typeof navigator !== 'undefined' ? navigator.modelContext : undefined;
  if (!mc) return;
  const tools: ModelContextTool[] = registry.list().map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    execute: (input) => registry.call(tool.name, input),
  }));
  try {
    if (mc.registerTool) {
      for (const tool of tools) {
        if (registeredNames.has(tool.name)) continue;
        mc.registerTool(tool);
        registeredNames.add(tool.name);
      }
    } else if (mc.provideContext) {
      mc.provideContext({ tools });
    }
  } catch {
    // An experimental API changing shape must never break the game.
  }
}
