import type { Page } from '@playwright/test';

// A minimal view of the store the app exposes on window.mindcraft.
// Kept as a local declaration so the e2e project does not have to
// compile the whole SPA.
type StoreState = {
  blocks: Record<string, { id: string; type: string }>;
  boxes: Array<{ id: string; position: { x: number; y: number; z: number } }>;
  saveState: string;
  placeBlockAt: (pos: { x: number; y: number; z: number }) => unknown;
  removeBlockAt: (pos: { x: number; y: number; z: number }) => unknown;
  openBoxAt: (pos: { x: number; y: number; z: number }) => void;
};

declare global {
  interface Window {
    mindcraft: { getState: () => StoreState };
    mindcraftDebug?: {
      projectBlock: (x: number, y: number, z: number) => { x: number; y: number } | null;
    };
  }
}

/** Waits for the game to load and closes the splash screen. */
export async function startGame(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Let's build!/ }).click();
}

/** Opens the game menu, where export/import/reset live. */
export async function openMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Open the menu' }).click();
}

/** Opens the starter Magic Delivery Box through the store. */
export async function openStarterBox(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = window.mindcraft.getState();
    state.openBoxAt(state.boxes[0].position);
  });
}

/** A guaranteed-empty spot: high in the sky above the spawn plaza. */
export const SKY_SPOT = { x: 30, y: 24, z: 30 } as const;

/**
 * Waits until the pending autosave lands. Mutating the store flips
 * saveState to 'saving' synchronously, so calling this right after a
 * change cannot race against an older 'saved' state.
 */
export async function waitForSaved(page: Page): Promise<void> {
  await page.waitForFunction(() => window.mindcraft.getState().saveState === 'saved', undefined, {
    timeout: 10_000,
  });
}

export function blockCount(page: Page): Promise<number> {
  return page.evaluate(() => Object.keys(window.mindcraft.getState().blocks).length);
}

export function hasBlockAt(page: Page, x: number, y: number, z: number): Promise<boolean> {
  return page.evaluate(
    ([bx, by, bz]) => Boolean(window.mindcraft.getState().blocks[`${bx},${by},${bz}`]),
    [x, y, z],
  );
}
