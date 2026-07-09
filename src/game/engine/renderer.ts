import * as THREE from 'three';
import type { BlockPosition, PlacedBlock } from '../../types/game';
import { BLOCK_DEFINITIONS } from './blockRegistry';
import { createBlockMaterials } from './textures';
import { WORLD_SIZE } from './world';

export type RendererCallbacks = {
  onPlace: (pos: BlockPosition) => void;
  onRemove: (pos: BlockPosition) => void;
  onBoxTap: (pos: BlockPosition) => void;
  getMode: () => 'place' | 'remove';
};

const DRAG_THRESHOLD_PX = 6;

/**
 * A deliberately small voxel renderer: one mesh per block, shared
 * geometry, cached materials. A 32x32 floor plus builds is around
 * 1,100 meshes, which every laptop from the last decade handles fine.
 */
export class VoxelRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private blockMeshes = new Map<string, THREE.Mesh>();
  private meshToBlock = new Map<THREE.Mesh, PlacedBlock>();
  private geometry = new THREE.BoxGeometry(1, 1, 1);
  private materials = new Map<string, THREE.Material | THREE.Material[]>();
  private groundPlane: THREE.Mesh;
  private highlight: THREE.LineSegments;
  private target = new THREE.Vector3(WORLD_SIZE.width / 2, 1, WORLD_SIZE.depth / 2);
  private yaw = Math.PI / 4;
  private pitch = 0.55;
  private distance = 26;
  private keysDown = new Set<string>();
  private pointerDownAt: { x: number; y: number; button: number } | null = null;
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private animationFrame = 0;
  private disposed = false;

  constructor(
    private container: HTMLElement,
    private callbacks: RendererCallbacks,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color('#aee3ff');
    this.scene.fog = new THREE.Fog('#aee3ff', 60, 120);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 300);

    const sun = new THREE.DirectionalLight('#fffbe8', 1.6);
    sun.position.set(WORLD_SIZE.width / 2 + 24, 44, WORLD_SIZE.depth / 2 - 14);
    sun.target.position.set(WORLD_SIZE.width / 2, 0, WORLD_SIZE.depth / 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 120;
    sun.shadow.bias = -0.0005;
    sun.shadow.camera.updateProjectionMatrix();
    this.scene.add(sun);
    this.scene.add(sun.target);
    this.scene.add(new THREE.HemisphereLight('#cfe9ff', '#9ad07c', 1.1));

    this.addClouds();

    // Invisible plane just under the floor so clicks on empty ground
    // still place blocks even if the grass there was removed.
    const planeGeometry = new THREE.PlaneGeometry(WORLD_SIZE.width, WORLD_SIZE.depth);
    planeGeometry.rotateX(-Math.PI / 2);
    this.groundPlane = new THREE.Mesh(
      planeGeometry,
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.groundPlane.position.set(WORLD_SIZE.width / 2 - 0.5, -0.5, WORLD_SIZE.depth / 2 - 0.5);
    this.scene.add(this.groundPlane);

    // Soft sand-colored rim so the edge of the world looks intentional.
    const rim = new THREE.Mesh(
      new THREE.BoxGeometry(WORLD_SIZE.width + 4, 1, WORLD_SIZE.depth + 4),
      new THREE.MeshLambertMaterial({ color: '#e8d8a8' }),
    );
    rim.position.set(WORLD_SIZE.width / 2 - 0.5, -1.01, WORLD_SIZE.depth / 2 - 0.5);
    rim.receiveShadow = true;
    this.scene.add(rim);

    const highlightGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02));
    this.highlight = new THREE.LineSegments(
      highlightGeometry,
      new THREE.LineBasicMaterial({ color: '#ffffff' }),
    );
    this.highlight.visible = false;
    this.scene.add(this.highlight);

    this.handleResize();
    this.attachEvents();
    this.loop();
  }

  static isSupported(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
    } catch {
      return false;
    }
  }

  // Flat drifting cloud slabs high above the build area. Pure decoration:
  // they are never raycast targets.
  private addClouds(): void {
    const material = new THREE.MeshLambertMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.85,
    });
    const spots: Array<[number, number, number, number, number]> = [
      [4, 24, 6, 7, 4],
      [14, 27, 22, 9, 5],
      [26, 25, 10, 6, 3],
      [30, 28, 28, 8, 5],
      [-2, 26, 20, 5, 3],
    ];
    for (const [x, y, z, w, d] of spots) {
      const cloud = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, d), material);
      cloud.position.set(x, y, z);
      this.scene.add(cloud);
    }
  }

  private materialFor(type: PlacedBlock['type']): THREE.Material | THREE.Material[] {
    const cached = this.materials.get(type);
    if (cached) return cached;
    const def = BLOCK_DEFINITIONS[type];
    // Pixel textures when 2D canvas is available, flat colors otherwise.
    const material =
      createBlockMaterials(type) ??
      new THREE.MeshLambertMaterial({
        color: def.color,
        transparent: def.transparent,
        opacity: def.opacity,
      });
    this.materials.set(type, material);
    return material;
  }

  syncBlocks(blocks: Record<string, PlacedBlock>): void {
    // Remove meshes for blocks that no longer exist.
    for (const [key, mesh] of this.blockMeshes) {
      if (!blocks[key]) {
        this.scene.remove(mesh);
        this.meshToBlock.delete(mesh);
        this.blockMeshes.delete(key);
      }
    }
    // Add meshes for new blocks.
    for (const [key, block] of Object.entries(blocks)) {
      const existing = this.blockMeshes.get(key);
      if (existing) {
        const known = this.meshToBlock.get(existing);
        if (known && known.type === block.type) continue;
        this.scene.remove(existing);
        this.meshToBlock.delete(existing);
        this.blockMeshes.delete(key);
      }
      const mesh = new THREE.Mesh(this.geometry, this.materialFor(block.type));
      mesh.position.set(block.position.x, block.position.y, block.position.z);
      const def = BLOCK_DEFINITIONS[block.type];
      mesh.castShadow = !def.transparent;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.blockMeshes.set(key, mesh);
      this.meshToBlock.set(mesh, block);
    }
  }

  private attachEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.handleResize);
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.pointerDownAt = { x: event.clientX, y: event.clientY, button: event.button };
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.dragging = false;
    this.renderer.domElement.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.pointerDownAt) {
      const dx = event.clientX - this.pointerDownAt.x;
      const dy = event.clientY - this.pointerDownAt.y;
      if (!this.dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        this.dragging = true;
      }
      if (this.dragging) {
        const moveX = event.clientX - this.lastPointer.x;
        const moveY = event.clientY - this.lastPointer.y;
        this.yaw -= moveX * 0.006;
        this.pitch = THREE.MathUtils.clamp(this.pitch + moveY * 0.004, 0.15, 1.35);
      }
    } else {
      this.updateHighlight(event);
    }
    this.lastPointer = { x: event.clientX, y: event.clientY };
  };

  private onPointerUp = (event: PointerEvent): void => {
    const start = this.pointerDownAt;
    this.pointerDownAt = null;
    if (!start || this.dragging) {
      this.dragging = false;
      return;
    }
    this.handleTap(event, start.button);
  };

  private onPointerLeave = (): void => {
    this.pointerDownAt = null;
    this.dragging = false;
    this.highlight.visible = false;
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.distance = THREE.MathUtils.clamp(this.distance + event.deltaY * 0.02, 8, 60);
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    this.keysDown.add(event.key.toLowerCase());
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keysDown.delete(event.key.toLowerCase());
  };

  private pickAt(event: PointerEvent): THREE.Intersection[] {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    const targets: THREE.Object3D[] = [...this.blockMeshes.values(), this.groundPlane];
    return this.raycaster.intersectObjects(targets, false);
  }

  private updateHighlight(event: PointerEvent): void {
    const hit = this.pickAt(event)[0];
    if (hit && hit.object !== this.groundPlane) {
      this.highlight.position.copy(hit.object.position);
      this.highlight.visible = true;
    } else {
      this.highlight.visible = false;
    }
  }

  private handleTap(event: PointerEvent, button: number): void {
    const hit = this.pickAt(event)[0];
    if (!hit) return;

    const removing = button === 2 || this.callbacks.getMode() === 'remove';

    if (hit.object === this.groundPlane) {
      if (removing) return;
      const point = hit.point;
      this.callbacks.onPlace({
        x: Math.round(point.x),
        y: 0,
        z: Math.round(point.z),
      });
      return;
    }

    const block = this.meshToBlock.get(hit.object as THREE.Mesh);
    if (!block) return;

    // Tapping a Magic Delivery Box opens it (unless the kid is in
    // remove mode and wants it gone).
    if (block.type === 'magic-box' && !removing) {
      this.callbacks.onBoxTap(block.position);
      return;
    }

    if (removing) {
      this.callbacks.onRemove(block.position);
      return;
    }

    const normal = hit.face?.normal;
    if (!normal) return;
    this.callbacks.onPlace({
      x: block.position.x + Math.round(normal.x),
      y: block.position.y + Math.round(normal.y),
      z: block.position.z + Math.round(normal.z),
    });
  }

  private moveFromKeys(): void {
    const speed = 0.35;
    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    if (this.keysDown.has('w') || this.keysDown.has('arrowup')) {
      this.target.addScaledVector(forward, -speed);
    }
    if (this.keysDown.has('s') || this.keysDown.has('arrowdown')) {
      this.target.addScaledVector(forward, speed);
    }
    if (this.keysDown.has('a') || this.keysDown.has('arrowleft')) {
      this.target.addScaledVector(right, -speed);
    }
    if (this.keysDown.has('d') || this.keysDown.has('arrowright')) {
      this.target.addScaledVector(right, speed);
    }
    this.target.x = THREE.MathUtils.clamp(this.target.x, -4, WORLD_SIZE.width + 4);
    this.target.z = THREE.MathUtils.clamp(this.target.z, -4, WORLD_SIZE.depth + 4);
  }

  private updateCamera(): void {
    const offset = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    ).multiplyScalar(this.distance);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth || 1;
    const height = this.container.clientHeight || 1;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private loop = (): void => {
    if (this.disposed) return;
    this.moveFromKeys();
    this.updateCamera();
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
    this.geometry.dispose();
    for (const entry of this.materials.values()) {
      for (const material of Array.isArray(entry) ? entry : [entry]) {
        if (material instanceof THREE.MeshLambertMaterial) material.map?.dispose();
        material.dispose();
      }
    }
    this.renderer.domElement.remove();
  }
}
