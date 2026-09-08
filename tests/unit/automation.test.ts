import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { B, blocks } from '../../src/engine/blocks/blocks';
import { BlockState } from '../../src/engine/blocks/BlockState';
import { RECIPES, ingredientIds, matchRecipe, recipeById, validateRecipes } from '../../src/engine/crafting/recipes';
import { EntitySystem } from '../../src/engine/entities/EntitySystem';
import { RobotRunner, flatten, validateProgram } from '../../src/engine/entities/robot';
import { LogicSystem } from '../../src/engine/logic/LogicSystem';
import { PlayerController } from '../../src/engine/physics/PlayerController';
import { Chunk } from '../../src/engine/world/Chunk';
import { VoxelWorld } from '../../src/engine/world/VoxelWorld';

function flatWorld(): VoxelWorld {
  const world = new VoxelWorld(blocks);
  for (let cx = -1; cx <= 1; cx++) for (let cz = -1; cz <= 1; cz++) {
    const chunk = new Chunk(cx, cz);
    for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= 2; y++) chunk.set(x, y, z, B.grass);
    world.addChunk(chunk);
  }
  return world;
}

describe('recipes', () => {
  it('are all valid and cover the new blocks', () => {
    expect(validateRecipes()).toEqual([]);
    expect(RECIPES.length).toBeGreaterThanOrEqual(30);
    expect(ingredientIds().every((id) => blocks.has(id))).toBe(true);
  });

  it('matches shaped recipes anywhere in the grid and shapeless ones in any order', () => {
    const door = recipeById('door')!;
    expect(matchRecipe(door.grid)?.id).toBe('door');
    // Shift the door pattern one column right.
    const shifted = [null, 'planks', 'planks', null, 'planks', 'planks', null, 'planks', 'planks'];
    expect(matchRecipe(shifted)?.id).toBe('door');
    expect(matchRecipe([null, null, null, null, null, null, null, null, 'wood'])?.id).toBe('planks');
    expect(matchRecipe(['stone', null, null, null, null, null, null, null, null])?.id).toBe('button');
    expect(matchRecipe(['stone', 'stone', 'stone', null, null, null, null, null, null])).toBeNull();
    expect(matchRecipe([null, null, null, null, null, null, null, null, null])).toBeNull();
  });
});

