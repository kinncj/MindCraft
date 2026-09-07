import type * as THREE from 'three';
import type { Brain } from './Brain';

export type EntityKind = 'bunny' | 'chick' | 'butterfly' | 'pet' | 'villager' | 'vehicle';

/** A living thing in the world: a body (Three.js group) plus a brain. */
export type Entity = {
  id: string;
  kind: EntityKind;
  /** Display name for pets and villagers. */
  name?: string;
  group: THREE.Group;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetZ: number;
  speed: number;
  /** Flies (butterflies) instead of hopping on the ground. */
  flies: boolean;
  restTimer: number;
  happyTimer: number;
  phase: number;
  mood: string;
  brain: Brain;
  /** Optional animated parts. */
  wings?: [THREE.Mesh, THREE.Mesh];
  /** Persisted with the world? Animals are not; pets and villagers are. */
  persistent: boolean;
};
