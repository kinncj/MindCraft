import { expect, test } from '@playwright/test';
import { blockAt, callTool, groundSpot, skySpot, startGame, surfaceAt, waitForSaved } from './helpers';

test('selecting a block from the hotbar highlights it', async ({ page }) => {
  await startGame(page);
  await page.getByRole('button', { name: /^Brick/ }).click();
  await expect(page.getByRole('button', { name: 'Brick, selected' })).toHaveAttribute('aria-pressed', 'true');
});

test('placing and removing a block through the tools updates the world', async ({ page }) => {
  await startGame(page);
  const spot = await skySpot(page);
  expect(await callTool(page, 'world_place_block', { ...spot, block: 'star' })).toEqual({ placed: true });
  expect(await blockAt(page, spot.x, spot.y, spot.z)).toBe('star');
  expect(await callTool(page, 'world_remove_block', spot)).toEqual({ removed: true });
  expect(await blockAt(page, spot.x, spot.y, spot.z)).toBe('air');
});

test('clicking terrain in the 3D view places the selected block', async ({ page }) => {
  await startGame(page);
  await page.getByRole('button', { name: /^Brick/ }).click();
  const target = await groundSpot(page);
  await page.mouse.click(target.screen.x, target.screen.y);
  await expect.poll(() => surfaceAt(page, target.x, target.z), { timeout: 5_000 }).toBe(target.top + 1);
  expect(await blockAt(page, target.x, target.top + 1, target.z)).toBe('brick');
  await expect(page.getByRole('button', { name: 'Undo the last change' })).toBeEnabled();
});

test('undo puts a placed block back and redo removes it again', async ({ page }) => {
  await startGame(page);
  const spot = await skySpot(page);
  await callTool(page, 'world_place_block', { ...spot, block: 'brick' });
  await page.getByRole('button', { name: 'Undo the last change' }).click();
  expect(await blockAt(page, spot.x, spot.y, spot.z)).toBe('air');
  await page.getByRole('button', { name: 'Redo' }).click();
  expect(await blockAt(page, spot.x, spot.y, spot.z)).toBe('brick');
});

test('first-person view places blocks through the crosshair', async ({ page }) => {
  await startGame(page);
  await page.getByRole('button', { name: 'Change camera view' }).click();
  await expect(page.locator('.crosshair')).toBeVisible();
  await callTool(page, 'player_look', { pitch: 1.1 }); // look at the ground
  const before = await page.evaluate(() => Object.keys(window.mindcraft.getState()).length);
  void before;
  const canvas = page.getByTestId('game-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no size');
  const under = await page.evaluate(() => {
    const p = window.mindcraftDebug!.playerPosition();
    return window.mindcraftDebug!.surfaceAt(Math.round(p.x), Math.round(p.z));
  });
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const p = window.mindcraftDebug!.playerPosition();
        // Any column within a block of the player got taller.
        let max = -1;
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
          max = Math.max(max, window.mindcraftDebug!.surfaceAt(Math.round(p.x) + dx, Math.round(p.z) + dz));
        }
        return max;
      }),
    )
    .toBeGreaterThan(under);
});

test('a placed block is still there after a reload', async ({ page }) => {
  await startGame(page);
  const spot = await skySpot(page);
  await callTool(page, 'world_place_block', { ...spot, block: 'rainbow' });
  await waitForSaved(page);
  await page.reload();
  await page.getByRole('button', { name: /Let's build!/ }).click();
  await expect.poll(() => blockAt(page, spot.x, spot.y, spot.z), { timeout: 30_000 }).toBe('rainbow');
});

test('the block palette fills a hotbar slot', async ({ page }) => {
  await startGame(page);
  await page.getByRole('button', { name: 'More blocks' }).click();
  await expect(page.getByRole('dialog', { name: 'All blocks' })).toBeVisible();
  await page.getByRole('button', { name: 'Wood Stairs' }).click();
  await expect(page.getByRole('button', { name: 'Wood Stairs, selected' })).toBeVisible();
});

test('doors open when tapped', async ({ page }) => {
  await startGame(page);
  const spawn = await page.evaluate(() => window.mindcraftDebug!.spawn());
  const at = { x: spawn.x + 4, y: spawn.y, z: spawn.z - 2 };
  await callTool(page, 'world_place_block', { ...at, block: 'door' });
  expect(await blockAt(page, at.x, at.y + 1, at.z)).toBe('door');
  const before = (await callTool(page, 'world_get_block', at)) as { state: number };
  await callTool(page, 'world_interact', at);
  const after = (await callTool(page, 'world_get_block', at)) as { state: number };
  expect(after.state & 0b1000).not.toBe(before.state & 0b1000);
});
