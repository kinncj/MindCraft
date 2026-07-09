import * as THREE from 'three';
import type { BlockPosition, PlacedBlock } from '../../types/game';
import { AnimalSystem, type GroundQuery } from './animals';
import { EnvironmentSystem } from './environment';
import { computeLight } from './lighting';
import {
  TextureAtlas,
  buildWorldGeometries,
  patchVoxelLighting,
  type BucketId,
} from './worldMesh';
import { VISUAL_MODES } from '../../shaders/visualModes';
import { touchInput } from '../touchControls';
import type { TimeMode, VisualModeId, WeatherMode } from '../../types/game';
import { PlayerController, type CellQuery } from './player';
import { SPAWN } from './starterWorld';
import { WORLD_SIZE } from './world';

export type ViewMode = 'third' | 'first';

export type RendererCallbacks = {
  onPlace: (pos: BlockPosition) => void;
  onRemove: (pos: BlockPosition) => void;
  onBoxTap: (pos: BlockPosition) => void;
  getMode: () => 'place' | 'remove';
  /** Ground lookup for animals: highest block in a column. */
  groundAt: GroundQuery;
  /** Grid cell lookup for player physics (collision, swimming). */
  cellAt: CellQuery;
  getViewMode: () => ViewMode;
  requestViewMode: (mode: ViewMode) => void;
  onAnimalPet: (kind: string) => void;
};

declare global {
  interface Window {
    /** Test hook: world position → screen pixels. The game is fully local. */
    mindcraftDebug?: {
      projectBlock: (x: number, y: number, z: number) => { x: number; y: number } | null;
      playerPosition: () => { x: number; y: number; z: number };
    };
  }
}

const DRAG_THRESHOLD_PX = 6;
const MIN_THIRD_PERSON_DISTANCE = 3;

/**
 * Chunk-meshed voxel renderer: the world is merged into four meshes
 * (opaque / water / alpha / glow) with only visible faces emitted —
 * a handful of draw calls and ~20k triangles for a full world.
 * Raycast hits resolve to grid cells via the hit point and face normal.
 */
