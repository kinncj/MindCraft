import { expect, test } from '@playwright/test';
import { callTool, startGame } from './helpers';

test('the tool registry exposes every domain an agent needs', async ({ page }) => {
  await startGame(page);
  const names = await page.evaluate(() => window.mindcraftTools!.list().map((t) => t.name));
  for (const expected of [
    'player_get_state', 'player_walk_to', 'player_teleport', 'player_look', 'player_jump', 'player_respawn',
    'world_get_block', 'world_place_block', 'world_remove_block', 'world_fill', 'world_interact', 'world_surface_height',
    'world_biome_at', 'world_list_blocks', 'world_save', 'history_undo', 'history_redo',
    'time_set', 'weather_set', 'camera_set_view', 'entity_list', 'entity_spawn', 'entity_pet',
  ]) {
    expect(names, expected).toContain(expected);
  }
  expect(names.every((n) => /^[a-z]+(_[a-z0-9]+)+$/.test(n))).toBe(true);
});

test('an agent can walk the player somewhere and build a wall', async ({ page }) => {
  await startGame(page);
  const start = (await callTool(page, 'player_get_state')) as { x: number; z: number };
  await callTool(page, 'player_walk_to', { x: start.x + 4, z: start.z });
  await expect
    .poll(async () => ((await callTool(page, 'player_get_state')) as { x: number }).x, { timeout: 15_000 })
    .toBeGreaterThan(start.x + 3);

  const spawn = await page.evaluate(() => window.mindcraftDebug!.spawn());
  const result = (await callTool(page, 'world_fill', {
    x1: spawn.x - 6, y1: spawn.y + 10, z1: spawn.z + 6, x2: spawn.x - 2, y2: spawn.y + 12, z2: spawn.z + 6, block: 'color_red',
  })) as { filled: number };
  expect(result.filled).toBe(15);
  expect(await page.evaluate((s) => window.mindcraftDebug!.blockAt(s.x - 4, s.y + 11, s.z + 6), spawn)).toBe('color_red');
  await callTool(page, 'history_undo');
  expect(await page.evaluate((s) => window.mindcraftDebug!.blockAt(s.x - 4, s.y + 11, s.z + 6), spawn)).toBe('air');
});

test('tools validate their input and report creatures', async ({ page }) => {
  await startGame(page);
  await expect(callTool(page, 'world_place_block', { x: 1, y: 2 })).rejects.toThrow(/missing/);
  await expect(callTool(page, 'weather_set', { weather: 'lava' })).rejects.toThrow(/one of/);
  const spawned = (await callTool(page, 'entity_spawn', { kind: 'bunny' })) as { id: string };
  const list = (await callTool(page, 'entity_list')) as Array<{ id: string; kind: string }>;
  expect(list.some((e) => e.id === spawned.id && e.kind === 'bunny')).toBe(true);
  expect(await callTool(page, 'entity_pet', { id: spawned.id })).toEqual({ mood: 'happy' });
  expect(await callTool(page, 'time_set', { mode: 'night' })).toEqual({ time: 0.8 });
});
