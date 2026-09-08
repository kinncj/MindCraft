import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { BuildTools } from '../../src/engine/build/BuildTools';
import { SitePlanner, type Ground } from '../../src/engine/build/siteFinder';
import { ChatAgent } from '../../src/engine/chat/ChatAgent';
import { CommandHistory } from '../../src/engine/commands/CommandHistory';
import { EntitySystem } from '../../src/engine/entities/EntitySystem';
import { PlayerController } from '../../src/engine/physics/PlayerController';
import { ToolRegistry } from '../../src/engine/tools/ToolRegistry';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

/** A make-believe world: flat at y = 4, with hills and buildings where you put them. */
function ground(options: { hills?: Array<{ x: number; z: number; r: number }>; walls?: Array<{ x: number; z: number; r: number }> } = {}): Ground {
  return {
    height: (x, z) => {
      if (Math.abs(x) > 200 || Math.abs(z) > 200) return -1; // outside the loaded world
      // A cone, so the ground really slopes: flat tops are fine to build on.
      let top = 4;
      for (const h of options.hills ?? []) top = Math.max(top, 4 + Math.max(0, h.r - Math.hypot(h.x - x, h.z - z)));
      return Math.round(top);
    },
    blocked: (x, y, z) => (options.walls ?? []).some((w) => Math.hypot(w.x - x, w.z - z) <= w.r) && y <= 8,
  };
}

describe('finding somewhere to build', () => {
  it('takes the spot the kid is standing by when it is open and level', () => {
    const planner = new SitePlanner(ground());
    expect(planner.place({ width: 9, depth: 9 }, { x: 20, z: 20 })).toEqual({ x: 20, y: 5, z: 20 });
  });

  it('never puts the second thing on top of the first', () => {
    const planner = new SitePlanner(ground());
    const first = planner.place({ width: 15, depth: 13 }, { x: 0, z: 0 });
    const second = planner.place({ width: 15, depth: 13 }, { x: 0, z: 0 });
    const third = planner.place({ width: 9, depth: 9 }, { x: 0, z: 0 });
    for (const [a, b] of [[first, second], [first, third], [second, third]]) {
      const apart = Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z));
      expect(apart, `${JSON.stringify(a)} vs ${JSON.stringify(b)}`).toBeGreaterThanOrEqual(13);
    }
  });

  it('walks away from a hill and from someone else\'s house', () => {
    const planner = new SitePlanner(ground({ hills: [{ x: 0, z: 0, r: 10 }], walls: [{ x: 30, z: 0, r: 10 }] }));
    const site = planner.place({ width: 9, depth: 9 }, { x: 0, z: 0 });
    expect(Math.hypot(site.x, site.z), 'stood on the hill').toBeGreaterThan(10);
    expect(Math.hypot(site.x - 30, site.z), 'built into the house').toBeGreaterThan(10);
    // Level enough to lay a foundation on: at most a couple of blocks across the whole plot.
    const g = ground({ hills: [{ x: 0, z: 0, r: 10 }], walls: [{ x: 30, z: 0, r: 10 }] });
    let low = Infinity;
    let high = -Infinity;
    for (let x = site.x - 6; x <= site.x + 6; x++) for (let z = site.z - 6; z <= site.z + 6; z++) {
      low = Math.min(low, g.height(x, z));
      high = Math.max(high, g.height(x, z));
    }
    expect(high - low, `ground under the site rises ${high - low} blocks`).toBeLessThanOrEqual(2);
  });

  it('never builds into a part of the world that is not there', () => {
    const planner = new SitePlanner(ground());
    const site = planner.place({ width: 9, depth: 9 }, { x: 199, z: 199 });
    expect(Math.abs(site.x), 'wandered off the edge of the world').toBeLessThanOrEqual(200);
  });

  it('still gives the kid a building when nowhere is good enough', () => {
    const planner = new SitePlanner({ height: () => 4, blocked: () => true });
    expect(planner.place({ width: 9, depth: 9 }, { x: 7, z: 7 })).toEqual({ x: 7, y: 5, z: 7 });
  });
});

