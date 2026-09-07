import type { StoredWorld } from '../../storage/db';
import type { InteractionMode, SaveState, TimeMode, VisualModeId, WeatherMode } from '../../types/game';

export type PanelId = 'none' | 'menu' | 'container' | 'sleep' | 'palette' | 'worlds' | 'blueprints' | 'pet' | 'villager' | 'dressup';
export type ViewMode = 'third' | 'first';
export type WorldPreset = 'meadow' | 'toyland';

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
  viewMode: ViewMode;
  mode: InteractionMode;
  canUndo: boolean;
  canRedo: boolean;
  /** A game controller is in use: show a reticle in third person too. */
  controllerActive: boolean;
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
  setHistoryState: (canUndo: boolean, canRedo: boolean) => void;
  setControllerActive: (active: boolean) => void;
  setMirror: (enabled: boolean) => void;
  nextTool: () => void;
  /** Load a blueprint into the clipboard and switch to paste mode. */
  selectBlueprint: (id: string) => void;
  /** A villager handed over a block. */
  receiveGift: (blockId: number, label: string) => void;
  undo: () => void;
  redo: () => void;
  petAnimal: (kind: string, name?: string) => void;
  sleepUntilMorning: () => void;
};

export type PlayerLookState = { shirt: string; pants: string; skin: string; hair: string; hat: 'none' | 'cap' | 'crown' | 'cowboy' | 'party' };

export type SettingsSlice = {
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
