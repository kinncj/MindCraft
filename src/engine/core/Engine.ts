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
  /** The player tapped a pet or villager: open its panel. */
  onEntityTapped?(entity: { id: string; kind: string; name?: string; variant?: string }): void;
  /** A villager handed over a block: put it in the hotbar. */
  onGift?(blockId: number, label: string): void;
  /** A villager said something (chat reply or villager_say). */
  onVillagerSay?(villagerId: string, text: string): void;
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
    this.build = new BuildTools(this.world, registry, this.history);
    this.build.onHint = (message) => bridge.toast(message);
    this.logic = new LogicSystem(this.world, registry);
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
          this.entities.mount(entity);
          this.audio.play('vroom');
          bridge.toast(entity.variant === 'boat' ? '⛵ All aboard! Tap the boat again to hop off.' : '🚗 Vroom! Tap the car again to hop out.');
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
      if (command === 'toggle_view') this.camera.toggleViewMode();
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
      this.entities.driveInput = { forward: f.forward, back: f.back, left: f.left, right: f.right };
      if (f.pressed.has(' ')) this.entities.dismount();
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
    this.player.update(dt, f, this.camera.yaw);
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
    if (spec.kind === 'vehicle' && (spec.variant === 'car' || spec.variant === 'boat')) {
      const e = this.entities.spawnVehicle(spec.variant, x, y - 0.5, z);
      this.options.bridge.toast(spec.variant === 'car' ? '🚗 A car! Tap it to drive.' : '⛵ A boat! Put it on water and tap it.');
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

  private render(): void {
    // A sheet is open: the world behind it is static. Skip GPU work so
    // phones with blurred glass panels do not crawl.
    if (this.input.blocked) {
      this.framesSinceBlocked += 1;
      if (this.framesSinceBlocked > 2) return;
    } else {
      this.framesSinceBlocked = 0;
    }
    const h = this.interaction.state.highlight;
    if (h) {
      this.highlight.position.set(h.x, h.y, h.z);
      this.highlight.visible = true;
    } else {
      this.highlight.visible = false;
    }
    this.environment.setFocus(this.player.x, this.player.y, this.player.z);
    this.clouds.setFocus(this.player.x, this.player.z);
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

  /** Zoom in (negative) or out (positive) by a few blocks. */
  zoom(delta: number): void {
    this.camera.zoom(delta);
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

  /** Mirror every edit across the player's current x, or turn it off. */
  setMirror(enabled: boolean): void {
    this.build.setMirror(enabled ? Math.round(this.player.x) : null);
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
