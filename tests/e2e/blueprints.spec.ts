import { expect, test } from '@playwright/test';
import { startGame } from './helpers';

/**
 * The Blueprints sheet is how a child who cannot type yet gets a landmark.
 * It is the only path to the monuments that does not go through words, so it
 * needs to open, list them by country, and actually build one.
 */
test('the blueprints sheet lists the landmarks by country and builds one', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => window.mindcraft.getState().setOpenPanel('blueprints'));
  const sheet = page.getByRole('dialog', { name: 'Blueprints' });
  await expect(sheet).toBeVisible();

  // Grouped, so thirty-five cards are not one wall of them.
  await expect(sheet.getByRole('heading', { name: 'Famous places' })).toBeVisible();
  await expect(sheet.getByRole('heading', { name: 'France', exact: true })).toBeVisible();
  await expect(sheet.getByRole('heading', { name: 'Whole cities' })).toBeVisible();

  // Tapping a landmark asks a villager to build it somewhere clear.
  await sheet.getByRole('button', { name: 'Build the Eiffel Tower' }).click();
  await expect(page.getByText(/Eiffel Tower/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.mindcraft.getState().canUndo), { timeout: 30_000 }).toBe(true);
});
