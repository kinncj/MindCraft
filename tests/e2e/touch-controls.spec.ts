import { expect, test } from '@playwright/test';
import { groundSpot, startGameByTouch, surfaceAt, touchDrag, touchHold } from './helpers';

// Emulate a tablet: touch screen, tablet-sized viewport.
test.use({ hasTouch: true, viewport: { width: 1024, height: 768 } });

function playerPos(page: import('@playwright/test').Page) {
  return page.evaluate(() => window.mindcraftDebug!.playerPosition());
}

test('virtual controls appear on touch devices', async ({ page }) => {
  await startGameByTouch(page);
  await expect(page.getByTestId('joystick')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jump' })).toBeVisible();
});

test('the joystick walks the player around', async ({ page }) => {
  await startGameByTouch(page);
  const before = await playerPos(page);
  const joystick = page.getByTestId('joystick');
  const box = await joystick.boundingBox();
  if (!box) throw new Error('joystick has no size');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await touchDrag(page, { x: cx, y: cy }, { x: cx, y: cy - 60 }, 1000);
  const after = await playerPos(page);
  expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(1.5);
});

test('the jump button makes the player jump', async ({ page }) => {
  await startGameByTouch(page);
  const jump = page.getByRole('button', { name: 'Jump' });
  const box = await jump.boundingBox();
  if (!box) throw new Error('jump button has no size');
  const ground = (await playerPos(page)).y;
  const held = touchHold(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, 700);
  let peak = 0;
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(60);
    peak = Math.max(peak, (await playerPos(page)).y);
  }
  await held;
  expect(peak).toBeGreaterThan(ground + 0.8);
});

test('tapping the world still places blocks on touch screens', async ({ page }) => {
  await startGameByTouch(page);
  const target = await groundSpot(page);
  await page.touchscreen.tap(target.screen.x, target.screen.y);
  await expect.poll(() => surfaceAt(page, target.x, target.z)).toBe(target.top + 1);
});
