import type { BlockEdit } from '../commands/Command';

/**
 * The rules every generated building must pass, so a child can walk in,
 * climb up, and see. The generator calls `ensureLivable` to fix what it
 * can (clear the way to the door, light dark rooms, open sealed rooms),
 * and tests call `checkLivability` to prove the rules hold.
 */

export type RoomRect = { x0: number; x1: number; z0: number; z1: number; base: number };

export type BuildingLayout = {
  groundY: number;
  storey: number;
  floors: number;
  /** Doorway columns on the front wall and the wall's z. */
  doorCells: number[];
  doorZ: number;
  doorHeight: number;
  /** +1 or -1: which way is outside the front wall. */
  outward: number;
  rooms: RoomRect[];
  /** Every flight: its steps from bottom to top, where it lands, and which way it runs. */
  stairs: Array<{ steps: Array<{ x: number; y: number; z: number }>; landing: { x: number; y: number; z: number }; dir: number }>;
  /** Ladder shafts: column, and the heights they span. */
  ladders: Array<{ x: number; z: number; bottom: number; top: number }>;
  air: number;
  lamp: number | null;
  wall: number;
};

export type Violation = { rule: string; at: { x: number; y: number; z: number } };

type Cells = Map<string, BlockEdit>;
const key = (x: number, y: number, z: number): string => `${x},${y},${z}`;

function isAir(cells: Cells, x: number, y: number, z: number, layout: BuildingLayout): boolean {
  const e = cells.get(key(x, y, z));
  return e ? e.id === layout.air : true;
}

function isPassable(cells: Cells, x: number, y: number, z: number, layout: BuildingLayout, door: number, passable: Set<number>): boolean {
  const e = cells.get(key(x, y, z));
  if (!e) return true;
  return e.id === layout.air || e.id === door || passable.has(e.id);
}

/** Fixes the building in place: the way to the door, headroom over stairs, light and a doorway per room. */
export function ensureLivable(cells: Cells, layout: BuildingLayout, door: number, passable: Set<number>): void {
  const put = (x: number, y: number, z: number, id: number): void => {
    cells.set(key(x, y, z), { x, y, z, id, state: 0, entity: null });
  };
  // Clears a cell unless something walkable-through is there on purpose (plates, wire).
  const clear = (x: number, y: number, z: number): void => {
    const e = cells.get(key(x, y, z));
    if (e && passable.has(e.id)) return;
    put(x, y, z, layout.air);
  };
  // 1. Nothing in front of or behind the door: three deep outside, one inside, full door height.
  for (const dx of layout.doorCells) {
    for (let h = 1; h <= layout.doorHeight; h++) {
      for (let step = 1; step <= 3; step++) clear(dx, layout.groundY + h, layout.doorZ + layout.outward * step);
      clear(dx, layout.groundY + h, layout.doorZ - layout.outward);
    }
    // Firm ground to step onto, both sides.
    for (let step = 1; step <= 3; step++) {
      const g = cells.get(key(dx, layout.groundY, layout.doorZ + layout.outward * step));
      if (g && g.id === layout.air) put(dx, layout.groundY, layout.doorZ + layout.outward * step, layout.wall);
    }
  }
  // 2. Headroom over every step (both columns of the flight) and a solid, clear landing.
  for (const flight of layout.stairs) {
    for (const step of flight.steps) {
      for (const dz of [0, 1]) {
        put(step.x, step.y + 1, step.z + dz, layout.air);
        put(step.x, step.y + 2, step.z + dz, layout.air);
      }
    }
    for (const lx of [flight.landing.x, flight.landing.x + flight.dir]) {
      for (const dz of [0, 1]) {
        const landing = cells.get(key(lx, flight.landing.y, flight.landing.z + dz));
        if (!landing || landing.id === layout.air) put(lx, flight.landing.y, flight.landing.z + dz, layout.wall);
        put(lx, flight.landing.y + 1, flight.landing.z + dz, layout.air);
        put(lx, flight.landing.y + 2, flight.landing.z + dz, layout.air);
      }
    }
  }
  for (const ladder of layout.ladders) {
    for (let h = 1; h <= 2; h++) put(ladder.x, ladder.top + h, ladder.z, layout.air);
  }
  // 3. Every room: a doorway in one of its walls and a light.
  for (const room of layout.rooms) {
    const hasDoor = roomHasDoorway(cells, room, layout, door, passable);
    if (!hasDoor) {
      const mx = Math.floor((room.x0 + room.x1) / 2);
      put(mx, room.base + 1, room.z0 - 1, layout.air);
      put(mx, room.base + 2, room.z0 - 1, layout.air);
    }
    if (layout.lamp !== null && !roomHasLight(cells, room, layout)) {
      // The back corner, away from the door column and the lobby.
      const lx = layout.doorCells.includes(room.x1) ? room.x0 : room.x1;
      put(lx, room.base + 2, room.z1, layout.lamp);
    }
  }
}

