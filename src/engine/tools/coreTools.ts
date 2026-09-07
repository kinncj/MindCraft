import type { Engine } from '../core/Engine';
import { resolveBlockId } from '../blocks/blocks';
import { SetBlocksCommand, type BlockEdit } from '../commands/Command';
import { WORLD_HEIGHT } from '../world/coords';
import { InfiniteGenerator } from '../world/generation/InfiniteGenerator';

/**
 * The tools every world exposes: player, world, time, weather, camera,
 * creatures, and undo. Features register their own domains (villager_*,
 * pet_*, vehicle_*, crafting_*, logic_*) when they load.
 */
export function registerCoreTools(engine: Engine): void {
  const { tools, registry } = engine;
  const blockId = (name: string): number => {
    const def = resolveBlockId(name);
    if (!def) throw new Error(`unknown block "${name}"`);
    return def.numericId;
  };
  const int = { type: 'integer' };
  const num = { type: 'number' };

  // --- player ---
  tools.register({
    name: 'player_get_state',
    description: 'Where the player is, where they look, and whether they are on the ground or swimming.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => ({
      ...engine.playerState(),
      onGround: engine.player.onGround,
      inWater: engine.player.inWater,
      viewMode: engine.camera.viewMode,
    }),
  });
  tools.register({
    name: 'player_walk_to',
    description: 'Walk the player toward a point (x, z). Returns immediately; the player keeps walking.',
    inputSchema: { type: 'object', properties: { x: num, z: num }, required: ['x', 'z'] },
    execute: ({ x, z }: { x: number; z: number }) => {
      engine.autoWalk = { x, z };
      return { walking: true };
    },
  });
  tools.register({
    name: 'player_stop',
    description: 'Stop any walking started by player_walk_to.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => {
      engine.autoWalk = null;
      return { walking: false };
    },
  });
  tools.register({
    name: 'player_teleport',
    description: 'Move the player instantly. y is optional (lands on the surface).',
    inputSchema: { type: 'object', properties: { x: num, y: num, z: num }, required: ['x', 'z'] },
    execute: ({ x, y, z }: { x: number; y?: number; z: number }) => {
      const surface = engine.world.height(Math.round(x), Math.round(z));
      const ty = y ?? (surface >= 0 ? surface + 0.5 : engine.generator.surfaceHeight(Math.round(x), Math.round(z)) + 0.5);
      engine.player.teleport(x, ty, z);
      return engine.playerState();
    },
  });
  tools.register({
    name: 'player_look',
    description: 'Turn the camera. yaw and pitch in radians; either may be omitted.',
    inputSchema: { type: 'object', properties: { yaw: num, pitch: num } },
    execute: ({ yaw, pitch }: { yaw?: number; pitch?: number }) => {
      if (yaw !== undefined) engine.camera.yaw = yaw;
      if (pitch !== undefined) engine.camera.pitch = pitch;
      return { yaw: engine.camera.yaw, pitch: engine.camera.pitch };
    },
  });
  tools.register({
    name: 'player_jump',
    description: 'Jump once.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => {
      engine.input.frame.jump = true;
      if (engine.player.onGround) engine.player.vy = 8.2;
      return { jumped: true };
    },
  });
  tools.register({
    name: 'player_respawn',
    description: 'Return the player to the world spawn point.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => {
      engine.respawn();
      return engine.playerState();
    },
  });

  // --- world ---
  tools.register({
    name: 'world_get_block',
    description: 'The block at a position: its id and state byte, or "air".',
    inputSchema: { type: 'object', properties: { x: int, y: int, z: int }, required: ['x', 'y', 'z'] },
    execute: ({ x, y, z }: { x: number; y: number; z: number }) => ({
      block: registry.get(engine.world.getBlock(x, y, z))?.id ?? 'air',
      state: engine.world.getState(x, y, z),
      loaded: engine.world.isLoaded(x, z),
    }),
  });
  tools.register({
    name: 'world_place_block',
    description: 'Place a block by id (see world_list_blocks). Fails if the cell is occupied or not loaded.',
    inputSchema: { type: 'object', properties: { x: int, y: int, z: int, block: { type: 'string' } }, required: ['x', 'y', 'z', 'block'] },
    execute: ({ x, y, z, block }: { x: number; y: number; z: number; block: string }) => ({
      placed: engine.interaction.placeBlock(x, y, z, blockId(block)),
    }),
  });
  tools.register({
    name: 'world_remove_block',
    description: 'Remove the block at a position.',
    inputSchema: { type: 'object', properties: { x: int, y: int, z: int }, required: ['x', 'y', 'z'] },
    execute: ({ x, y, z }: { x: number; y: number; z: number }) => ({ removed: engine.interaction.removeBlock(x, y, z) }),
  });
  tools.register({
    name: 'world_interact',
    description: 'Tap a block: open a box, toggle a door, use a bed.',
    inputSchema: { type: 'object', properties: { x: int, y: int, z: int }, required: ['x', 'y', 'z'] },
    execute: ({ x, y, z }: { x: number; y: number; z: number }) => ({ handled: engine.interaction.interact(x, y, z) }),
  });
  tools.register({
    name: 'world_fill',
    description: 'Fill a box from (x1,y1,z1) to (x2,y2,z2) with a block ("air" clears). One undo step. Max 20k blocks.',
    inputSchema: {
      type: 'object',
      properties: { x1: int, y1: int, z1: int, x2: int, y2: int, z2: int, block: { type: 'string' } },
      required: ['x1', 'y1', 'z1', 'x2', 'y2', 'z2', 'block'],
    },
    execute: (a: { x1: number; y1: number; z1: number; x2: number; y2: number; z2: number; block: string }) => {
      const id = a.block === 'air' ? 0 : blockId(a.block);
      const edits: BlockEdit[] = [];
      const [x0, x1] = [Math.min(a.x1, a.x2), Math.max(a.x1, a.x2)];
      const [y0, y1] = [Math.max(0, Math.min(a.y1, a.y2)), Math.min(WORLD_HEIGHT - 1, Math.max(a.y1, a.y2))];
      const [z0, z1] = [Math.min(a.z1, a.z2), Math.max(a.z1, a.z2)];
      if ((x1 - x0 + 1) * (y1 - y0 + 1) * (z1 - z0 + 1) > 20000) throw new Error('that fill is too big (max 20000 blocks)');
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
        if (engine.world.isLoaded(x, z)) edits.push({ x, y, z, id, state: 0, entity: null });
      }
      engine.history.run(new SetBlocksCommand(`Fill ${a.block}`, edits));
      return { filled: edits.length };
    },
  });
  tools.register({
    name: 'world_surface_height',
    description: 'The y of the highest block in a column (-1 if not loaded).',
    inputSchema: { type: 'object', properties: { x: int, z: int }, required: ['x', 'z'] },
    execute: ({ x, z }: { x: number; z: number }) => ({ y: engine.world.height(x, z) }),
  });
  tools.register({
    name: 'world_biome_at',
    description: 'The biome at a column (meadow, forest, cherry, desert, snowy, hills, beach, ocean).',
    inputSchema: { type: 'object', properties: { x: int, z: int }, required: ['x', 'z'] },
    execute: ({ x, z }: { x: number; z: number }) => ({
      biome: engine.generator instanceof InfiniteGenerator ? engine.generator.biomeOf(x, z) : 'flat',
    }),
  });
  tools.register({
    name: 'world_list_blocks',
    description: 'Every placeable block id with its label and category.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => registry.palette().map((d) => ({ id: d.id, label: d.label, category: d.category, shape: d.shape })),
  });
  tools.register({
    name: 'world_spawn_point',
    description: 'Where new players start in this world.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => engine.spawn,
  });
  tools.register({
    name: 'world_save',
    description: 'Save every edited chunk now.',
    inputSchema: { type: 'object', properties: {} },
    execute: async () => {
      await engine.save();
      return { saved: true };
    },
  });

  // --- history ---
  tools.register({
    name: 'history_undo',
    description: 'Undo the last edit.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => ({ undone: engine.history.undo()?.label ?? null }),
  });
  tools.register({
    name: 'history_redo',
    description: 'Redo the last undone edit.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => ({ redone: engine.history.redo()?.label ?? null }),
  });

  // --- time, weather, camera, visuals ---
  tools.register({
    name: 'time_set',
    description: 'Set the time of day: mode cycle/day/night, or an exact time 0..1 (0.3 morning, 0.8 night).',
    inputSchema: { type: 'object', properties: { mode: { type: 'string', enum: ['cycle', 'day', 'night'] }, time: num } },
    execute: ({ mode, time }: { mode?: 'cycle' | 'day' | 'night'; time?: number }) => {
      if (mode) engine.setTimeMode(mode);
      if (time !== undefined) engine.environment.setTime(time);
      return { time: engine.environment.time };
    },
  });
  tools.register({
    name: 'weather_set',
    description: 'Set the weather: sunny, rain, or snow.',
    inputSchema: { type: 'object', properties: { weather: { type: 'string', enum: ['sunny', 'rain', 'snow'] } }, required: ['weather'] },
    execute: ({ weather }: { weather: 'sunny' | 'rain' | 'snow' }) => {
      engine.setWeather(weather);
      return { weather };
    },
  });
  tools.register({
    name: 'camera_set_view',
    description: 'Switch between first-person and third-person camera.',
    inputSchema: { type: 'object', properties: { mode: { type: 'string', enum: ['first', 'third'] } }, required: ['mode'] },
    execute: ({ mode }: { mode: 'first' | 'third' }) => {
      engine.camera.setViewMode(mode);
      return { mode };
    },
  });

  // --- creatures ---
  tools.register({
    name: 'entity_list',
    description: 'Every creature currently in the world with its position and mood.',
    inputSchema: { type: 'object', properties: {} },
    execute: () =>
      engine.entities.entities.map((e) => ({ id: e.id, kind: e.kind, name: e.name ?? null, x: e.x, y: e.y, z: e.z, mood: e.mood })),
  });
  tools.register({
    name: 'entity_spawn',
    description: 'Spawn an animal (bunny, chick, butterfly) near a point (defaults to the player).',
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['bunny', 'chick', 'butterfly'] }, x: num, z: num }, required: ['kind'] },
    execute: ({ kind, x, z }: { kind: 'bunny' | 'chick' | 'butterfly'; x?: number; z?: number }) => {
      const e = engine.entities.spawn(kind, x ?? engine.player.x + 2, z ?? engine.player.z + 2);
      return { id: e.id, kind: e.kind };
    },
  });
  tools.register({
    name: 'entity_pet',
    description: 'Pet a creature by id. It does a happy hop.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    execute: ({ id }: { id: string }) => {
      const e = engine.entities.entities.find((x) => x.id === id);
      if (!e) throw new Error(`no creature ${id}`);
      engine.entities.pet(e);
      return { mood: e.mood };
    },
  });
  tools.register({
    name: 'entity_remove',
    description: 'Send a creature away (it disappears).',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
    execute: ({ id }: { id: string }) => ({ removed: engine.entities.remove(id) }),
  });
}
