import * as THREE from 'three';
import type { BlockTypeId } from '../../types/game';
import { WORLD_SIZE } from './world';

/**
 * Friendly wandering critters: bunnies, chicks, and butterflies.
 * Pure decoration — they are never obstacles, never targets, and are
 * not saved with the world (a fresh flock greets every session).
 */

export type GroundQuery = (x: number, z: number) => { y: number; type: BlockTypeId } | null;

type Animal = {
  group: THREE.Group;
  kind: 'bunny' | 'chick' | 'butterfly';
  x: number;
  z: number;
  targetX: number;
  targetZ: number;
  restTimer: number;
  happyTimer: number;
  phase: number;
  wings?: [THREE.Mesh, THREE.Mesh];
};

function box(w: number, h: number, d: number, color: string): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.castShadow = true;
  return mesh;
}

function buildBunny(): THREE.Group {
  const group = new THREE.Group();
  const body = box(0.55, 0.38, 0.42, '#f3efe7');
  body.position.y = 0.19;
  const head = box(0.3, 0.28, 0.3, '#f3efe7');
  head.position.set(0.32, 0.42, 0);
  const earLeft = box(0.08, 0.3, 0.08, '#f3efe7');
  earLeft.position.set(0.32, 0.68, -0.08);
  const earRight = earLeft.clone();
  earRight.position.z = 0.08;
  const tail = box(0.14, 0.14, 0.14, '#ffffff');
  tail.position.set(-0.3, 0.28, 0);
  const nose = box(0.05, 0.05, 0.08, '#e8a0b4');
  nose.position.set(0.48, 0.42, 0);
  group.add(body, head, earLeft, earRight, tail, nose);
  return group;
}

function buildChick(): THREE.Group {
  const group = new THREE.Group();
  const body = box(0.34, 0.32, 0.32, '#ffd94a');
  body.position.y = 0.16;
  const head = box(0.24, 0.22, 0.24, '#ffd94a');
  head.position.set(0.16, 0.42, 0);
  const beak = box(0.1, 0.06, 0.08, '#f2903c');
  beak.position.set(0.32, 0.42, 0);
  group.add(body, head, beak);
  return group;
}

function buildButterfly(): { group: THREE.Group; wings: [THREE.Mesh, THREE.Mesh] } {
  const group = new THREE.Group();
  const material = new THREE.MeshLambertMaterial({
    color: '#f291bb',
    side: THREE.DoubleSide,
  });
  const wingGeometry = new THREE.PlaneGeometry(0.28, 0.2);
  const left = new THREE.Mesh(wingGeometry, material);
  const right = new THREE.Mesh(wingGeometry, material);
  left.position.x = -0.14;
  right.position.x = 0.14;
  const bodyMesh = box(0.06, 0.06, 0.16, '#6b4a26');
  group.add(left, right, bodyMesh);
  return { group, wings: [left, right] };
}

export class AnimalSystem {
  private animals: Animal[] = [];

  constructor(
    private scene: THREE.Scene,
    private groundAt: GroundQuery,
    center: { x: number; z: number },
  ) {
    const flock: Array<Animal['kind']> = [
      'bunny',
      'bunny',
      'bunny',
      'chick',
      'chick',
      'chick',
      'butterfly',
      'butterfly',
    ];
    for (const kind of flock) {
      const spot = this.findGrass(center.x, center.z, 18);
      if (!spot) continue;
      let group: THREE.Group;
      let wings: [THREE.Mesh, THREE.Mesh] | undefined;
      if (kind === 'butterfly') {
        const built = buildButterfly();
        group = built.group;
        wings = built.wings;
      } else {
        group = kind === 'bunny' ? buildBunny() : buildChick();
      }
      scene.add(group);
      this.animals.push({
        group,
        kind,
        x: spot.x,
        z: spot.z,
        targetX: spot.x,
        targetZ: spot.z,
        restTimer: Math.random() * 2,
        happyTimer: 0,
        phase: Math.random() * Math.PI * 2,
        wings,
      });
    }
  }

