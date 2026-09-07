import * as THREE from 'three';
import type { System } from '../core/System';

const MAX = 600;

/**
 * Little bursts of colored cubes when a block is placed or removed, a
 * pet is happy, or a spell of sparkles is called for. One Points cloud,
 * recycled slots, no allocations per frame.
 */
export class ParticleSystem implements System {
  readonly name = 'particles';
  private points: THREE.Points;
  private positions = new Float32Array(MAX * 3);
  private colors = new Float32Array(MAX * 3);
  private velocity = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private next = 0;

  constructor(private scene: THREE.Scene) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    const material = new THREE.PointsMaterial({ size: 0.16, vertexColors: true, transparent: true, opacity: 0.95, sizeAttenuation: true });
    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  /** A puff of `count` particles around a block center. */
  burst(x: number, y: number, z: number, color: string, count = 14, spread = 0.5): void {
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const slot = this.next;
      this.next = (this.next + 1) % MAX;
      this.positions[slot * 3] = x + (Math.random() - 0.5) * spread;
      this.positions[slot * 3 + 1] = y + (Math.random() - 0.5) * spread;
      this.positions[slot * 3 + 2] = z + (Math.random() - 0.5) * spread;
      this.velocity[slot * 3] = (Math.random() - 0.5) * 3;
      this.velocity[slot * 3 + 1] = 1.5 + Math.random() * 2.5;
      this.velocity[slot * 3 + 2] = (Math.random() - 0.5) * 3;
      const shade = 0.8 + Math.random() * 0.4;
      this.colors[slot * 3] = Math.min(1, c.r * shade);
      this.colors[slot * 3 + 1] = Math.min(1, c.g * shade);
      this.colors[slot * 3 + 2] = Math.min(1, c.b * shade);
      this.life[slot] = 0.6 + Math.random() * 0.4;
    }
  }

  get alive(): number {
    let n = 0;
    for (let i = 0; i < MAX; i++) if (this.life[i] > 0) n++;
    return n;
  }

  update(dt: number): void {
    let any = false;
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= dt;
      this.velocity[i * 3 + 1] -= 9 * dt;
      this.positions[i * 3] += this.velocity[i * 3] * dt;
      this.positions[i * 3 + 1] += this.velocity[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.velocity[i * 3 + 2] * dt;
      if (this.life[i] <= 0) this.positions[i * 3 + 1] = -1000; // hide
    }
    if (any) {
      (this.points.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (this.points.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    }
  }

  dispose(): void {
    this.scene.remove(this.points);
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
