import * as THREE from 'three';
import { blocks as registry, resolveBlockId } from '../blocks/blocks';
import { CommandHistory } from '../commands/CommandHistory';
import { BuildTools } from '../build/BuildTools';
import { EntitySystem } from '../entities/EntitySystem';
import { DEFAULT_LOOK as DEFAULT_LOOK_IMPORT, PlayerAvatar, type PlayerLook } from '../entities/PlayerAvatar';
import type { StoredEntity } from '../entities/Entity';
import { registerLifeTools } from '../tools/lifeTools';
import { registerAutomationTools } from '../tools/automationTools';
import { LogicSystem, type LogicEvent } from '../logic/LogicSystem';
import { AudioSystem } from '../audio/AudioSystem';
import { ChatAgent } from '../chat/ChatAgent';
import type { ChatProvider } from '../chat/types';
import type { AudioSettings } from '../audio/music';
import { InfiniteGenerator } from '../world/generation/InfiniteGenerator';
import { recipeById } from '../crafting/recipes';
import { CameraSystem, type ViewMode } from '../input/CameraSystem';
import { InputSystem, type PadCommand } from '../input/InputSystem';
import { InteractionSystem, type InteractionMode } from '../input/InteractionSystem';
import { LightEngine } from '../lighting/LightEngine';
import { PlayerController } from '../physics/PlayerController';
import { isFluidAt } from '../physics/collision';
import { FluidSystem } from '../world/FluidSystem';
import { PostFx } from '../render/PostFx';
import { ChunkMesher } from '../render/ChunkMesher';
import { ChunkRenderer } from '../render/ChunkRenderer';
import { CloudLayer } from '../render/CloudLayer';
import { EnvironmentSystem } from '../render/EnvironmentSystem';
import { GhostPreview } from '../render/GhostPreview';
import { ParticleSystem } from '../render/ParticleSystem';
import { TextureAtlas } from '../render/TextureAtlas';
import { ToolRegistry } from '../tools/ToolRegistry';
import { exposeTools } from '../tools/webmcp';
import { registerCoreTools } from '../tools/coreTools';
import { registerBuildTools } from '../tools/buildTools';
import { ChunkManager, type ChunkStorage } from '../world/ChunkManager';
import { CHUNK_SIZE, toChunkCoord, toLocal } from '../world/coords';
import { createGenerator } from '../world/generation/createGenerator';
import type { GeneratorConfig, WorldGenerator } from '../world/generation/Generator';
import { VoxelWorld } from '../world/VoxelWorld';
import { VISUAL_MODES, type VisualModeDefinition } from '../../shaders/visualModes';
import { setBodyStyle } from '../entities/bodies';
import { classifyGpu, pickProfile, probeGraphics, type DeviceProfile, type GpuClass } from './deviceProfile';
import { VEHICLE_KINDS, VEHICLE_LABELS, type VehicleKind } from '../entities/vehicles';
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
  /** The mouse got grabbed (desktop game controls) or let go. */
  onPointerLock?(locked: boolean): void;
  /** A game system threw; the loop skipped it for that frame and kept going. */
  onEngineError?(system: string, message: string): void;
  /** Cinema was too much for this device: the engine switched itself to a lighter mode. */
  onVisualModeFallback?(mode: VisualModeId, reason: string): void;
  /** Called when the last template block was written; persist that fact. */
  onTemplateApplied?(): void;
  /** The player tapped a pet or villager: open its panel. */
  onEntityTapped?(entity: { id: string; kind: string; name?: string; variant?: string }): void;
  /** A villager handed over a block: put it in the hotbar. */
  onGift?(blockId: number, label: string): void;
  /** A villager said something (chat reply or villager_say). */
  onVillagerSay?(villagerId: string, text: string): void;
  onFlyChanged?(flying: boolean): void;
  /** Something crafted: put it in the hotbar. */
  onCrafted?(blockId: number, label: string, count: number): void;
  /** Logic events the app may react to (a note block playing). */
  onLogicEvent?(event: LogicEvent): void;
};

