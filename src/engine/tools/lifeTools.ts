import type { Engine } from '../core/Engine';
import { JOBS } from '../entities/villagers';

/** villager_*, pet_*, vehicle_*, and dress-up tools. */
export function registerLifeTools(engine: Engine): void {
  const { tools, entities } = engine;
  const num = { type: 'number' };
  const str = { type: 'string' };
  const near = (x?: number, z?: number) => ({ x: x ?? engine.player.x + 2, z: z ?? engine.player.z + 2 });
  const describe = (e: { id: string; kind: string; variant?: string; name?: string; x: number; y: number; z: number; mood: string; brain: { kind: string } }) => ({
    id: e.id, kind: e.kind, variant: e.variant ?? null, name: e.name ?? null, x: e.x, y: e.y, z: e.z, mood: e.mood, brain: e.brain.kind,
  });

  tools.register({
    name: 'villager_list',
    description: 'Every villager: id, name, job, position.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => entities.entities.filter((e) => e.kind === 'villager').map(describe),
  });
  tools.register({
    name: 'villager_jobs',
    description: 'The jobs a villager can have.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => JOBS.map((j) => ({ id: j.id, label: j.label, emoji: j.emoji, gift: j.giftLabel })),
  });
  tools.register({
    name: 'villager_spawn',
    description: 'A new villager with a job (see villager_jobs, or "random") near the player or at (x, z).',
    inputSchema: { type: 'object', properties: { job: str, name: str, x: num, z: num } },
    execute: ({ job, name, x, z }: { job?: string; name?: string; x?: number; z?: number }) => {
      const at = near(x, z);
      return describe(entities.spawnVillager(job ?? 'random', at.x, at.z, name));
    },
  });
  tools.register({
    name: 'villager_talk',
    description: 'Talk to a villager: choice hi, gift, play (they follow you a while), or bye. Returns their line.',
    inputSchema: { type: 'object', properties: { id: str, choice: { type: 'string', enum: ['hi', 'gift', 'play', 'bye'] } }, required: ['id', 'choice'] },
    execute: ({ id, choice }: { id: string; choice: 'hi' | 'gift' | 'play' | 'bye' }) => {
      const reply = engine.talkTo(id, choice);
      if (!reply) throw new Error(`no villager ${id}`);
      return { line: reply.line, gift: reply.gift !== undefined ? engine.registry.get(reply.gift)?.id ?? null : null };
    },
  });
  tools.register({
    name: 'villager_chat',
    description: 'Say something to a villager as the child would. Returns what they answer and what they did.',
    inputSchema: { type: 'object', properties: { id: str, message: str }, required: ['id', 'message'] },
    execute: async ({ id, message }: { id: string; message: string }) => {
      const result = await engine.chat.send(id, message);
      if (!result) throw new Error(`no villager ${id}`);
      return result;
    },
  });
  tools.register({
    name: 'villager_say',
    description: 'Make a villager say a line (for outside agents answering chats).',
    inputSchema: { type: 'object', properties: { id: str, text: str }, required: ['id', 'text'] },
    execute: ({ id, text }: { id: string; text: string }) => {
      const e = entities.byId(id);
      if (!e || e.kind !== 'villager') throw new Error(`no villager ${id}`);
      e.happyTimer = 0.5;
      engine.sayAs(id, text.slice(0, 220));
      return { said: true };
    },
  });
  tools.register({
    name: 'villager_dance',
    description: 'A villager or pet dances for a few seconds.',
    inputSchema: { type: 'object', properties: { id: str, seconds: num }, required: ['id'] },
    execute: ({ id, seconds }: { id: string; seconds?: number }) => {
      const e = entities.byId(id);
      if (!e || e.vehicle) throw new Error(`no creature ${id}`);
      entities.dance(e, seconds ?? 6);
      engine.audio.play('happy');
      return describe(e);
    },
  });
  tools.register({
    name: 'player_fly',
    description: 'Creative flight on or off (default: toggle). While flying, jump rises and sneak sinks.',
    inputSchema: { type: 'object', properties: { on: { type: 'boolean' } } },
    execute: ({ on }: { on?: boolean }) => ({ flying: engine.setFlying(on ?? !engine.player.flying) }),
  });
  tools.register({
    name: 'player_dance',
    description: 'The player dances for a few seconds.',
    inputSchema: { type: 'object', properties: { seconds: num } },
    execute: ({ seconds }: { seconds?: number }) => {
      engine.dance(seconds ?? 6);
      return { dancing: true };
    },
  });
  tools.register({
    name: 'villager_stay',
    description: 'A villager waits where it is for a while.',
    inputSchema: { type: 'object', properties: { id: str, seconds: num }, required: ['id'] },
    execute: ({ id, seconds }: { id: string; seconds?: number }) => {
      const e = entities.byId(id);
      if (!e || e.kind !== 'villager') throw new Error(`no villager ${id}`);
      entities.stay(e, seconds ?? 60);
      return describe(e);
    },
  });
  tools.register({
    name: 'villager_build',
    description: 'A villager walks over and builds a blueprint (or fills a box with a block) by hand, block by block. One undo step when done.',
    inputSchema: { type: 'object', properties: { id: str, blueprint: str, block: str, x: num, y: num, z: num, x2: num, y2: num, z2: num, rotation: num }, required: ['id', 'x', 'y', 'z'] },
    execute: (a: { id: string; blueprint?: string; block?: string; x: number; y: number; z: number; x2?: number; y2?: number; z2?: number; rotation?: number }) => {
      const e = entities.byId(a.id);
      if (!e || e.kind !== 'villager') throw new Error(`no villager ${a.id}`);
      const ctx = { player: engine.playerState(), site: { x: Math.round(a.x), y: Math.round(a.y), z: Math.round(a.z) } };
      const action = a.blueprint
        ? { tool: 'build_stamp_blueprint', args: { blueprint: a.blueprint, x: a.x, y: a.y, z: a.z, rotation: a.rotation } }
        : { tool: 'world_fill', args: { x1: a.x, y1: a.y, z1: a.z, x2: a.x2 ?? a.x, y2: a.y2 ?? a.y, z2: a.z2 ?? a.z, block: a.block ?? 'planks' } };
      const plan = engine.chat.plan(action, ctx as never);
      if (!plan) throw new Error('nothing to build');
      entities.assignWork(a.id, plan.label, plan.edits);
      return { blocks: plan.edits.length, label: plan.label };
    },
  });
  tools.register({
    name: 'villager_walk_to',
    description: 'Send a villager (or pet) walking to (x, z).',
    inputSchema: { type: 'object', properties: { id: str, x: num, z: num }, required: ['id', 'x', 'z'] },
    execute: ({ id, x, z }: { id: string; x: number; z: number }) => {
      const e = entities.byId(id);
      if (!e || e.vehicle) throw new Error(`no creature ${id}`);
      e.targetX = x;
      e.targetZ = z;
      e.restTimer = 5;
      return describe(e);
    },
  });

  tools.register({
    name: 'pet_list',
    description: 'Every pet: id, name, kind, whether it follows.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => entities.entities.filter((e) => e.kind === 'pet').map(describe),
  });
  tools.register({
    name: 'pet_adopt',
    description: 'Adopt a dog or cat; it appears near the player (or at x, z) and follows.',
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['dog', 'cat'] }, name: str, x: num, z: num }, required: ['kind'] },
    execute: ({ kind, name, x, z }: { kind: 'dog' | 'cat'; name?: string; x?: number; z?: number }) => {
      const at = near(x, z);
      return describe(entities.spawnPet(kind, at.x, at.z, name));
    },
  });
  tools.register({
    name: 'pet_rename',
    description: 'Give a pet a new name.',
    inputSchema: { type: 'object', properties: { id: str, name: str }, required: ['id', 'name'] },
    execute: ({ id, name }: { id: string; name: string }) => {
      const e = entities.byId(id);
      if (!e || e.kind !== 'pet') throw new Error(`no pet ${id}`);
      e.name = name.trim().slice(0, 24) || e.name;
      return describe(e);
    },
  });
  tools.register({
    name: 'pet_follow',
    description: 'Tell a pet to follow you, stay, or wander.',
    inputSchema: { type: 'object', properties: { id: str, mode: { type: 'string', enum: ['follow', 'stay', 'wander'] } }, required: ['id', 'mode'] },
    execute: ({ id, mode }: { id: string; mode: 'follow' | 'stay' | 'wander' }) => {
      const e = entities.byId(id);
      if (!e || e.kind !== 'pet') throw new Error(`no pet ${id}`);
      entities.setPetBrain(e, mode);
      return describe(e);
    },
  });

  tools.register({
    name: 'vehicle_list',
    description: 'Every car and boat, and which one the player is riding.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => entities.entities.filter((e) => e.vehicle).map((e) => ({ ...describe(e), riding: entities.mounted === e, yaw: e.vehicle!.yaw })),
  });
  tools.register({
    name: 'vehicle_spawn',
    description: 'A new ride near the player or at (x, z): car, motorcycle, boat (needs water), plane, or helicopter.',
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['car', 'boat', 'motorcycle', 'plane', 'helicopter'] }, x: num, z: num }, required: ['kind'] },
    execute: ({ kind, x, z }: { kind: 'car' | 'boat' | 'motorcycle' | 'plane' | 'helicopter'; x?: number; z?: number }) => {
      const at = near(x, z);
      const top = engine.world.height(Math.round(at.x), Math.round(at.z));
      return describe(entities.spawnVehicle(kind, at.x, top >= 0 ? top + 0.5 : engine.player.y, at.z));
    },
  });
  tools.register({
    name: 'vehicle_mount',
    description: 'Hop into a vehicle by id. Then player input (or player_walk_to) drives it.',
    inputSchema: { type: 'object', properties: { id: str }, required: ['id'] },
    execute: ({ id }: { id: string }) => {
      const e = entities.byId(id);
      if (!e?.vehicle) throw new Error(`no vehicle ${id}`);
      return { riding: entities.mount(e) };
    },
  });
  tools.register({
    name: 'vehicle_dismount',
    description: 'Hop out of the current vehicle.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => ({ dismounted: entities.dismount() }),
  });

  tools.register({
    name: 'player_set_look',
    description: 'Dress up the player: hex colors for shirt, pants, skin, hair; hat none/cap/crown/cowboy/party; style boy/girl.',
    inputSchema: { type: 'object', properties: { shirt: str, pants: str, skin: str, hair: str, hat: { type: 'string', enum: ['none', 'cap', 'crown', 'cowboy', 'party'] }, style: { type: 'string', enum: ['boy', 'girl'] } } },
    execute: (look: { shirt?: string; pants?: string; skin?: string; hair?: string; hat?: 'none' | 'cap' | 'crown' | 'cowboy' | 'party'; style?: 'boy' | 'girl' }) => {
      for (const v of [look.shirt, look.pants, look.skin, look.hair]) if (v !== undefined && !/^#[0-9a-fA-F]{6}$/.test(v)) throw new Error(`"${v}" is not a hex color`);
      engine.setLook(look);
      return engine.avatar.look;
    },
  });
}
