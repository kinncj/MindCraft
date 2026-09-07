import * as THREE from 'three';
import type { System } from '../core/System';
import type { PlayerController } from '../physics/PlayerController';
import { raycastBlocks } from '../physics/raycast';
import type { BlockRegistry } from '../blocks/registry';
import type { VoxelWorld } from '../world/VoxelWorld';
import type { InputFrame } from './InputSystem';
import type { Ray } from '../physics/raycast';

export type ViewMode = 'first' | 'third';

const MIN_THIRD_DISTANCE = 3;
const MAX_DISTANCE = 40;

/**
 * Owns the Three.js camera: orbit yaw/pitch, first vs third person,
 * zoom-through switching, and a wall check so the third-person camera
 * never pokes into a hill.
 */
export class CameraSystem implements System {
  readonly name = 'camera';
  readonly camera = new THREE.PerspectiveCamera(60, 1, 0.1, 600);
  // Starts on the sunny side of the spawn plaza, looking at the landmarks.
  yaw = Math.PI / 4;
  pitch = 0.45;
  private distance = 8;
  private targetDistance = 8;
  private mode: ViewMode = 'third';
  private eye = new THREE.Vector3();
  private onModeChange: ((mode: ViewMode) => void) | null = null;

  constructor(
    private player: PlayerController,
    private input: InputFrame,
    private world: VoxelWorld,
    private registry: BlockRegistry,
  ) {}

  get viewMode(): ViewMode {
    return this.mode;
  }

  setViewMode(mode: ViewMode, notify = true): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === 'third') {
      this.distance = MIN_THIRD_DISTANCE;
      this.targetDistance = 7;
    }
    if (notify) this.onModeChange?.(mode);
  }

  toggleViewMode(): void {
    this.setViewMode(this.mode === 'third' ? 'first' : 'third');
  }

  /** The UI layer listens so its button label stays in sync. */
  onViewModeChange(handler: (mode: ViewMode) => void): void {
    this.onModeChange = handler;
  }

  /** Player yaw in quarter turns, for placing blocks that face the player. */
  rotationQuarter(): number {
    const turns = Math.round(-this.yaw / (Math.PI / 2));
    return ((turns % 4) + 4) % 4;
  }

  /** A world-space ray through a normalized device coordinate. */
  ray(ndcX: number, ndcY: number): Ray {
    const origin = new THREE.Vector3(ndcX, ndcY, -1).unproject(this.camera);
    const far = new THREE.Vector3(ndcX, ndcY, 1).unproject(this.camera);
    const dir = far.sub(origin).normalize();
    return { ox: origin.x, oy: origin.y, oz: origin.z, dx: dir.x, dy: dir.y, dz: dir.z };
  }

  /** A ray straight ahead from the eye — first-person crosshair. */
  forwardRay(): Ray {
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    return { ox: this.eye.x, oy: this.eye.y, oz: this.eye.z, dx: dir.x, dy: dir.y, dz: dir.z };
  }

  resize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  update(): void {
    const f = this.input;
    this.yaw -= f.lookDX * 0.006;
    this.pitch = THREE.MathUtils.clamp(this.pitch + f.lookDY * 0.004, -1.35, 1.45);
    if (f.zoom !== 0) this.zoomBy(f.zoom);
    if (f.pressed.has('v')) this.toggleViewMode();

    const e = this.player.eye();
    this.eye.set(e.x, e.y, e.z);
    this.distance += (this.targetDistance - this.distance) * 0.18;

    if (this.mode === 'first') {
      this.camera.position.copy(this.eye);
      const look = new THREE.Vector3(
        -Math.sin(this.yaw) * Math.cos(this.pitch),
        -Math.sin(this.pitch),
        -Math.cos(this.yaw) * Math.cos(this.pitch),
      );
      this.camera.lookAt(look.add(this.eye));
      return;
    }

    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    // Pull the camera in if a block is between it and the player.
    const hit = raycastBlocks(
      this.world,
      this.registry,
      { ox: this.eye.x, oy: this.eye.y, oz: this.eye.z, dx: offset.x, dy: offset.y, dz: offset.z },
      this.distance,
    );
    const allowed = hit ? Math.max(0.6, hit.distance - 0.4) : this.distance;
    const position = this.camera.position.copy(this.eye).add(offset.multiplyScalar(allowed));
    position.y = Math.max(position.y, 0.4);
    this.camera.lookAt(this.eye);
  }

  private zoomBy(delta: number): void {
    if (this.mode === 'first') {
      if (delta > 0) this.setViewMode('third');
      return;
    }
    this.targetDistance = THREE.MathUtils.clamp(this.targetDistance + delta, MIN_THIRD_DISTANCE - 1, MAX_DISTANCE);
    if (this.targetDistance < MIN_THIRD_DISTANCE) {
      this.targetDistance = 7;
      this.distance = 7;
      this.setViewMode('first');
    }
  }
}
