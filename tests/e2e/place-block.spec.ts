import { expect, test } from '@playwright/test';
import { blockCount, hasBlockAt, startGame, waitForSaved } from './helpers';

test('selecting a block from the hotbar highlights it', async ({ page }) => {
  await startGame(page);
  const star = page.getByRole('button', { name: /^Star/ });
  await star.click();
  await expect(page.getByRole('button', { name: 'Star, selected' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('placing and removing a block updates the world', async ({ page }) => {
  await startGame(page);
  const before = await blockCount(page);

  // Drive placement through the store: pixel-perfect 3D clicks are what
  // the renderer unit-handles; here we care about world + persistence.
  await page.evaluate(() => {
    window.mindcraft.getState().placeBlockAt({ x: 8, y: 1, z: 8 });
  });
  expect(await blockCount(page)).toBe(before + 1);
  expect(await hasBlockAt(page, 8, 1, 8)).toBe(true);

  await page.evaluate(() => {
    window.mindcraft.getState().removeBlockAt({ x: 8, y: 1, z: 8 });
  });
  expect(await hasBlockAt(page, 8, 1, 8)).toBe(false);
});

test('clicking the ground in the 3D view places a block', async ({ page }) => {
  await startGame(page);
  const before = await blockCount(page);
  const canvas = page.getByTestId('game-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no size');
  // Click a spot to the side of center: open grass in the starter world.
  await page.mouse.click(box.x + box.width / 2 + 120, box.y + box.height / 2 + 60);
  await expect
    .poll(() => blockCount(page), { timeout: 5_000 })
    .toBe(before + 1);
});

test('a placed block is still there after a reload', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => {
    window.mindcraft.getState().placeBlockAt({ x: 9, y: 1, z: 9 });
  });
  await waitForSaved(page);

  await page.reload();
  await page.getByRole('button', { name: /Let's build!/ }).click();
  expect(await hasBlockAt(page, 9, 1, 9)).toBe(true);
});
