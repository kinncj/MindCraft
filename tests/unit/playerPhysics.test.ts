import { beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { PlayerController, type PlayerInput } from '../../src/game/engine/player';
import type { BlockTypeId } from '../../src/types/game';

const IDLE: PlayerInput = { forward: false, back: false, left: false, right: false, jump: false };

let cells: Map<string, BlockTypeId>;

function cellAt(x: number, y: number, z: number): BlockTypeId | null {
  return cells.get(`${x},${y},${z}`) ?? null;
}

function setBlock(x: number, y: number, z: number, type: BlockTypeId): void {
  cells.set(`${x},${y},${z}`, type);
}

function floorAt(y: number): void {
  for (let x = 0; x < 20; x++) {
    for (let z = 0; z < 20; z++) {
      setBlock(x, y, z, 'grass');
    }
  }
}

function makePlayer(x = 10, z = 10): PlayerController {
  return new PlayerController(new THREE.Scene(), cellAt, { x, z });
}

/** Runs physics at 60fps. Camera yaw 0 means forward = -z. */
function simulate(player: PlayerController, frames: number, input: Partial<PlayerInput> = {}): void {
  for (let i = 0; i < frames; i++) {
    player.update(1 / 60, { ...IDLE, ...input }, 0, i / 60);
  }
}

describe('player physics', () => {
  beforeEach(() => {
    cells = new Map();
    floorAt(0);
  });

  it('stands on the ground', () => {
    const player = makePlayer();
    simulate(player, 30);
    expect(player.y).toBeCloseTo(0.5, 1);
  });

  it('walks forward', () => {
    const player = makePlayer();
    const startZ = player.z;
    simulate(player, 60, { forward: true });
    expect(player.z).toBeLessThan(startZ - 2);
  });

  it('steps up a single block without jumping', () => {
    setBlock(10, 1, 8, 'stone');
    setBlock(10, 1, 7, 'stone');
    const player = makePlayer(10, 10);
    // Walk just far enough to be standing on the step, not past it.
    simulate(player, 35, { forward: true });
    expect(player.y).toBeGreaterThan(1.4); // standing on the step
  });

  it('is stopped by a two-block wall', () => {
    for (let y = 1; y <= 2; y++) {
      for (let x = 8; x <= 12; x++) {
        setBlock(x, y, 8, 'stone');
      }
    }
    const player = makePlayer(10, 10);
    simulate(player, 90, { forward: true });
    expect(player.z).toBeGreaterThan(8.4); // never crossed the wall line
    expect(player.y).toBeCloseTo(0.5, 1); // and never climbed it
  });

  it('walks under a roof three blocks up', () => {
    for (let x = 8; x <= 12; x++) {
      for (let z = 4; z <= 8; z++) {
        setBlock(x, 3, z, 'planks');
      }
    }
    const player = makePlayer(10, 10);
    simulate(player, 120, { forward: true });
    // Walked into the sheltered area, still on the floor — the roof is
    // not treated as the ground.
    expect(player.z).toBeLessThan(8);
    expect(player.y).toBeCloseTo(0.5, 1);
  });

  it('cannot walk into a gap only one block tall', () => {
    // Ceiling at y=2 leaves a single air cell above the floor — the
    // player is almost two blocks tall and must not squeeze in.
    for (let x = 8; x <= 12; x++) {
      for (let z = 4; z <= 8; z++) {
        setBlock(x, 2, z, 'planks');
      }
    }
    const player = makePlayer(10, 10);
    simulate(player, 90, { forward: true });
    expect(player.z).toBeGreaterThan(8.4);
    expect(player.y).toBeCloseTo(0.5, 1);
  });

  it('jumping under a ceiling stops at the ceiling', () => {
    // Spawn first: the constructor drops the player onto the column
    // top, and spawning on the roof would defeat the test.
    const player = makePlayer(10, 10);
    for (let x = 8; x <= 12; x++) {
      for (let z = 8; z <= 12; z++) {
        setBlock(x, 3, z, 'planks');
      }
    }
    let peak = 0;
    for (let i = 0; i < 60; i++) {
      player.update(1 / 60, { ...IDLE, jump: i < 5 }, 0, i / 60);
      peak = Math.max(peak, player.y);
    }
    // Ceiling at y=3 (bottom face 2.5) minus player height 1.8 = 0.7 max.
    expect(peak).toBeLessThanOrEqual(0.71);
  });

  it('jumps about one block high in the open', () => {
    const player = makePlayer();
    let peak = 0;
    for (let i = 0; i < 90; i++) {
      player.update(1 / 60, { ...IDLE, jump: i < 5 }, 0, i / 60);
      peak = Math.max(peak, player.y);
    }
    expect(peak).toBeGreaterThan(1.4);
    expect(peak).toBeLessThan(2.5);
  });

  it('floats and swims upward in water', () => {
    // A deep pool.
    for (let x = 8; x <= 12; x++) {
      for (let z = 8; z <= 12; z++) {
        for (let y = 1; y <= 6; y++) {
          setBlock(x, y, z, 'water');
        }
      }
    }
    const player = makePlayer(10, 10);
    expect(player.isInWater()).toBe(true);
    simulate(player, 90, { jump: true });
    expect(player.y).toBeGreaterThan(3); // swam up
  });

  it('can jump out of water at the surface', () => {
    for (let x = 8; x <= 12; x++) {
      for (let z = 8; z <= 12; z++) {
        setBlock(x, 1, z, 'water');
      }
    }
    const player = makePlayer(10, 10);
    let peak = 0;
    for (let i = 0; i < 90; i++) {
      player.update(1 / 60, { ...IDLE, jump: true }, 0, i / 60);
      peak = Math.max(peak, player.y);
    }
    // Feet in shallow water, torso in air: the breach jump must clear
    // more than a block so the swimmer can climb ashore.
    expect(peak).toBeGreaterThan(1.3);
  });
});
