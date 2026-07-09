import { expect, test } from '@playwright/test';
import { hasBlockAt, openMenu, SKY_SPOT, startGame, waitForSaved } from './helpers';

test('reset asks for confirmation and builds a fresh world', async ({ page }) => {
  await startGame(page);

  await page.evaluate((spot) => {
    window.mindcraft.getState().placeBlockAt(spot);
  }, SKY_SPOT);
  expect(await hasBlockAt(page, SKY_SPOT.x, SKY_SPOT.y, SKY_SPOT.z)).toBe(true);
  await waitForSaved(page);

  await openMenu(page);
  await page.getByRole('button', { name: 'Reset the world' }).click();
  await expect(page.getByRole('dialog', { name: 'Reset World?' })).toBeVisible();
  await expect(
    page.getByText(/This will clear your MindCraft world on this computer/),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Reset World', exact: true }).click();
  await expect.poll(() => hasBlockAt(page, SKY_SPOT.x, SKY_SPOT.y, SKY_SPOT.z)).toBe(false);

  // The fresh world has its Magic Delivery Box back at the spawn plaza.
  const boxPosition = await page.evaluate(() => window.mindcraft.getState().boxes[0]?.position);
  expect(boxPosition).toEqual({ x: 32, y: 5, z: 32 });

  // And it stays reset after a reload.
  await waitForSaved(page);
  await page.reload();
  await page.getByRole('button', { name: /Let's build!/ }).click();
  expect(await hasBlockAt(page, SKY_SPOT.x, SKY_SPOT.y, SKY_SPOT.z)).toBe(false);
});

test('cancel leaves the world alone', async ({ page }) => {
  await startGame(page);
  await page.evaluate((spot) => {
    window.mindcraft.getState().placeBlockAt(spot);
  }, SKY_SPOT);
  await openMenu(page);
  await page.getByRole('button', { name: 'Reset the world' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  expect(await hasBlockAt(page, SKY_SPOT.x, SKY_SPOT.y, SKY_SPOT.z)).toBe(true);
});