describe('logic', () => {
  function rig() {
    const world = flatWorld();
    const logic = new LogicSystem(world, blocks);
    return { world, logic };
  }

  it('a lever powers a lamp through wire, fading one per block', () => {
    const { world, logic } = rig();
    world.setBlock(2, 3, 5, B.lever);
    for (let x = 3; x <= 6; x++) world.setBlock(x, 3, 5, B.wire);
    world.setBlock(7, 3, 5, B.logic_lamp);
    logic.tick();
    expect(world.getBlock(7, 3, 5)).toBe(B.logic_lamp);
    world.setBlock(2, 3, 5, B.lever, BlockState.withOpen(0, true));
    logic.tick();
    expect(world.getBlock(7, 3, 5)).toBe(B.logic_lamp_on);
    expect(logic.powerAt(3, 3, 5)).toBe(14);
    expect(logic.powerAt(6, 3, 5)).toBe(11);
    expect(BlockState.variant(world.getState(4, 3, 5))).toBe(1); // wire lights up
    world.setBlock(2, 3, 5, B.lever, BlockState.withOpen(0, false));
    logic.tick();
    expect(world.getBlock(7, 3, 5)).toBe(B.logic_lamp);
    expect(BlockState.variant(world.getState(4, 3, 5))).toBe(0);
  });

  it('wire runs out after fifteen blocks', () => {
    const { world, logic } = rig();
    world.setBlock(-8, 3, 0, B.lever, BlockState.withOpen(0, true));
    for (let x = -7; x <= 9; x++) world.setBlock(x, 3, 0, B.wire);
    logic.tick();
    expect(logic.powerAt(6, 3, 0)).toBe(1);
    expect(logic.powerAt(7, 3, 0)).toBe(0);
  });

  it('a button turns off by itself and a plate reads the player', () => {
    const { world, logic } = rig();
    world.setBlock(2, 3, 2, B.button);
    world.setBlock(3, 3, 2, B.logic_lamp);
    logic.pressButton(2, 3, 2);
    logic.tick();
    expect(world.getBlock(3, 3, 2)).toBe(B.logic_lamp_on);
    for (let i = 0; i < 20; i++) logic.tick();
    expect(world.getBlock(3, 3, 2)).toBe(B.logic_lamp);

    world.setBlock(6, 3, 6, B.pressure_plate);
    world.setBlock(7, 3, 6, B.logic_lamp);
    logic.pressers = () => [{ minX: 5.7, minY: 3, minZ: 5.7, maxX: 6.3, maxY: 4.8, maxZ: 6.3 }];
    logic.tick();
    expect(world.getBlock(7, 3, 6)).toBe(B.logic_lamp_on);
    logic.pressers = () => [];
    logic.tick();
    expect(world.getBlock(7, 3, 6)).toBe(B.logic_lamp);
  });

  it('power opens doors', () => {
    const { world, logic } = rig();
    world.setBlock(4, 3, 4, B.door, 0);
    world.setBlock(4, 4, 4, B.door, BlockState.withTopHalf(0, true));
    world.setBlock(3, 3, 4, B.lever, BlockState.withOpen(0, true));
    logic.tick();
    expect(BlockState.isOpen(world.getState(4, 3, 4))).toBe(true);
    expect(BlockState.isOpen(world.getState(4, 4, 4))).toBe(true);
  });

  it('a piston pushes a row of blocks and a sticky piston pulls one back', () => {
    const { world, logic } = rig();
    // Piston at x=4 facing +x (rotation 1), blocks at 5 and 6, air at 7.
    world.setBlock(4, 3, 8, B.sticky_piston, BlockState.withRotation(0, 1));
    world.setBlock(5, 3, 8, B.brick);
    world.setBlock(6, 3, 8, B.stone);
    world.setBlock(3, 3, 8, B.lever, BlockState.withOpen(0, true));
    logic.tick();
    expect(world.getBlock(5, 3, 8)).toBe(B.piston_head);
    expect(world.getBlock(6, 3, 8)).toBe(B.brick);
    expect(world.getBlock(7, 3, 8)).toBe(B.stone);
    expect(BlockState.isOpen(world.getState(4, 3, 8))).toBe(true);
    world.setBlock(3, 3, 8, B.lever, BlockState.withOpen(0, false));
    logic.tick();
    expect(world.getBlock(5, 3, 8)).toBe(B.brick); // pulled back
    expect(world.getBlock(6, 3, 8)).toBe(0);
    expect(world.getBlock(7, 3, 8)).toBe(B.stone);
    expect(BlockState.isOpen(world.getState(4, 3, 8))).toBe(false);
  });

  it('a piston cannot push bedrock or more than twelve blocks', () => {
    const { world, logic } = rig();
    world.setBlock(0, 3, 0, B.piston, BlockState.withRotation(0, 1));
    for (let x = 1; x <= 13; x++) world.setBlock(x, 3, 0, B.stone);
    world.setBlock(-1, 3, 0, B.lever, BlockState.withOpen(0, true));
    logic.tick();
    expect(world.getBlock(1, 3, 0)).toBe(B.stone);
    expect(BlockState.isOpen(world.getState(0, 3, 0))).toBe(false);
  });
  describe('repeaters', () => {
    it('carries power past the fifteen blocks wire manages on its own', () => {
      const { world, logic } = rig();
      world.setBlock(-1, 3, 0, B.lever, BlockState.withOpen(0, true));
      // Wire out to its limit, a repeater, then wire again — and a lamp far away.
      for (let x = 0; x <= 13; x++) world.setBlock(x, 3, 0, B.wire);
      world.setBlock(14, 3, 0, B.repeater);
      for (let x = 15; x <= 27; x++) world.setBlock(x, 3, 0, B.wire);
      world.setBlock(28, 3, 0, B.logic_lamp);
      logic.tick();
      expect(logic.powerAt(14, 3, 0), 'the repeater should start again at full').toBe(15);
      expect(world.getBlock(28, 3, 0), 'the lamp past the repeater should light').toBe(B.logic_lamp_on);
      expect(BlockState.variant(world.getState(14, 3, 0)), 'a working repeater lights up').toBe(1);
      // And it goes dark again with the lever.
      world.setBlock(-1, 3, 0, B.lever, BlockState.withOpen(0, false));
      logic.tick();
      expect(world.getBlock(28, 3, 0)).toBe(B.logic_lamp);
      expect(BlockState.variant(world.getState(14, 3, 0))).toBe(0);
    });

    it('is no use without power reaching it', () => {
      const { world, logic } = rig();
      world.setBlock(14, 3, 0, B.repeater);
      for (let x = 15; x <= 20; x++) world.setBlock(x, 3, 0, B.wire);
      world.setBlock(21, 3, 0, B.logic_lamp);
      logic.tick();
      expect(world.getBlock(21, 3, 0)).toBe(B.logic_lamp);
    });
    });

});

