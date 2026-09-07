import type { Page } from '@playwright/test';

// A minimal view of what the app exposes on window. Kept as a local
// declaration so the e2e project does not have to compile the whole SPA.
type StoreState = {
  worlds: Array<{ id: string; name: string; generator: { kind: string } }>;
  currentWorldId: string | null;
  worldName: string;
  saveState: string;
  selectedBlockType: string;
  hotbar: string[];
  openPanel: string;
  canUndo: boolean;
  setOpenPanel: (panel: string, payload?: unknown) => void;
};

declare global {
  interface Window {
    mindcraft: { getState: () => StoreState };
    mindcraftDebug?: {
      projectBlock: (x: number, y: number, z: number) => { x: number; y: number } | null;
      playerPosition: () => { x: number; y: number; z: number };
      blockAt: (x: number, y: number, z: number) => string | null;
      surfaceAt: (x: number, z: number) => number;
      isReady: () => boolean;
      spawn: () => { x: number; y: number; z: number };
      pick: (clientX: number, clientY: number) => { x: number; y: number; z: number; face: number } | null;
    };
    mindcraftTools?: {
      list: () => Array<{ name: string }>;
      call: (name: string, input?: Record<string, unknown>) => Promise<unknown>;
    };
  }
}

/** Waits for the game to load, closes the splash, and waits for ground. */
export async function startGame(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: /Let's build!/ }).click();
  await waitForGround(page);
}

/** The chunks around the player are generated, lit, and the player stands. */
export async function waitForGround(page: Page): Promise<void> {
  await page.waitForFunction(() => window.mindcraftDebug?.isReady() === true, undefined, { timeout: 45_000 });
}

/** Opens the game menu and, optionally, one of its submenus. */
export async function openMenu(page: Page, section?: 'share' | 'reset' | 'looks' | 'worlds' | 'help'): Promise<void> {
  await page.getByRole('button', { name: 'Open the menu' }).click();
  if (!section) return;
  const rows = { share: 'Save & share', reset: 'Start over', looks: 'World looks', worlds: 'See all your worlds', help: 'How to play' };
  await page.getByRole('button', { name: rows[section] }).click();
}

export function callTool(page: Page, name: string, input: Record<string, unknown> = {}): Promise<unknown> {
  return page.evaluate(([n, i]) => window.mindcraftTools!.call(n as string, i as Record<string, unknown>), [name, input]);
}

/** Where the starter Magic Delivery Box stands (see starterPlazaTemplate). */
export async function starterBoxPosition(page: Page): Promise<{ x: number; y: number; z: number }> {
  const spawn = await page.evaluate(() => window.mindcraftDebug!.spawn());
  return { x: spawn.x + 2, y: spawn.y, z: spawn.z - 2 };
}

/** A guaranteed-empty spot: high in the sky above the spawn. */
export async function skySpot(page: Page): Promise<{ x: number; y: number; z: number }> {
  const spawn = await page.evaluate(() => window.mindcraftDebug!.spawn());
  return { x: spawn.x, y: spawn.y + 20, z: spawn.z };
}

export type GroundTarget = { screen: { x: number; y: number }; x: number; z: number; top: number };

/**
 * A ground column near the spawn whose top block projects well inside
 * the canvas (clear of the HUD bars), plus where to click it.
 */
export async function groundSpot(page: Page): Promise<GroundTarget> {
  const target = await page.evaluate(() => {
    const spawn = window.mindcraftDebug!.spawn();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const candidates: Array<[number, number]> = [];
    for (let r = 2; r <= 7; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) candidates.push([dx, dz]);
    for (const [dx, dz] of candidates) {
      const x = spawn.x + dx;
      const z = spawn.z + dz;
      const top = window.mindcraftDebug!.surfaceAt(x, z);
      if (top < 0 || window.mindcraftDebug!.blockAt(x, top, z) !== 'grass') continue;
      const p = window.mindcraftDebug!.projectBlock(x, top + 0.5, z);
      if (!p) continue;
      if (p.x < width * 0.25 || p.x > width * 0.75 || p.y < 140 || p.y > height - 220) continue;
      // Nothing (an arch, a tree) may stand between the camera and this block.
      const hit = window.mindcraftDebug!.pick(p.x, p.y);
      if (!hit || hit.x !== x || hit.y !== top || hit.z !== z || hit.face !== 2) continue;
      return { screen: p, x, z, top };
    }
    return null;
  });
  if (!target) throw new Error('no visible ground column near the spawn');
  return target;
}

export function surfaceAt(page: Page, x: number, z: number): Promise<number> {
  return page.evaluate(([bx, bz]) => window.mindcraftDebug!.surfaceAt(bx, bz), [x, z]);
}

/**
 * Waits until the pending autosave lands. Mutating the store flips
 * saveState to 'saving' synchronously, so calling this right after a
 * change cannot race against an older 'saved' state.
 */
export async function waitForSaved(page: Page): Promise<void> {
  await page.waitForFunction(() => window.mindcraft.getState().saveState === 'saved', undefined, { timeout: 30_000 });
}

export function blockAt(page: Page, x: number, y: number, z: number): Promise<string | null> {
  return page.evaluate(([bx, by, bz]) => window.mindcraftDebug!.blockAt(bx, by, bz), [x, y, z]);
}
