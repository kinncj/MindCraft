import type { StoredWorld } from '../../storage/db';
import type { InteractionMode, SaveState, TimeMode, VisualModeId, WeatherMode } from '../../types/game';

export type PanelId = 'none' | 'menu' | 'container' | 'sleep' | 'palette' | 'worlds' | 'blueprints' | 'pet' | 'villager' | 'dressup' | 'crafting' | 'robot' | 'vehicle';
export type ViewMode = 'third' | 'first';
export type WorldPreset = 'meadow' | 'toyland' | 'town';

export type WorldSlice = {
  ready: boolean;
  initStarted: boolean;
  storageAvailable: boolean;
  saveState: SaveState;
  worlds: StoredWorld[];
  currentWorldId: string | null;
  worldName: string;
  init: () => Promise<void>;
  createWorld: (name: string, preset: WorldPreset) => Promise<void>;
  openWorld: (id: string) => Promise<void>;
  deleteWorld: (id: string) => Promise<void>;
  renameWorld: (id: string, name: string) => Promise<void>;
  resetWorld: (preset?: WorldPreset) => Promise<void>;
  markDirty: () => void;
  saveNow: () => Promise<void>;
  exportWorld: () => Promise<void>;
  importWorldFromText: (text: string) => Promise<{ ok: boolean; error?: string }>;
  /** The current world's record, for mounting the engine. */
  currentWorld: () => StoredWorld | null;
};

export type UiSlice = {
  openPanel: PanelId;
  panelPayload: unknown;
  toast: string | null;
  /** Recent errors (game loop, window, promises) for the debug overlay. */
  errors: Array<{ at: number; where: string; message: string }>;
  recordError: (where: string, message: string) => void;
  viewMode: ViewMode;
  mode: InteractionMode;
  canUndo: boolean;
  canRedo: boolean;
  /** A game controller is in use: show a reticle in third person too. */
  controllerActive: boolean;
  /** The mouse is grabbed by the game (desktop controls). */
  pointerLocked: boolean;
  setPointerLocked: (locked: boolean) => void;
  /** Build-mode mirror across the player's x. */
  mirror: boolean;
  /** Bumped whenever a container's contents change, so panels re-render. */
  containerVersion: number;
  setOpenPanel: (panel: PanelId, payload?: unknown) => void;
  closePanels: () => void;
  showToast: (message: string) => void;
  setMode: (mode: InteractionMode) => void;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  zoom: (delta: number) => void;
  dance: () => void;
  /** Builds a famous place on open ground near the player. */
  buildMonument: (kind: string, text?: string) => void;
  /** Takes a picture of the world (no HUD) and saves it as a PNG. */
  takePhoto: () => Promise<void>;
  /** Creative flight (double-tap jump, or the wing button). */
  flying: boolean;
  toggleFly: () => void;
  setFlying: (flying: boolean) => void;
  setHistoryState: (canUndo: boolean, canRedo: boolean) => void;
  setControllerActive: (active: boolean) => void;
  setMirror: (enabled: boolean) => void;
  nextTool: () => void;
  /** Load a blueprint into the clipboard and switch to paste mode. */
  selectBlueprint: (id: string) => void;
  /** A villager handed over a block. */
  receiveGift: (blockId: number, label: string) => void;
  /** Something was crafted. */
  receiveCrafted: (blockId: number, label: string, count: number) => void;
  /** The latest thing each villager said, for the chat panel. */
  villagerLines: Record<string, Array<{ who: 'kid' | 'villager'; text: string }>>;
  pushVillagerLine: (id: string, who: 'kid' | 'villager', text: string) => void;
  undo: () => void;
  redo: () => void;
  petAnimal: (kind: string, name?: string) => void;
  sleepUntilMorning: () => void;
};

export type PlayerLookState = { shirt: string; pants: string; skin: string; hair: string; hat: 'none' | 'cap' | 'crown' | 'cowboy' | 'party'; style: 'boy' | 'girl' };

export type AudioState = { muted: boolean; music: boolean; volume: number };

export type SettingsSlice = {
  audio: AudioState;
  setAudio: (audio: Partial<AudioState>) => void;
  /** Let villager chats use the browser's built-in on-device model when it has one. */
  smartChat: boolean;
  setSmartChat: (on: boolean) => void;
  /** The downloadable helper model: a parent's choice, kept on the device. */
  /** `napping`: unloaded to free memory while Cinema runs on a phone or tablet; wakes when the look changes. */
  helper: { status: 'none' | 'loading' | 'downloading' | 'ready' | 'error' | 'napping'; progress: number; text: string; enabled: boolean; model: string };
  /** Pick a helper size (model id); a loaded helper is downloaded again at the new size. */
  setHelperModel: (id: string) => Promise<void>;
  /** Forget the helper: choice, size, cached files. Shown on the welcome screen. */
  resetHelper: () => Promise<void>;
  napHelper: () => Promise<void>;
  downloadHelper: () => Promise<void>;
  setHelperEnabled: (on: boolean) => void;
  removeHelper: () => Promise<void>;
  look: PlayerLookState;
  setLook: (look: Partial<PlayerLookState>) => void;
  visualMode: VisualModeId;
  timeMode: TimeMode;
  weather: WeatherMode;
  setVisualMode: (mode: VisualModeId) => void;
  setTimeMode: (mode: TimeMode) => void;
  setWeather: (weather: WeatherMode) => void;
};

export type InventorySlice = {
  selectedBlockType: string;
  hotbar: string[];
  hotbarIndex: number;
  selectBlockType: (id: string) => void;
  selectSlot: (index: number) => void;
  setHotbarSlot: (index: number, id: string) => void;
  /** Container (Magic Delivery Box) contents live in the world; these edit them. */
  addItemToBox: (pos: { x: number; y: number; z: number }, blockType: string) => void;
  takeItemFromBox: (pos: { x: number; y: number; z: number }, blockType: string) => void;
  clearBox: (pos: { x: number; y: number; z: number }) => void;
  renameBox: (pos: { x: number; y: number; z: number }, name: string) => void;
};

export type GameState = WorldSlice & UiSlice & SettingsSlice & InventorySlice;