function roomHasDoorway(cells: Cells, room: RoomRect, layout: BuildingLayout, door: number, passable: Set<number>): boolean {
  const checks: Array<[number, number]> = [];
  for (let x = room.x0; x <= room.x1; x++) checks.push([x, room.z0 - 1], [x, room.z1 + 1]);
  for (let z = room.z0; z <= room.z1; z++) checks.push([room.x0 - 1, z], [room.x1 + 1, z]);
  return checks.some(([x, z]) => isPassable(cells, x, room.base + 1, z, layout, door, passable) && isPassable(cells, x, room.base + 2, z, layout, door, passable));
}

function roomHasLight(cells: Cells, room: RoomRect, layout: BuildingLayout): boolean {
  for (let x = room.x0 - 1; x <= room.x1 + 1; x++) {
    for (let z = room.z0 - 1; z <= room.z1 + 1; z++) {
      for (let h = 1; h < layout.storey; h++) {
        const e = cells.get(key(x, room.base + h, z));
        if (e && e.id === layout.lamp) return true;
      }
    }
  }
  return false;
}

/** Every rule, as a list of violations (empty means the building is fine). */
export function checkLivability(edits: BlockEdit[], layout: BuildingLayout, door: number, passable: Set<number>): Violation[] {
  const cells: Cells = new Map();
  for (const e of edits) cells.set(key(e.x, e.y, e.z), e);
  const out: Violation[] = [];
  for (const dx of layout.doorCells) {
    const bottom = cells.get(key(dx, layout.groundY + 1, layout.doorZ));
    if (!bottom || (bottom.id !== door && bottom.id !== layout.air)) out.push({ rule: 'door on the ground', at: { x: dx, y: layout.groundY + 1, z: layout.doorZ } });
    for (let h = 2; h <= layout.doorHeight; h++) {
      if (!isPassable(cells, dx, layout.groundY + h, layout.doorZ, layout, door, passable)) out.push({ rule: 'door tall enough', at: { x: dx, y: layout.groundY + h, z: layout.doorZ } });
    }
    for (let step = 1; step <= 2; step++) {
      for (let h = 1; h <= 2; h++) {
        if (!isPassable(cells, dx, layout.groundY + h, layout.doorZ + layout.outward * step, layout, door, passable)) out.push({ rule: 'nothing in front of the door', at: { x: dx, y: layout.groundY + h, z: layout.doorZ + layout.outward * step } });
        if (!isPassable(cells, dx, layout.groundY + h, layout.doorZ - layout.outward, layout, door, passable)) out.push({ rule: 'nothing behind the door', at: { x: dx, y: layout.groundY + h, z: layout.doorZ - layout.outward } });
      }
    }
    const floor = cells.get(key(dx, layout.groundY, layout.doorZ));
    if (!floor || floor.id === layout.air) out.push({ rule: 'floor under the door', at: { x: dx, y: layout.groundY, z: layout.doorZ } });
  }
  for (const flight of layout.stairs) {
    for (const step of flight.steps) {
      for (const dz of [0, 1]) {
        if (!isAir(cells, step.x, step.y + 1, step.z + dz, layout) || !isAir(cells, step.x, step.y + 2, step.z + dz, layout)) out.push({ rule: 'headroom over stairs', at: { x: step.x, y: step.y, z: step.z + dz } });
      }
    }
    const top = flight.steps[flight.steps.length - 1];
    if (top && top.y !== flight.landing.y) out.push({ rule: 'stairs reach the next floor', at: top });
    for (const lx of [flight.landing.x, flight.landing.x + flight.dir]) {
      for (const dz of [0, 1]) {
        const landing = cells.get(key(lx, flight.landing.y, flight.landing.z + dz));
        if (!landing || landing.id === layout.air) out.push({ rule: 'stairs lead somewhere', at: { x: lx, y: flight.landing.y, z: flight.landing.z + dz } });
        if (!isAir(cells, lx, flight.landing.y + 1, flight.landing.z + dz, layout) || !isAir(cells, lx, flight.landing.y + 2, flight.landing.z + dz, layout)) out.push({ rule: 'landing is clear', at: { x: lx, y: flight.landing.y + 1, z: flight.landing.z + dz } });
      }
    }
  }
  for (const ladder of layout.ladders) {
    for (let py = ladder.bottom; py <= ladder.top; py++) {
      const rung = cells.get(key(ladder.x, py, ladder.z));
      if (!rung || rung.id === layout.air) out.push({ rule: 'ladder is continuous', at: { x: ladder.x, y: py, z: ladder.z } });
    }
    if (!isAir(cells, ladder.x, ladder.top + 1, ladder.z, layout)) out.push({ rule: 'ladder top is clear', at: { x: ladder.x, y: ladder.top + 1, z: ladder.z } });
  }
  for (const room of layout.rooms) {
    if (!roomHasDoorway(cells, room, layout, door, passable)) out.push({ rule: 'room has a doorway', at: { x: room.x0, y: room.base + 1, z: room.z0 } });
    if (layout.lamp !== null && !roomHasLight(cells, room, layout)) out.push({ rule: 'room has a light', at: { x: room.x0, y: room.base + 2, z: room.z0 } });
  }
  return out;
}