describe('a villager builds beside what it just built', () => {
  function rig() {
    const world = new VoxelWorld(blocks);
    for (let cx = -4; cx <= 4; cx++) for (let cz = -4; cz <= 4; cz++) {
      const chunk = new Chunk(cx, cz);
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= 4; y++) chunk.set(x, y, z, y < 4 ? B.dirt : B.grass);
      world.addChunk(chunk);
    }
    const player = new PlayerController(world, blocks, { x: 8, y: 5.5, z: 8 });
    const entities = new EntitySystem(new THREE.Scene(), world, blocks, player);
    const history = new CommandHistory(world);
    const build = new BuildTools(world, blocks, history);
    const agent = new ChatAgent({
      tools: new ToolRegistry(), entities, build, registry: blocks,
      player: () => ({ x: 8, y: 5.5, z: 8, yaw: 0 }), surface: (x, z) => world.height(x, z), say: () => undefined,
    });
    const villager = entities.spawnVillager('builder', 5, 5, 'Ben');
    return { world, entities, agent, villager };
  }

  it('two houses in a row stand side by side, not one inside the other', async () => {
    const { world, entities, agent, villager } = rig();
    const footprints: Array<{ x: number; z: number }> = [];
    for (const message of ['build a house', 'build another house']) {
      const result = await agent.send(villager.id, message);
      const args = result?.actions.find((a) => a.tool === 'build_house')?.args as { x: number; z: number } | undefined;
      expect(args, message).toBeDefined();
      footprints.push({ x: args!.x, z: args!.z });
      for (let i = 0; i < 60 * 90 && villager.work; i++) entities.update(1 / 60, i / 60);
      expect(villager.work, `${message} never finished`).toBeUndefined();
    }
    expect(Math.max(Math.abs(footprints[0].x - footprints[1].x), Math.abs(footprints[0].z - footprints[1].z))).toBeGreaterThanOrEqual(9);
    // Both houses are still standing: one door each, and they are not in the same place.
    const doors: Array<{ x: number; z: number }> = [];
    for (let x = -40; x < 60; x++) for (let z = -40; z < 60; z++) {
      if (world.getBlock(x, 5, z) === blocks.numericOf('door')) doors.push({ x, z });
    }
    expect(doors.length, 'a door for each house').toBeGreaterThanOrEqual(2);
    expect(new Set(doors.map((d) => `${d.x},${d.z}`)).size).toBe(doors.length);
  });

  it('digging twice, or making two pyramids, also moves along', async () => {
    const { agent, villager, entities } = rig();
    const spots: Array<{ x: number; z: number }> = [];
    for (const message of ['dig a pond', 'dig another pond', 'build a pyramid', 'build a big pyramid']) {
      const result = await agent.send(villager.id, message);
      const action = result?.actions.find((a) => a.tool === 'build_dig' || a.tool === 'build_shape');
      expect(action, message).toBeDefined();
      spots.push({ x: action!.args.x as number, z: action!.args.z as number });
      for (let i = 0; i < 60 * 90 && villager.work; i++) entities.update(1 / 60, i / 60);
    }
    const keys = new Set(spots.map((s) => `${s.x},${s.z}`));
    expect(keys.size, `landed on the same ground: ${JSON.stringify(spots)}`).toBe(spots.length);
  });

  it('a school, a lake and an airport in one sentence each get their own ground', async () => {
    const { agent, villager } = rig();
    const result = await agent.send(villager.id, 'build a school and dig a big lake and then an airport with an airstrip for airplanes');
    const places = (result?.actions ?? [])
      .filter((a) => a.tool === 'build_house' || a.tool === 'build_dig')
      .map((a) => ({ tool: a.tool, x: a.args.x as number, z: a.args.z as number }));
    expect(places).toHaveLength(3);
    for (let i = 0; i < places.length; i++) {
      for (let j = i + 1; j < places.length; j++) {
        const apart = Math.max(Math.abs(places[i].x - places[j].x), Math.abs(places[i].z - places[j].z));
        expect(apart, `${places[i].tool} and ${places[j].tool} landed on the same ground`).toBeGreaterThanOrEqual(13);
      }
    }
  });
});
