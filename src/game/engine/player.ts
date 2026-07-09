import * as THREE from 'three';
import type { BlockTypeId } from '../../types/game';
import { WORLD_SIZE } from './world';

/**
 * The player: a small voxel kid who walks, hops up single blocks,
 * jumps with space, swims in water, and — crucially — fits under
 * roofs, bridges, and shelters. Collision is per-cell against the
 * block grid: support below, headroom around, ceiling above.
 */

/** What block occupies a grid cell, if any. */
export type CellQuery = (x: number, y: number, z: number) => BlockTypeId | null;

export type PlayerInput = {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  jump: boolean;
};

const WALK_SPEED = 4.4;
const SWIM_SPEED = 2.6;
const GRAVITY = -22;
const WATER_GRAVITY = -3;
const JUMP_VELOCITY = 8;
const SWIM_UP_VELOCITY = 3.4;
const STEP_UP = 1.05; // can walk up one block without jumping
const PLAYER_HEIGHT = 1.8;
const EYE_HEIGHT = 1.6;

function isSolid(type: BlockTypeId | null): boolean {
  return type !== null && type !== 'water' && type !== 'cloud';
}

function paintFace(): THREE.Texture | null {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#f2c79a'; // friendly skin tone
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = '#6b4a26'; // hair
  ctx.fillRect(0, 0, 16, 4);
  ctx.fillRect(0, 4, 2, 3);
  ctx.fillRect(14, 4, 2, 3);
  ctx.fillStyle = '#3a3226'; // eyes
  ctx.fillRect(4, 7, 2, 2);
  ctx.fillRect(10, 7, 2, 2);
  ctx.fillStyle = '#d8735f'; // smile
  ctx.fillRect(5, 11, 6, 1);
  ctx.fillRect(4, 10, 1, 1);
  ctx.fillRect(11, 10, 1, 1);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function limb(w: number, h: number, d: number, color: string): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  // Pivot at the top so limbs swing from the shoulder/hip.
  mesh.geometry.translate(0, -h / 2, 0);
  mesh.castShadow = true;
  return mesh;
}

export class PlayerController {
  readonly group = new THREE.Group();
  x: number;
  y: number; // feet height
  z: number;
  private vy = 0;
  private onGround = true;
  private facing = 0;
  private armLeft: THREE.Mesh;
  private armRight: THREE.Mesh;
  private legLeft: THREE.Mesh;
  private legRight: THREE.Mesh;

