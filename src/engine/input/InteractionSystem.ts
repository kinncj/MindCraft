import type { BlockRegistry } from '../blocks/registry';
import type { BlockDefinition } from '../blocks/BlockDefinition';
import { SetBlocksCommand, type BlockEdit } from '../commands/Command';
import type { CommandHistory } from '../commands/CommandHistory';
import type { System } from '../core/System';
import { boxOverlaps, shapeBoxToWorld } from '../physics/collision';
import type { PlayerController } from '../physics/PlayerController';
import { raycastBlocks, type BlockHit, type Ray } from '../physics/raycast';
import { SHAPES } from '../blocks/shapes';
import { DIRECTIONS, DIR_NY, DIR_PY, type Direction } from '../world/coords';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { CameraSystem } from './CameraSystem';
import type { InputFrame } from './InputSystem';

export type InteractionMode = 'place' | 'remove';

/** What the interaction system needs from the app layer. */
export type InteractionBridge = {
  getSelectedBlockId(): number;
  getMode(): InteractionMode;
  openPanel(kind: string, payload: unknown): void;
  /** Return true when something (an animal) consumed the tap. */
  tapEntity?(ray: Ray): boolean;
  onBlockPlaced?(def: BlockDefinition, x: number, y: number, z: number): void;
  onBlockRemoved?(def: BlockDefinition, x: number, y: number, z: number): void;
};

export type PlacementTarget = { x: number; y: number; z: number; face: Direction; valid: boolean };

export type InteractionState = {
  highlight: { x: number; y: number; z: number } | null;
  /** Where the selected block would go if the player tapped now. */
  placement: PlacementTarget | null;
  /** Test hook: what the last tap did. */
  lastTap: { hit: BlockHit | null; action: string } | null;
};

const REACH = 7;

/**
 * Turns taps into world edits: pick the block under the pointer (or the
 * crosshair in first person), then place, remove, or interact through
 * the block's behavior. All edits go through the command history.
 */
export class InteractionSystem implements System {
  readonly name = 'interaction';
  readonly state: InteractionState = { highlight: null, placement: null, lastTap: null };

  constructor(
    private world: VoxelWorld,
    private registry: BlockRegistry,
    private input: InputFrame,
    private camera: CameraSystem,
    private player: PlayerController,
    private history: CommandHistory,
    private bridge: InteractionBridge,
  ) {}

  /** What a tap at these normalized coords would hit. Public for tests. */
  pickAt(ndcX: number, ndcY: number): BlockHit | null {
    return this.pick(ndcX, ndcY);
  }

  private pick(ndcX: number, ndcY: number): BlockHit | null {
    const ray = this.camera.viewMode === 'first' ? this.camera.forwardRay() : this.camera.ray(ndcX, ndcY);
    return raycastBlocks(this.world, this.registry, ray, this.camera.viewMode === 'first' ? REACH : REACH * 6);
  }

  update(): void {
    for (const tap of this.input.taps) {
      const ray = this.camera.viewMode === 'first' ? this.camera.forwardRay() : this.camera.ray(tap.ndcX, tap.ndcY);
      if (this.bridge.tapEntity?.(ray)) continue;
      const hit = this.pick(tap.ndcX, tap.ndcY);
      if (!hit) {
        this.state.lastTap = { hit: null, action: 'miss' };
        continue;
      }
      const removing = tap.button === 2 || this.bridge.getMode() === 'remove';
      if (removing) this.state.lastTap = { hit, action: this.removeAt(hit) ? 'removed' : 'remove-failed' };
      else this.state.lastTap = { hit, action: this.placeOrInteract(hit) };
    }

    const hover = this.camera.viewMode === 'first' ? { ndcX: 0, ndcY: 0 } : this.input.hover;
    const hit = hover ? this.pick(hover.ndcX, hover.ndcY) : null;
    this.state.highlight = hit ? { x: hit.x, y: hit.y, z: hit.z } : null;
    this.state.placement = hit && this.bridge.getMode() === 'place' ? this.placementFor(hit) : null;
  }

