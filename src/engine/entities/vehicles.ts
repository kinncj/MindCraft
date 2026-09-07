import * as THREE from 'three';
import type { BlockRegistry } from '../blocks/registry';
import { WORLD_HEIGHT } from '../world/coords';
import type { VoxelWorld } from '../world/VoxelWorld';
import { box } from './bodies';

export type VehicleKind = 'car' | 'boat' | 'motorcycle' | 'plane' | 'helicopter';
export const VEHICLE_KINDS: VehicleKind[] = ['car', 'boat', 'motorcycle', 'plane', 'helicopter'];

export type DriveInput = { forward: boolean; back: boolean; left: boolean; right: boolean; up?: boolean; down?: boolean; boost?: boolean };

export const VEHICLE_COLORS: Record<VehicleKind, string> = { car: '#e8574f', boat: '#c98d4b', motorcycle: '#2f6fd6', plane: '#f2f2f2', helicopter: '#ffd94a' };
export const VEHICLE_LABELS: Record<VehicleKind, { emoji: string; label: string; hint: string }> = {
  car: { emoji: '🚗', label: 'Car', hint: 'Vroom! Tap the car again to hop out.' },
  boat: { emoji: '⛵', label: 'Boat', hint: 'All aboard! Tap the boat again to hop off.' },
  motorcycle: { emoji: '🏍️', label: 'Motorbike', hint: 'Lean into the turns! Tap it again to hop off.' },
  plane: { emoji: '✈️', label: 'Airplane', hint: 'Go fast to take off, then hold Jump to climb. Tap it again to hop out.' },
  helicopter: { emoji: '🚁', label: 'Helicopter', hint: 'Hold Jump to lift off, Sneak to land. Tap it again to hop out.' },
};

/** Per-kind tuning. Ground vehicles hug terrain; aircraft own their height. */
const TUNING = {
  car: { accel: 9, brake: 18, max: 12, boost: 16, reverse: 4, turn: 2.3, drag: 1.2 },
  motorcycle: { accel: 13, brake: 20, max: 15, boost: 20, reverse: 3, turn: 3.2, drag: 1.0 },
  boat: { accel: 5, brake: 8, max: 5.5, boost: 7, reverse: 2.5, turn: 1.8, drag: 1.4 },
  plane: { thrust: 8, maxAir: 24, takeoff: 9, drag: 0.35, climb: 0.55, roll: 1.6, yawRate: 1.1, glide: -3 },
  helicopter: { accel: 6, max: 10, drag: 1.6, lift: 4.5, yawRate: 1.9 },
} as const;

/**
 * Arcade-real vehicles. Cars and bikes accelerate, brake, and steer
 * tighter when slow; bikes lean. Planes need runway speed to lift off,
 * bank to turn, and glide down when they slow. Helicopters lift straight
 * up and hover. No damage and no flipping: bumping a block just stops
 * you, so a kid can never get stuck.
 */
export class Vehicle {
  x: number;
  y: number;
  z: number;
  yaw = 0;
  speed = 0;
  /** Aircraft: vertical speed, pitch and roll (visual and physical). */
  vy = 0;
  pitch = 0;
  roll = 0;
  /** Plane throttle 0..1. */
  throttle = 0;
  airborne = false;
  readonly group: THREE.Group;
  private wheels: THREE.Mesh[] = [];
  private spinners: THREE.Object3D[] = [];
  private body = new THREE.Group();

