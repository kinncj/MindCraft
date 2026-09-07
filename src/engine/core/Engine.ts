import * as THREE from 'three';
import { blocks as registry, resolveBlockId } from '../blocks/blocks';
import { CommandHistory } from '../commands/CommandHistory';
import { EntitySystem } from '../entities/EntitySystem';
import { PlayerAvatar } from '../entities/PlayerAvatar';
import { CameraSystem, type ViewMode } from '../input/CameraSystem';
import { InputSystem, type PadCommand } from '../input/InputSystem';
import { InteractionSystem, type InteractionMode } from '../input/InteractionSystem';
import { LightEngine } from '../lighting/LightEngine';
import { PlayerController } from '../physics/PlayerController';
import { ChunkMesher } from '../render/ChunkMesher';
import { ChunkRenderer } from '../render/ChunkRenderer';
import { EnvironmentSystem } from '../render/EnvironmentSystem';
import { TextureAtlas } from '../render/TextureAtlas';
import { ToolRegistry } from '../tools/ToolRegistry';
import { exposeTools } from '../tools/webmcp';
import { registerCoreTools } from '../tools/coreTools';
import { ChunkManager, type ChunkStorage } from '../world/ChunkManager';
import { CHUNK_SIZE, toChunkCoord, toLocal } from '../world/coords';
import { createGenerator } from '../world/generation/createGenerator';
import type { GeneratorConfig, WorldGenerator } from '../world/generation/Generator';
import { VoxelWorld } from '../world/VoxelWorld';
import { VISUAL_MODES } from '../../shaders/visualModes';
import type { TimeMode, VisualModeId, WeatherMode } from '../../types/game';
import { GameLoop } from './GameLoop';
import type { Chunk } from '../world/Chunk';

export type TemplateBlock = {
  x: number;
  y: number;
  z: number;
  id: string;
  state?: number;
  entity?: { kind: string; data: Record<string, unknown> };
};

/** What the engine needs from the app (React + store) layer. */
export type EngineBridge = {
  getSelectedBlockId(): number;
  getMode(): InteractionMode;
  openPanel(kind: string, payload: unknown): void;
  toast(message: string): void;
  onViewModeChange(mode: ViewMode): void;
  onPet(kind: string, name?: string): void;
  /** A controller button mapped to an app action (menu, hotbar, undo...). */
  onCommand?(command: PadCommand): void;
  /** A controller started or stopped being used (show/hide the reticle). */
  onGamepadActive?(active: boolean): void;
  /** Called when the last template block was written; persist that fact. */
  onTemplateApplied?(): void;
};

export type EngineOptions = {
  container: HTMLElement;
  generator: GeneratorConfig;
  spawn: { x: number; y: number; z: number };
  player?: { x: number; y: number; z: number; yaw?: number; pitch?: number } | null;
  template?: TemplateBlock[] | null;
  storage: ChunkStorage | null;
  bridge: EngineBridge;
  settings: { visualMode: VisualModeId; timeMode: TimeMode; weather: WeatherMode; timeOfDay?: number };
  /** Smaller radius for tests and slow machines. */
  viewRadius?: number;
  useWorker?: boolean;
};

declare global {
  interface Window {
    mindcraftDebug?: {
      projectBlock: (x: number, y: number, z: number) => { x: number; y: number } | null;
      playerPosition: () => { x: number; y: number; z: number };
      blockAt: (x: number, y: number, z: number) => string | null;
      surfaceAt: (x: number, z: number) => number;
      isReady: () => boolean;
      spawn: () => { x: number; y: number; z: number };
      lastTap: () => unknown;
      pick: (clientX: number, clientY: number) => { x: number; y: number; z: number; face: number } | null;
    };
  }
}

/**
 * The composition root. Builds the world, the systems, and the Three.js
 * scene, and runs the loop. React mounts one Engine per open world.
 */
