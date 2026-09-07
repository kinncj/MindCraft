import * as THREE from 'three';
import type { System } from '../core/System';
import type { PlayerController } from '../physics/PlayerController';
import { box, disposeGroup } from './bodies';

export type HatId = 'none' | 'cap' | 'crown' | 'cowboy' | 'party';

export type PlayerLook = { shirt: string; pants: string; skin: string; hair: string; hat: HatId };

export const DEFAULT_LOOK: PlayerLook = { shirt: '#ffb03c', pants: '#4a7fd6', skin: '#f2c79a', hair: '#6b4a26', hat: 'none' };

function paintFace(skin: string, hair: string): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = skin;
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = hair;
  ctx.fillRect(0, 0, 16, 4);
  ctx.fillRect(0, 4, 2, 3);
  ctx.fillRect(14, 4, 2, 3);
  ctx.fillStyle = '#3a3226';
  ctx.fillRect(4, 7, 2, 2);
  ctx.fillRect(10, 7, 2, 2);
  ctx.fillStyle = '#d8735f';
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
  const mesh = box(w, h, d, color);
  mesh.geometry.translate(0, -h / 2, 0); // pivot at the shoulder / hip
  return mesh;
}

/** The player's body in third person, plus the hand in first person. */
export class PlayerAvatar implements System {
  readonly name = 'avatar';
  readonly group = new THREE.Group();
  readonly firstPersonArm = new THREE.Group();
  private armLeft!: THREE.Mesh;
  private armRight!: THREE.Mesh;
  private legLeft!: THREE.Mesh;
  private legRight!: THREE.Mesh;
  private walkPhase = 0;
  showBody = true;
  look: PlayerLook;

  constructor(
    private scene: THREE.Scene,
    private player: PlayerController,
    private camera: THREE.Camera,
    look: PlayerLook = DEFAULT_LOOK,
  ) {
    this.look = { ...look };
    scene.add(this.group);
    camera.add(this.firstPersonArm);
    this.firstPersonArm.position.set(0.32, -0.3, -0.55);
    this.firstPersonArm.rotation.set(-0.25, 0.12, 0);
    this.firstPersonArm.visible = false;
    this.rebuild();
  }

  /** Dress-up: swap colors and hat, rebuilding the body. */
  setLook(look: Partial<PlayerLook>): void {
    this.look = { ...this.look, ...look };
    this.rebuild();
  }

  private rebuild(): void {
    for (const child of [...this.group.children]) this.group.remove(child);
    for (const child of [...this.firstPersonArm.children]) this.firstPersonArm.remove(child);
    const colors = this.look;
    const body = box(0.5, 0.62, 0.3, colors.shirt);
    body.position.y = 1.06;
    const faceTexture = paintFace(colors.skin, colors.hair);
    const headMaterials: THREE.Material[] = [];
    for (let i = 0; i < 6; i++) {
      if (i === 4 && faceTexture) headMaterials.push(new THREE.MeshLambertMaterial({ map: faceTexture }));
      else if (i === 2) headMaterials.push(new THREE.MeshLambertMaterial({ color: colors.hair }));
      else headMaterials.push(new THREE.MeshLambertMaterial({ color: colors.skin }));
    }
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), headMaterials);
    head.position.y = 1.6;
    head.castShadow = true;
    this.armLeft = limb(0.16, 0.55, 0.16, colors.shirt);
    this.armLeft.position.set(-0.33, 1.35, 0);
    this.armRight = limb(0.16, 0.55, 0.16, colors.shirt);
    this.armRight.position.set(0.33, 1.35, 0);
    this.legLeft = limb(0.18, 0.75, 0.2, colors.pants);
    this.legLeft.position.set(-0.13, 0.75, 0);
    this.legRight = limb(0.18, 0.75, 0.2, colors.pants);
    this.legRight.position.set(0.13, 0.75, 0);
    this.group.add(body, head, this.armLeft, this.armRight, this.legLeft, this.legRight);
    for (const part of hatParts(colors.hat)) this.group.add(part);

    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.4), new THREE.MeshBasicMaterial({ color: colors.shirt }));
    sleeve.position.z = 0.14;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.14), new THREE.MeshBasicMaterial({ color: colors.skin }));
    hand.position.z = -0.13;
    this.firstPersonArm.add(sleeve, hand);
  }

  update(dt: number, elapsed: number): void {
    const p = this.player;
    this.group.visible = this.showBody;
    this.firstPersonArm.visible = !this.showBody;
    if (p.moving) this.walkPhase += dt * (p.inWater ? 6 : 9);
    const swing = p.moving ? Math.sin(this.walkPhase) * (p.inWater ? 0.9 : 0.7) : 0;
    this.armLeft.rotation.x = p.inWater ? swing - 1.2 : swing;
    this.armRight.rotation.x = p.inWater ? -swing - 1.2 : -swing;
    this.legLeft.rotation.x = -swing * (p.inWater ? 0.5 : 1);
    this.legRight.rotation.x = swing * (p.inWater ? 0.5 : 1);
    this.group.position.set(p.x, p.y, p.z);
    this.group.rotation.y = p.facing;
    if (p.seated || p.mounted) {
      // Sit: legs forward, arms down.
      this.legLeft.rotation.x = -1.4;
      this.legRight.rotation.x = -1.4;
      this.armLeft.rotation.x = -0.4;
      this.armRight.rotation.x = -0.4;
      this.group.position.y = p.y - 0.35;
    }
    if (!this.showBody) {
      this.firstPersonArm.position.y = -0.3 + (p.moving ? Math.sin(elapsed * 9) * 0.02 : 0);
      this.firstPersonArm.position.x = 0.32 + (p.moving ? Math.cos(elapsed * 4.5) * 0.012 : 0);
    }
  }

  dispose(): void {
    this.camera.remove(this.firstPersonArm);
    this.scene.remove(this.group);
    disposeGroup(this.group);
    this.firstPersonArm.parent?.remove(this.firstPersonArm);
    disposeGroup(this.firstPersonArm);
  }
}

function hatParts(hat: HatId): THREE.Mesh[] {
  switch (hat) {
    case 'cap': {
      const cap = box(0.5, 0.12, 0.5, '#e8574f');
      cap.position.y = 1.88;
      const brim = box(0.5, 0.05, 0.22, '#e8574f');
      brim.position.set(0, 1.83, 0.34);
      return [cap, brim];
    }
    case 'crown': {
      const band = box(0.5, 0.14, 0.5, '#ffd94a');
      band.position.y = 1.9;
      const points: THREE.Mesh[] = [];
      for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
        const p = box(0.1, 0.16, 0.1, '#ffd94a');
        p.position.set(dx, 2.03, dz);
        points.push(p);
      }
      return [band, ...points];
    }
    case 'cowboy': {
      const brim = box(0.78, 0.06, 0.78, '#8a6238');
      brim.position.y = 1.84;
      const top = box(0.4, 0.26, 0.4, '#8a6238');
      top.position.y = 1.99;
      return [brim, top];
    }
    case 'party': {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.42, 6), new THREE.MeshLambertMaterial({ color: '#f291bb' }));
      cone.position.y = 2.02;
      const ball = box(0.1, 0.1, 0.1, '#ffd94a');
      ball.position.y = 2.25;
      return [cone, ball];
    }
    default:
      return [];
  }
}
