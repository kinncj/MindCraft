import type { BlockRegistry } from '../blocks/registry';
import type { VoxelWorld } from '../world/VoxelWorld';
import { WORLD_HEIGHT } from '../world/coords';
import { isFluidAt, solidBoxesIn, sweepAxis, type Box } from './collision';

export type PlayerInput = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
  sneak: boolean;
  sprint: boolean;
};

export const PLAYER_WIDTH = 0.6;
export const PLAYER_HEIGHT = 1.8;
export const EYE_HEIGHT = 1.62;

const WALK_SPEED = 4.4;
const SPRINT_SPEED = 6.5;
const SWIM_SPEED = 2.8;
const GRAVITY = -24;
const WATER_GRAVITY = -3;
const JUMP_VELOCITY = 8.2;
const SWIM_UP_VELOCITY = 3.6;
const STEP_HEIGHT = 1.05; // walk up a full block without jumping — kids hate ledges
const TERMINAL = -40;
const CLIMB_SPEED = 3;

/**
 * The player's body: an axis-aligned box swept through the block shapes.
 * Walks, jumps, swims, steps up single blocks, fits under roofs. Knows
 * nothing about rendering; the avatar reads position and facing.
 */
export class PlayerController {
  x: number;
  y: number; // feet
  z: number;
  vx = 0;
  vy = 0;
  vz = 0;
  onGround = false;
  inWater = false;
  onLadder = false;
  facing = 0; // radians around y
  /** True while the body is being animated as walking. */
  moving = false;

