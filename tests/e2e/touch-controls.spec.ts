import { expect, test } from '@playwright/test';
import { groundSpot, startGame, surfaceAt } from './helpers';

// Emulate a tablet: touch screen, tablet-sized viewport.
test.use({ hasTouch: true, viewport: { width: 1024, height: 768 } });

function playerPos(page: import('@playwright/test').Page) {
  return page.evaluate(() => window.mindcraftDebug!.playerPosition());
}

test('virtual controls appear on touch devices', async ({ page }) => {
  await startGame(page);
  await expect(page.getByTestId('joystick')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jump' })).toBeVisible();
});

test('the joystick walks the player around', async ({ page }) => {
  await startGame(page);
  const before = await playerPos(page);
  const joystick = page.getByTestId('joystick');
  const box = await joystick.boundingBox();
  if (!box) throw new Error('joystick has no size');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 60, { steps: 4 });
  await page.waitForTimeout(1000);
  await page.mouse.up();
  const after = await playerPos(page);
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(1.5);
});

test('the jump button makes the player jump', async ({ page }) => {
  await startGame(page);
  const jump = page.getByRole('button', { name: 'Jump' });
  const box = await jump.boundingBox();
  if (!box) throw new Error('jump button has no size');
  const ground = (await playerPos(page)).y;
  let peak = 0;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(60);
    peak = Math.max(peak, (await playerPos(page)).y);
  }
  await page.mouse.up();
  expect(peak).toBeGreaterThan(ground + 0.8);
});

test('tapping the world still places blocks on touch screens', async ({ page }) => {
  await startGame(page);
  const target = await groundSpot(page);
  await page.touchscreen.tap(target.screen.x, target.screen.y);
  await expect.poll(() => surfaceAt(page, target.x, target.z)).toBe(target.top + 1);
});
