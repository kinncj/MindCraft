import { describe, expect, it } from 'vitest';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { VEHICLE_KINDS, Vehicle } from '../../src/engine/entities/vehicles';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

function flat(): VoxelWorld {
  const world = new VoxelWorld(blocks);
  for (let cx = -2; cx <= 2; cx++) for (let cz = -2; cz <= 2; cz++) {
    const chunk = new Chunk(cx, cz);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= 3; y++) chunk.set(x, y, z, B.stone);
    world.addChunk(chunk);
  }
  return world;
}
const drive = (over: Partial<Parameters<Vehicle['update']>[1] & object>) => ({ forward: false, back: false, left: false, right: false, ...over });
const run = (v: Vehicle, input: ReturnType<typeof drive> | null, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) v.update(1 / 60, input, i / 60);
};

describe('rides', () => {
  it('every kind builds a body and has a card block', () => {
    const world = flat();
    for (const kind of VEHICLE_KINDS) {
      const v = new Vehicle(kind, world, blocks, { x: 8, y: 3.5, z: 8 }, '#ffffff');
      expect(v.group.children.length).toBeGreaterThan(0);
      expect(blocks.byId(kind)?.spawns).toEqual({ kind: 'vehicle', variant: kind });
    }
  });

  it('a car accelerates, brakes, and a motorbike is quicker and leans', () => {
    const world = flat();
    const car = new Vehicle('car', world, blocks, { x: 8, y: 3.5, z: 8 }, '#f00');
    run(car, drive({ forward: true }), 2);
    expect(car.speed).toBeGreaterThan(8);
    const before = car.x;
    run(car, drive({ back: true }), 0.6);
    expect(car.speed).toBeLessThan(2);
    expect(car.x).toBeGreaterThan(before);
    const bike = new Vehicle('motorcycle', world, blocks, { x: 8, y: 3.5, z: 8 }, '#00f');
    run(bike, drive({ forward: true }), 2);
    expect(bike.speed).toBeGreaterThan(car.speed);
    run(bike, drive({ forward: true, left: true }), 0.5);
    expect(Math.abs(bike.roll)).toBeGreaterThan(0.1);
  });

  it('a plane needs runway speed, climbs with jump, and glides down when it slows', () => {
    const world = flat();
    const plane = new Vehicle('plane', world, blocks, { x: -20, y: 3.5, z: 8 }, '#fff');
    run(plane, drive({ forward: true, up: true }), 0.5);
    expect(plane.y).toBeCloseTo(3.5, 1); // too slow to lift
    run(plane, drive({ forward: true, up: true }), 4);
    expect(plane.airborne).toBe(true);
    expect(plane.y).toBeGreaterThan(8);
    const high = plane.y;
    run(plane, drive({ back: true }), 6);
    expect(plane.y).toBeLessThan(high); // slowing down, gliding lower
    expect(plane.y).toBeGreaterThanOrEqual(3.5); // never below the ground
  });

  it('a helicopter lifts straight up, hovers, moves forward, and lands', () => {
    const world = flat();
    const heli = new Vehicle('helicopter', world, blocks, { x: 8, y: 3.5, z: 8 }, '#ff0');
    run(heli, drive({ up: true }), 2);
    expect(heli.y).toBeGreaterThan(7);
    const hover = heli.y;
    run(heli, drive({}), 2);
    expect(Math.abs(heli.y - hover)).toBeLessThan(1);
    run(heli, drive({ forward: true }), 2);
    expect(heli.x).toBeGreaterThan(9);
    run(heli, drive({ down: true }), 6);
    expect(heli.y).toBeCloseTo(3.5, 1);
    expect(heli.airborne).toBe(false);
  });
});
