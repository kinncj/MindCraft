import { blueprintById, BLUEPRINTS } from '../build/blueprints';
import type { Engine } from '../core/Engine';
import { resolveBlockId } from '../blocks/blocks';
import { earthworkOptions, featureOptions, houseOptions, type BuildingArgs } from '../build/buildingKit';
import type { EarthworkKind, FeatureKind } from '../build/BuildTools';
import { houseLayout } from '../build/BuildTools';

/** build_* tools: the same room/fill/paint/copy/paste/mirror the UI has. */
export function registerBuildTools(engine: Engine): void {
  const { tools, build } = engine;
  const int = { type: 'integer' };
  const blockId = (name: string): number => {
    if (name === 'air') return 0;
    const def = resolveBlockId(name);
    if (!def) throw new Error(`unknown block "${name}"`);
    return def.numericId;
  };
  const box = { x1: int, y1: int, z1: int, x2: int, y2: int, z2: int };

  tools.register({
    name: 'build_room',
    description: 'Build a room: a floor from corner to corner and hollow walls three high, with a doorway. One undo step.',
    inputSchema: { type: 'object', properties: { ...box, block: { type: 'string' } }, required: ['x1', 'y1', 'z1', 'x2', 'z2', 'block'] },
    execute: (a: { x1: number; y1: number; z1: number; x2: number; z2: number; block: string }) => ({
      blocks: build.room({ x: a.x1, y: a.y1, z: a.z1 }, { x: a.x2, y: a.y1, z: a.z2 }, blockId(a.block)),
    }),
  });
  tools.register({
    name: 'build_paint',
    description: 'Change one block into another kind, keeping its rotation when the shape matches.',
    inputSchema: { type: 'object', properties: { x: int, y: int, z: int, block: { type: 'string' } }, required: ['x', 'y', 'z', 'block'] },
    execute: ({ x, y, z, block }: { x: number; y: number; z: number; block: string }) => {
      const id = engine.world.getBlock(x, y, z);
      if (id === 0) return { painted: false };
      return { painted: build.paint({ x, y, z, id, face: 2, px: x, py: y, pz: z, distance: 0 }, blockId(block)) };
    },
  });
  tools.register({
    name: 'build_copy',
    description: 'Copy a box of blocks to the clipboard.',
    inputSchema: { type: 'object', properties: box, required: ['x1', 'y1', 'z1', 'x2', 'y2', 'z2'] },
    execute: (a: { x1: number; y1: number; z1: number; x2: number; y2: number; z2: number }) => ({
      copied: build.copy({ x: a.x1, y: a.y1, z: a.z1 }, { x: a.x2, y: a.y2, z: a.z2 }),
      blocks: build.clipboard?.blocks.length ?? 0,
    }),
  });
  tools.register({
    name: 'build_paste',
    description: 'Paste the clipboard centered on (x, z) with its bottom at y. rotation = quarter turns.',
    inputSchema: { type: 'object', properties: { x: int, y: int, z: int, rotation: int }, required: ['x', 'y', 'z'] },
    execute: ({ x, y, z, rotation }: { x: number; y: number; z: number; rotation?: number }) => {
      if (rotation !== undefined) build.rotation = ((rotation % 4) + 4) % 4;
      return { blocks: build.paste({ x, y, z }) };
    },
  });
  tools.register({
    name: 'build_house',
    description: 'Build any building at (x, z) with its floor at y: type (house, hospital, school, shop, skyscraper, hotel, barn, library, restaurant, firestation, castle), width and depth 5-25, floors 1-10, wall/roof/trim block ids, colorful, furnish (beds, tables, lamps...), sign "cross", flag (canada, brazil, usa, uk, france, italy, germany, japan, portugal, spain, mexico, ireland, rainbow). Doors, stairs between floors, windows, and lamps are always included.',
    inputSchema: { type: 'object', properties: { x: int, y: int, z: int, type: { type: 'string' }, width: int, depth: int, floors: int, wall: { type: 'string' }, roof: { type: 'string' }, trim: { type: 'string' }, colorful: { type: 'boolean' }, castle: { type: 'boolean' }, furnish: { type: 'boolean' }, sign: { type: 'string' }, flag: { type: 'string' }, doorWidth: int, doorHeight: int, automaticDoor: { type: 'boolean' }, elevator: { type: 'boolean' }, pistonDoor: { type: 'boolean' }, roomPlan: { type: 'array', items: { type: 'object', properties: { purpose: { type: 'string' }, count: int } } }, features: { type: 'array', items: { type: 'string', enum: ['court', 'playground', 'pool', 'garden', 'parking', 'fountain', 'fence'] } } }, required: ['x', 'y', 'z'] },
    execute: (a: { x: number; y: number; z: number } & BuildingArgs) => {
      const opts = houseOptions(engine.registry, a);
      const edits = build.planHouse(a.x, a.y, a.z, opts);
      const blocks = build.run(`Build a ${a.type ?? (a.castle ? 'castle' : 'house')}`, edits);
      const layout = houseLayout(a.x, a.y, a.z, opts);
      if (layout.shaft) engine.entities.spawnLift(layout.shaft.x + 0.5, layout.stops[0], layout.shaft.z + 0.5, layout.stops);
      return { blocks, elevator: layout.shaft !== null };
    },
  });
  tools.register({
    name: 'build_dig',
    description: 'Dig something at (x, z) with the ground surface at y: kind pool (in-ground, tiled, with a ladder), raisedPool (above ground), lake, pond, pit, bunker (underground room with stairs and lights), tunnel (along +x), well, moat. width and length in blocks, depth in blocks down.',
    inputSchema: { type: 'object', properties: { x: int, y: int, z: int, kind: { type: 'string', enum: ['pool', 'raisedPool', 'lake', 'pond', 'pit', 'bunker', 'tunnel', 'well', 'moat'] }, width: int, length: int, depth: int }, required: ['x', 'y', 'z', 'kind'] },
    execute: (a: { x: number; y: number; z: number; kind: EarthworkKind; width?: number; length?: number; depth?: number }) => {
      const edits = build.planEarthwork(a.kind, a.x, a.y, a.z, earthworkOptions(engine.registry, a));
      return { blocks: build.run(`Dig a ${a.kind}`, edits) };
    },
  });
  tools.register({
    name: 'build_feature',
    description: 'Build one thing beside a building, centred on (x, z) with the ground at y: bridge (a plank deck with railings and a step at each end), treehouse (a platform on log stilts with a ladder), playground, court, garden, fountain, parking, fence. width and length in blocks, color a block id for its planks.',
    inputSchema: { type: 'object', properties: { x: int, y: int, z: int, kind: { type: 'string', enum: ['bridge', 'treehouse', 'playground', 'court', 'garden', 'fountain', 'parking', 'fence'] }, width: int, length: int, color: { type: 'string' } }, required: ['x', 'y', 'z', 'kind'] },
    execute: (a: { x: number; y: number; z: number; kind: FeatureKind; width?: number; length?: number; color?: string }) => {
      const edits = build.planFeature(a.kind, a.x, a.y, a.z, featureOptions(engine.registry, a));
      return { blocks: build.run(`Build a ${a.kind}`, edits) };
    },
  });
  tools.register({
    name: 'build_shape',
    description: 'Build a simple shape centered on (x, z) with its bottom at y: pyramid, tower, cube, platform, wall, ring, line, tree, arch. size 2-16.',
    inputSchema: { type: 'object', properties: { shape: { type: 'string' }, block: { type: 'string' }, x: int, y: int, z: int, size: int }, required: ['shape', 'x', 'y', 'z'] },
    execute: (a: { shape: string; block?: string; x: number; y: number; z: number; size?: number }) => {
      const edits = build.planShape(a.shape, a.x, a.y, a.z, a.block ? blockId(a.block) : engine.registry.numericOf('sandstone'), a.size ?? 5);
      if (edits.length === 0) throw new Error(`I do not know the shape "${a.shape}"`);
      return { blocks: build.run(`Build a ${a.shape}`, edits) };
    },
  });
  tools.register({
    name: 'build_list_blueprints',
    description: 'The blueprint cards you can stamp: id, label, size.',
    inputSchema: { type: 'object', properties: {} },
    execute: () => BLUEPRINTS.map((b) => ({ id: b.id, label: b.label, description: b.description, width: b.stamp.width, height: b.stamp.height, depth: b.stamp.depth })),
  });
  tools.register({
    name: 'build_stamp_blueprint',
    description: 'Stamp a blueprint (see build_list_blueprints) centered on (x, z) with its floor at y.',
    inputSchema: { type: 'object', properties: { blueprint: { type: 'string' }, x: int, y: int, z: int, rotation: int }, required: ['blueprint', 'x', 'y', 'z'] },
    execute: ({ blueprint, x, y, z, rotation }: { blueprint: string; x: number; y: number; z: number; rotation?: number }) => {
      const bp = blueprintById(blueprint);
      if (!bp) throw new Error(`unknown blueprint "${blueprint}"`);
      build.setClipboard(bp.stamp);
      build.rotation = ((rotation ?? 0) % 4 + 4) % 4;
      return { blocks: build.paste({ x, y, z }) };
    },
  });
  tools.register({
    name: 'build_mirror',
    description: 'Mirror every edit across the plane x = mirrorX (defaults to the player). enabled=false turns it off.',
    inputSchema: { type: 'object', properties: { enabled: { type: 'boolean' }, mirrorX: int }, required: ['enabled'] },
    execute: ({ enabled, mirrorX }: { enabled: boolean; mirrorX?: number }) => {
      build.setMirror(enabled ? (mirrorX ?? Math.round(engine.player.x)) : null);
      return { mirrorX: build.mirrorX };
    },
  });
}
