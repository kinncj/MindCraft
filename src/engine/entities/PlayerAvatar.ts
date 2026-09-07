import * as THREE from 'three';
import type { System } from '../core/System';
import type { PlayerController } from '../physics/PlayerController';
import { box, disposeGroup } from './bodies';

function paintFace(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#f2c79a';
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = '#6b4a26';
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
  private armLeft: THREE.Mesh;
  private armRight: THREE.Mesh;
  private legLeft: THREE.Mesh;
  private legRight: THREE.Mesh;
  private walkPhase = 0;
  showBody = true;

  constructor(
    private scene: THREE.Scene,
    private player: PlayerController,
    camera: THREE.Camera,
    colors: { shirt: string; pants: string; skin: string } = { shirt: '#ffb03c', pants: '#4a7fd6', skin: '#f2c79a' },
  ) {
    const body = box(0.5, 0.62, 0.3, colors.shirt);
    body.position.y = 1.06;
    const faceTexture = paintFace();
    const headMaterials: THREE.Material[] = [];
    for (let i = 0; i < 6; i++) {
      if (i === 4 && faceTexture) headMaterials.push(new THREE.MeshLambertMaterial({ map: faceTexture }));
      else if (i === 2) headMaterials.push(new THREE.MeshLambertMaterial({ color: '#6b4a26' }));
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
    scene.add(this.group);

    const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.4), new THREE.MeshBasicMaterial({ color: colors.shirt }));
    sleeve.position.z = 0.14;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.14), new THREE.MeshBasicMaterial({ color: colors.skin }));
    hand.position.z = -0.13;
    this.firstPersonArm.add(sleeve, hand);
    this.firstPersonArm.position.set(0.32, -0.3, -0.55);
    this.firstPersonArm.rotation.set(-0.25, 0.12, 0);
    this.firstPersonArm.visible = false;
    camera.add(this.firstPersonArm);
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
    if (!this.showBody) {
      this.firstPersonArm.position.y = -0.3 + (p.moving ? Math.sin(elapsed * 9) * 0.02 : 0);
      this.firstPersonArm.position.x = 0.32 + (p.moving ? Math.cos(elapsed * 4.5) * 0.012 : 0);
    }
  }

  dispose(): void {
    this.scene.remove(this.group);
    disposeGroup(this.group);
    this.firstPersonArm.parent?.remove(this.firstPersonArm);
    disposeGroup(this.firstPersonArm);
  }
}