  /** The cell a tap on this hit would fill, and whether that is allowed. */
  private placementFor(hit: BlockHit): PlacementTarget {
    const cell = this.targetCell(hit);
    const def = this.registry.get(this.bridge.getSelectedBlockId());
    const hitDef = this.registry.get(hit.id);
    const valid = Boolean(def) && !(hitDef?.behavior?.onInteract) && this.canPlaceAt(cell.x, cell.y, cell.z, def!);
    return { ...cell, face: hit.face, valid };
  }

  /** Tapping a replaceable block (grass, flowers) builds in its cell. */
  private targetCell(hit: BlockHit): { x: number; y: number; z: number } {
    const hitDef = this.registry.get(hit.id);
    if (hitDef?.replaceable) return { x: hit.x, y: hit.y, z: hit.z };
    const dir = DIRECTIONS[hit.face];
    return { x: hit.x + dir.x, y: hit.y + dir.y, z: hit.z + dir.z };
  }

  private canPlaceAt(x: number, y: number, z: number, def: BlockDefinition): boolean {
    const existing = this.world.getBlock(x, y, z);
    if (existing !== 0 && !(this.registry.get(existing)?.replaceable)) return false;
    if (!this.world.isLoaded(x, z)) return false;
    if (def.collision === 'solid') {
      const body = this.player.box();
      for (const b of SHAPES[def.shape].boxes(0)) if (boxOverlaps(shapeBoxToWorld(b, x, y, z), body)) return false;
    }
    return true;
  }

  /** Public so tools (WebMCP, robot programs) share the exact same path. */
  placeBlock(x: number, y: number, z: number, id: number, face = DIR_PY, hitHeight = 0.5): boolean {
    const def = this.registry.get(id);
    if (!def) return false;
    if (!this.canPlaceAt(x, y, z, def)) return false;
    const extras: BlockEdit[] = [];
    const state =
      def.behavior?.onPlace?.({
        world: this.world,
        position: { x, y, z },
        playerRotation: this.camera.rotationQuarter(),
        face,
        hitHeight,
        place: (ex, ey, ez, eid, estate = 0) => extras.push({ x: ex, y: ey, z: ez, id: eid, state: estate }),
      }) ?? 0;
    // Don't build inside the player's own body.
    if (def.collision === 'solid') {
      const body = this.player.box();
      for (const b of SHAPES[def.shape].boxes(state)) {
        if (boxOverlaps(shapeBoxToWorld(b, x, y, z), body)) return false;
      }
    }
    this.history.run(new SetBlocksCommand(`Place ${def.label}`, [{ x, y, z, id, state }, ...extras]));
    this.bridge.onBlockPlaced?.(def, x, y, z);
    return true;
  }

  removeBlock(x: number, y: number, z: number): boolean {
    const id = this.world.getBlock(x, y, z);
    if (id === 0) return false;
    const def = this.registry.get(id);
    if (!def) return false;
    const state = this.world.getState(x, y, z);
    this.history.run(new SetBlocksCommand(`Remove ${def.label}`, [{ x, y, z, id: 0, state: 0, entity: null }]));
    def.behavior?.onRemove?.({ world: this.world, position: { x, y, z }, state });
    this.bridge.onBlockRemoved?.(def, x, y, z);
    return true;
  }

  interact(x: number, y: number, z: number, face = DIR_PY): boolean {
    const id = this.world.getBlock(x, y, z);
    const def = this.registry.get(id);
    if (!def?.behavior?.onInteract) return false;
    return def.behavior.onInteract({
      world: this.world,
      position: { x, y, z },
      blockId: id,
      state: this.world.getState(x, y, z),
      face,
      openPanel: (kind, payload) => this.bridge.openPanel(kind, payload),
    });
  }

  private removeAt(hit: BlockHit): boolean {
    return this.removeBlock(hit.x, hit.y, hit.z);
  }

  private placeOrInteract(hit: BlockHit): string {
    if (this.interact(hit.x, hit.y, hit.z, hit.face)) return 'interacted';
    const cell = this.targetCell(hit);
    const hitHeight = hit.face === DIR_PY ? 1 : hit.face === DIR_NY ? 0 : hit.py - (hit.y - 0.5);
    const placed = this.placeBlock(cell.x, cell.y, cell.z, this.bridge.getSelectedBlockId(), hit.face, hitHeight);
    return placed ? 'placed' : 'place-failed';
  }
}
