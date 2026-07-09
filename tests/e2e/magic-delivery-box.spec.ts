import { expect, test } from '@playwright/test';
import { openStarterBox, startGame, waitForSaved } from './helpers';

test('tapping the Magic Delivery Box in the world opens it', async ({ page }) => {
  await startGame(page);
  // Project the starter box to screen pixels and click it there.
  const spot = await page.evaluate(() => {
    const box = window.mindcraft.getState().boxes[0];
    return window.mindcraftDebug?.projectBlock(box.position.x, box.position.y, box.position.z) ?? null;
  });
  expect(spot).not.toBeNull();
  await page.mouse.click(spot!.x, spot!.y);
  await expect(page.getByRole('dialog', { name: 'Magic Delivery Box' })).toBeVisible();
});

test('the box stores and returns blocks, and survives a reload', async ({ page }) => {
  await startGame(page);
  await openStarterBox(page);
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
  await openStarterBox(page);
  await expect(dialog.getByText('Grass × 1')).toBeVisible();
  await expect(dialog.getByText('Star × 2')).toBeVisible();
});

test('emptying the box asks first', async ({ page }) => {
  await startGame(page);
  await openStarterBox(page);
  const dialog = page.getByRole('dialog', { name: 'Magic Delivery Box' });
  await dialog.getByRole('button', { name: /Empty the box/ }).click();
  await expect(dialog.getByText('Empty the whole box?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Yes, empty it' }).click();
  await expect(dialog.getByText('Your box is empty')).toBeVisible();
});
