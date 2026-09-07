import * as THREE from 'three';
import type { BlockRegistry } from '../blocks/registry';
import type { System } from '../core/System';
import type { PlayerController } from '../physics/PlayerController';
import type { Ray } from '../physics/raycast';
import type { VoxelWorld } from '../world/VoxelWorld';
import { WanderBrain, type Brain, type BrainSense } from './Brain';
import { buildBunny, buildButterfly, buildChick, disposeGroup } from './bodies';
import type { Entity, EntityKind } from './Entity';

let nextId = 1;

/**
 * Creatures: bodies in the scene, brains deciding where to go, simple
 * ground-following movement. Animals spawn fresh near the player; pets
 * and villagers (later) persist with the world.
 */
export class EntitySystem implements System {
  readonly name = 'entities';
  readonly entities: Entity[] = [];
  private raycaster = new THREE.Raycaster();
  private spawnedAround: string | null = null;

  constructor(
    private scene: THREE.Scene,
    private world: VoxelWorld,
    private registry: BlockRegistry,
    private player: PlayerController,
  ) {}

  private standable(x: number, z: number): boolean {
    const top = this.world.height(x, z);
    if (top < 0) return false;
    const def = this.registry.get(this.world.getBlock(x, top, z));
    if (!def) return false;
    return def.id === 'grass' || def.category === 'nature' && def.collision === 'none';
  }

  private groundY(x: number, z: number): number {
    const top = this.world.height(Math.round(x), Math.round(z));
    return top >= 0 ? top + 0.5 : this.player.y;
  }

  spawn(kind: EntityKind, x: number, z: number, brain: Brain = new WanderBrain(), name?: string): Entity {
    let group: THREE.Group;
    let wings: [THREE.Mesh, THREE.Mesh] | undefined;
    if (kind === 'butterfly') {
      const built = buildButterfly();
      group = built.group;
      wings = built.wings;
    } else if (kind === 'chick') {
      group = buildChick();
    } else {
      group = buildBunny();
    }
    this.scene.add(group);
    const entity: Entity = {
      id: `e${nextId++}`,
      kind,
      name,
      group,
      x,
      y: this.groundY(x, z),
      z,
      targetX: x,
      targetZ: z,
      speed: kind === 'butterfly' ? 1.6 : kind === 'chick' ? 1.0 : 1.2,
      flies: kind === 'butterfly',
      restTimer: Math.random() * 2,
      happyTimer: 0,
      phase: Math.random() * Math.PI * 2,
      mood: 'curious',
      brain,
      wings,
      persistent: kind === 'pet' || kind === 'villager',
    };
    this.entities.push(entity);
    return entity;
  }

  remove(id: string): boolean {
    const index = this.entities.findIndex((e) => e.id === id);
    if (index < 0) return false;
    const [entity] = this.entities.splice(index, 1);
    this.scene.remove(entity.group);
    disposeGroup(entity.group);
    return true;
  }

  /** A friendly flock near a point. Called once the ground has loaded. */
  spawnFlock(cx: number, cz: number): void {
    const key = `${Math.round(cx / 32)},${Math.round(cz / 32)}`;
    if (this.spawnedAround === key) return;
    this.spawnedAround = key;
    const flock: EntityKind[] = ['bunny', 'bunny', 'bunny', 'chick', 'chick', 'chick', 'butterfly', 'butterfly'];
    for (const kind of flock) {
      for (let attempt = 0; attempt < 24; attempt++) {
        const x = Math.round(cx + (Math.random() * 2 - 1) * 18);
        const z = Math.round(cz + (Math.random() * 2 - 1) * 18);
        if (this.standable(x, z)) {
          this.spawn(kind, x, z);
          break;
        }
      }
    }
  }

  /** Did a ray hit a creature? Pets it and returns it. */
  tap(ray: Ray): Entity | null {
    this.raycaster.set(new THREE.Vector3(ray.ox, ray.oy, ray.oz), new THREE.Vector3(ray.dx, ray.dy, ray.dz));
    for (const entity of this.entities) {
      const hit = this.raycaster.intersectObject(entity.group, true)[0];
      if (hit) {
        this.pet(entity);
        return entity;
      }
    }
    return null;
  }

  pet(entity: Entity): void {
    entity.happyTimer = 0.9;
    const intent = entity.brain.onPet?.(this.sense(entity, 0, 0));
    if (intent) {
      entity.restTimer = intent.restFor;
      entity.mood = intent.mood ?? entity.mood;
    }
  }

  private sense(entity: Entity, dt: number, elapsed: number): BrainSense {
    return {
      x: entity.x,
      y: entity.y,
      z: entity.z,
      playerX: this.player.x,
      playerZ: this.player.z,
      dt,
      elapsed,
      standable: (x, z) => this.standable(x, z),
      random: Math.random,
    };
  }

  update(dt: number, elapsed: number): void {
    for (const entity of this.entities) {
      // Creatures outside loaded ground just wait.
      if (!this.world.isLoaded(Math.round(entity.x), Math.round(entity.z))) continue;

      if (entity.happyTimer > 0) {
        entity.happyTimer -= dt;
        const wiggle = Math.sin(entity.happyTimer * 24) * 0.25;
        entity.group.rotation.y += wiggle * dt * 20;
        const groundY = this.groundY(entity.x, entity.z);
        entity.group.position.set(entity.x, groundY + Math.abs(Math.sin(entity.happyTimer * 12)) * 0.5, entity.z);
        continue;
      }

      const dx = entity.targetX - entity.x;
      const dz = entity.targetZ - entity.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.1) {
        entity.restTimer -= dt;
        if (entity.restTimer <= 0) {
          const intent = entity.brain.decide(this.sense(entity, dt, elapsed));
          if (intent.target) {
            entity.targetX = intent.target.x;
            entity.targetZ = intent.target.z;
          }
          entity.restTimer = intent.restFor;
          entity.mood = intent.mood ?? entity.mood;
        }
      } else {
        const step = Math.min(distance, entity.speed * dt);
        const nx = entity.x + (dx / distance) * step;
        const nz = entity.z + (dz / distance) * step;
        // Don't walk up cliffs: give up on targets more than a block higher.
        if (!entity.flies && this.groundY(nx, nz) > entity.y + 1.1) {
          entity.targetX = entity.x;
          entity.targetZ = entity.z;
        } else {
          entity.x = nx;
          entity.z = nz;
        }
        entity.group.rotation.y = Math.atan2(dz, dx) * -1 + Math.PI / 2;
      }

      const groundY = this.groundY(entity.x, entity.z);
      entity.y += (groundY - entity.y) * Math.min(1, dt * 10);
      if (entity.flies) {
        entity.group.position.set(entity.x, entity.y + 1.1 + Math.sin(elapsed * 2 + entity.phase) * 0.25, entity.z);
        const flap = Math.sin(elapsed * 14 + entity.phase) * 0.9;
        if (entity.wings) {
          entity.wings[0].rotation.y = flap;
          entity.wings[1].rotation.y = -flap;
        }
      } else {
        const moving = distance >= 0.1;
        const hop = moving ? Math.abs(Math.sin(elapsed * 7 + entity.phase)) * 0.18 : 0;
        entity.group.position.set(entity.x, entity.y + hop, entity.z);
      }
    }
  }

  dispose(): void {
    for (const entity of this.entities) {
      this.scene.remove(entity.group);
      disposeGroup(entity.group);
    }
    this.entities.length = 0;
  }
}
