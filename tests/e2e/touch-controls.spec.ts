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
  // Watch for the top of the jump inside the page: polling across the wire is
  // slow enough on a loaded machine to step right over the apex.
  const watching = page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        let peak = 0;
        const until = performance.now() + 1400;
        const look = (): void => {
          peak = Math.max(peak, window.mindcraftDebug!.playerPosition().y);
          if (performance.now() < until) requestAnimationFrame(look);
          else resolve(peak);
        };
        requestAnimationFrame(look);
      }),
  );
  await touchHold(page, { x: box.x + box.width / 2, y: box.y + box.height / 2 }, 900);
  const peak = await watching;
  expect(peak, `jumped from ${ground.toFixed(2)} to ${peak.toFixed(2)}`).toBeGreaterThan(ground + 0.8);
});

test('tapping the world still places blocks on touch screens', async ({ page }) => {
  await startGameByTouch(page);
  const target = await groundSpot(page);
  await page.touchscreen.tap(target.screen.x, target.screen.y);
  await expect.poll(() => surfaceAt(page, target.x, target.z)).toBe(target.top + 1);
});
