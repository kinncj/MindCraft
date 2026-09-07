import type { Engine } from '../core/Engine';
import { resolveBlockId } from '../blocks/blocks';
import { RECIPES, matchRecipe, recipeById } from '../crafting/recipes';
import { validateProgram } from '../entities/robot';
import { BlockState } from '../blocks/BlockState';

/** crafting_*, logic_*, and robot_* tools. */
export function registerAutomationTools(engine: Engine): void {
  const { tools, entities } = engine;
  const int = { type: 'integer' };
  const str = { type: 'string' };

  tools.register({
    name: 'crafting_list_recipes',
    description: 'Every recipe: id, result, ingredients grid (9 cells, row by row).',
    inputSchema: { type: 'object', properties: {} },
    execute: () => RECIPES.map((r) => ({ id: r.id, label: r.label, result: r.result, count: r.count, grid: r.grid, shapeless: r.shapeless ?? false, hint: r.hint })),
  });
  tools.register({
    name: 'crafting_match',
    description: 'What a 3x3 grid of block ids (nulls for empty) would make.',
    inputSchema: { type: 'object', properties: { grid: { type: 'array' } }, required: ['grid'] },
    execute: ({ grid }: { grid: unknown }) => {
      if (!Array.isArray(grid) || grid.length !== 9) throw new Error('grid must have 9 cells');
      const cells = grid.map((c) => (typeof c === 'string' && resolveBlockId(c) ? resolveBlockId(c)!.id : null));
      const recipe = matchRecipe(cells);
      return recipe ? { recipe: recipe.id, result: recipe.result, count: recipe.count } : { recipe: null };
    },
  });
  tools.register({
    name: 'crafting_craft',
    description: 'Craft a recipe by id: the result lands in the hotbar.',
    inputSchema: { type: 'object', properties: { recipe: str }, required: ['recipe'] },
    execute: ({ recipe }: { recipe: string }) => {
      const r = recipeById(recipe);
      if (!r) throw new Error(`unknown recipe "${recipe}"`);
      engine.craft(r.id);
      return { result: r.result, count: r.count };
    },
  });

  tools.register({
    name: 'logic_power_at',
    description: 'The power level (0-15) reaching a cell right now.',
    inputSchema: { type: 'object', properties: { x: int, y: int, z: int }, required: ['x', 'y', 'z'] },
    execute: ({ x, y, z }: { x: number; y: number; z: number }) => ({ power: engine.logic.powerAt(x, y, z) }),
  });
  tools.register({
    name: 'logic_set_lever',
    description: 'Flip a lever on or off.',
    inputSchema: { type: 'object', properties: { x: int, y: int, z: int, on: { type: 'boolean' } }, required: ['x', 'y', 'z', 'on'] },
    execute: ({ x, y, z, on }: { x: number; y: number; z: number; on: boolean }) => {
      const id = engine.world.getBlock(x, y, z);
      if (engine.registry.get(id)?.logic?.kind !== 'lever') throw new Error('no lever there');
      engine.world.setBlock(x, y, z, id, BlockState.withOpen(engine.world.getState(x, y, z), on));
      return { on };
    },
  });
  tools.register({
    name: 'logic_press_button',
    description: 'Press a button (it stays on for a moment).',
    inputSchema: { type: 'object', properties: { x: int, y: int, z: int }, required: ['x', 'y', 'z'] },
    execute: ({ x, y, z }: { x: number; y: number; z: number }) => {
      if (engine.registry.get(engine.world.getBlock(x, y, z))?.logic?.kind !== 'button') throw new Error('no button there');
      engine.logic.pressButton(x, y, z);
      return { pressed: true };
    },
  });

  tools.register({
    name: 'robot_list',
    description: 'Every robot with its program, position, and whether it is running.',
    inputSchema: { type: 'object', properties: {} },
    execute: () =>
      entities.entities
        .filter((e) => e.robot)
        .map((e) => ({ id: e.id, name: e.name, x: e.robot!.x, y: e.robot!.y, z: e.robot!.z, running: e.robot!.running, program: e.robot!.program, block: engine.registry.get(e.robot!.blockId)?.id ?? null })),
  });
  tools.register({
    name: 'robot_spawn',
    description: 'A new robot near the player (or at x, y, z).',
    inputSchema: { type: 'object', properties: { name: str, x: int, y: int, z: int } },
    execute: ({ name, x, y, z }: { name?: string; x?: number; y?: number; z?: number }) => {
      const e = entities.spawnRobot(x ?? Math.round(engine.player.x) + 2, y ?? Math.round(engine.player.y), z ?? Math.round(engine.player.z), name);
      return { id: e.id, name: e.name };
    },
  });
  tools.register({
    name: 'robot_program',
    description: 'Set a robot program: cards like {op:"forward"}, {op:"place"}, {op:"repeat",times:4,body:[...]}. Ops: forward back left right up down turn_left turn_right place remove wait. Optional block id to place.',
    inputSchema: { type: 'object', properties: { id: str, program: { type: 'array' }, block: str }, required: ['id', 'program'] },
    execute: ({ id, program, block }: { id: string; program: unknown; block?: string }) => {
      const e = entities.byId(id);
      if (!e?.robot) throw new Error(`no robot ${id}`);
      const valid = validateProgram(program);
      if (!valid) throw new Error('that program has a card I do not know');
      e.robot.setProgram(valid);
      if (block) e.robot.blockId = resolveBlockId(block)?.numericId ?? 0;
      return { steps: valid.length };
    },
  });
  tools.register({
    name: 'robot_run',
    description: 'Run (or stop) a robot program.',
    inputSchema: { type: 'object', properties: { id: str, run: { type: 'boolean' } }, required: ['id'] },
    execute: ({ id, run = true }: { id: string; run?: boolean }) => {
      const e = entities.byId(id);
      if (!e?.robot) throw new Error(`no robot ${id}`);
      if (run) e.robot.run();
      else e.robot.stop();
      return { running: e.robot.running };
    },
  });
}