  constructor(
    readonly kind: VehicleKind,
    private world: VoxelWorld,
    private registry: BlockRegistry,
    spawn: { x: number; y: number; z: number },
    readonly color: string,
  ) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.z = spawn.z;
    this.group = new THREE.Group();
    const built =
      kind === 'car' ? this.buildCar(color)
      : kind === 'boat' ? this.buildBoat(color)
      : kind === 'motorcycle' ? this.buildMotorcycle(color)
      : kind === 'plane' ? this.buildPlane(color)
      : this.buildHelicopter(color);
    this.body.add(built);
    this.group.add(this.body);
    this.group.position.set(this.x, this.y, this.z);
  }

  get flies(): boolean {
    return this.kind === 'plane' || this.kind === 'helicopter';
  }

  private buildCar(color: string): THREE.Group {
    const g = new THREE.Group();
    const body = box(1.4, 0.5, 0.9, color);
    body.position.y = 0.5;
    const cabin = box(0.8, 0.45, 0.8, color);
    cabin.position.set(-0.1, 0.95, 0);
    const glass = box(0.82, 0.3, 0.82, '#aee3ff');
    glass.position.set(-0.1, 1.0, 0);
    const lightL = box(0.1, 0.15, 0.2, '#fff3b0');
    lightL.position.set(0.72, 0.5, 0.3);
    const lightR = lightL.clone();
    lightR.position.z = -0.3;
    g.add(body, cabin, glass, lightL, lightR);
    for (const [dx, dz] of [[0.45, 0.5], [0.45, -0.5], [-0.45, 0.5], [-0.45, -0.5]]) {
      const wheel = box(0.32, 0.32, 0.18, '#3a3a3a');
      wheel.position.set(dx, 0.2, dz);
      this.wheels.push(wheel);
      g.add(wheel);
    }
    return g;
  }

  private buildBoat(color: string): THREE.Group {
    const g = new THREE.Group();
    const hull = box(1.8, 0.4, 1.0, color);
    hull.position.y = 0.2;
    const inner = box(1.4, 0.2, 0.7, '#f3efe7');
    inner.position.y = 0.42;
    const mast = box(0.1, 1.6, 0.1, '#8a6238');
    mast.position.set(0.1, 1.2, 0);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.0), new THREE.MeshLambertMaterial({ color: '#ffffff', side: THREE.DoubleSide }));
    sail.position.set(0.6, 1.3, 0);
    g.add(hull, inner, mast, sail);
    return g;
  }

  private buildMotorcycle(color: string): THREE.Group {
    const g = new THREE.Group();
    const frame = box(1.1, 0.3, 0.3, color);
    frame.position.y = 0.45;
    const tank = box(0.45, 0.28, 0.34, color);
    tank.position.set(0.15, 0.68, 0);
    const seat = box(0.5, 0.12, 0.3, '#2b2b2b');
    seat.position.set(-0.3, 0.66, 0);
    const bars = box(0.08, 0.08, 0.7, '#777777');
    bars.position.set(0.5, 0.82, 0);
    const lamp = box(0.12, 0.16, 0.16, '#fff3b0');
    lamp.position.set(0.62, 0.62, 0);
    g.add(frame, tank, seat, bars, lamp);
    for (const dx of [0.55, -0.55]) {
      const wheel = box(0.5, 0.5, 0.14, '#3a3a3a');
      wheel.position.set(dx, 0.25, 0);
      this.wheels.push(wheel);
      g.add(wheel);
    }
    return g;
  }

  private buildPlane(color: string): THREE.Group {
    const g = new THREE.Group();
    const fuselage = box(2.6, 0.6, 0.7, color);
    fuselage.position.y = 0.7;
    const nose = box(0.5, 0.45, 0.5, '#e8574f');
    nose.position.set(1.5, 0.7, 0);
    const cockpit = box(0.7, 0.35, 0.6, '#aee3ff');
    cockpit.position.set(0.5, 1.1, 0);
    const wing = box(0.9, 0.1, 3.6, color);
    wing.position.set(0.3, 0.75, 0);
    const tail = box(0.6, 0.1, 1.4, color);
    tail.position.set(-1.2, 0.85, 0);
    const fin = box(0.5, 0.7, 0.1, '#e8574f');
    fin.position.set(-1.2, 1.2, 0);
    const prop = box(0.06, 1.1, 0.14, '#3a3a3a');
    prop.position.set(1.78, 0.7, 0);
    this.spinners.push(prop);
    g.add(fuselage, nose, cockpit, wing, tail, fin, prop);
    for (const [dx, dz] of [[0.6, 0.5], [0.6, -0.5], [-1.0, 0]]) {
      const wheel = box(0.26, 0.26, 0.12, '#3a3a3a');
      wheel.position.set(dx, 0.13, dz);
      this.wheels.push(wheel);
      g.add(wheel);
    }
    return g;
  }

  private buildHelicopter(color: string): THREE.Group {
    const g = new THREE.Group();
    const cabin = box(1.4, 0.8, 0.9, color);
    cabin.position.y = 0.75;
    const glass = box(0.5, 0.5, 0.8, '#aee3ff');
    glass.position.set(0.55, 0.85, 0);
    const boom = box(1.6, 0.25, 0.25, color);
    boom.position.set(-1.3, 0.85, 0);
    const finTail = box(0.1, 0.5, 0.1, '#e8574f');
    finTail.position.set(-2.0, 1.1, 0);
    const mast = box(0.1, 0.3, 0.1, '#3a3a3a');
    mast.position.set(0, 1.3, 0);
    const rotor = new THREE.Group();
    const bladeA = box(3.2, 0.05, 0.16, '#3a3a3a');
    const bladeB = box(0.16, 0.05, 3.2, '#3a3a3a');
    rotor.add(bladeA, bladeB);
    rotor.position.set(0, 1.45, 0);
    this.spinners.push(rotor);
    const tailRotor = box(0.05, 0.6, 0.1, '#3a3a3a');
    tailRotor.position.set(-2.0, 1.1, 0.1);
    this.spinners.push(tailRotor);
    g.add(cabin, glass, boom, finTail, mast, rotor, tailRotor);
    for (const dz of [0.4, -0.4]) {
      const skid = box(1.4, 0.06, 0.08, '#777777');
      skid.position.set(0, 0.12, dz);
      g.add(skid);
    }
    return g;
  }

  private solidAt(x: number, y: number, z: number): boolean {
    if (y < 0 || y >= WORLD_HEIGHT) return false;
    const id = this.world.getBlock(Math.round(x), Math.round(y), Math.round(z));
    return id !== 0 && this.registry.get(id)?.collision === 'solid';
  }

  private waterAt(x: number, y: number, z: number): boolean {
    const id = this.world.getBlock(Math.round(x), Math.round(y), Math.round(z));
    return id !== 0 && this.registry.get(id)?.collision === 'fluid';
  }

  /** Top of the ground (or water) under a point, as a standing height. */
  private surfaceUnder(x: number, z: number): number | null {
    const top = this.world.height(Math.round(x), Math.round(z));
    if (top < 0) return null;
    return top + 0.5;
  }

  update(dt: number, input: DriveInput | null, elapsed: number): void {
    if (this.kind === 'plane') this.updatePlane(dt, input);
    else if (this.kind === 'helicopter') this.updateHelicopter(dt, input);
    else this.updateGround(dt, input, elapsed);
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.yaw;
    this.body.rotation.z = this.pitch;
    this.body.rotation.x = this.roll;
  }

  private steer(input: DriveInput | null, dt: number, turnRate: number): number {
    if (!input) return 0;
    const turn = (input.left ? 1 : 0) - (input.right ? 1 : 0);
    if (turn === 0) return 0;
    // Tighter when slow, steadier when fast; reversing steers the other way.
    const factor = Math.min(1, 0.35 + Math.abs(this.speed) / 6);
    this.yaw += turn * dt * turnRate * factor * Math.sign(this.speed || 1);
    return turn;
  }

  private updateGround(dt: number, input: DriveInput | null, elapsed: number): void {
    const t = TUNING[this.kind === 'boat' ? 'boat' : this.kind === 'motorcycle' ? 'motorcycle' : 'car'];
    if (input) {
      const max = input.boost ? t.boost : t.max;
      if (input.forward) {
        // Braking first when rolling backward, then accelerating.
        this.speed = this.speed < 0 ? Math.min(0, this.speed + t.brake * dt) : Math.min(max, this.speed + t.accel * dt);
      } else if (input.back) {
        this.speed = this.speed > 0 ? Math.max(0, this.speed - t.brake * dt) : Math.max(-t.reverse, this.speed - t.accel * 0.6 * dt);
      } else this.speed *= Math.max(0, 1 - dt * t.drag);
    } else this.speed *= Math.max(0, 1 - dt * 3);
    if (Math.abs(this.speed) < 0.02) this.speed = 0;
    const turn = Math.abs(this.speed) > 0.2 ? this.steer(input, dt, t.turn) : 0;

    const nx = this.x + Math.cos(this.yaw) * this.speed * dt;
    const nz = this.z - Math.sin(this.yaw) * this.speed * dt;
    if (this.kind === 'boat') {
      if (this.waterAt(nx, this.y - 0.1, nz) || this.waterAt(nx, this.y - 0.6, nz)) {
        this.x = nx;
        this.z = nz;
      } else this.speed = 0;
      const top = this.world.height(Math.round(this.x), Math.round(this.z));
      if (top >= 0) this.y += (top + 0.35 - this.y) * Math.min(1, dt * 6);
      this.roll = Math.sin(elapsed * 1.6) * 0.04;
      return;
    }
    const ahead = this.surfaceUnder(nx, nz);
    if (ahead !== null && ahead <= this.y + 1.05 && !this.solidAt(nx, ahead + 0.6, nz) && !this.waterAt(nx, ahead - 0.4, nz)) {
      this.x = nx;
      this.z = nz;
      this.y += (ahead - this.y) * Math.min(1, dt * 10);
    } else this.speed = 0;
    for (const wheel of this.wheels) wheel.rotation.z -= this.speed * dt * 3;
    // Bikes lean into corners; cars dip their nose when braking hard.
    const lean = this.kind === 'motorcycle' ? -turn * Math.min(1, Math.abs(this.speed) / 8) * 0.45 : 0;
    this.roll += (lean - this.roll) * Math.min(1, dt * 6);
    const dip = input?.back && this.speed > 3 ? 0.06 : 0;
    this.pitch += (dip - this.pitch) * Math.min(1, dt * 6);
  }

  private updatePlane(dt: number, input: DriveInput | null): void {
    const t = TUNING.plane;
    if (input) {
      if (input.forward) this.throttle = Math.min(1, this.throttle + dt * 0.8);
      if (input.back) this.throttle = Math.max(0, this.throttle - dt * 1.2);
    }
    // Airspeed chases the throttle; drag always pulls it back.
    const target = this.throttle * t.maxAir;
    this.speed += (target - this.speed) * Math.min(1, dt * (this.speed < target ? t.thrust / 12 : t.drag * 1.6));
    if (!input && this.airborne) this.throttle = Math.max(0, this.throttle - dt * 0.3);
    const ground = this.surfaceUnder(this.x, this.z);
    const onGround = ground !== null && this.y <= ground + 0.05;

    if (onGround && this.speed < t.takeoff) {
      // Taxiing: steer like a car, sit on the ground.
      this.airborne = false;
      this.pitch += (0 - this.pitch) * Math.min(1, dt * 6);
      this.roll += (0 - this.roll) * Math.min(1, dt * 6);
      this.vy = 0;
      if (ground !== null) this.y = ground;
      if (Math.abs(this.speed) > 0.2) this.steer(input, dt, 1.6);
      if (input?.back && this.speed < 0.5) this.speed = Math.max(-2, this.speed - dt * 2);
    } else {
      // Flying: pitch with jump/sneak, bank with left/right, lift needs airspeed.
      const wantPitch = input?.up ? t.climb : input?.down ? -t.climb : 0;
      this.pitch += (wantPitch - this.pitch) * Math.min(1, dt * 3);
      const turn = input ? (input.left ? 1 : 0) - (input.right ? 1 : 0) : 0;
      this.roll += (-turn * 0.6 - this.roll) * Math.min(1, dt * 3);
      this.yaw += -this.roll * t.yawRate * Math.min(1, this.speed / t.takeoff) * dt;
      const lift = Math.min(1, this.speed / t.takeoff);
      // Idle engines sink gently, like a glider; full lift needs speed.
      const wantVy = Math.sin(this.pitch) * this.speed * lift + t.glide * (1 - lift) - 1.2 * (1 - this.throttle);
      this.vy += (wantVy - this.vy) * Math.min(1, dt * 4);
      this.airborne = true;
    }

    const nx = this.x + Math.cos(this.yaw) * this.speed * dt;
    const nz = this.z - Math.sin(this.yaw) * this.speed * dt;
    let ny = Math.max(0, Math.min(WORLD_HEIGHT - 3, this.y + this.vy * dt));
    if (ground !== null && ny < ground) {
      // Touch down: settle onto the surface and roll out.
      ny = ground;
      this.vy = 0;
      this.pitch *= 0.5;
      if (this.airborne && this.speed < t.takeoff) this.airborne = false;
    }
    if (this.solidAt(nx, ny + 0.6, nz) || this.solidAt(nx, ny + 1.2, nz)) {
      // Bonk: a gentle stop, never a crash.
      this.speed = 0;
      this.throttle = 0;
      this.vy = Math.min(0, this.vy);
    } else {
      this.x = nx;
      this.z = nz;
      this.y = ny;
    }
    for (const wheel of this.wheels) wheel.rotation.z -= (onGround ? this.speed : 0) * dt * 4;
    for (const spinner of this.spinners) spinner.rotation.x += (2 + this.throttle * 40) * dt;
  }

  private updateHelicopter(dt: number, input: DriveInput | null): void {
    const t = TUNING.helicopter;
    const ground = this.surfaceUnder(this.x, this.z);
    const onGround = ground !== null && this.y <= ground + 0.05;
    // Nobody at the controls: sink gently until the skids touch down.
    const wantVy = input ? (input.up ? t.lift : input.down ? -t.lift : 0) : this.airborne ? -1.5 : 0;
    this.vy += (wantVy - this.vy) * Math.min(1, dt * 6);
    if (onGround && !input?.up) {
      this.vy = 0;
      this.airborne = false;
      if (ground !== null) this.y = ground;
    } else this.airborne = true;
    // Forward and back push along the heading; the body tilts with speed.
    if (this.airborne && input) {
      const push = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
      this.speed += push * t.accel * dt;
      this.speed = Math.max(-t.max * 0.5, Math.min(t.max, this.speed));
      const turn = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      this.yaw += turn * t.yawRate * dt;
    }
    this.speed *= Math.max(0, 1 - dt * (input?.forward || input?.back ? 0.2 : t.drag));
    if (!this.airborne) this.speed = 0;
    this.pitch += (-this.speed * 0.03 - this.pitch) * Math.min(1, dt * 4);
    this.roll += (0 - this.roll) * Math.min(1, dt * 4);

    const nx = this.x + Math.cos(this.yaw) * this.speed * dt;
    const nz = this.z - Math.sin(this.yaw) * this.speed * dt;
    let ny = Math.max(0, Math.min(WORLD_HEIGHT - 3, this.y + this.vy * dt));
    const under = this.surfaceUnder(nx, nz);
    if (under !== null && ny < under) {
      ny = under;
      this.vy = 0;
    }
    if (this.solidAt(nx, ny + 0.6, nz) || this.solidAt(nx, ny + 1.4, nz)) this.speed = 0;
    else {
      this.x = nx;
      this.z = nz;
      this.y = ny;
    }
    const spin = this.airborne || input?.up ? 30 : 3;
    for (const spinner of this.spinners) {
      if (spinner instanceof THREE.Group) spinner.rotation.y += spin * dt;
      else spinner.rotation.x += spin * dt;
    }
  }

  /** Where a rider sits. */
  seat(): { x: number; y: number; z: number } {
    const lift = this.kind === 'car' ? 0.55 : this.kind === 'boat' ? 0.35 : this.kind === 'motorcycle' ? 0.6 : this.kind === 'plane' ? 0.7 : 0.6;
    return { x: this.x, y: this.y + lift, z: this.z };
  }
}
