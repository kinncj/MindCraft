import { expect, test } from '@playwright/test';
import { blockAt, callTool, openMenu, skySpot, startGame, waitForSaved } from './helpers';

test('reset asks for confirmation and grows a fresh world', async ({ page }) => {
  await startGame(page);
  const spot = await skySpot(page);
  await callTool(page, 'world_place_block', { ...spot, block: 'brick' });
  await waitForSaved(page);
  const oldId = await page.evaluate(() => window.mindcraft.getState().currentWorldId);

  await openMenu(page);
  await page.getByRole('button', { name: 'Reset the world' }).click();
  await expect(page.getByRole('dialog', { name: 'Reset World?' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset World', exact: true }).click();

  await expect.poll(() => page.evaluate(() => window.mindcraft.getState().currentWorldId)).not.toBe(oldId);
  await page.waitForFunction(() => window.mindcraftDebug?.isReady() === true, undefined, { timeout: 45_000 });
  expect(await page.evaluate(() => window.mindcraft.getState().worlds.length)).toBe(1);
});

test('cancel leaves the world alone', async ({ page }) => {
  await startGame(page);
  const spot = await skySpot(page);
  await callTool(page, 'world_place_block', { ...spot, block: 'brick' });
  await openMenu(page);
  await page.getByRole('button', { name: 'Reset the world' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  expect(await blockAt(page, spot.x, spot.y, spot.z)).toBe('brick');
});

test('Toy Land replaces the world after confirmation', async ({ page }) => {
  await startGame(page);
  await openMenu(page);
  await page.getByRole('button', { name: 'Start a Toy Land world' }).click();
  await expect(page.getByRole('dialog', { name: 'Start Toy Land?' })).toBeVisible();
  await page.getByRole('button', { name: 'Start Toy Land', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.mindcraft.getState().worldName)).toBe('Toy Land');
  await page.waitForFunction(() => window.mindcraftDebug?.isReady() === true, undefined, { timeout: 45_000 });
  expect(await blockAt(page, 32, 5, 32)).toBe('magic_box');
  await page.evaluate(() => window.mindcraft.getState().setOpenPanel('container', { position: { x: 32, y: 5, z: 32 } }));
  await expect(page.getByRole('dialog', { name: 'Toy Chest' })).toBeVisible();
});

test('several worlds can be created, switched, and persist separately', async ({ page }) => {
  await startGame(page);
  const spot = await skySpot(page);
  await callTool(page, 'world_place_block', { ...spot, block: 'brick' });
  await waitForSaved(page);

  await openMenu(page);
  await page.getByRole('button', { name: 'See all your worlds' }).click();
  await page.getByLabel('Make a new world').fill('Castle');
  await page.getByRole('button', { name: '🌱 New meadow' }).click();
  await expect.poll(() => page.evaluate(() => window.mindcraft.getState().worldName)).toBe('Castle');
  await page.waitForFunction(() => window.mindcraftDebug?.isReady() === true, undefined, { timeout: 45_000 });
  await waitForSaved(page);

  await openMenu(page);
  await page.getByRole('button', { name: 'See all your worlds' }).click();
  await page.getByRole('button', { name: 'Open My World' }).click();
  await expect.poll(() => page.evaluate(() => window.mindcraft.getState().worldName)).toBe('My World');
  await expect.poll(() => blockAt(page, spot.x, spot.y, spot.z), { timeout: 30_000 }).toBe('brick');
});

test('a v1 save in IndexedDB is migrated automatically on load', async ({ page }) => {
  await page.goto('/');
  // Seed a v1 database the way MindCraft 1.0 wrote it, then reload.
  await page.evaluate(async () => {
    const dbs = await indexedDB.databases?.();
    for (const d of dbs ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('mindcraft', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        db.createObjectStore('blocks', { keyPath: 'id' }).createIndex('[x+y+z]', ['x', 'y', 'z']);
        db.createObjectStore('boxes', { keyPath: 'id' });
        db.createObjectStore('meta', { keyPath: 'key' });
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['blocks', 'boxes', 'meta'], 'readwrite');
        tx.objectStore('blocks').put({ id: 'a', type: 'rainbow', x: 10, y: 5, z: 10 });
        tx.objectStore('blocks').put({ id: 'b', type: 'magic-box', x: 32, y: 5, z: 32 });
        tx.objectStore('boxes').put({ id: 'box', name: 'Old Treasure', x: 32, y: 5, z: 32, items: [{ blockType: 'star', quantity: 4 }] });
        tx.objectStore('meta').put({ key: 'settings', value: { worldName: 'Kid World', selectedBlockType: 'brick', visualMode: 'classic', timeMode: 'cycle', weather: 'sunny' } });
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  });
  await page.reload();
  await page.getByRole('button', { name: /Let's build!/ }).click();
  await expect(page.getByText('Your old world moved into the new MindCraft!')).toBeVisible({ timeout: 20_000 });
  await expect.poll(() => page.evaluate(() => window.mindcraft.getState().worldName)).toBe('Kid World');
  await page.waitForFunction(() => window.mindcraftDebug?.isReady() === true, undefined, { timeout: 45_000 });
  expect(await blockAt(page, 10, 5, 10)).toBe('rainbow');
  expect(await blockAt(page, 32, 5, 32)).toBe('magic_box');
  await page.evaluate(() => window.mindcraft.getState().setOpenPanel('container', { position: { x: 32, y: 5, z: 32 } }));
  await expect(page.getByRole('dialog', { name: 'Old Treasure' })).toBeVisible();
  await expect(page.getByText('Star × 4')).toBeVisible();
});