  constructor(
    private scene: THREE.Scene,
    private cellAt: CellQuery,
    spawn: { x: number; z: number },
  ) {
    this.x = spawn.x;
    this.z = spawn.z;
    this.y = this.supportHeight(spawn.x, spawn.z, WORLD_SIZE.height);

    const shirt = '#ffb03c';
    const pants = '#4a7fd6';
    const skin = '#f2c79a';

    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.62, 0.3),
      new THREE.MeshLambertMaterial({ color: shirt }),
    );
    body.position.y = 1.06;
    body.castShadow = true;

    const faceTexture = paintFace();
    const headMaterials: THREE.Material[] = [];
    for (let i = 0; i < 6; i++) {
      // Face texture on the front (+z after facing rotation); hair-brown top.
      if (i === 4 && faceTexture) {
        headMaterials.push(new THREE.MeshLambertMaterial({ map: faceTexture }));
      } else if (i === 2) {
        headMaterials.push(new THREE.MeshLambertMaterial({ color: '#6b4a26' }));
      } else {
        headMaterials.push(new THREE.MeshLambertMaterial({ color: skin }));
      }
    }
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), headMaterials);
    head.position.y = 1.6;
    head.castShadow = true;

    this.armLeft = limb(0.16, 0.55, 0.16, shirt);
    this.armLeft.position.set(-0.33, 1.35, 0);
    this.armRight = limb(0.16, 0.55, 0.16, shirt);
    this.armRight.position.set(0.33, 1.35, 0);
    this.legLeft = limb(0.18, 0.75, 0.2, pants);
    this.legLeft.position.set(-0.13, 0.75, 0);
    this.legRight = limb(0.18, 0.75, 0.2, pants);
    this.legRight.position.set(0.13, 0.75, 0);

    this.group.add(body, head, this.armLeft, this.armRight, this.legLeft, this.legRight);
    scene.add(this.group);
  }

  private solidAt(x: number, y: number, z: number): boolean {
    return isSolid(this.cellAt(x, y, z));
  }

  /**
   * Feet height on the highest solid block at or below `belowFeetY` in
   * this column — never a block above the player's head, which is what
   * makes roofs and shelters walk-under-able.
   */
  private supportHeight(x: number, z: number, belowFeetY: number): number {
    const gx = Math.round(x);
    const gz = Math.round(z);
    const start = Math.min(WORLD_SIZE.height - 1, Math.floor(belowFeetY + 0.49));
    for (let y = start; y >= 0; y--) {
      if (this.solidAt(gx, y, gz)) return y + 0.5;
    }
    return 0.5;
  }

  /** Can the player's body (feet at feetY) fit in this column? */
  private fits(x: number, z: number, feetY: number): boolean {
    const gx = Math.round(x);
    const gz = Math.round(z);
    // Cells overlapping the body: center y in (feetY - 0.5, feetY + height + 0.5).
    const first = Math.floor(feetY + 0.51);
    const last = Math.floor(feetY + PLAYER_HEIGHT + 0.49);
    for (let y = first; y <= last; y++) {
      if (this.solidAt(gx, y, gz)) return false;
    }
    return true;
  }

  /** Is the cell at the player's torso water? (Used for swimming.) */
  isInWater(): boolean {
    const torso = this.cellAt(Math.round(this.x), Math.floor(this.y + 0.9), Math.round(this.z));
    return torso === 'water';
  }

  update(dt: number, input: PlayerInput, cameraYaw: number, elapsed: number): void {
    const inWater = this.isInWater();

    // Direction relative to where the camera looks.
    let moveX = 0;
    let moveZ = 0;
    const forwardX = -Math.sin(cameraYaw);
    const forwardZ = -Math.cos(cameraYaw);
    if (input.forward) {
      moveX += forwardX;
      moveZ += forwardZ;
    }
    if (input.back) {
      moveX -= forwardX;
      moveZ -= forwardZ;
    }
    if (input.left) {
      moveX += forwardZ;
      moveZ -= forwardX;
    }
    if (input.right) {
      moveX -= forwardZ;
      moveZ += forwardX;
    }
    const moving = moveX !== 0 || moveZ !== 0;

    if (moving) {
      const length = Math.hypot(moveX, moveZ);
      const speed = inWater ? SWIM_SPEED : WALK_SPEED;
      const stepX = (moveX / length) * speed * dt;
      const stepZ = (moveZ / length) * speed * dt;

      this.tryMove(this.x + stepX, this.z);
      this.tryMove(this.x, this.z + stepZ);

      const targetFacing = Math.atan2(moveX, moveZ);
      let delta = targetFacing - this.facing;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      this.facing += delta * Math.min(1, dt * 12);
    }

    // Vertical: jumping, swimming, gravity, ceilings, landing.
    const feetInWater =
      this.cellAt(Math.round(this.x), Math.floor(this.y + 0.3), Math.round(this.z)) === 'water';
    if (input.jump && inWater) {
      this.vy = Math.min(this.vy + SWIM_UP_VELOCITY * dt * 6, SWIM_UP_VELOCITY);
    } else if (input.jump && !inWater && feetInWater) {
      // At the surface: a real jump, so the swimmer can hop onto shore.
      this.vy = JUMP_VELOCITY * 0.85;
    } else if (input.jump && this.onGround) {
      this.vy = JUMP_VELOCITY;
      this.onGround = false;
    }

    if (inWater) {
      this.vy += WATER_GRAVITY * dt;
      this.vy *= Math.max(0, 1 - dt * 3); // water drag
    } else {
      this.vy += GRAVITY * dt;
    }

    let nextY = this.y + this.vy * dt;

    if (this.vy > 0) {
      // Ceiling: the cell just above the head.
      const headCell = Math.floor(nextY + PLAYER_HEIGHT + 0.49);
      if (this.solidAt(Math.round(this.x), headCell, Math.round(this.z))) {
        nextY = headCell - 0.5 - PLAYER_HEIGHT;
        this.vy = 0;
      }
    }

    const support = this.supportHeight(this.x, this.z, Math.max(this.y, nextY));
    if (nextY <= support) {
      nextY = support;
      this.vy = 0;
      this.onGround = true;
    } else {
      this.onGround = false;
    }
    this.y = nextY;

    // Animation: swim paddle, walk swing, or idle.
    const swing =
      inWater && moving
        ? Math.sin(elapsed * 6) * 0.9
        : moving && this.onGround
          ? Math.sin(elapsed * 9) * 0.7
          : 0;
    this.armLeft.rotation.x = inWater ? swing - 1.2 : swing;
    this.armRight.rotation.x = inWater ? -swing - 1.2 : -swing;
    this.legLeft.rotation.x = -swing * (inWater ? 0.5 : 1);
    this.legRight.rotation.x = swing * (inWater ? 0.5 : 1);

    this.group.position.set(this.x, this.y, this.z);
    this.group.rotation.y = this.facing;
  }

  /** Horizontal move with step-up and headroom checks. */
  private tryMove(nx: number, nz: number): void {
    const cx = THREE.MathUtils.clamp(nx, 0.5, WORLD_SIZE.width - 1.5);
    const cz = THREE.MathUtils.clamp(nz, 0.5, WORLD_SIZE.depth - 1.5);
    const support = this.supportHeight(cx, cz, this.y + STEP_UP);

    if (this.onGround) {
      // Walking: the new column's floor must be within a step, and the
      // body must fit standing on it.
      if (support - this.y > STEP_UP) return;
      if (!this.fits(cx, cz, Math.max(support, this.y))) return;
      this.x = cx;
      this.z = cz;
      if (support > this.y) this.y = support; // step up
    } else {
      // Airborne or swimming: keep the current height, just don't clip
      // into walls.
      if (!this.fits(cx, cz, this.y)) return;
      this.x = cx;
      this.z = cz;
    }
  }

  eyePosition(target: THREE.Vector3): THREE.Vector3 {
    return target.set(this.x, this.y + EYE_HEIGHT, this.z);
  }

  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  dispose(): void {
    this.scene.remove(this.group);
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const material = child.material;
        for (const m of Array.isArray(material) ? material : [material]) m.dispose();
      }
    });
  }
}