export type EngineOptions = {
  container: HTMLElement;
  generator: GeneratorConfig;
  spawn: { x: number; y: number; z: number };
  player?: { x: number; y: number; z: number; yaw?: number; pitch?: number } | null;
  template?: TemplateBlock[] | null;
  storage: ChunkStorage | null;
  bridge: EngineBridge;
  settings: { visualMode: VisualModeId; timeMode: TimeMode; weather: WeatherMode; timeOfDay?: number; look?: Partial<PlayerLook> };
  audio?: Partial<AudioSettings>;
  /** Pets, villagers, and vehicles saved with the world. */
  entities?: StoredEntity[] | null;
  worldName?: string;
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
      renderStats: () => Record<string, unknown>;
      setPostFx: (on: boolean) => void;
      setPostFxOptions: (options: { ao?: boolean; bloom?: boolean; vignette?: boolean }) => void;
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
  readonly build: BuildTools;
  readonly logic: LogicSystem;
  readonly audio = new AudioSystem();
  readonly chat: ChatAgent;
  readonly tools = new ToolRegistry();
  readonly generator: WorldGenerator;
  readonly player: PlayerController;
  readonly camera: CameraSystem;
  private mesher: ChunkMesher;
  private jumpHeld = false;
  private sneakHeld = false;
  readonly fluids: FluidSystem;
  private postFx: PostFx;
  readonly environment: EnvironmentSystem;
  readonly entities: EntitySystem;
  readonly chunks: ChunkManager;
  readonly interaction: InteractionSystem;
  readonly input: InputSystem;
  readonly avatar: PlayerAvatar;
  readonly particles: ParticleSystem;
  readonly clouds: CloudLayer;
  readonly ghost: GhostPreview;
  readonly scene = new THREE.Scene();
  readonly renderer: THREE.WebGLRenderer;
  readonly loop = new GameLoop();
  readonly lowPower: boolean;
  /** The graphics chip's name and class, and the budgets picked for it. */
  readonly gpuName: string;
  readonly gpuClass: GpuClass;
  readonly profile: DeviceProfile;
  private pixelRatio = 1;
  /** A phone or tablet: smaller budgets, no post-processing. */
  readonly mobile: boolean;
  readonly spawn: { x: number; y: number; z: number };
  /** Set by tools: the engine walks the player toward this point. */
  autoWalk: { x: number; z: number } | null = null;
  /** The app persists sound settings changed through tools. */
  onAudioSettings: ((settings: AudioSettings) => void) | null = null;

  private atlas: TextureAtlas;
  private chunkRenderer: ChunkRenderer;
  private highlight: THREE.LineSegments;
  private templateByChunk = new Map<string, TemplateBlock[]>();
  private settled = false;
  private disposeTools: () => void;
  private disposed = false;

  constructor(private options: EngineOptions) {
    const { container, bridge } = options;
    const probe = probeGraphics();
    const forced = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('power') : null;
    this.gpuName = probe.name;
    this.gpuClass = forced === 'high' ? 'discrete' : classifyGpu(probe.name);
    this.lowPower = forced !== 'high' && (!probe.webgl || this.gpuClass === 'software');
    this.mobile = Engine.detectMobile();
    this.profile = pickProfile(this.gpuClass, this.mobile);
    this.renderer = Engine.createRenderer(!this.lowPower);
    // Fill rate is the first thing a small GPU runs out of: cap the canvas resolution by device class.
    this.pixelRatio = Math.min(window.devicePixelRatio, this.profile.pixelRatioCap);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.shadowMap.enabled = !this.lowPower;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.generator = createGenerator(options.generator);
    this.spawn = options.spawn;
    this.world = new VoxelWorld(registry);
    this.history = new CommandHistory(this.world);
    this.build = new BuildTools(this.world, registry, this.history);
    this.build.onHint = (message) => bridge.toast(message);
    this.logic = new LogicSystem(this.world, registry);
    this.fluids = new FluidSystem(this.world, registry);
    const lighting = new LightEngine(this.world, registry);
    this.atlas = new TextureAtlas();
    const mesher = new ChunkMesher(this.world, registry, this.atlas);
    this.mesher = mesher;

    this.environment = new EnvironmentSystem(this.scene, this.renderer, VISUAL_MODES[options.settings.visualMode], !this.lowPower);
    this.environment.maxShadowMap = this.profile.shadowMap;
    this.environment.bakeSeconds = this.profile.bakeSeconds;
    this.applyProfileCadence();
    this.atlas.hiResScale = this.profile.hiResScale;
    this.atlas.anisotropy = this.profile.anisotropy;
    this.renderer.domElement.addEventListener('webglcontextlost', (event) => {
      event.preventDefault();
      this.fallbackFromCinema('The graphics memory ran out');
    });
    this.environment.setTimeMode(options.settings.timeMode);
    this.environment.setWeather(options.settings.weather);
    if (options.settings.timeOfDay !== undefined) this.environment.setTime(options.settings.timeOfDay);

    this.chunkRenderer = new ChunkRenderer(this.atlas, this.environment.dayLight, !this.lowPower);
    this.scene.add(this.chunkRenderer.group);

    const start = options.player ?? options.spawn;
    this.player = new PlayerController(this.world, registry, start);
    this.input = new InputSystem(this.renderer.domElement);
    this.camera = new CameraSystem(this.player, this.input.frame, this.world, registry);
    // A real mouse on a desktop plays like a desktop block game: click to grab, look freely.
    this.input.mouseMode = !this.mobile && typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches ? 'game' : 'tap';
    this.input.onPointerLock = (locked) => bridge.onPointerLock?.(locked);
    this.player.current = (x, y, z) => this.fluids.current(x, y, z);
    if (options.player?.yaw !== undefined) this.camera.yaw = options.player.yaw;
    if (options.player?.pitch !== undefined) this.camera.pitch = options.player.pitch;
    this.camera.onViewModeChange((mode) => {
      this.avatar.showBody = mode === 'third';
      bridge.onViewModeChange(mode);
    });
    this.scene.add(this.camera.camera);
    this.avatar = new PlayerAvatar(this.scene, this.player, this.camera.camera, { ...DEFAULT_LOOK_IMPORT, ...(options.settings.look ?? {}) });
    this.entities = new EntitySystem(this.scene, this.world, registry, this.player);
    this.entities.timeOfDay = () => this.environment.time;
    this.entities.onWorkBlock = (x, y, z, id) => {
      this.particles.burst(x, y, z, registry.get(id)?.color ?? '#ffffff', 6, 0.4);
      this.audio.play('place', 3);
    };
    this.entities.onWorkDone = (entity, command) => {
      this.history.record(command);
      this.audio.play('craft');
      bridge.toast(`🔨 ${entity.name ?? 'Your friend'} finished building! (Undo works too.)`);
    };
    this.particles = new ParticleSystem(this.scene);
    this.logic.pressers = () => {
      const boxes = [this.player.box()];
      for (const e of this.entities.entities) {
        if (e.vehicle || e.kind === 'pet' || e.kind === 'villager') boxes.push({ minX: e.x - 0.4, minY: e.y - 0.1, minZ: e.z - 0.4, maxX: e.x + 0.4, maxY: e.y + 0.5, maxZ: e.z + 0.4 });
      }
      return boxes;
    };
    this.logic.onEvent((event) => {
      if (event.kind === 'note') {
        this.particles.burst(event.x, event.y + 1, event.z, '#ffd94a', 6, 0.4);
        this.audio.playNote(event.pitch);
      }
      if (event.kind === 'piston') {
        this.particles.burst(event.x, event.y, event.z, '#9aa2ab', 6, 0.5);
        this.audio.play('piston');
      }
      bridge.onLogicEvent?.(event);
    });
    if (options.audio) this.audio.setSettings(options.audio);
    // Audio may only start from a user gesture; the first tap on the world is
    // one. Start it after the tap has been handled so the tap itself stays snappy.
    this.renderer.domElement.addEventListener('pointerdown', () => setTimeout(() => void this.audio.start(), 250), { passive: true });
    this.clouds = new CloudLayer(this.scene, options.generator.seed);
    this.postFx = new PostFx(this.renderer, this.scene, this.camera.camera);
    this.environment.onEnvMap((map) => {
      this.chunkRenderer.setEnvMap(map);
      setBodyStyle({ rounded: this.mesher.smooth, envMap: map });
    });

    this.chunks = new ChunkManager(this.world, this.generator, lighting, mesher, options.storage, {
      viewRadius: options.viewRadius ?? (this.lowPower ? 4 : 7),
      useWorker: options.useWorker ?? true,
    });
    this.chunks.onMeshes((chunk, meshes) => this.chunkRenderer.setMeshes(chunk, meshes));
    this.chunks.onChunkRemoved((key) => this.chunkRenderer.removeChunk(key));
    this.setTemplate(options.template ?? []);
    this.chunks.onFirstGenerate((chunk) => this.applyTemplate(chunk));
    if (options.settings.visualMode === 'cinema' && Engine.cinemaCrashedLastTime()) {
      // Do not walk into the same crash twice: start lighter and say so.
      options.settings.visualMode = 'ultraRealistic';
      this.environment.applyVisualMode(VISUAL_MODES.ultraRealistic);
      setTimeout(() => bridge.onVisualModeFallback?.('ultraRealistic', 'Cinema crashed last time on this device'), 0);
    }
    this.visualMode = options.settings.visualMode;
    this.applyRendering(VISUAL_MODES[options.settings.visualMode]);
    this.armProbation(options.settings.visualMode);

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

    this.interaction = new InteractionSystem(this.world, registry, this.input.frame, this.camera, this.player, {
      getSelectedBlockId: () => bridge.getSelectedBlockId(),
      getMode: () => bridge.getMode(),
      openPanel: (kind, payload) => bridge.openPanel(kind, payload),
      tapEntity: (ray) => {
        if (this.entities.mounted) {
          this.entities.dismount();
          return true;
        }
        const entity = this.entities.pick(ray);
        if (!entity) return false;
        if (entity.vehicle) {
          // Ride it yourself, or ask a friend to: the vehicle sheet decides.
          bridge.onEntityTapped?.({ id: entity.id, kind: entity.kind, name: entity.name, variant: entity.variant });
          return true;
        }
        this.entities.pet(entity);
        this.audio.play('happy');
        this.particles.burst(entity.x, entity.y + 0.6, entity.z, '#ffd94a', 10, 0.6);
        if (entity.kind === 'pet' || entity.kind === 'villager' || entity.kind === 'robot') bridge.onEntityTapped?.({ id: entity.id, kind: entity.kind, name: entity.name, variant: entity.variant });
        else bridge.onPet(entity.kind, entity.name);
        return true;
      },
      perform: (action, payload) => this.perform(action, payload),
      spawn: (spec, x, y, z) => this.spawnFromCard(spec, x, y, z),
      onBlockPlaced: (def, x, y, z) => {
        this.particles.burst(x, y, z, def.color, 10, 0.4);
        this.audio.play('place', def.category === 'ground' ? -5 : def.category === 'light' ? 7 : 0);
      },
      onBlockRemoved: (def, x, y, z) => {
        this.particles.burst(x, y, z, def.color, 16, 0.7);
        this.audio.play('remove');
      },
    }, this.build);
    this.ghost = new GhostPreview(this.scene, registry, this.interaction.state, () => bridge.getSelectedBlockId());

    const highlightGeometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02));
    this.highlight = new THREE.LineSegments(highlightGeometry, new THREE.LineBasicMaterial({ color: '#ffffff' }));
    this.highlight.visible = false;
    this.scene.add(this.highlight);

    this.loop
      .add(this.input)
      .add({ name: 'commands', update: () => this.dispatchCommands() })
      .add({ name: 'autowalk', update: () => this.driveAutoWalk() })
      .add({ name: 'player', update: (dt) => this.updatePlayer(dt) })
      .add(this.camera)
      .add(this.chunks)
      .add({ name: 'settle', update: () => this.settleWhenReady() })
      .add(this.interaction)
      .add(this.logic)
      .add(this.fluids)
      .add(this.ghost)
      .add(this.entities)
      .add(this.avatar)
      .add(this.particles)
      .add(this.clouds)
      .add(this.environment)
      .add(this.audio)
      .add({ name: 'mood', update: (_dt, elapsed) => this.updateMood(elapsed) })
      .add({ name: 'render', update: () => this.render() });

    this.chat = new ChatAgent({
      tools: this.tools,
      entities: this.entities,
      build: this.build,
      registry,
      player: () => this.playerState(),
      surface: (x, z) => this.world.height(x, z),
      say: (id, text) => bridge.onVillagerSay?.(id, text),
      world: () => ({
        timeOfDay: this.environment.time,
        weather: this.environment.weatherName,
        biome: this.generator instanceof InfiniteGenerator ? this.generator.biomeOf(Math.round(this.player.x), Math.round(this.player.z)) : 'town',
        worldName: this.options.worldName ?? 'My World',
      }),
    });
    this.disposeTools = exposeTools(this.tools, this.chat);
    registerCoreTools(this);
    registerBuildTools(this);
    registerLifeTools(this);
    registerAutomationTools(this);
    this.installDebugHooks();
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
    this.loop.onError = (system, error) => bridge.onEngineError?.(system, error instanceof Error ? `${error.message}\n${error.stack ?? ''}` : String(error));
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

  static detectMobile(): boolean {
    if (typeof window === 'undefined') return false;
    const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
    return coarse && Math.min(window.innerWidth, window.innerHeight) < 900;
  }

  /**
   * Three reads shader precision while it builds the renderer; on a context
   * that was lost before it started (Safari under memory pressure) that read
   * returns null and throws. Try again on a fresh canvas with the plainest
   * settings before giving up with a clear message.
   */
  static createRenderer(antialias: boolean): THREE.WebGLRenderer {
    const attempts: THREE.WebGLRendererParameters[] = [
      { antialias, powerPreference: 'high-performance' },
      { antialias: false, powerPreference: 'default' },
      { antialias: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false },
    ];
    let lastError: unknown = null;
    for (const params of attempts) {
      try {
        const canvas = document.createElement('canvas');
        const gl = (canvas.getContext('webgl2', params) ?? canvas.getContext('webgl', params)) as WebGL2RenderingContext | WebGLRenderingContext | null;
        if (!gl || gl.isContextLost() || !gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT)) continue;
        return new THREE.WebGLRenderer({ ...params, canvas, context: gl as WebGL2RenderingContext });
      } catch (error) {
        lastError = error;
      }
    }
    throw new Error(`Graphics could not start${lastError instanceof Error ? ` (${lastError.message})` : ''}. Close other tabs and reload.`);
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
    if (!this.entitiesRestored) {
      this.entitiesRestored = true;
      this.entities.restore(this.options.entities ?? []);
    }
  }

  private gamepadWasActive = false;

  private dispatchCommands(): void {
    const active = this.input.frame.gamepadActive;
    if (active !== this.gamepadWasActive) {
      this.gamepadWasActive = active;
      this.options.bridge.onGamepadActive?.(active);
    }
    if (this.input.frame.pressed.has('x')) this.dance();
    for (const command of this.input.frame.commands) {
      if (command === 'fly_toggle') this.setFlying(!this.player.flying);
      else if (command === 'toggle_view') this.camera.toggleViewMode();
      else if (command === 'rotate') this.build.rotateClipboard();
      else if (command === 'zoom_cycle') this.camera.cycleZoom();
      else this.options.bridge.onCommand?.(command);
    }
    // In first person a controller "tap" aims at the crosshair; in third
    // person aim at the screen center too (the reticle the HUD shows).
    if (this.input.frame.gamepadActive && !this.input.frame.hover) {
      this.input.frame.hover = { ndcX: 0, ndcY: 0 };
    }
  }

  private lastMoodAt = -10;
  private updateMood(elapsed: number): void {
    if (elapsed - this.lastMoodAt < 2) return;
    this.lastMoodAt = elapsed;
    const biome = this.generator instanceof InfiniteGenerator ? this.generator.biomeOf(Math.round(this.player.x), Math.round(this.player.z)) : 'meadow';
    this.audio.setMood(biome, this.environment.time);
  }

  private updatePlayer(dt: number): void {
    const f = this.input.frame;
    const wasOnGround = this.player.onGround;
    if (this.entities.mounted) {
      this.entities.driveInput = { forward: f.forward, back: f.back, left: f.left, right: f.right, up: f.jump, down: f.sneak, boost: f.sprint };
      // Space hops out of ground rides; aircraft use Jump to climb, so they hop out with E (or a tap).
      const flies = this.entities.mounted.vehicle?.flies ?? false;
      if (f.pressed.has('e') || (!flies && f.pressed.has(' '))) this.entities.dismount();
      // The camera settles behind the vehicle unless the kid is dragging to look.
      const vehicle = this.entities.mounted.vehicle;
      if (vehicle && f.lookDX === 0 && f.lookDY === 0) {
        const wanted = vehicle.yaw - Math.PI / 2;
        let delta = wanted - this.camera.yaw;
        while (delta > Math.PI) delta -= Math.PI * 2;
        while (delta < -Math.PI) delta += Math.PI * 2;
        this.camera.yaw += delta * Math.min(1, dt * 3);
      }
      return;
    }
    this.entities.driveInput = null;
    // Standing on a lift: a Jump or Sneak press picks the next floor (edges, not holds).
    const upPressed = f.jump && !this.jumpHeld;
    const downPressed = f.sneak && !this.sneakHeld;
    this.jumpHeld = f.jump;
    this.sneakHeld = f.sneak;
    this.entities.liftInput = { up: upPressed && this.entities.ridingLift !== null, down: downPressed && this.entities.ridingLift !== null };
    const wasFlying = this.player.flying;
    this.player.update(dt, f, this.camera.yaw);
    if (wasFlying && !this.player.flying) this.options.bridge.onFlyChanged?.(false);
    if (this.player.moving && (this.player.onGround || this.player.inWater)) this.audio.step(this.loopElapsed(), this.player.inWater);
    if (wasOnGround && !this.player.onGround && this.player.vy > 0) this.audio.play('jump');
  }

  private perform(action: string, payload: unknown): void {
    const pos = (payload as { position?: { x: number; y: number; z: number } } | undefined)?.position;
    if (!pos) return;
    const { x, y, z } = pos;
    switch (action) {
      case 'sit':
        this.player.sitAt(x, y, z);
        this.audio.play('pop');
        this.options.bridge.toast('Ahh, comfy! Move to get up. 🪑');
        break;
      case 'cook':
        this.audio.play('sizzle');
        this.particles.burst(x, y + 0.7, z, '#ffb03c', 18, 0.5);
        this.options.bridge.toast('Sizzle sizzle! 🍳 Dinner is ready!');
        break;
      case 'splash':
        this.audio.play('splash');
        this.particles.burst(x, y + 0.6, z, '#7cc2f2', 16, 0.5);
        this.options.bridge.toast('Splish splash! 🚰');
        break;
      case 'switch':
      case 'switch_on':
      case 'switch_off':
      case 'click':
        this.audio.play('switch');
        this.particles.burst(x, y, z, '#fff3b0', 8, 0.5);
        break;
      case 'door':
        this.audio.play('door', (payload as { open?: boolean }).open ? 0 : -5);
        break;
      case 'press_button':
        this.audio.play('click');
        this.logic.pressButton(x, y, z);
        this.particles.burst(x, y, z, '#fff3b0', 6, 0.4);
        break;
      case 'note': {
        const pitch = (payload as { pitch?: number }).pitch ?? 0;
        this.particles.burst(x, y + 1, z, '#ffd94a', 6, 0.4);
        this.options.bridge.onLogicEvent?.({ kind: 'note', x, y, z, pitch });
        break;
      }
      default:
        break;
    }
  }

  private spawnFromCard(spec: { kind: 'vehicle' | 'pet' | 'villager' | 'robot'; variant: string }, x: number, y: number, z: number): boolean {
    if (spec.kind === 'vehicle' && (VEHICLE_KINDS as string[]).includes(spec.variant)) {
      const kind = spec.variant as VehicleKind;
      const e = this.entities.spawnVehicle(kind, x, y - 0.5, z);
      const info = VEHICLE_LABELS[kind];
      this.options.bridge.toast(kind === 'boat' ? '⛵ A boat! Put it on water and tap it.' : `${info.emoji} A ${info.label.toLowerCase()}! Tap it to ride.`);
      this.particles.burst(e.x, e.y + 0.5, e.z, '#ffffff', 14, 0.8);
      return true;
    }
    if (spec.kind === 'pet' && (spec.variant === 'dog' || spec.variant === 'cat')) {
      const e = this.entities.spawnPet(spec.variant, x, z);
      this.options.bridge.toast(`${spec.variant === 'dog' ? '🐶' : '🐱'} Meet ${e.name}! Tap to say hi.`);
      this.particles.burst(e.x, e.y + 0.5, e.z, '#f291bb', 14, 0.8);
      return true;
    }
    if (spec.kind === 'robot') {
      const e = this.entities.spawnRobot(x, y, z, undefined, [], this.options.bridge.getSelectedBlockId());
      this.options.bridge.toast('🤖 Beep boop! Tap the robot to program it.');
      this.particles.burst(e.x, e.y + 0.5, e.z, '#b8f0ff', 14, 0.8);
      return true;
    }
    if (spec.kind === 'villager') {
      const e = this.entities.spawnVillager('random', x, z);
      this.options.bridge.toast(`🧑 ${e.name} moved in! Tap to chat.`);
      this.particles.burst(e.x, e.y + 1, e.z, '#ffd94a', 14, 0.8);
      return true;
    }
    return false;
  }

  /** A villager conversation, from the panel or a tool. */
  talkTo(id: string, choice: 'hi' | 'gift' | 'play' | 'bye'): { line: string; gift?: number; giftLabel?: string } | null {
    const entity = this.entities.byId(id);
    if (!entity || entity.kind !== 'villager') return null;
    const reply = this.entities.talk(entity, choice);
    if (reply.gift !== undefined) {
      this.audio.play('gift');
      this.options.bridge.onGift?.(reply.gift, reply.giftLabel ?? 'a gift');
      this.particles.burst(entity.x, entity.y + 1.2, entity.z, '#ffd94a', 20, 0.6);
    }
    return reply;
  }

  /** Craft a recipe: sparkles, and the result goes to the hotbar. */
  craft(recipeId: string): boolean {
    const recipe = recipeById(recipeId);
    const def = recipe ? resolveBlockId(recipe.result) : undefined;
    if (!recipe || !def) return false;
    this.particles.burst(this.player.x, this.player.y + 1.4, this.player.z, def.color, 24, 1);
    this.audio.play('craft');
    this.options.bridge.onCrafted?.(def.numericId, def.label, recipe.count);
    return true;
  }

  /** The player dances for a few seconds; nearby friends join in. */
  /** A chat with a villager starts (they stop and face the child) or ends. */
  setTalking(villagerId: string, on: boolean): void {
    this.entities.setTalking(villagerId, on);
  }

  /** The player hops into a ride (from the vehicle sheet or a tool). */
  rideVehicle(id: string): boolean {
    const entity = this.entities.byId(id);
    if (!entity?.vehicle) return false;
    if (this.player.flying) this.setFlying(false);
    if (!this.entities.mount(entity)) return false;
    this.audio.play('vroom');
    const info = VEHICLE_LABELS[(entity.variant ?? 'car') as VehicleKind] ?? VEHICLE_LABELS.car;
    this.options.bridge.toast(`${info.emoji} ${info.hint}`);
    return true;
  }

  /** Creative flight on or off; kids double-tap jump or use the wing button. */
  setFlying(on: boolean): boolean {
    if (this.entities.mounted) return false;
    this.player.setFlying(on);
    this.options.bridge.onFlyChanged?.(on);
    if (on) this.options.bridge.toast('🪽 Flying! Hold Jump to go up, Sneak to come down.');
    return this.player.flying;
  }

  dance(seconds = 6): void {
    this.avatar.danceUntil = this.loopElapsed() + seconds;
    this.audio.play('happy');
    this.particles.burst(this.player.x, this.player.y + 1.5, this.player.z, '#f472b6', 18, 1);
    for (const e of this.entities.entities) {
      if (!e.vehicle && !e.robot && Math.hypot(e.x - this.player.x, e.z - this.player.z) < 6) this.entities.dance(e, seconds);
    }
  }

  /** Show a villager line in the UI. */
  sayAs(villagerId: string, text: string): void {
    this.options.bridge.onVillagerSay?.(villagerId, text);
  }

  /** Let an outside agent answer villager chats. */
  registerChatProvider(provider: ChatProvider | null): void {
    this.chat.registerProvider(provider);
  }

  setLook(look: Partial<PlayerLook>): void {
    this.avatar.setLook(look);
  }

  private entitiesRestored = false;

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

  private framesSinceBlocked = 0;

  /** Rolling frame timing for the debug overlay. */
  private perf = { fps: 0, frameMs: 0, last: 0 };
  /** Cinema steps itself down, one notch at a time, on any device that cannot hold it. */
  private quality = { tier: 0, since: 0, checkedAt: 0, radiusCut: 0, shadowEvery: 1 };
  private applyProfileCadence(): void {
    this.quality.shadowEvery = this.profile.shadowEvery;
  }
  static readonly QUALITY_TIERS = ['full', 'no post-processing', 'smaller canvas', 'lighter shadows', 'shorter draw distance', 'back to Ultra'] as const;

  get qualityTier(): string {
    return Engine.QUALITY_TIERS[this.quality.tier];
  }

  private setPixelRatio(ratio: number): void {
    this.pixelRatio = ratio;
    this.renderer.setPixelRatio(ratio);
    this.handleResize();
  }

  /**
   * Every mode steps down one notch at a time while the frame rate stays under 34:
   * post-processing off, a smaller canvas, lighter shadows, a shorter draw distance,
   * and for Cinema finally Ultra. Only down, never up, so nothing flickers.
   */
  private adaptQuality(now: number): void {
    if (this.input.blocked || !this.settled) {
      this.quality.since = now;
      return;
    }
    // Give the world five seconds to settle after any change, then judge every three.
    if (now - this.quality.since < 5000 || now - this.quality.checkedAt < 3000) return;
    this.quality.checkedAt = now;
    if (this.perf.fps >= 34) return;
    const cinema = this.visualMode === 'cinema';
    let tier = this.quality.tier + 1;
    if (tier === 1 && !this.postFx.enabled) tier = 2; // nothing to turn off
    if (tier === 2 && this.pixelRatio <= 1) tier = 3;
    if (tier === 5 && !cinema) return; // flat modes stop at the shortest draw distance
    if (tier > 5) return;
    this.quality.tier = tier;
    this.quality.since = now;
    if (tier === 1) this.postFx.setEnabled(false);
    else if (tier === 2) this.setPixelRatio(Math.max(1, this.pixelRatio - 0.25));
    else if (tier === 3) {
      this.environment.maxShadowMap = Math.min(this.environment.maxShadowMap, 1024);
      this.environment.bakeSeconds = Math.max(this.environment.bakeSeconds, 8);
      this.quality.shadowEvery = 2;
      this.environment.applyVisualMode(VISUAL_MODES[this.visualMode]);
    } else if (tier === 4) {
      this.quality.radiusCut = 2;
      this.chunks.options.viewRadius = Math.max(4, this.chunks.options.viewRadius - 2);
    } else if (tier === 5) {
      this.fallbackFromCinema(`This device could not hold Cinema at ${Math.round(this.perf.fps)} fps`);
      return;
    }
    this.options.bridge.toast(`⚙️ Eased off (${Engine.QUALITY_TIERS[tier]}) to keep things smooth.`);
  }
  private shadowFrame = 0;

  private render(): void {
    const now = performance.now();
    if (this.perf.last > 0) {
      const ms = now - this.perf.last;
      this.perf.frameMs += (ms - this.perf.frameMs) * 0.1;
      this.perf.fps = 1000 / Math.max(1, this.perf.frameMs);
    }
    this.perf.last = now;
    this.renderer.info.autoReset = false;
    this.renderer.info.reset();
    this.adaptQuality(now);
    // Phones refresh the sun shadow every third frame; nobody notices, the GPU does.
    if (this.renderer.shadowMap.enabled) {
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.shadowMap.needsUpdate = this.shadowFrame++ % this.quality.shadowEvery === 0;
    }
    // A sheet is open: the world behind it is static. Skip GPU work so
    // phones with blurred glass panels do not crawl.
    if (this.input.blocked) {
      this.framesSinceBlocked += 1;
      if (this.framesSinceBlocked > 2) return;
    } else {
      this.framesSinceBlocked = 0;
    }
    const h = this.interaction.state.highlight ?? this.interaction.state.flash;
    if (h) {
      this.highlight.position.set(h.x, h.y, h.z);
      this.highlight.visible = true;
      (this.highlight.material as THREE.LineBasicMaterial).color.set(this.interaction.state.highlight ? '#ffffff' : '#ffd94a');
    } else {
      this.highlight.visible = false;
    }
    this.environment.setFocus(this.player.x, this.player.y, this.player.z);
    this.chunks.setViewDirection(-Math.sin(this.camera.yaw), -Math.cos(this.camera.yaw));
    const eye = this.camera.camera.position;
    this.environment.setUnderwater(isFluidAt(this.world, registry, eye.x, eye.y, eye.z));
    this.clouds.setFocus(this.player.x, this.player.z);
    // Gentle water shimmer.
    const water = this.chunkRenderer.materials.water as THREE.MeshLambertMaterial;
    water.opacity = 0.78 + Math.sin(this.loopElapsed() * 1.4) * 0.06;
    this.chunkRenderer.time.value = this.loopElapsed();
    // See-through camera: in third person, blocks between the camera and the kid fade away.
    const cut = this.chunkRenderer.cutaway;
    cut.cutFrom.value.copy(this.camera.camera.position);
    cut.cutTo.value.set(this.player.x, this.player.y + 1.0, this.player.z);
    cut.cutRadius.value = this.camera.viewMode === 'third' ? 1.4 : 0;
    try {
      if (this.postFx.enabled) this.postFx.render();
      else this.renderer.render(this.scene, this.camera.camera);
    } catch (error) {
      this.fallbackFromCinema(`Drawing failed (${error instanceof Error ? error.message : String(error)})`);
    }
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
    this.postFx.resize(width, height);
  };

  // --- Public API for the app layer -----------------------------------------

  setViewMode(mode: ViewMode): void {
    this.camera.setViewMode(mode, false);
    this.avatar.showBody = mode === 'third';
  }

  /** Zoom in (negative) or out (positive) by a few blocks. */
  zoom(delta: number): void {
    this.camera.zoom(delta);
  }

  setVisualMode(mode: VisualModeId): void {
    const def = VISUAL_MODES[mode];
    try {
      this.environment.applyVisualMode(def);
      this.applyRendering(def);
      this.visualMode = mode;
      this.quality = { tier: 0, since: performance.now(), checkedAt: 0, radiusCut: 0, shadowEvery: this.profile.shadowEvery };
      this.armProbation(mode);
    } catch (error) {
      this.fallbackFromCinema(`Cinema could not start (${error instanceof Error ? error.message : String(error)})`);
    }
  }

  private visualMode: VisualModeId = 'classic';
  private probationTimer: ReturnType<typeof setTimeout> | null = null;
  private static PROBATION_KEY = 'mindcraft-cinema-probation';

  /**
   * A crash-loop guard: Cinema marks itself "on probation" for ten seconds.
   * If the page dies before that (Safari reloads a tab that runs out of
   * memory), the next start refuses Cinema and explains why.
   */
  private armProbation(mode: VisualModeId): void {
    if (this.probationTimer) clearTimeout(this.probationTimer);
    this.probationTimer = null;
    try {
      if (mode !== 'cinema') {
        localStorage.removeItem(Engine.PROBATION_KEY);
        return;
      }
      localStorage.setItem(Engine.PROBATION_KEY, String(Date.now()));
      this.probationTimer = setTimeout(() => {
        try {
          localStorage.removeItem(Engine.PROBATION_KEY);
        } catch {
          // Private mode: nothing to clear.
        }
      }, 10000);
    } catch {
      // Private mode: no guard, no harm.
    }
  }

  /** Did the last Cinema session die within its first ten seconds? */
  static cinemaCrashedLastTime(): boolean {
    try {
      return localStorage.getItem(Engine.PROBATION_KEY) !== null;
    } catch {
      return false;
    }
  }

  private fallbackFromCinema(reason: string): void {
    if (this.visualMode !== 'cinema' && !VISUAL_MODES[this.options.settings.visualMode].rendering.pbr) return;
    const mode: VisualModeId = 'ultraRealistic';
    try {
      localStorage.removeItem(Engine.PROBATION_KEY);
      this.environment.applyVisualMode(VISUAL_MODES[mode]);
      this.applyRendering(VISUAL_MODES[mode]);
      this.visualMode = mode;
    } catch {
      // Even the fallback failed: the page is in trouble; the bridge still hears about it.
    }
    this.options.bridge.onVisualModeFallback?.(mode, reason);
  }

  /** Materials, smooth surfaces, rounded bodies, and draw distance for a mode. */
  private applyRendering(def: VisualModeDefinition): void {
    const pbr = def.rendering.pbr && !this.lowPower;
    this.renderer.shadowMap.type = pbr && (this.gpuClass === 'discrete' || this.gpuClass === 'apple') ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.chunkRenderer.setPbr(pbr);
    this.clouds.setVisible(!pbr);
    this.postFx.setEnabled(pbr && def.rendering.postFx && this.profile.postFx);
    this.chunks.options.viewRadius = this.profile.viewRadius + Math.min(this.profile.cinemaBonus, def.rendering.viewRadiusBonus) - this.quality.radiusCut;
    const smooth = pbr && def.rendering.smooth;
    setBodyStyle({ rounded: smooth });
    if (this.mesher.smooth !== smooth) {
      this.mesher.smooth = smooth;
      for (const chunk of this.world.allChunks()) chunk.setDirty();
    }
    if (this.avatar && this.avatar.rounded !== smooth) this.avatar.setLook({});
  }

  setTimeMode(mode: TimeMode): void {
    this.environment.setTimeMode(mode);
  }

  setWeather(weather: WeatherMode): void {
    this.environment.setWeather(weather);
  }

  /** Mirror every edit across the player's current x, or turn it off. */
  setMirror(enabled: boolean): void {
    this.build.setMirror(enabled ? Math.round(this.player.x) : null);
  }

  /** Block the world input while a panel is open. */
  setInputBlocked(blocked: boolean): void {
    if (blocked) this.input.releasePointer();
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
      renderStats: () => ({
        pbr: this.chunkRenderer.isPbr,
        smooth: this.mesher.smooth,
        postFx: this.postFx.enabled,
        meshes: this.chunkRenderer.meshCount,
        envMap: this.environment.envMap !== null,
        fps: Math.round(this.perf.fps),
        frameMs: Math.round(this.perf.frameMs * 10) / 10,
        drawCalls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        meshJobs: this.chunks.meshJobsInFlight,
        meshedInWorker: this.chunks.meshedInWorker,
        mobile: this.mobile,
        lowPower: this.lowPower,
        quality: this.qualityTier,
        gpu: this.gpuName,
        gpuClass: this.gpuClass,
        profile: this.profile.name,
        pixelRatio: this.pixelRatio,
      }),
      setPostFx: (on) => this.postFx.setEnabled(on),
      setPostFxOptions: (options) => this.postFx.setOptions(options),
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
