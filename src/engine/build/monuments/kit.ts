/**
 * The blocks the monuments are made of, resolved from the block registry.
 *
 * Every `id()` here has a fallback so a slimmed-down registry still builds
 * something. That makes a renamed block silent: every black facade would
 * quietly become deep stone and no test would notice. Pass `missing` to find
 * out which preferred names were not there — a test does exactly that.
 */

import type { BlockRegistry } from '../../blocks/registry';
import type { MonumentKit } from './types';

export function monumentKit(registry: BlockRegistry, missing?: string[]): MonumentKit {
  const id = (name: string, fallback: string): number => {
    if (registry.has(name)) return registry.numericOf(name);
    missing?.push(name);
    return registry.numericOf(fallback);
  };
  const maybe = (name: string): number | null => (registry.has(name) ? registry.numericOf(name) : null);
  return {
    iron: id('color_brown', 'cobblestone'),
    concrete: id('color_white', 'stone'),
    white: id('color_white', 'stone'),
    glass: registry.numericOf('glass'),
    red: id('color_red', 'brick'),
    yellow: id('color_yellow', 'sand'),
    green: id('color_green', 'grass'),
    blue: id('color_blue', 'water'),
    pink: id('color_pink', 'brick'),
    stone: id('stone_bricks', 'stone'),
    cobble: id('cobblestone', 'stone'),
    water: registry.numericOf('water'),
    ice: id('ice', 'glass'),
    grass: registry.numericOf('grass'),
    dirt: registry.numericOf('dirt'),
    sand: registry.numericOf('sand'),
    leaves: id('leaves', 'grass'),
    wood: id('wood', 'planks'),
    planks: registry.numericOf('planks'),
    slab: id('planks_slab', 'planks'),
    stairs: id('stone_stairs', 'planks'),
    fence: id('fence', 'wood'),
    lamp: maybe('lantern'),
    flowers: ['flower_pink', 'flower_yellow', 'flower_blue', 'flower_red'].filter((n) => registry.has(n)).map((n) => registry.numericOf(n)),
    black: id('color_black', 'deep_stone'),
    stickyPiston: maybe('sticky_piston'),
    wire: maybe('wire'),
    lever: maybe('lever'),
    repeater: maybe('repeater'),
  };
}
