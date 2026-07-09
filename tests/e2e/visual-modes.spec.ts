import { expect, test } from '@playwright/test';
import { openMenu, startGame, waitForSaved } from './helpers';

test('visual modes can be selected and persist across reloads', async ({ page }) => {
  await startGame(page);
  await openMenu(page);

  await page.getByRole('button', { name: /Claude Dream/ }).click();
  await expect(page.getByRole('button', { name: /Claude Dream/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('button', { name: 'Back to building' }).click();
  await waitForSaved(page);

  await page.reload();
  await page.getByRole('button', { name: /Let's build!/ }).click();
  await openMenu(page);
  await expect(page.getByRole('button', { name: /Claude Dream/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('time of day and weather toggles persist', async ({ page }) => {
  await startGame(page);
  await openMenu(page);
  await page.getByRole('button', { name: /Always night/ }).click();
  await page.getByRole('button', { name: /Snowfall/ }).click();
  await page.getByRole('button', { name: 'Back to building' }).click();
  await waitForSaved(page);

  await page.reload();
  await page.getByRole('button', { name: /Let's build!/ }).click();
  await openMenu(page);
  await expect(page.getByRole('button', { name: /Always night/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByRole('button', { name: /Snowfall/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('Toy Land replaces the world after confirmation', async ({ page }) => {
  await startGame(page);
  await openMenu(page);
  await page.getByRole('button', { name: 'Start a Toy Land world' }).click();
  await expect(page.getByRole('dialog', { name: 'Start Toy Land?' })).toBeVisible();
  await page.getByRole('button', { name: 'Start Toy Land', exact: true }).click();

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window.mindcraft.getState() as unknown as { boxes: Array<{ name: string }> }).boxes[0]
            ?.name,
      ),
    )
    .toBe('Toy Chest');
});
