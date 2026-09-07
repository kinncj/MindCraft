import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { blockAt, callTool, openMenu, skySpot, startGame, waitForSaved } from './helpers';

test('export downloads a valid versioned world file with the edits', async ({ page }) => {
  await startGame(page);
  const spot = await skySpot(page);
  await callTool(page, 'world_place_block', { ...spot, block: 'brick' });
  await waitForSaved(page);
  await openMenu(page, 'share');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export your world to a file' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^mindcraft-world-.*\.json$/);
  const data = JSON.parse(await readFile((await download.path())!, 'utf-8'));
  expect(data.schemaVersion).toBe(2);
  expect(data.world.generator.kind).toBe('infinite');
  expect(data.chunks.length).toBeGreaterThan(0);
  expect(Object.keys(data.palette).length).toBeGreaterThan(50);
});

test('a v1 export imports as a new flat world and opens', async ({ page }) => {
  await startGame(page);
  await openMenu(page, 'share');

  const worldFile = {
    schemaVersion: 1,
    appVersion: '1.0.0',
    exportedAt: '2026-07-08T12:00:00.000Z',
    world: {
      id: 'tiny',
      name: 'Tiny Old World',
      size: { width: 64, depth: 64, height: 32 },
      blocks: [
        { id: 'a', type: 'brick', position: { x: 1, y: 0, z: 1 } },
        { id: 'b', type: 'star', position: { x: 2, y: 0, z: 2 } },
        { id: 'c', type: 'magic-box', position: { x: 3, y: 0, z: 3 } },
      ],
    },
    inventory: { selectedBlockType: 'brick' },
    magicDeliveryBoxes: [{ id: 'box-1', name: 'Imported Box', position: { x: 3, y: 0, z: 3 }, items: [{ blockType: 'rainbow', quantity: 7 }] }],
  };

  await page.setInputFiles('[data-testid="import-file-input"]', {
    name: 'tiny-world.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(worldFile)),
  });

  await expect(page.getByRole('dialog', { name: 'Import this world?' })).toBeVisible();
  await expect(page.getByText('Tiny Old World')).toBeVisible();
  await page.getByRole('button', { name: 'Import World', exact: true }).click();

  await expect.poll(() => page.evaluate(() => window.mindcraft.getState().worldName)).toBe('Tiny Old World');
  await page.waitForFunction(() => window.mindcraftDebug?.isReady() === true, undefined, { timeout: 45_000 });
  expect(await blockAt(page, 1, 0, 1)).toBe('brick');
  expect(await blockAt(page, 3, 0, 3)).toBe('magic_box');
  expect(await blockAt(page, 40, 4, 40)).toBe('grass'); // flat ground beyond the old edge

  await page.evaluate(() => window.mindcraft.getState().setOpenPanel('container', { position: { x: 3, y: 0, z: 3 } }));
  await expect(page.getByRole('dialog', { name: 'Imported Box' })).toBeVisible();
  await expect(page.getByText('Rainbow × 7')).toBeVisible();
  // The previous world is still there.
  expect((await page.evaluate(() => window.mindcraft.getState().worlds.length))).toBe(2);
});

test('import rejects a file that is not a world', async ({ page }) => {
  await startGame(page);
  await openMenu(page, 'share');
  await page.setInputFiles('[data-testid="import-file-input"]', {
    name: 'junk.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello": "there"}'),
  });
  await expect(page.getByText('That file does not look like a MindCraft world.')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Import this world?' })).not.toBeVisible();
});
