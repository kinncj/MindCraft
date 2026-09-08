/**
 * Roofs that really open and shut.
 *
 * Two stadiums here have retractable roofs, and in this game that is not a
 * picture of one: it is built out of the same parts a kid can use — sticky
 * pistons, wire, and a lever. Flip the lever and the pistons push the panels
 * out over the pitch; flip it back and the sticky heads pull them home.
 *
 * The wire runs along the rim at the height of the pistons, so power reaches
 * every one of them from the single lever on the concourse.
 */

import { BlockState } from '../../blocks/BlockState';
import { DIR_NZ, DIR_PZ, rotationToDirection } from '../../world/coords';
import type { MonumentDraw } from './types';

/** Which rotation makes a piston face each way across the pitch. */
const FACING_PZ = [0, 1, 2, 3].find((r) => rotationToDirection(r) === DIR_PZ) ?? 2;
const FACING_NZ = [0, 1, 2, 3].find((r) => rotationToDirection(r) === DIR_NZ) ?? 0;

export type SlidingRoof = {
  /** The opening the panels cover, in world blocks. */
  x0: number;
  x1: number;
  /** The rim the pistons stand on, either side of the opening. */
  zNorth: number;
  zSouth: number;
  /** The height the panels slide at. */
  y: number;
  /** How far each panel reaches when the lever is on (at most twelve). */
  reach: number;
  /** The block the panels are made of. */
  panel: number;
  /** Ground level, where the lever ends up within reach of a child. */
  groundY: number;
  /** The near edge of the monument: the stairs may not step past it. */
  minZ: number;
  /** The block the staircase of wire is built from. */
  step: number;
};

/**
 * Draws the machinery. Without the logic blocks in the registry (a stripped
 * build) it falls back to a plain fixed roof, so the stadium still looks right.
 */
export function slidingRoof(m: MonumentDraw, roof: SlidingRoof): void {
  const sticky = m.kit.stickyPiston;
  const wire = m.kit.wire;
  const lever = m.kit.lever;
  const repeater = m.kit.repeater;
  if (sticky === null || wire === null || lever === null) {
    for (let x = roof.x0; x <= roof.x1; x++) {
      for (let z = roof.zNorth; z <= roof.zSouth; z++) m.put(x, roof.y, z, roof.panel);
    }
    return;
  }

  // A sticky piston pulls back exactly one block, so each panel is one block
  // deep. The pistons sit either side of a two-block slot with their panels in
  // front of them: power them and the panels slide in and the slot shuts; let
  // go and the sticky heads pull them back out again.
  const slotNorth = m.cz;
  const slotSouth = m.cz + 1;
  const pistonNorth = slotNorth - 2;
  const pistonSouth = slotSouth + 2;
  for (let x = roof.x0; x <= roof.x1; x++) {
    // The fixed roof either side of the moving strip.
    for (let z = roof.zNorth; z < pistonNorth; z++) m.put(x, roof.y, z, roof.panel);
    for (let z = roof.zSouth; z > pistonSouth; z--) m.put(x, roof.y, z, roof.panel);
    m.put(x, roof.y, pistonNorth, sticky, BlockState.withRotation(0, FACING_PZ));
    m.put(x, roof.y, pistonSouth, sticky, BlockState.withRotation(0, FACING_NZ));
    m.put(x, roof.y, pistonNorth + 1, roof.panel);
    m.put(x, roof.y, pistonSouth - 1, roof.panel);
    m.put(x, roof.y, slotNorth, 0);
    m.put(x, roof.y, slotSouth, 0);
    // The wire that tells every piston at once. A repeater every five blocks:
    // wire fades a step a block, and the climb from the ground has already
    // spent half of it before the circuit starts.
    const boost = repeater !== null && (x - roof.x0) % 5 === 3;
    m.put(x, roof.y + 1, pistonNorth, boost ? repeater : wire);
    m.put(x, roof.y + 1, pistonSouth, boost ? repeater : wire);
  }

  // One column just outside the panels joins both rims into a single circuit.
  const railX = roof.x0 - 1;
  for (let z = pistonNorth; z <= pistonSouth; z++) {
    // Never a repeater on the first cell: the staircase meets the rail on the
    // diagonal, and only wire makes that step.
    const boost = repeater !== null && (z - pistonNorth) % 5 === 3;
    m.put(railX, roof.y + 1, z, boost ? repeater : wire);
  }

  // Wire only climbs a step at a time, so the way down to the lever is a
  // staircase: a block, wire on top, the next one along and one lower.
  let y = roof.y + 1;
  let z = pistonNorth - 1;
  while (y > roof.groundY + 2 && z > roof.minZ + 1) {
    y -= 1;
    m.put(railX, y - 1, z, roof.step);
    // Wire only: a repeater cannot make the diagonal step a staircase needs,
    // and fifteen blocks is plenty to get down from a roof.
    m.put(railX, y, z, wire);
    z -= 1;
  }
  // The lever at the bottom of the stairs, where a child can reach it.
  m.put(railX, y - 1, z, roof.step);
  m.put(railX, y, z, lever);
}
