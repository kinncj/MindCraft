/**
 * Villager chat. A kid types (or taps a chip); a provider answers with a
 * short line and, optionally, actions expressed as tool calls. The agent
 * runs the actions: builds are handed to the villager, who walks over and
 * lays the blocks; everything else goes through the tool registry.
 */
export type ChatAction = { tool: string; args: Record<string, unknown> };

export type ChatReply = { say: string; actions: ChatAction[] };

export type ChatTurn = { who: 'kid' | 'villager'; text: string };

export type ChatContext = {
  villager: { id: string; name: string; job: string; jobLabel: string; emoji: string; x: number; z: number; gender?: 'girl' | 'boy' };
  message: string;
  history: ChatTurn[];
  player: { x: number; y: number; z: number; yaw: number };
  /** A good spot to build: a few blocks in front of the player. */
  site: { x: number; y: number; z: number };
  blueprints: Array<{ id: string; label: string }>;
  blocks: Array<{ id: string; label: string }>;
  /** Tools the provider may call, with one-line descriptions. */
  tools: Array<{ name: string; description: string }>;
  /** What the world looks like right now, for honest answers. */
  world: { timeOfDay: number; weather: string; biome: string; worldName: string };
};

export interface ChatProvider {
  readonly name: string;
  available(): Promise<boolean>;
  reply(ctx: ChatContext): Promise<ChatReply>;
}

/** Tools a chat reply is allowed to trigger. Everything else is dropped. */
export const CHAT_TOOL_ALLOWLIST = [
  'build_stamp_blueprint',
  'build_house',
  'build_dig',
  'build_feature',
  'build_shape',
  'build_room',
  'world_place_block',
  'world_fill',
  'villager_spawn',
  'villager_talk',
  'villager_walk_to',
  'villager_stay',
  'villager_say',
  'villager_dance',
  'player_dance',
  'player_fly',
  'vehicle_ride',
  'vehicle_stop',
  'time_set',
  'weather_set',
  'pet_adopt',
  'vehicle_spawn',
  'entity_spawn',
  'audio_play',
] as const;

/** Tools whose edits the villager performs by hand, block by block. */
export const HANDS_ON_TOOLS = ['build_stamp_blueprint', 'build_house', 'build_dig',
  'build_feature', 'build_shape', 'build_room', 'world_place_block', 'world_fill'] as const;
