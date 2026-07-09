import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { blockCount, hasBlockAt, openMenu, startGame } from './helpers';

test('export downloads a valid versioned world file', async ({ page }) => {
  await startGame(page);
  await openMenu(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export your world to a file' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^mindcraft-world-.*\.json$/);
  const path = await download.path();
  const data = JSON.parse(await readFile(path, 'utf-8'));
  expect(data.schemaVersion).toBe(1);
  expect(data.world.blocks.length).toBeGreaterThan(1000);
  expect(data.magicDeliveryBoxes).toHaveLength(1);
  expect(data.magicDeliveryBoxes[0].items.length).toBeGreaterThan(0);
});

test('import replaces the world after confirmation', async ({ page }) => {
  await startGame(page);
  await openMenu(page);

  const worldFile = {
    schemaVersion: 1,
    appVersion: '1.0.0',
    exportedAt: '2026-07-08T12:00:00.000Z',
    world: {
      id: 'tiny',
      name: 'Tiny Test World',
      size: { width: 32, depth: 32, height: 16 },
      blocks: [
        { id: 'a', type: 'brick', position: { x: 1, y: 0, z: 1 } },
        { id: 'b', type: 'star', position: { x: 2, y: 0, z: 2 } },
      ],
    },
    inventory: { selectedBlockType: 'brick' },
    magicDeliveryBoxes: [
      {
        id: 'box-1',
        name: 'Imported Box',
        position: { x: 3, y: 0, z: 3 },
        items: [{ blockType: 'rainbow', quantity: 7 }],
      },
    ],
  };

  await page.setInputFiles('[data-testid="import-file-input"]', {
    name: 'tiny-world.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(worldFile)),
  });

  await expect(page.getByRole('dialog', { name: 'Import this world?' })).toBeVisible();
  await expect(page.getByText('Tiny Test World')).toBeVisible();
  await page.getByRole('button', { name: 'Import World', exact: true }).click();

  await expect.poll(() => blockCount(page)).toBe(2);
  expect(await hasBlockAt(page, 1, 0, 1)).toBe(true);

  // The imported box came along with its contents.
  await page.evaluate(() => {
    window.mindcraft.getState().openBoxAt({ x: 3, y: 0, z: 3 });
  });
  await expect(page.getByRole('dialog', { name: 'Imported Box' })).toBeVisible();
  await expect(page.getByText('Rainbow × 7')).toBeVisible();
});

test('import rejects a file that is not a world', async ({ page }) => {
  await startGame(page);
  await openMenu(page);
  await page.setInputFiles('[data-testid="import-file-input"]', {
    name: 'junk.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello": "there"}'),
  });
  await expect(page.getByText('That file does not look like a MindCraft world.')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Import this world?' })).not.toBeVisible();
});
