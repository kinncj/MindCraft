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
const CURRENT_SPEED = 1.8;
const SWIM_SPEED = 2.8;
const GRAVITY = -24;
const WATER_GRAVITY = -3;
const JUMP_VELOCITY = 8.2;
const SWIM_UP_VELOCITY = 3.6;
const STEP_HEIGHT = 1.05; // walk up a full block without jumping — kids hate ledges
const TERMINAL = -40;
const CLIMB_SPEED = 3;
const FLY_SPEED = 9;
const FLY_SPRINT = 16;
const FLY_VERTICAL = 7;

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
  /** Which way the water here flows, set by the engine (FluidSystem). */
  current: ((x: number, y: number, z: number) => { x: number; z: number }) | null = null;
  onLadder = false;
  /** Sitting on a chair: frozen until the player moves. */
  seated: { x: number; y: number; z: number } | null = null;
  /** Riding a vehicle: the entity system drives the position. */
  mounted = false;
  /** Creative flight: no gravity, jump rises, sneak sinks, landing ends it. */
  flying = false;
  /** Standing on an elevator: it carries the player; jump and sneak pick floors instead. */
  onLift = false;

  setFlying(on: boolean): void {
    if (on === this.flying) return;
    this.flying = on;
    this.vy = 0;
    if (on) this.onGround = false;
  }
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

  sitAt(x: number, y: number, z: number): void {
    this.seated = { x, y, z };
    this.teleport(x, y, z);
    this.onGround = true;
  }

  standUp(): void {
    if (!this.seated) return;
    const { x, y, z } = this.seated;
    this.seated = null;
    this.teleport(x, y + 0.5, z);
  }

  /** How far up to look for daylight when a build closes over the player. */
  private static readonly ESCAPE_HEIGHT = 8;

  /**
   * If the player's own box overlaps solid blocks, lift them to the nearest
   * clear spot above. Blocks appearing around a standing child is normal in
   * this game — a villager builds where you asked — so being buried has to be
   * survivable, not a stuck screen.
   */
  private escapeIfBuriedIn(): void {
    if (!this.buried(this.y)) return;
    for (let lift = 1; lift <= PlayerController.ESCAPE_HEIGHT; lift++) {
      if (this.buried(this.y + lift)) continue;
      this.y += lift;
      this.vy = 0;
      this.onGround = false;
      return;
    }
    // Nowhere clear overhead: stand on top of whatever swallowed us.
    this.y = this.world.height(Math.round(this.x), Math.round(this.z)) + 1;
    this.vy = 0;
  }

  private buried(y: number): boolean {
    // Only the lower half counts. A head grazing a ceiling is ordinary
    // movement and the sweep deals with it; blocks around your feet mean
    // somebody built where you were standing.
    const full = this.box(this.x, y, this.z);
    const box = { ...full, maxY: full.minY + 0.9 };
    const region = {
      minX: Math.floor(box.minX),
      maxX: Math.ceil(box.maxX),
      minY: Math.floor(box.minY),
      maxY: Math.ceil(box.maxY),
      minZ: Math.floor(box.minZ),
      maxZ: Math.ceil(box.maxZ),
    };
    // Touching is not being buried: a jump that grazes a ceiling, or standing
    // flush against a wall, leaves a hair of overlap after the sweep. Only a
    // real overlap on every axis means blocks closed over the child.
    const bite = 0.05;
    for (const solid of solidBoxesIn(this.world, this.registry, region)) {
      const inX = Math.min(box.maxX, solid.maxX) - Math.max(box.minX, solid.minX);
      const inY = Math.min(box.maxY, solid.maxY) - Math.max(box.minY, solid.minY);
      const inZ = Math.min(box.maxZ, solid.maxZ) - Math.max(box.minZ, solid.minZ);
      if (inX > bite && inY > bite && inZ > bite) return true;
    }
    return false;
  }

  update(dt: number, input: PlayerInput, cameraYaw: number): void {
    if (this.mounted) {
      this.moving = false;
      return;
    }
    if (this.seated) {
      if (input.forward || input.back || input.left || input.right || input.jump) this.standUp();
      else {
        this.moving = false;
        return;
      }
    }
    // Don't simulate on unloaded ground: the player would fall forever.
    if (!this.world.isLoaded(Math.round(this.x), Math.round(this.z))) return;

    // Somebody built where the kid was standing — a stamped blueprint, a
    // villager's house, a monument. Step out of the wall instead of being
    // stuck inside it.
    this.escapeIfBuriedIn();

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
    if ((this.inWater || feetInWater) && this.current) {
      const c = this.current(Math.round(this.x), Math.round(this.y + 0.3), Math.round(this.z));
      this.vx += c.x * CURRENT_SPEED;
      this.vz += c.z * CURRENT_SPEED;
    }

    // On a lift the platform owns the vertical axis; walk on it, do not jump off by accident.
    if (this.onLift && !this.flying) {
      this.vy = 0;
      this.moveBy(this.vx * dt, 0, this.vz * dt);
      this.onGround = true;
      return;
    }
    // Flying: steady speed in every direction, no gravity; touching down lands.
    if (this.flying) {
      const speed = input.sprint ? FLY_SPRINT : FLY_SPEED;
      if (this.moving) {
        const len = Math.hypot(mx, mz);
        this.vx = (mx / len) * speed;
        this.vz = (mz / len) * speed;
      }
      const wantY = input.jump ? FLY_VERTICAL : input.sneak ? -FLY_VERTICAL : 0;
      this.vy += (wantY - this.vy) * Math.min(1, dt * 10);
      this.onGround = false;
      this.moveBy(this.vx * dt, this.vy * dt, this.vz * dt);
      this.y = Math.max(0, Math.min(WORLD_HEIGHT - PLAYER_HEIGHT, this.y));
      if (input.sneak && this.onGround) this.setFlying(false); // came down onto ground
      else this.onGround = false;
      return;
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