describe('robots', () => {
  it('flattens repeats and validates programs', () => {
    const program = validateProgram([{ op: 'forward' }, { op: 'repeat', times: 3, body: [{ op: 'place' }, { op: 'forward' }] }])!;
    expect(program).not.toBeNull();
    expect(flatten(program).map((c) => c.op)).toEqual(['forward', 'place', 'forward', 'place', 'forward', 'place', 'forward']);
    expect(validateProgram([{ op: 'fly' }])).toBeNull();
    expect(validateProgram('nope')).toBeNull();
  });

  it('runs a program that builds a line of blocks', () => {
    const world = flatWorld();
    const robot = new RobotRunner(world, blocks, 4, 3, 8);
    robot.blockId = B.brick;
    // Face +x, then lay bricks while backing away so nothing blocks the robot.
    robot.setProgram([{ op: 'turn_right' }, { op: 'repeat', times: 3, body: [{ op: 'place' }, { op: 'back' }] }]);
    robot.run();
    for (let i = 0; i < 200; i++) robot.update(0.1);
    expect(robot.running).toBe(false);
    expect(world.getBlock(5, 3, 8)).toBe(B.brick);
    expect(world.getBlock(4, 3, 8)).toBe(B.brick);
    expect(world.getBlock(3, 3, 8)).toBe(B.brick);
    expect(robot.x).toBe(1);
  });

  it('robots live in the entity system and persist their program', () => {
    const world = flatWorld();
    const player = new PlayerController(world, blocks, { x: 8, y: 2.5, z: 8 });
    const entities = new EntitySystem(new THREE.Scene(), world, blocks, player);
    const bot = entities.spawnRobot(2, 3, 2, 'Beep', [{ op: 'forward' }], B.stone);
    entities.update(0.1, 0.1);
    const stored = entities.serialize();
    const again = new EntitySystem(new THREE.Scene(), world, blocks, player);
    again.restore(stored);
    const restored = again.entities.find((e) => e.kind === 'robot')!;
    expect(restored.robot?.program).toEqual([{ op: 'forward' }]);
    expect(restored.robot?.blockId).toBe(B.stone);
    expect(bot.name).toBe('Beep');
  });
});

describe('pistons like the real thing', () => {
  it('face up and down, push twelve blocks but not thirteen, and wire climbs a step', async () => {
    const { B, blocks } = await import('../../src/engine/blocks/blocks');
    const { BlockState } = await import('../../src/engine/blocks/BlockState');
    const { MAX_PUSH, PISTON_UP, PISTON_DOWN, pistonDirection, extendPiston } = await import('../../src/engine/logic/pistons');
    const { DIR_PY, DIR_NY, DIR_PX } = await import('../../src/engine/world/coords');
    const { Chunk } = await import('../../src/engine/world/Chunk');
    const { VoxelWorld } = await import('../../src/engine/world/VoxelWorld');
    const { LogicSystem } = await import('../../src/engine/logic/LogicSystem');
    expect(MAX_PUSH).toBe(12);
    expect(pistonDirection(BlockState.withVariant(0, PISTON_UP))).toBe(DIR_PY);
    expect(pistonDirection(BlockState.withVariant(0, PISTON_DOWN))).toBe(DIR_NY);

    const world = new VoxelWorld(blocks);
    for (let cx = -1; cx <= 2; cx++) for (let cz = -1; cz <= 1; cz++) {
      const chunk = new Chunk(cx, cz);
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) chunk.set(x, 0, z, B.stone);
      world.addChunk(chunk);
    }
    // A row of twelve bricks moves; thirteen do not.
    const facePx = [0, 1, 2, 3].find((r) => pistonDirection(BlockState.withRotation(0, r)) === DIR_PX)!;
    world.setBlock(0, 1, 5, B.piston, BlockState.withRotation(0, facePx));
    for (let i = 1; i <= 12; i++) world.setBlock(i, 1, 5, B.brick);
    expect(extendPiston(world, blocks, 0, 1, 5, pistonDirection(world.getState(0, 1, 5)))).toBe(true);
    expect(world.getBlock(13, 1, 5)).toBe(B.brick);
    world.setBlock(0, 1, 8, B.piston, BlockState.withRotation(0, facePx));
    for (let i = 1; i <= 13; i++) world.setBlock(i, 1, 8, B.brick);
    expect(extendPiston(world, blocks, 0, 1, 8, pistonDirection(world.getState(0, 1, 8)))).toBe(false);

    // Wire climbing: lever -> ground wire -> wire on a step -> lamp two blocks up.
    const logic = new LogicSystem(world, blocks);
    world.setBlock(5, 1, 12, B.lever, BlockState.withOpen(0, true));
    world.setBlock(6, 1, 12, B.wire);
    world.setBlock(7, 1, 12, B.stone);
    world.setBlock(7, 2, 12, B.wire);
    world.setBlock(8, 2, 12, B.stone);
    world.setBlock(8, 3, 12, B.wire);
    world.setBlock(9, 3, 12, B.logic_lamp);
    logic.tick();
    expect(world.getBlock(9, 3, 12)).toBe(B.logic_lamp_on); // lit
  });
});