export class Engine {
  readonly registry = registry;
  readonly world: VoxelWorld;
  readonly history: CommandHistory;
  readonly tools = new ToolRegistry();
  readonly generator: WorldGenerator;
  readonly player: PlayerController;
  readonly camera: CameraSystem;
  readonly environment: EnvironmentSystem;
  readonly entities: EntitySystem;
  readonly chunks: ChunkManager;
  readonly interaction: InteractionSystem;
  readonly input: InputSystem;
  readonly avatar: PlayerAvatar;
  readonly scene = new THREE.Scene();
  readonly renderer: THREE.WebGLRenderer;
  readonly loop = new GameLoop();
  readonly lowPower: boolean;
  readonly spawn: { x: number; y: number; z: number };
  /** Set by tools: the engine walks the player toward this point. */
  autoWalk: { x: number; z: number } | null = null;

  private atlas: TextureAtlas;
  private chunkRenderer: ChunkRenderer;
  private highlight: THREE.LineSegments;
  private templateByChunk = new Map<string, TemplateBlock[]>();
  private settled = false;
  private disposeTools: () => void;
  private disposed = false;

  constructor(private options: EngineOptions) {
    const { container, bridge } = options;
    this.lowPower = Engine.detectSoftwareRendering();
    this.renderer = new THREE.WebGLRenderer({ antialias: !this.lowPower, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.lowPower ? 0.5 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.lowPower;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.generator = createGenerator(options.generator);
    this.spawn = options.spawn;
    this.world = new VoxelWorld(registry);
    this.history = new CommandHistory(this.world);
    const lighting = new LightEngine(this.world, registry);
    this.atlas = new TextureAtlas();
    const mesher = new ChunkMesher(this.world, registry, this.atlas);

    this.environment = new EnvironmentSystem(this.scene, this.renderer, VISUAL_MODES[options.settings.visualMode], !this.lowPower);
    this.environment.setTimeMode(options.settings.timeMode);
    this.environment.setWeather(options.settings.weather);
    if (options.settings.timeOfDay !== undefined) this.environment.setTime(options.settings.timeOfDay);

    this.chunkRenderer = new ChunkRenderer(this.atlas.texture, this.environment.dayLight, !this.lowPower);
    this.scene.add(this.chunkRenderer.group);

    const start = options.player ?? options.spawn;
    this.player = new PlayerController(this.world, registry, start);
    this.input = new InputSystem(this.renderer.domElement);
    this.camera = new CameraSystem(this.player, this.input.frame, this.world, registry);
    if (options.player?.yaw !== undefined) this.camera.yaw = options.player.yaw;
    if (options.player?.pitch !== undefined) this.camera.pitch = options.player.pitch;
    this.camera.onViewModeChange((mode) => {
      this.avatar.showBody = mode === 'third';
      bridge.onViewModeChange(mode);
    });
    this.scene.add(this.camera.camera);
    this.avatar = new PlayerAvatar(this.scene, this.player, this.camera.camera);
    this.entities = new EntitySystem(this.scene, this.world, registry, this.player);

    this.chunks = new ChunkManager(this.world, this.generator, lighting, mesher, options.storage, {
      viewRadius: options.viewRadius ?? (this.lowPower ? 4 : 7),
      useWorker: options.useWorker ?? true,
    });
    this.chunks.onMeshes((chunk, meshes) => this.chunkRenderer.setMeshes(chunk, meshes));
    this.chunks.onChunkRemoved((key) => this.chunkRenderer.removeChunk(key));
    this.setTemplate(options.template ?? []);
    this.chunks.onFirstGenerate((chunk) => this.applyTemplate(chunk));

    // Edits relight and remesh around the change.
    this.world.subscribe({
      onBlockChanged: (change) => {
        const touched = lighting.onBlockChanged(change);
        for (const key of touched) {
          const [cx, cz] = key.split(',').map(Number);
          this.world.getChunk(cx, cz)?.setDirty();
        }
        this.world.markDirtyAround(change.x, change.y, change.z);
      },
    });

    this.interaction = new InteractionSystem(this.world, registry, this.input.frame, this.camera, this.player, this.history, {
      getSelectedBlockId: () => bridge.getSelectedBlockId(),
      getMode: () => bridge.getMode(),
      openPanel: (kind, payload) => bridge.openPanel(kind, payload),
      tapEntity: (ray) => {
        const entity = this.entities.tap(ray);
        if (entity) bridge.onPet(entity.kind, entity.name);
        return entity !== null;
      },
    });

    const highlightGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02));
    this.highlight = new THREE.LineSegments(highlightGeometry, new THREE.LineBasicMaterial({ color: '#ffffff' }));
    this.highlight.visible = false;
    this.scene.add(this.highlight);

    this.loop
      .add(this.input)
      .add({ name: 'commands', update: () => this.dispatchCommands() })
      .add({ name: 'autowalk', update: () => this.driveAutoWalk() })
      .add({ name: 'player', update: (dt) => this.player.update(dt, this.input.frame, this.camera.yaw) })
      .add(this.camera)
      .add(this.chunks)
      .add({ name: 'settle', update: () => this.settleWhenReady() })
      .add(this.interaction)
      .add(this.entities)
      .add(this.avatar)
      .add(this.environment)
      .add({ name: 'render', update: () => this.render() });

    this.disposeTools = exposeTools(this.tools);
    registerCoreTools(this);
    this.installDebugHooks();
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    this.loop.start();
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

  // --- Templates --------------------------------------------------------------

  private setTemplate(template: TemplateBlock[]): void {
    this.templateByChunk.clear();
    for (const block of template) {
      const key = `${toChunkCoord(block.x)},${toChunkCoord(block.z)}`;
      let list = this.templateByChunk.get(key);
      if (!list) {
        list = [];
        this.templateByChunk.set(key, list);
      }
      list.push(block);
    }
  }

  private applyTemplate(chunk: Chunk): void {
    const key = `${chunk.cx},${chunk.cz}`;
    const list = this.templateByChunk.get(key);
    if (!list) return;
    for (const b of list) {
      const def = resolveBlockId(b.id);
      if (!def) continue;
      chunk.set(toLocal(b.x), b.y, toLocal(b.z), def.numericId, b.state ?? 0);
      if (b.entity) chunk.setEntity(toLocal(b.x), b.y, toLocal(b.z), b.entity);
    }
    chunk.modified = true;
    this.templateByChunk.delete(key);
    if (this.templateByChunk.size === 0) this.options.bridge.onTemplateApplied?.();
  }

  /** Template blocks not yet written (chunks never generated). For persistence. */
  pendingTemplate(): TemplateBlock[] {
    return [...this.templateByChunk.values()].flat();
  }

  // --- Frame helpers ----------------------------------------------------------

  private settleWhenReady(): void {
    this.chunks.setFocus(this.player.x, this.player.z);
    if (this.settled) return;
    if (!this.chunks.isReady(this.player.x, this.player.z)) return;
    this.player.settleOnGround();
    this.settled = true;
    this.entities.spawnFlock(this.player.x, this.player.z);
  }

  private gamepadWasActive = false;

  private dispatchCommands(): void {
    const active = this.input.frame.gamepadActive;
    if (active !== this.gamepadWasActive) {
      this.gamepadWasActive = active;
      this.options.bridge.onGamepadActive?.(active);
    }
    for (const command of this.input.frame.commands) {
      if (command === 'toggle_view') this.camera.toggleViewMode();
      else this.options.bridge.onCommand?.(command);
    }
    // In first person a controller "tap" aims at the crosshair; in third
    // person aim at the screen center too (the reticle the HUD shows).
    if (this.input.frame.gamepadActive && !this.input.frame.hover) {
      this.input.frame.hover = { ndcX: 0, ndcY: 0 };
    }
  }

  private driveAutoWalk(): void {
    const goal = this.autoWalk;
    if (!goal) return;
    const dx = goal.x - this.player.x;
    const dz = goal.z - this.player.z;
    if (Math.hypot(dx, dz) < 0.35) {
      this.autoWalk = null;
      return;
    }
    // Point the camera along the path and hold "forward".
    this.camera.yaw = Math.atan2(-dx, -dz);
    const f = this.input.frame;
    f.forward = true;
    f.back = f.left = f.right = false;
    // Hop when something blocks the way.
    f.jump = this.player.onGround && Math.abs(this.player.vx) + Math.abs(this.player.vz) < 0.5;
  }

  private render(): void {
    const h = this.interaction.state.highlight;
    if (h) {
      this.highlight.position.set(h.x, h.y, h.z);
      this.highlight.visible = true;
    } else {
      this.highlight.visible = false;
    }
    this.environment.setFocus(this.player.x, this.player.y, this.player.z);
    // Gentle water shimmer.
    const water = this.chunkRenderer.materials.water as THREE.MeshLambertMaterial;
    water.opacity = 0.78 + Math.sin(this.loopElapsed() * 1.4) * 0.06;
    this.renderer.render(this.scene, this.camera.camera);
  }

  private elapsedClock = new THREE.Clock();
  private loopElapsed(): number {
    return this.elapsedClock.getElapsedTime();
  }

  private handleResize = (): void => {
    const width = this.options.container.clientWidth || 1;
    const height = this.options.container.clientHeight || 1;
    this.renderer.setSize(width, height);
    this.camera.resize(width, height);
  };

  // --- Public API for the app layer -----------------------------------------

  setViewMode(mode: ViewMode): void {
    this.camera.setViewMode(mode, false);
    this.avatar.showBody = mode === 'third';
  }

  setVisualMode(mode: VisualModeId): void {
    this.environment.applyVisualMode(VISUAL_MODES[mode]);
  }

  setTimeMode(mode: TimeMode): void {
    this.environment.setTimeMode(mode);
  }

  setWeather(weather: WeatherMode): void {
    this.environment.setWeather(weather);
  }

  /** Block the world input while a panel is open. */
  setInputBlocked(blocked: boolean): void {
    this.input.blocked = blocked;
  }

  playerState(): { x: number; y: number; z: number; yaw: number; pitch: number } {
    return { x: this.player.x, y: this.player.y, z: this.player.z, yaw: this.camera.yaw, pitch: this.camera.pitch };
  }

  respawn(): void {
    this.player.teleport(this.spawn.x, this.spawn.y + 1, this.spawn.z);
    this.settled = false;
  }

  /** Persist every edited chunk. The app layer saves the world row itself. */
  async save(): Promise<void> {
    await this.chunks.saveAll();
  }

  /** Waits until the ground under the spawn exists. */
  async waitForGround(): Promise<void> {
    await this.chunks.preload(this.player.x, this.player.z, 1);
  }

  private installDebugHooks(): void {
    window.mindcraftDebug = {
      projectBlock: (x, y, z) => {
        const v = new THREE.Vector3(x, y, z).project(this.camera.camera);
        if (v.z > 1) return null;
        const rect = this.renderer.domElement.getBoundingClientRect();
        return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
      },
      playerPosition: () => ({ x: this.player.x, y: this.player.y, z: this.player.z }),
      blockAt: (x, y, z) => {
        const id = this.world.getBlock(x, y, z);
        return id === 0 ? 'air' : (registry.get(id)?.id ?? null);
      },
      surfaceAt: (x, z) => this.world.height(x, z),
      isReady: () => this.settled,
      spawn: () => this.spawn,
      lastTap: () => this.interaction.state.lastTap,
      pick: (clientX, clientY) => {
        const rect = this.renderer.domElement.getBoundingClientRect();
        const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
        const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
        const hit = this.interaction.pickAt(ndcX, ndcY);
        return hit ? { x: hit.x, y: hit.y, z: hit.z, face: hit.face } : null;
      },
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    window.removeEventListener('resize', this.handleResize);
    this.loop.dispose();
    this.disposeTools();
    delete window.mindcraftDebug;
    this.scene.remove(this.highlight);
    this.highlight.geometry.dispose();
    (this.highlight.material as THREE.Material).dispose();
    this.chunkRenderer.dispose();
    this.atlas.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export { CHUNK_SIZE };
