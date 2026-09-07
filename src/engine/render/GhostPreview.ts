import * as THREE from 'three';
import type { BlockRegistry } from '../blocks/registry';
import { SHAPES } from '../blocks/shapes';
import type { System } from '../core/System';
import type { InteractionState } from '../input/InteractionSystem';

/**
 * A translucent copy of the selected block's shape where it would be
 * placed. Green when allowed, red when not — a kid sees the answer before
 * tapping.
 */
export class GhostPreview implements System {
  readonly name = 'ghost';
  private group = new THREE.Group();
  private material = new THREE.MeshBasicMaterial({ color: '#8ed75f', transparent: true, opacity: 0.35, depthWrite: false });
  private lastKey = '';

  constructor(
    private scene: THREE.Scene,
    private registry: BlockRegistry,
    private state: InteractionState,
    private selected: () => number,
  ) {
    scene.add(this.group);
    this.group.visible = false;
  }

  update(): void {
    const target = this.state.placement;
    if (!target) {
      this.group.visible = false;
      return;
    }
    const id = this.selected();
    const def = this.registry.get(id);
    if (!def) {
      this.group.visible = false;
      return;
    }
    const key = `${id}:${def.shape}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      for (const child of [...this.group.children]) {
        this.group.remove(child);
        (child as THREE.Mesh).geometry.dispose();
      }
      const boxes = SHAPES[def.shape].boxes(0);
      const list = boxes.length > 0 ? boxes : [{ minX: 0, minY: 0, minZ: 0, maxX: 1, maxY: 1, maxZ: 1 }];
      for (const b of list) {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.maxX - b.minX, b.maxY - b.minY, b.maxZ - b.minZ), this.material);
        mesh.position.set((b.minX + b.maxX) / 2 - 0.5, (b.minY + b.maxY) / 2 - 0.5, (b.minZ + b.maxZ) / 2 - 0.5);
        this.group.add(mesh);
      }
    }
    this.material.color.set(target.valid ? '#8ed75f' : '#e8574f');
    this.group.position.set(target.x, target.y, target.z);
    this.group.visible = true;
  }

  dispose(): void {
    this.scene.remove(this.group);
    for (const child of this.group.children) (child as THREE.Mesh).geometry.dispose();
    this.material.dispose();
  }
}
