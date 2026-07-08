import { expect, test } from '@playwright/test';
import { startGame, waitForSaved } from './helpers';

test('tapping the Magic Delivery Box in the world opens it', async ({ page }) => {
  await startGame(page);
  // The starter box sits at the camera target, dead center of the view.
  const canvas = page.getByTestId('game-canvas');
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas has no size');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole('dialog', { name: 'Magic Delivery Box' })).toBeVisible();
});

test('the box stores and returns blocks, and survives a reload', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => {
    const state = window.mindcraft.getState();
    state.openBoxAt({ x: 16, y: 1, z: 16 });
  });
  const dialog = page.getByRole('dialog', { name: 'Magic Delivery Box' });
  await expect(dialog).toBeVisible();

  // The starter box comes with 3 stars; put a grass block in too.
  await page.getByRole('button', { name: /Put a Grass block inside/ }).click();
  await expect(dialog.getByText('Grass × 1')).toBeVisible();

  // Take a star out: quantity drops and the star becomes selected.
  await expect(dialog.getByText('Star × 3')).toBeVisible();
  await dialog.locator('li', { hasText: 'Star' }).getByRole('button', { name: 'Take one out' }).click();
  await expect(dialog.getByText('Star × 2')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Star, selected' })).toBeVisible();

  // Contents persist.
  await waitForSaved(page);
  await page.reload();
  await page.getByRole('button', { name: /Let's build!/ }).click();
  await page.evaluate(() => {
    window.mindcraft.getState().openBoxAt({ x: 16, y: 1, z: 16 });
  });
  await expect(dialog.getByText('Grass × 1')).toBeVisible();
  await expect(dialog.getByText('Star × 2')).toBeVisible();
});

test('emptying the box asks first', async ({ page }) => {
  await startGame(page);
  await page.evaluate(() => {
    window.mindcraft.getState().openBoxAt({ x: 16, y: 1, z: 16 });
  });
  const dialog = page.getByRole('dialog', { name: 'Magic Delivery Box' });
  await dialog.getByRole('button', { name: /Empty the box/ }).click();
  await expect(dialog.getByText('Empty the whole box?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Yes, empty it' }).click();
  await expect(dialog.getByText('Your box is empty')).toBeVisible();
});
