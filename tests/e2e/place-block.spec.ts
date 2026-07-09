import { expect, test } from '@playwright/test';
import { blockCount, hasBlockAt, SKY_SPOT, startGame, waitForSaved } from './helpers';

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

  await page.evaluate((spot) => {
    window.mindcraft.getState().placeBlockAt(spot);
  }, SKY_SPOT);
  expect(await blockCount(page)).toBe(before + 1);
  expect(await hasBlockAt(page, SKY_SPOT.x, SKY_SPOT.y, SKY_SPOT.z)).toBe(true);

  await page.evaluate((spot) => {
    window.mindcraft.getState().removeBlockAt(spot);
  }, SKY_SPOT);
  expect(await hasBlockAt(page, SKY_SPOT.x, SKY_SPOT.y, SKY_SPOT.z)).toBe(false);
});

test('clicking terrain in the 3D view places a block', async ({ page }) => {
  await startGame(page);
  const before = await blockCount(page);

  // Find the top of a plaza column and click its projected screen spot.
  const screenSpot = await page.evaluate(() => {
    const state = window.mindcraft.getState();
    let top = 0;
    for (let y = 31; y >= 0; y--) {
      if (state.blocks[`27,${y},34`]) {
        top = y;
        break;
      }
    }
    return window.mindcraftDebug?.projectBlock(27, top, 34) ?? null;
  });
  expect(screenSpot).not.toBeNull();
  await page.mouse.click(screenSpot!.x, screenSpot!.y);
  await expect
    .poll(() => blockCount(page), { timeout: 5_000 })
    .toBe(before + 1);
});

test('first-person view places blocks through the crosshair', async ({ page }) => {
  await startGame(page);
  await page.getByRole('button', { name: 'Change camera view' }).click();
  await expect(page.locator('.crosshair')).toBeVisible();

  const before = await blockCount(page);
  const canvas = page.getByTestId('game-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no size');
  // Look slightly down at the ground ahead and click the crosshair spot.
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 160, { steps: 5 });
  await page.mouse.up();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect
    .poll(() => blockCount(page), { timeout: 5_000 })
    .toBe(before + 1);
});

test('a placed block is still there after a reload', async ({ page }) => {
  await startGame(page);
  await page.evaluate((spot) => {
    window.mindcraft.getState().placeBlockAt(spot);
  }, SKY_SPOT);
  await waitForSaved(page);

  await page.reload();
  await page.getByRole('button', { name: /Let's build!/ }).click();
  expect(await hasBlockAt(page, SKY_SPOT.x, SKY_SPOT.y, SKY_SPOT.z)).toBe(true);
});
