import { expect, test } from '@playwright/test';
import { startGame } from './helpers';

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
  // Hold the stick fully forward for a second.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 60, { steps: 4 });
  await page.waitForTimeout(1000);
  await page.mouse.up();

  const after = await playerPos(page);
  const traveled = Math.hypot(after.x - before.x, after.z - before.z);
  expect(traveled).toBeGreaterThan(2);
});

test('the jump button makes the player jump', async ({ page }) => {
  await startGame(page);
  const jump = page.getByRole('button', { name: 'Jump' });
  const box = await jump.boundingBox();
  if (!box) throw new Error('jump button has no size');

  // Baseline before pressing: holding jump re-jumps forever, so the
  // player may still be airborne at release time.
  const ground = (await playerPos(page)).y;
  let peak = 0;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(60);
    const pos = await playerPos(page);
    peak = Math.max(peak, pos.y);
  }
  await page.mouse.up();
  expect(peak).toBeGreaterThan(ground + 0.8);
});

test('tapping the world still places blocks on touch screens', async ({ page }) => {
  await startGame(page);
  const before = await page.evaluate(() => Object.keys(window.mindcraft.getState().blocks).length);
  const spot = await page.evaluate(() => {
    const state = window.mindcraft.getState();
    let top = 0;
    for (let y = 31; y >= 0; y--) {
      if (state.blocks[`27,${y},34`]) {
        top = y;
        break;
      }
    }
    return window.mindcraftDebug?.projectBlock(27, top, 34) ?? null;
  });
  expect(spot).not.toBeNull();
  await page.touchscreen.tap(spot!.x, spot!.y);
  await expect
    .poll(() => page.evaluate(() => Object.keys(window.mindcraft.getState().blocks).length))
    .toBe(before + 1);
});
