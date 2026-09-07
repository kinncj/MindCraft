import { expect, test } from '@playwright/test';
import { starterBoxPosition, startGame, waitForSaved } from './helpers';

const boxPosition = starterBoxPosition;

async function openStarterBox(page: import('@playwright/test').Page) {
  const pos = await boxPosition(page);
  await page.evaluate((p) => window.mindcraft.getState().setOpenPanel('container', { position: p }), pos);
}

test('tapping the Magic Delivery Box in the world opens it', async ({ page }) => {
  await startGame(page);
  const pos = await boxPosition(page);
  const spot = await page.evaluate((p) => window.mindcraftDebug!.projectBlock(p.x, p.y, p.z), pos);
  expect(spot).not.toBeNull();
  await page.mouse.click(spot!.x, spot!.y);
  await expect(page.getByRole('dialog', { name: 'Magic Delivery Box' })).toBeVisible();
});

test('the box stores and returns blocks, and survives a reload', async ({ page }) => {
  await startGame(page);
  await openStarterBox(page);
  const dialog = page.getByRole('dialog', { name: 'Magic Delivery Box' });
  await expect(dialog).toBeVisible();

  await page.getByRole('button', { name: /Put a Grass block inside/ }).click();
  await expect(dialog.getByText('Grass × 1')).toBeVisible();

  await expect(dialog.getByText('Star × 3')).toBeVisible();
  await dialog.locator('li', { hasText: 'Star' }).getByRole('button', { name: 'Take one out' }).click();
  await expect(dialog.getByText('Star × 2')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Star, selected' })).toBeVisible();

  await waitForSaved(page);
  await page.reload();
  await page.getByRole('button', { name: /Let's build!/ }).click();
  await page.waitForFunction(() => window.mindcraftDebug?.isReady() === true, undefined, { timeout: 45_000 });
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