export class VoxelRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private atlas = new TextureAtlas();
  private worldMeshes = new Map<BucketId, THREE.Mesh>();
  private blocksRef: Record<string, PlacedBlock> = {};
  private environment: EnvironmentSystem;
  private groundPlane: THREE.Mesh;
  private highlight: THREE.LineSegments;
  private animals: AnimalSystem;
  private player: PlayerController;
  private firstPersonArm: THREE.Group;
  private clock = new THREE.Clock();
  private eye = new THREE.Vector3(SPAWN.x, SPAWN.y + 1.6, SPAWN.z);
  // Camera starts behind the player, facing the spawn plaza and its
  // Magic Delivery Box.
  private yaw = Math.PI / 4 + Math.PI;
  private pitch = 0.5;
  private distance = 9;
  private targetDistance = 9;
  private keysDown = new Set<string>();
  private pointerDownAt: { x: number; y: number; button: number } | null = null;
  private dragging = false;
  private lastPointer = { x: 0, y: 0 };
  private activePointers = new Map<number, { x: number; y: number }>();
  private pinchDistance: number | null = null;
  private animationFrame = 0;
  private disposed = false;

  /** True when WebGL runs on a software rasterizer (CI, VMs, old machines). */
  private readonly lowPower: boolean;

  constructor(
    private container: HTMLElement,
    private callbacks: RendererCallbacks,
  ) {
    this.lowPower = VoxelRenderer.detectSoftwareRendering();
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.lowPower });
    // Software rasterizers are fill-rate bound: rendering at half
    // resolution roughly quadruples the frame rate and still looks fine
    // upscaled. Real GPUs get the crisp native-DPI picture.
    this.renderer.setPixelRatio(this.lowPower ? 0.5 : Math.min(window.devicePixelRatio, 2));
    // Soft shadows are the single most expensive feature on a software
    // rasterizer (seconds per frame). Real GPUs keep them.
    this.renderer.shadowMap.enabled = !this.lowPower;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color('#aee3ff');
    this.scene.fog = new THREE.Fog('#aee3ff', 70, 170);

    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 400);

    const sun = new THREE.DirectionalLight('#fffbe8', 1.6);
    sun.position.set(WORLD_SIZE.width / 2 + 40, 70, WORLD_SIZE.depth / 2 - 24);
    sun.target.position.set(WORLD_SIZE.width / 2, 0, WORLD_SIZE.depth / 2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -55;
    sun.shadow.camera.right = 55;
    sun.shadow.camera.top = 55;
    sun.shadow.camera.bottom = -55;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 220;
    sun.shadow.bias = -0.0005;
    sun.shadow.camera.updateProjectionMatrix();
    this.scene.add(sun);
    this.scene.add(sun.target);
    const hemisphere = new THREE.HemisphereLight('#cfe9ff', '#9ad07c', 1.1);
    this.scene.add(hemisphere);

    this.environment = new EnvironmentSystem(
      this.scene,
      sun,
      hemisphere,
      this.renderer,
      VISUAL_MODES.classic,
      !this.lowPower,
    );

    this.addClouds();

    // Invisible plane just under the terrain so clicks on exposed ground
    // still place blocks.
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
      new THREE.BoxGeometry(WORLD_SIZE.width + 6, 1, WORLD_SIZE.depth + 6),
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

    this.animals = new AnimalSystem(this.scene, callbacks.groundAt, {
      x: SPAWN.x,
      z: SPAWN.z,
    });
    this.player = new PlayerController(this.scene, callbacks.cellAt, {
      x: SPAWN.x - 3,
      z: SPAWN.z - 3,
    });

    // First-person arm: the player's own hand in the bottom corner of
    // the view, attached to the camera.
    this.firstPersonArm = this.buildFirstPersonArm();
    this.camera.add(this.firstPersonArm);
    this.scene.add(this.camera);

    this.createWorldMeshes();

    window.mindcraftDebug = {
      projectBlock: (x, y, z) => {
        const v = new THREE.Vector3(x, y, z).project(this.camera);
        if (v.z > 1) return null; // behind the camera
        const rect = this.renderer.domElement.getBoundingClientRect();
        return {
          x: rect.left + ((v.x + 1) / 2) * rect.width,
          y: rect.top + ((1 - v.y) / 2) * rect.height,
        };
      },
      playerPosition: () => ({ x: this.player.x, y: this.player.y, z: this.player.z }),
    };

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

  static detectSoftwareRendering(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      if (!gl) return true;
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
    } catch {
      return true;
    }
  }

  private buildFirstPersonArm(): THREE.Group {
    const group = new THREE.Group();
    const sleeve = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.14, 0.4),
      new THREE.MeshBasicMaterial({ color: '#ffb03c' }),
    );
    sleeve.position.z = 0.14;
    const hand = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.13, 0.14),
      new THREE.MeshBasicMaterial({ color: '#f2c79a' }),
    );
    hand.position.z = -0.13;
    group.add(sleeve, hand);
    group.position.set(0.32, -0.3, -0.55);
    group.rotation.set(-0.25, 0.12, 0);
    group.visible = false;
    return group;
  }

  private addClouds(): void {
    const material = new THREE.MeshLambertMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.85,
    });
    const spots: Array<[number, number, number, number, number]> = [
      [8, 34, 12, 9, 5],
      [28, 38, 44, 11, 6],
      [52, 36, 20, 8, 4],
      [60, 40, 56, 10, 6],
      [-4, 37, 40, 7, 4],
      [40, 35, 4, 8, 5],
    ];
    for (const [x, y, z, w, d] of spots) {
      const cloud = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d), material);
      cloud.position.set(x, y, z);
      this.scene.add(cloud);
    }
  }

  private createWorldMeshes(): void {
    const atlasMap = this.atlas.texture;
    const materials: Record<BucketId, THREE.Material> = {
      opaque: new THREE.MeshLambertMaterial({ map: atlasMap }),
      water: new THREE.MeshLambertMaterial({
        map: atlasMap,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
      alpha: new THREE.MeshLambertMaterial({
        map: atlasMap,
        transparent: true,
        alphaTest: 0.04,
        side: THREE.DoubleSide,
      }),
      glow: new THREE.MeshLambertMaterial({
        map: atlasMap,
        emissive: new THREE.Color('#fff3c0'),
        emissiveIntensity: 0.4,
        emissiveMap: atlasMap ?? undefined,
      }),
    };
    for (const bucket of Object.keys(materials) as BucketId[]) {
      // Glow faces ignore darkness — a torch texture is always bright.
      if (bucket !== 'glow') {
        patchVoxelLighting(materials[bucket], this.environment.dayLight);
      }
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), materials[bucket]);
      mesh.castShadow = bucket === 'opaque' || bucket === 'glow';
      mesh.receiveShadow = true;
      mesh.visible = false;
      this.scene.add(mesh);
      this.worldMeshes.set(bucket, mesh);
    }
  }

  syncBlocks(blocks: Record<string, PlacedBlock>): void {
    this.blocksRef = blocks;
    const light = computeLight(blocks);
    const geometries = buildWorldGeometries(blocks, this.atlas, light);
    for (const [bucket, mesh] of this.worldMeshes) {
      const geometry = geometries[bucket];
      mesh.geometry.dispose();
      if (geometry) {
        mesh.geometry = geometry;
        mesh.visible = true;
      } else {
        mesh.geometry = new THREE.BufferGeometry();
        mesh.visible = false;
      }
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

  private pinchSpread(): number {
    const [a, b] = [...this.activePointers.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.renderer.domElement.setPointerCapture(event.pointerId);
    if (this.activePointers.size === 2) {
      // Second finger: this is a pinch zoom, not a tap or a look-drag.
      this.pinchDistance = this.pinchSpread();
      this.pointerDownAt = null;
      this.dragging = false;
      this.highlight.visible = false;
      return;
    }
    if (this.activePointers.size > 2) return;
    this.pointerDownAt = { x: event.clientX, y: event.clientY, button: event.button };
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.dragging = false;
  };

  private onPointerMove = (event: PointerEvent): void => {
    const tracked = this.activePointers.get(event.pointerId);
    if (tracked) {
      tracked.x = event.clientX;
      tracked.y = event.clientY;
    }
    if (this.activePointers.size >= 2 && this.pinchDistance !== null) {
      const spread = this.pinchSpread();
      // Fingers apart = zoom in, together = zoom out.
      this.zoomBy((this.pinchDistance - spread) * 0.06);
      this.pinchDistance = spread;
      return;
    }
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
        // No clamp here — updateCamera owns the pitch range, and it
        // allows looking all the way up at the sky and ceilings.
        this.pitch += moveY * 0.004;
      }
    } else {
      this.updateHighlight(event);
    }
    this.lastPointer = { x: event.clientX, y: event.clientY };
  };

  private onPointerUp = (event: PointerEvent): void => {
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size < 2) this.pinchDistance = null;
    const start = this.pointerDownAt;
    this.pointerDownAt = null;
    if (!start || this.dragging) {
      this.dragging = false;
      return;
    }
    this.handleTap(event, start.button);
  };

  private onPointerLeave = (event: PointerEvent): void => {
    this.activePointers.delete(event.pointerId);
    if (this.activePointers.size < 2) this.pinchDistance = null;
    this.pointerDownAt = null;
    this.dragging = false;
    this.highlight.visible = false;
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.zoomBy(event.deltaY * 0.02);
  };

  /** Shared by wheel and pinch: positive moves the camera away. */
  private zoomBy(delta: number): void {
    const mode = this.callbacks.getViewMode();
    if (mode === 'first') {
      // Zooming out of your own head brings the camera behind you,
      // just like the game this one is named after.
      if (delta > 0) {
        this.callbacks.requestViewMode('third');
        this.distance = MIN_THIRD_PERSON_DISTANCE;
        this.targetDistance = 7;
      }
      return;
    }
    this.targetDistance = THREE.MathUtils.clamp(
      this.targetDistance + delta,
      MIN_THIRD_PERSON_DISTANCE - 1,
      60,
    );
    if (this.targetDistance < MIN_THIRD_PERSON_DISTANCE) {
      this.callbacks.requestViewMode('first');
      this.targetDistance = 7;
      this.distance = 7;
    }
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
      return;
    }
    // Buttons own their activation keys; walking keys still work.
    if (target instanceof HTMLButtonElement && (event.key === ' ' || event.key === 'Enter')) {
      return;
    }
    if (event.key === ' ') event.preventDefault();
    const key = event.key.toLowerCase();
    if (key === 'v') {
      this.callbacks.requestViewMode(this.callbacks.getViewMode() === 'third' ? 'first' : 'third');
      return;
    }
    this.keysDown.add(key);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keysDown.delete(event.key.toLowerCase());
  };

  private pickAt(event: PointerEvent): {
    intersection: THREE.Intersection;
    block: PlacedBlock | null;
  } | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    const targets: THREE.Object3D[] = [this.groundPlane];
    for (const mesh of this.worldMeshes.values()) {
      if (mesh.visible) targets.push(mesh);
    }
    const hit = this.raycaster.intersectObjects(targets, false)[0];
    if (!hit) return null;
    if (hit.object === this.groundPlane) return { intersection: hit, block: null };
    // The hit point sits on a face plane; stepping half a block against
    // the normal lands inside the block that owns the face.
    const normal = hit.face?.normal;
    if (!normal) return null;
    const cell = {
      x: Math.round(hit.point.x - normal.x * 0.5),
      y: Math.round(hit.point.y - normal.y * 0.5),
      z: Math.round(hit.point.z - normal.z * 0.5),
    };
    const block = this.blocksRef[`${cell.x},${cell.y},${cell.z}`] ?? null;
    return block ? { intersection: hit, block } : null;
  }

  private updateHighlight(event: PointerEvent): void {
    const hit = this.pickAt(event);
    if (hit?.block) {
      const { x, y, z } = hit.block.position;
      this.highlight.position.set(x, y, z);
      this.highlight.visible = true;
    } else {
      this.highlight.visible = false;
    }
  }

  setTimeMode(mode: TimeMode): void {
    this.environment.setTimeMode(mode);
  }

  setWeather(weather: WeatherMode): void {
    this.environment.setWeather(weather);
  }

  setVisualMode(mode: VisualModeId): void {
    this.environment.applyVisualMode(VISUAL_MODES[mode]);
  }

  private handleTap(event: PointerEvent, button: number): void {
    // Petting comes first: animals are friends, not building surfaces.
    const petted = this.animals.tapAt(this.raycaster, this.camera, event, this.renderer.domElement);
    if (petted) {
      this.callbacks.onAnimalPet(petted);
      return;
    }
    const hit = this.pickAt(event);
    if (!hit) return;

    const removing = button === 2 || this.callbacks.getMode() === 'remove';

    if (!hit.block) {
      if (removing) return;
      const point = hit.intersection.point;
      this.callbacks.onPlace({
        x: Math.round(point.x),
        y: 0,
        z: Math.round(point.z),
      });
      return;
    }

    const block = hit.block;
    if (block.type === 'magic-box' && !removing) {
      this.callbacks.onBoxTap(block.position);
      return;
    }

    if (removing) {
      this.callbacks.onRemove(block.position);
      return;
    }

    const normal = hit.intersection.face?.normal;
    if (!normal) return;
    this.callbacks.onPlace({
      x: block.position.x + Math.round(normal.x),
      y: block.position.y + Math.round(normal.y),
      z: block.position.z + Math.round(normal.z),
    });
  }

  private playerInput() {
    // Keyboard and the on-screen joystick both drive the same input.
    return {
      forward: this.keysDown.has('w') || this.keysDown.has('arrowup') || touchInput.y < -0.3,
      back: this.keysDown.has('s') || this.keysDown.has('arrowdown') || touchInput.y > 0.3,
      left: this.keysDown.has('a') || this.keysDown.has('arrowleft') || touchInput.x < -0.3,
      right: this.keysDown.has('d') || this.keysDown.has('arrowright') || touchInput.x > 0.3,
      jump: this.keysDown.has(' ') || touchInput.jump,
    };
  }

  private updateCamera(mode: ViewMode): void {
    this.player.eyePosition(this.eye);
    // Full range in both modes so ceilings and sky are always reachable.
    this.pitch = THREE.MathUtils.clamp(this.pitch, -1.25, 1.35);
    this.distance += (this.targetDistance - this.distance) * 0.18;

    if (mode === 'first') {
      this.camera.position.copy(this.eye);
      const look = new THREE.Vector3(
        -Math.sin(this.yaw) * Math.cos(this.pitch),
        -Math.sin(this.pitch),
        -Math.cos(this.yaw) * Math.cos(this.pitch),
      );
      this.camera.lookAt(look.add(this.eye));
    } else {
      const offset = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        Math.sin(this.pitch),
        Math.cos(this.yaw) * Math.cos(this.pitch),
      ).multiplyScalar(this.distance);
      const position = this.camera.position.copy(this.eye).add(offset);
      // Looking up swings the camera low; keep it from diving underground.
      position.y = Math.max(position.y, 0.4);
      this.camera.lookAt(this.eye);
    }
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
    const dt = Math.min(this.clock.getDelta(), 0.1);
    const elapsed = this.clock.elapsedTime;
    const mode = this.callbacks.getViewMode();
    const input = this.playerInput();
    this.player.update(dt, input, this.yaw, elapsed);
    this.player.setVisible(mode === 'third');
    this.firstPersonArm.visible = mode === 'first';
    if (mode === 'first') {
      // Gentle walk bob for the visible hand.
      const moving = input.forward || input.back || input.left || input.right;
      this.firstPersonArm.position.y = -0.3 + (moving ? Math.sin(elapsed * 9) * 0.02 : 0);
      this.firstPersonArm.position.x = 0.32 + (moving ? Math.cos(elapsed * 4.5) * 0.012 : 0);
    }
    this.updateCamera(mode);
    this.environment.update(dt, elapsed);
    this.animals.update(dt, elapsed);
    // Gentle water shimmer: breathe the opacity instead of scrolling,
    // since the water mesh shares the atlas texture.
    const water = this.worldMeshes.get('water');
    if (water && water.visible) {
      (water.material as THREE.MeshLambertMaterial).opacity =
        0.78 + Math.sin(elapsed * 1.4) * 0.06;
    }
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.handleResize);
    this.environment.dispose();
    this.animals.dispose();
    this.player.dispose();
    delete window.mindcraftDebug;
    for (const mesh of this.worldMeshes.values()) {
      mesh.geometry.dispose();
      const material = mesh.material;
      for (const m of Array.isArray(material) ? material : [material]) m.dispose();
    }
    this.atlas.texture?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