  constructor(
    private world: VoxelWorld,
    private registry: BlockRegistry,
    spawn: { x: number; y: number; z: number },
  ) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.z = spawn.z;
  }

  teleport(x: number, y: number, z: number): void {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = this.vy = this.vz = 0;
  }

  /** Drops the player onto the highest block below (after chunks load). */
  settleOnGround(): void {
    const top = this.world.height(Math.round(this.x), Math.round(this.z));
    if (top >= 0 && this.y < top + 0.5) this.y = top + 0.5;
  }

  private climbableAt(x: number, y: number, z: number): boolean {
    const id = this.world.getBlock(Math.round(x), Math.round(y), Math.round(z));
    return id !== 0 && (this.registry.get(id)?.climbable ?? false);
  }

  box(x = this.x, y = this.y, z = this.z): Box {
    const half = PLAYER_WIDTH / 2;
    return { minX: x - half, minY: y, minZ: z - half, maxX: x + half, maxY: y + PLAYER_HEIGHT, maxZ: z + half };
  }

  eye(): { x: number; y: number; z: number } {
    return { x: this.x, y: this.y + EYE_HEIGHT, z: this.z };
  }

  update(dt: number, input: PlayerInput, cameraYaw: number): void {
    // Don't simulate on unloaded ground: the player would fall forever.
    if (!this.world.isLoaded(Math.round(this.x), Math.round(this.z))) return;

    this.inWater = isFluidAt(this.world, this.registry, this.x, this.y + 0.9, this.z);
    const feetInWater = isFluidAt(this.world, this.registry, this.x, this.y + 0.3, this.z);
    this.onLadder = this.climbableAt(this.x, this.y + 0.9, this.z) || this.climbableAt(this.x, this.y + 0.2, this.z);

    // Desired horizontal motion relative to the camera.
    let mx = 0;
    let mz = 0;
    const fx = -Math.sin(cameraYaw);
    const fz = -Math.cos(cameraYaw);
    if (input.forward) { mx += fx; mz += fz; }
    if (input.back) { mx -= fx; mz -= fz; }
    if (input.left) { mx += fz; mz -= fx; }
    if (input.right) { mx -= fz; mz += fx; }
    this.moving = mx !== 0 || mz !== 0;
    if (this.moving) {
      const len = Math.hypot(mx, mz);
      const speed = this.inWater ? SWIM_SPEED : input.sprint ? SPRINT_SPEED : input.sneak ? WALK_SPEED * 0.4 : WALK_SPEED;
      this.vx = (mx / len) * speed;
      this.vz = (mz / len) * speed;
      const target = Math.atan2(mx, mz);
      let delta = target - this.facing;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      this.facing += delta * Math.min(1, dt * 12);
    } else {
      this.vx = 0;
      this.vz = 0;
    }

    // Vertical.
    if (this.onLadder && !this.inWater) {
      // Ladders: hold jump (or walk into it) to climb, sneak to slide down.
      this.vy = input.jump || this.moving ? CLIMB_SPEED : input.sneak ? -CLIMB_SPEED : -0.6;
      this.moveBy(this.vx * dt * 0.6, this.vy * dt, this.vz * dt * 0.6);
      this.y = Math.max(0, Math.min(WORLD_HEIGHT - PLAYER_HEIGHT, this.y));
      return;
    }
    if (input.jump && this.inWater) {
      this.vy = Math.min(this.vy + SWIM_UP_VELOCITY * dt * 6, SWIM_UP_VELOCITY);
    } else if (input.jump && !this.inWater && feetInWater) {
      this.vy = JUMP_VELOCITY * 0.85; // breach jump onto shore
    } else if (input.jump && this.onGround) {
      this.vy = JUMP_VELOCITY;
      this.onGround = false;
    }
    if (this.inWater) {
      this.vy += WATER_GRAVITY * dt;
      this.vy *= Math.max(0, 1 - dt * 3);
    } else {
      this.vy = Math.max(TERMINAL, this.vy + GRAVITY * dt);
    }

    this.moveBy(this.vx * dt, this.vy * dt, this.vz * dt);
    this.y = Math.max(0, Math.min(WORLD_HEIGHT - PLAYER_HEIGHT, this.y));
  }

  /** Swept movement with per-axis resolution and a step-up retry. */
  private moveBy(dx: number, dy: number, dz: number): void {
    const region: Box = {
      minX: Math.min(this.x, this.x + dx) - 1,
      minY: Math.min(this.y, this.y + dy) - 1,
      minZ: Math.min(this.z, this.z + dz) - 1,
      maxX: Math.max(this.x, this.x + dx) + 2,
      maxY: Math.max(this.y, this.y + dy) + PLAYER_HEIGHT + 2,
      maxZ: Math.max(this.z, this.z + dz) + 2,
    };
    const solids = solidBoxesIn(this.world, this.registry, region);

    // Vertical first so we know whether we are grounded.
    let box = this.box();
    const movedY = sweepAxis(box, 'y', dy, solids);
    this.y += movedY;
    if (movedY !== dy) {
      if (dy < 0) this.onGround = true;
      this.vy = 0;
    } else if (dy < 0) {
      this.onGround = false;
    }

    box = this.box();
    let movedX = sweepAxis(box, 'x', dx, solids);
    let movedZ = sweepAxis(this.box(this.x + movedX, this.y, this.z), 'z', dz, solids);

    // Blocked horizontally while on the ground? Try again one step up.
    if ((movedX !== dx || movedZ !== dz) && (this.onGround || this.inWater)) {
      const up = sweepAxis(this.box(), 'y', STEP_HEIGHT, solids);
      const raised = this.box(this.x, this.y + up, this.z);
      const stepX = sweepAxis(raised, 'x', dx, solids);
      const stepZ = sweepAxis(this.box(this.x + stepX, this.y + up, this.z), 'z', dz, solids);
      if (Math.abs(stepX) + Math.abs(stepZ) > Math.abs(movedX) + Math.abs(movedZ) + 1e-6) {
        // Settle back down onto whatever we stepped onto.
        const down = sweepAxis(this.box(this.x + stepX, this.y + up, this.z + stepZ), 'y', -up, solids);
        this.y += up + down;
        movedX = stepX;
        movedZ = stepZ;
        this.onGround = true;
        this.vy = 0;
      }
    }
    this.x += movedX;
    this.z += movedZ;
  }
}
