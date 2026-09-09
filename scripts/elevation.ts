/**
 * Prints a monument as a block-by-block elevation, so you can see what it
 * really looks like without launching a browser. Far quicker than a
 * screenshot, and it does not fight the terrain for a view.
 *
 *   npm run elevation -- eiffel            # front, then side
 *   npm run elevation -- arena_baixada plan
 *   npm run elevation -- rideau_canal section   # a slice down the middle
 *   npm run elevation --                   # lists what there is
 */

import { B, blocks } from '../src/engine/blocks/blocks';
import { BuildTools } from '../src/engine/build/BuildTools';
import { MONUMENTS, MONUMENT_KINDS, monumentKit, type MonumentKind } from '../src/engine/build/monuments/index';
import { CommandHistory } from '../src/engine/commands/CommandHistory';
import { Chunk } from '../src/engine/world/Chunk';
import { VoxelWorld } from '../src/engine/world/VoxelWorld';

const GROUND = 12;
const AT = 40;

function flatWorld(): VoxelWorld {
  const world = new VoxelWorld(blocks);
  for (let cx = -6; cx <= 6; cx++) {
    for (let cz = -6; cz <= 6; cz++) {
      const chunk = new Chunk(cx, cz);
      for (let x = 0; x < 16; x++) for (let z = 0; z < 16; z++) for (let y = 0; y <= GROUND; y++) chunk.set(x, y, z, y < GROUND ? B.dirt : B.grass);
      world.addChunk(chunk);
    }
  }
  return world;
}

/** One letter per material, so a silhouette is readable at a glance. */
function letterFor(id: number): string {
  if (id === 0) return '.';
  const name = blocks.get(id)?.id ?? '?';
  if (name.includes('glass')) return 'o';
  if (name === 'water') return '~';
  if (name === 'ice') return '=';
  if (name === 'wire') return '+';
  if (name === 'repeater') return '>';
  if (name.includes('piston')) return 'P';
  if (name === 'lever') return 'L';
  if (name.startsWith('color_')) return name[6].toUpperCase();
  return name[0];
}

const kind = (process.argv[2] ?? '') as MonumentKind;
if (!MONUMENT_KINDS.includes(kind)) {
  console.log('Monuments:', MONUMENT_KINDS.join(', '));
  process.exit(kind ? 1 : 0);
}
const view = process.argv[3] ?? 'both';
const spec = MONUMENTS[kind];
const world = flatWorld();
const tools = new BuildTools(world, blocks, new CommandHistory(world));
const edits = tools.planMonument(kind, AT, GROUND + 1, AT, { kit: monumentKit(blocks), text: 'HI' });
tools.run(kind, edits);

const halfW = Math.floor(spec.width / 2) + 1;
const halfD = Math.floor(spec.depth / 2) + 1;
const top = GROUND + spec.height + 3;

console.log(`${spec.label} — ${spec.place}`);
console.log(`${spec.width} x ${spec.depth} x ${spec.height} blocks | real: ${spec.real.height} m tall, ${spec.real.width} m across | ${edits.filter((e) => e.id !== 0).length} blocks`);
console.log(spec.real.source ?? '');

/** Looks through the whole depth (or width) and reports the first block it meets. */
function elevation(axis: 'front' | 'side'): void {
  console.log(`\n${axis} elevation:`);
  const across = axis === 'front' ? halfW : halfD;
  const through = axis === 'front' ? halfD : halfW;
  for (let y = top; y >= GROUND; y--) {
    let row = String(y - GROUND).padStart(3) + ' ';
    for (let a = -across; a <= across; a++) {
      let ch = '.';
      // From the near side backwards: this is the face you would be standing at.
      for (let t = through; t >= -through; t--) {
        const x = axis === 'front' ? AT + a : AT + t;
        const z = axis === 'front' ? AT + t : AT + a;
        const id = world.getBlock(x, y, z);
        if (id === 0) continue;
        ch = letterFor(id);
        break;
      }
      row += ch;
    }
    console.log(row);
  }
}

function plan(): void {
  console.log('\nplan (looking down):');
  for (let z = -halfD; z <= halfD; z++) {
    let row = String(z).padStart(4) + ' ';
    for (let x = -halfW; x <= halfW; x++) {
      let ch = '.';
      for (let y = top; y >= GROUND; y--) {
        const id = world.getBlock(AT + x, y, AT + z);
        if (id === 0) continue;
        ch = letterFor(id);
        break;
      }
      row += ch;
    }
    console.log(row);
  }
}

/**
 * A true slice down the middle rather than a silhouette: it shows what is
 * hollow, and it is the only view that reaches below the ground, where the
 * Rideau Canal's whole channel and the Colosseum's hypogeum live.
 */
function section(): void {
  console.log('\nsection (a slice down the middle, below ground too):');
  for (let y = top; y >= GROUND - 4; y--) {
    let row = String(y - GROUND).padStart(3) + ' ';
    for (let a = -halfW; a <= halfW; a++) row += letterFor(world.getBlock(AT + a, y, AT));
    console.log(row);
  }
}

if (view === 'front' || view === 'both') elevation('front');
if (view === 'side' || view === 'both') elevation('side');
if (view === 'plan') plan();
if (view === 'section') section();
