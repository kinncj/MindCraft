import { expect, test } from '@playwright/test';
import { openMenu, startGame, waitForSaved } from './helpers';

test('visual modes can be selected and persist across reloads', async ({ page }) => {
  await startGame(page);
  await openMenu(page, 'looks');
  await page.getByRole('button', { name: /Claude Dream/ }).click();
  await expect(page.getByRole('button', { name: /Claude Dream/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Close/ }).click();
  await waitForSaved(page);

  await page.reload();
  await page.getByRole('button', { name: /Let's build!/ }).click();
  await openMenu(page, 'looks');
  await expect(page.getByRole('button', { name: /Claude Dream/ })).toHaveAttribute('aria-pressed', 'true');
});

test('time of day and weather toggles persist', async ({ page }) => {
  await startGame(page);
  await openMenu(page, 'looks');
  await page.getByRole('button', { name: /Always night/ }).click();
  await page.getByRole('button', { name: /Snowfall/ }).click();
  await page.getByRole('button', { name: /Close/ }).click();
  await waitForSaved(page);

  await page.reload();
  await page.getByRole('button', { name: /Let's build!/ }).click();
  await openMenu(page, 'looks');
  await expect(page.getByRole('button', { name: /Always night/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: /Snowfall/ })).toHaveAttribute('aria-pressed', 'true');
});
