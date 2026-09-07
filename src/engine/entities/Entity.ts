import type * as THREE from 'three';
import type { Brain } from './Brain';
import type { Vehicle } from './vehicles';
import type { RobotRunner } from './robot';

export type EntityKind = 'bunny' | 'chick' | 'butterfly' | 'pet' | 'villager' | 'vehicle' | 'robot';

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
  /** dog, cat, car, boat, or a villager job. */
  variant?: string;
  /** Villagers: where they live, so wandering stays near home. */
  home?: { x: number; z: number };
  /** Extra per-entity data (job, colors) persisted as-is. */
  data?: Record<string, unknown>;
  /** Vehicles carry their own controller. */
  vehicle?: Vehicle;
  /** Robots carry their program runner. */
  robot?: RobotRunner;
  /** Temporary brain swap (a villager playing along) ends at this time. */
  brainUntil?: number;
  savedBrain?: Brain;
};

/** What a persistent entity looks like in the world record. */
export type StoredEntity = {
  id: string;
  kind: EntityKind;
  variant?: string;
  name?: string;
  x: number;
  y: number;
  z: number;
  brain: string;
  home?: { x: number; z: number };
  data?: Record<string, unknown>;
};
