import { expect, test } from '@playwright/test';
import { hasBlockAt, startGame, waitForSaved } from './helpers';

test('reset asks for confirmation and restores the starter world', async ({ page }) => {
  await startGame(page);

  await page.evaluate(() => {
    window.mindcraft.getState().placeBlockAt({ x: 4, y: 1, z: 4 });
  });
  expect(await hasBlockAt(page, 4, 1, 4)).toBe(true);
  await waitForSaved(page);

  await page.getByRole('button', { name: 'Reset the world' }).click();
  await expect(page.getByRole('dialog', { name: 'Reset World?' })).toBeVisible();
  await expect(
    page.getByText('This will clear your MindCraft world on this computer.'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Reset World', exact: true }).click();
  await expect.poll(() => hasBlockAt(page, 4, 1, 4)).toBe(false);

  // And it stays reset after a reload.
  await waitForSaved(page);
  await page.reload();
  await page.getByRole('button', { name: /Let's build!/ }).click();
  expect(await hasBlockAt(page, 4, 1, 4)).toBe(false);
  // Starter landmarks are back.
  expect(await hasBlockAt(page, 16, 1, 16)).toBe(true);
});

test('cancel leaves the world alone', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => {
    window.mindcraft.getState().placeBlockAt({ x: 6, y: 1, z: 6 });
  });
  await page.getByRole('button', { name: 'Reset the world' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  expect(await hasBlockAt(page, 6, 1, 6)).toBe(true);
});
