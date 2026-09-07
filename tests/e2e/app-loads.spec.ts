import { expect, test } from '@playwright/test';
import { openMenu, startGame, waitForGround } from './helpers';

test('the game loads with a splash screen and all main controls', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('MindCraft');
  await expect(page.getByText('Welcome to MindCraft!')).toBeVisible();

  await page.getByRole('button', { name: /Let's build!/ }).click();
  await expect(page.getByText('Welcome to MindCraft!')).not.toBeVisible();

  await expect(page.getByTestId('game-canvas')).toBeVisible();
  await expect(page.getByRole('toolbar', { name: 'Pick a block' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open the menu' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'More blocks' })).toBeVisible();
  await waitForGround(page);
});

test('the menu has submenus for sharing, resetting, worlds, and how-to-play', async ({ page }) => {
  await startGame(page);
  await openMenu(page);
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
  await page.getByRole('button', { name: 'Save & share' }).click();
  await expect(page.getByRole('button', { name: 'Export your world to a file' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Import a world from a file' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Start over' }).click();
  await expect(page.getByRole('button', { name: 'Reset the world' })).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByText(/Drag to look around, scroll to zoom/)).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
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
  await expect(page.getByText('Saved on this computer')).toBeVisible({ timeout: 20_000 });
});

test('the player spawns on solid ground with the starter landmarks nearby', async ({ page }) => {
  await startGame(page);
  const info = await page.evaluate(() => {
    const spawn = window.mindcraftDebug!.spawn();
    const pos = window.mindcraftDebug!.playerPosition();
    return {
      spawn,
      pos,
      under: window.mindcraftDebug!.blockAt(Math.round(pos.x), Math.floor(pos.y - 0.5), Math.round(pos.z)),
      box: window.mindcraftDebug!.blockAt(spawn.x + 2, spawn.y, spawn.z - 2),
    };
  });
  expect(info.under).not.toBeNull();
  expect(info.under).not.toBe('air');
  expect(info.box).toBe('magic_box');
});
