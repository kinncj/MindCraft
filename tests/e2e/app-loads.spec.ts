import { expect, test } from '@playwright/test';
import { startGame } from './helpers';

test('the game loads with a welcome panel and all main controls', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('MindCraft');
  await expect(page.getByText('Welcome to MindCraft!')).toBeVisible();

  await page.getByRole('button', { name: /Let's build!/ }).click();
  await expect(page.getByText('Welcome to MindCraft!')).not.toBeVisible();

  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByRole('toolbar', { name: 'Pick a block' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export your world to a file' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import a world from a file' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset the world' })).toBeVisible();
});

test('the world autosaves and reports it', async ({ page }) => {
  await startGame(page);
  await expect(page.getByText('Saved on this computer')).toBeVisible({ timeout: 10_000 });
});
