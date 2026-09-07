import * as THREE from 'three';
import type { BlockRegistry } from '../blocks/registry';
import type { VoxelWorld } from '../world/VoxelWorld';
import { box } from './bodies';

export type VehicleKind = 'car' | 'boat';

export type DriveInput = { forward: boolean; back: boolean; left: boolean; right: boolean };

/**
 * Simple arcade vehicles. A car hugs the ground and climbs one block;
 * a boat only moves on water and bobs at the surface. No damage, no
 * flipping — a kid can't get stuck.
 */
export class Vehicle {
  x: number;
  y: number;
  z: number;
  yaw = 0;
  speed = 0;
  readonly group: THREE.Group;
  private wheels: THREE.Mesh[] = [];

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
    this.group = kind === 'car' ? this.buildCar(color) : this.buildBoat(color);
    this.group.position.set(this.x, this.y, this.z);
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

  private solidAt(x: number, y: number, z: number): boolean {
    const id = this.world.getBlock(Math.round(x), Math.round(y), Math.round(z));
    return id !== 0 && this.registry.get(id)?.collision === 'solid';
  }

  private waterAt(x: number, y: number, z: number): boolean {
    const id = this.world.getBlock(Math.round(x), Math.round(y), Math.round(z));
    return id !== 0 && this.registry.get(id)?.collision === 'fluid';
  }

  /** Surface height under a point: top solid (car) or top water (boat). */
  private surfaceUnder(x: number, z: number): number | null {
    const top = this.world.height(Math.round(x), Math.round(z));
    if (top < 0) return null;
    return top + 0.5;
  }

  update(dt: number, input: DriveInput | null, elapsed: number): void {
    const accel = this.kind === 'car' ? 9 : 5;
    const maxSpeed = this.kind === 'car' ? 9 : 5.5;
    if (input) {
      if (input.forward) this.speed = Math.min(maxSpeed, this.speed + accel * dt);
      else if (input.back) this.speed = Math.max(-maxSpeed * 0.5, this.speed - accel * dt);
      else this.speed *= Math.max(0, 1 - dt * 2.5);
      const turn = (input.left ? 1 : 0) - (input.right ? 1 : 0);
      if (Math.abs(this.speed) > 0.2) this.yaw += turn * dt * 2.2 * Math.sign(this.speed);
    } else {
      this.speed *= Math.max(0, 1 - dt * 3);
    }

    const nx = this.x + Math.cos(this.yaw) * this.speed * dt;
    const nz = this.z - Math.sin(this.yaw) * this.speed * dt;
    if (this.kind === 'car') {
      const ahead = this.surfaceUnder(nx, nz);
      if (ahead !== null && ahead <= this.y + 1.05 && !this.solidAt(nx, ahead + 0.6, nz) && !this.waterAt(nx, ahead - 0.4, nz)) {
        this.x = nx;
        this.z = nz;
        this.y += (ahead - this.y) * Math.min(1, dt * 10);
      } else {
        this.speed = 0;
      }
      for (const wheel of this.wheels) wheel.rotation.z -= this.speed * dt * 3;
    } else {
      // Boats stay on water; the surface is the top water block.
      if (this.waterAt(nx, this.y - 0.1, nz) || this.waterAt(nx, this.y - 0.6, nz)) {
        this.x = nx;
        this.z = nz;
      } else {
        this.speed = 0;
      }
      const top = this.world.height(Math.round(this.x), Math.round(this.z));
      if (top >= 0) this.y += (top + 0.35 - this.y) * Math.min(1, dt * 6);
      this.group.rotation.z = Math.sin(elapsed * 1.6) * 0.04;
    }
    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.yaw;
  }

  /** Where a rider sits. */
  seat(): { x: number; y: number; z: number } {
    return { x: this.x, y: this.y + (this.kind === 'car' ? 0.55 : 0.35), z: this.z };
  }
}
