/**
 * Famous places, as block sculptures a villager can build.
 *
 * These are original blocky homages drawn in code — a silhouette and the
 * proportions a kid recognises, nothing traced, no logos or signage from the
 * real thing.
 *
 * One monument per file. Adding one: write `src/engine/build/monuments/<name>.ts`
 * exporting a `Monument`, add it to `MONUMENT_LIST` below, and give a kid words
 * for it (docs/contributing/teach-the-model.md). Nothing else changes: the tool,
 * the chat, the site planner and the tests all read this list.
 */

import { arenaBaixada } from './arenaBaixada';
import { bigBen } from './bigBen';
import { botanicalGarden } from './botanicalGarden';
import { canadaPlace } from './canadaPlace';
import { christRedeemer } from './christRedeemer';
import { cnTower } from './cnTower';
import { copan } from './copan';
import { eiffel } from './eiffel';
import { burjKhalifa } from './burjKhalifa';
import { colosseum } from './colosseum';
import { empireState } from './empireState';
import { goldenGate } from './goldenGate';
import { greatWall } from './greatWall';
import { harbourBridge } from './harbourBridge';
import { ibirapuera } from './ibirapuera';
import { iguacu } from './iguacu';
import { machuPicchu } from './machuPicchu';
import { masp } from './masp';
import { operaHouse } from './operaHouse';
import { pyramid } from './pyramid';
import { niagara } from './niagara';
import { niemeyerEye } from './niemeyerEye';
import { leaningTower } from './leaningTower';
import { liberty } from './liberty';
import { lionsGate } from './lionsGate';
import { peaceTower } from './peaceTower';
import { rideauCanal } from './rideauCanal';
import { rogersDome } from './rogersDome';
import { scienceWorld } from './scienceWorld';
import { sensoji } from './sensoji';
import { skytree } from './skytree';
import { stonehenge } from './stonehenge';
import { sugarloaf } from './sugarloaf';
import { tajMahal } from './tajMahal';
import { towerBridge } from './towerBridge';
import { tokyoTower } from './tokyoTower';
import { sign } from './sign';
import { wireOpera } from './wireOpera';
import type { Monument, MonumentDraw } from './types';

export type { Monument, MonumentContext, MonumentDraw, MonumentKit } from './types';
export { monumentKit } from './kit';
export { cleanText, textWidth } from './font';

/** Every monument in the game, in the order they appear to a kid. */
export const MONUMENT_LIST = [
  eiffel,
  cnTower,
  rogersDome,
  peaceTower,
  rideauCanal,
  tokyoTower,
  skytree,
  sensoji,
  canadaPlace,
  scienceWorld,
  lionsGate,
  christRedeemer,
  sugarloaf,
  arenaBaixada,
  bigBen,
  towerBridge,
  liberty,
  empireState,
  operaHouse,
  harbourBridge,
  colosseum,
  pyramid,
  goldenGate,
  tajMahal,
  leaningTower,
  stonehenge,
  greatWall,
  burjKhalifa,
  machuPicchu,
  niemeyerEye,
  wireOpera,
  botanicalGarden,
  masp,
  copan,
  ibirapuera,
  niagara,
  iguacu,
  sign,
] as const;

export type MonumentKind = (typeof MONUMENT_LIST)[number]['id'];

export const MONUMENTS = Object.fromEntries(MONUMENT_LIST.map((m) => [m.id, m])) as Record<MonumentKind, Monument>;

export const MONUMENT_KINDS = MONUMENT_LIST.map((m) => m.id) as MonumentKind[];

export function isMonumentKind(value: unknown): value is MonumentKind {
  return typeof value === 'string' && (MONUMENT_KINDS as string[]).includes(value);
}

/** How big this monument wants to be, before the ground has a say. */
export function monumentFootprint(kind: MonumentKind, ctx?: { text?: string }): { width: number; depth: number } {
  const monument = MONUMENTS[kind];
  if (ctx && monument.footprint) return monument.footprint(ctx);
  return { width: monument.width, depth: monument.depth };
}

/** Draws one monument. `g` is the block a character stands on. */
export function drawMonument(kind: MonumentKind, draw: MonumentDraw): void {
  MONUMENTS[kind].draw(draw);
}
