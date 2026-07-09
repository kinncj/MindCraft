import { expect, test } from '@playwright/test';
import { openMenu, startGame } from './helpers';

test('the game loads with a splash screen and all main controls', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('MindCraft');
  await expect(page.getByText('Welcome to MindCraft!')).toBeVisible();

  await page.getByRole('button', { name: /Let's build!/ }).click();
  await expect(page.getByText('Welcome to MindCraft!')).not.toBeVisible();

  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByRole('toolbar', { name: 'Pick a block' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open the menu' })).toBeVisible();
});

test('the menu holds export, import, reset, and how-to-play', async ({ page }) => {
  await startGame(page);
  await openMenu(page);
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export your world to a file' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import a world from a file' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset the world' })).toBeVisible();

  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByText('Drag to look around, scroll to zoom, arrows or WASD to move')).toBeVisible();

  await page.getByRole('button', { name: 'Back to building' }).click();
  await expect(page.getByRole('dialog', { name: 'Menu' })).not.toBeVisible();
});

test('escape opens and closes the menu', async ({ page }) => {
  await startGame(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Menu' })).not.toBeVisible();
});

test('the world autosaves and reports it', async ({ page }) => {
  await startGame(page);
  await expect(page.getByText('Saved on this computer')).toBeVisible({ timeout: 10_000 });
});
