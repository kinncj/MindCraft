import * as THREE from 'three';
import type { System } from '../core/System';

const CLOUD_Y = 108;
const FIELD = 320;
const COUNT = 26;

/** Soft blocky clouds drifting over the player. Purely cosmetic. */
export class CloudLayer implements System {
  readonly name = 'clouds';
  readonly group = new THREE.Group();
  private drift = 0;
  private focus = { x: 0, z: 0 };
  private material: THREE.MeshLambertMaterial;

  constructor(private scene: THREE.Scene, seed = 1) {
    this.material = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false });
    let s = seed >>> 0;
    const rand = (): number => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 2 ** 32;
    };
    for (let i = 0; i < COUNT; i++) {
      const w = 8 + rand() * 14;
      const d = 6 + rand() * 10;
      const cloud = new THREE.Mesh(new THREE.BoxGeometry(w, 1.2, d), this.material);
      cloud.position.set(rand() * FIELD - FIELD / 2, CLOUD_Y + rand() * 6, rand() * FIELD - FIELD / 2);
      this.group.add(cloud);
      if (rand() > 0.5) {
        const puff = new THREE.Mesh(new THREE.BoxGeometry(w * 0.5, 1.2, d * 0.6), this.material);
        puff.position.set(cloud.position.x + w * 0.2, cloud.position.y + 1.2, cloud.position.z);
        this.group.add(puff);
      }
    }
    scene.add(this.group);
  }

  setFocus(x: number, z: number): void {
    this.focus = { x, z };
  }

  update(dt: number): void {
    this.drift += dt * 0.6;
    // The field wraps around the player so clouds are always overhead.
    const ox = Math.round(this.focus.x / FIELD) * FIELD;
    const oz = Math.round(this.focus.z / FIELD) * FIELD;
    this.group.position.set(ox, 0, oz);
    for (const child of this.group.children) {
      child.position.x += dt * 0.6;
      if (child.position.x > FIELD / 2) child.position.x -= FIELD;
    }
  }

  dispose(): void {
    this.scene.remove(this.group);
    for (const child of this.group.children) (child as THREE.Mesh).geometry.dispose();
    this.material.dispose();
  }
}