  /** Finds a nearby grass cell to stand on. */
  private findGrass(cx: number, cz: number, radius: number): { x: number; z: number } | null {
    for (let attempt = 0; attempt < 24; attempt++) {
      const x = Math.round(cx + (Math.random() * 2 - 1) * radius);
      const z = Math.round(cz + (Math.random() * 2 - 1) * radius);
      if (x < 1 || x >= WORLD_SIZE.width - 1 || z < 1 || z >= WORLD_SIZE.depth - 1) continue;
      const ground = this.groundAt(x, z);
      if (ground && (ground.type === 'grass' || ground.type === 'flower')) {
        return { x, z };
      }
    }
    return null;
  }

  /**
   * Did a tap land on an animal? Returns its kind and makes it do a
   * happy hop. Animals win over blocks so petting never digs a hole.
   */
  tapAt(
    raycaster: THREE.Raycaster,
    camera: THREE.Camera,
    event: PointerEvent,
    canvas: HTMLCanvasElement,
  ): string | null {
    const rect = canvas.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    for (const animal of this.animals) {
      const hit = raycaster.intersectObject(animal.group, true)[0];
      if (hit) {
        animal.happyTimer = 0.9;
        animal.restTimer = 2.5;
        return animal.kind;
      }
    }
    return null;
  }

  update(dt: number, elapsed: number): void {
    for (const animal of this.animals) {
      if (animal.happyTimer > 0) {
        animal.happyTimer -= dt;
        // A joyful wiggle-hop.
        const wiggle = Math.sin(animal.happyTimer * 24) * 0.25;
        animal.group.rotation.y += wiggle * dt * 20;
        const ground = this.groundAt(Math.round(animal.x), Math.round(animal.z));
        const groundY = ground ? ground.y + 0.5 : 4;
        animal.group.position.set(
          animal.x,
          groundY + Math.abs(Math.sin(animal.happyTimer * 12)) * 0.5,
          animal.z,
        );
        continue;
      }
      const dx = animal.targetX - animal.x;
      const dz = animal.targetZ - animal.z;
      const distance = Math.hypot(dx, dz);

      if (distance < 0.1) {
        animal.restTimer -= dt;
        if (animal.restTimer <= 0) {
          const next = this.findGrass(animal.x, animal.z, 8);
          if (next) {
            animal.targetX = next.x;
            animal.targetZ = next.z;
          }
          animal.restTimer = 1.5 + Math.random() * 3;
        }
      } else {
        const speed = animal.kind === 'butterfly' ? 1.6 : 1.1;
        const step = Math.min(distance, speed * dt);
        animal.x += (dx / distance) * step;
        animal.z += (dz / distance) * step;
        animal.group.rotation.y = Math.atan2(dz, dx) * -1 + Math.PI / 2;
      }

      const ground = this.groundAt(Math.round(animal.x), Math.round(animal.z));
      const groundY = ground ? ground.y + 0.5 : 4;

      if (animal.kind === 'butterfly') {
        animal.group.position.set(
          animal.x,
          groundY + 1.1 + Math.sin(elapsed * 2 + animal.phase) * 0.25,
          animal.z,
        );
        const flap = Math.sin(elapsed * 14 + animal.phase) * 0.9;
        if (animal.wings) {
          animal.wings[0].rotation.y = flap;
          animal.wings[1].rotation.y = -flap;
        }
      } else {
        const moving = distance >= 0.1;
        const hop = moving ? Math.abs(Math.sin(elapsed * 7 + animal.phase)) * 0.18 : 0;
        animal.group.position.set(animal.x, groundY + hop, animal.z);
      }
    }
  }

  dispose(): void {
    for (const animal of this.animals) {
      this.scene.remove(animal.group);
      animal.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const material = child.material;
          for (const m of Array.isArray(material) ? material : [material]) m.dispose();
        }
      });
    }
    this.animals = [];
  }
}
