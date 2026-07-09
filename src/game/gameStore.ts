import { create } from 'zustand';
import type {
  BlockPosition,
  BlockTypeId,
  InteractionMode,
  MagicDeliveryBox,
  PlacedBlock,
  SaveState,
  TimeMode,
  VisualModeId,
  WeatherMode,
} from '../types/game';
import { WORLD_SIZE, isInsideWorld, makeBlock, newBlockId, positionKey } from './engine/world';
import { createStarterWorld, createToyLandWorld } from './engine/starterWorld';
import { db } from '../storage/db';
import { WorldRepository } from '../storage/worldRepository';
import { SettingsRepository, DEFAULT_SETTINGS } from '../storage/settingsRepository';
import { buildWorldExport, downloadWorldExport } from '../importExport/exportWorld';
import { parseWorldImportFile } from '../importExport/validateWorldImport';

export type PanelId = 'none' | 'inventory' | 'magic-box' | 'menu';
export type ViewMode = 'third' | 'first';
export type WorldPreset = 'meadow' | 'toyland';

export type GameState = {
  ready: boolean;
  initStarted: boolean;
  storageAvailable: boolean;
  blocks: Record<string, PlacedBlock>;
  boxes: MagicDeliveryBox[];
  worldName: string;
  selectedBlockType: BlockTypeId;
  mode: InteractionMode;
  saveState: SaveState;
  openPanel: PanelId;
  activeBoxId: string | null;
  toast: string | null;
  viewMode: ViewMode;
  visualMode: VisualModeId;
  timeMode: TimeMode;
  weather: WeatherMode;

  init: () => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  setVisualMode: (mode: VisualModeId) => void;
  setTimeMode: (mode: TimeMode) => void;
  setWeather: (weather: WeatherMode) => void;
  petAnimal: (kind: string) => void;
  selectBlockType: (type: BlockTypeId) => void;
  setMode: (mode: InteractionMode) => void;
  placeBlockAt: (pos: BlockPosition) => PlacedBlock | null;
  removeBlockAt: (pos: BlockPosition) => PlacedBlock | null;
  openBoxAt: (pos: BlockPosition) => void;
  setOpenPanel: (panel: PanelId) => void;
  closePanels: () => void;
  renameBox: (boxId: string, name: string) => void;
  addItemToBox: (boxId: string, blockType: BlockTypeId) => void;
  takeItemFromBox: (boxId: string, blockType: BlockTypeId) => void;
  clearBox: (boxId: string) => void;
  resetWorld: (preset?: WorldPreset) => Promise<void>;
  exportWorld: () => void;
  importWorldFromText: (text: string) => Promise<{ ok: boolean; error?: string }>;
  showToast: (message: string) => void;
};

const worldRepository = new WorldRepository(db);
const settingsRepository = new SettingsRepository(db);

function toRecord(blocks: PlacedBlock[]): Record<string, PlacedBlock> {
  const record: Record<string, PlacedBlock> = {};
  for (const block of blocks) {
    record[positionKey(block.position)] = block;
  }
  return record;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
// Every change bumps this. A finishing save may only report "saved" if no
// newer change happened while it was writing — otherwise a slow in-flight
// save would claim "Saved" for a world state it never saw.
let changeSeq = 0;

export const useGameStore = create<GameState>((set, get) => {
  function scheduleAutosave(): void {
    const { storageAvailable } = get();
    if (!storageAvailable) return;
    changeSeq += 1;
    set({ saveState: 'saving' });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const seqAtStart = changeSeq;
      const state = get();
      try {
        await worldRepository.saveWorld(Object.values(state.blocks), state.boxes);
        await settingsRepository.saveSettings({
          worldName: state.worldName,
          selectedBlockType: state.selectedBlockType,
          visualMode: state.visualMode,
          timeMode: state.timeMode,
          weather: state.weather,
        });
        if (changeSeq === seqAtStart) {
          set({ saveState: 'saved' });
        }
      } catch {
        set({ saveState: 'error', storageAvailable: false });
      }
    }, 600);
  }

  return {
    ready: false,
    initStarted: false,
    storageAvailable: true,
    blocks: {},
    boxes: [],
    worldName: DEFAULT_SETTINGS.worldName,
    selectedBlockType: DEFAULT_SETTINGS.selectedBlockType,
    mode: 'place',
    saveState: 'idle',
    openPanel: 'none',
    activeBoxId: null,
    toast: null,
    viewMode: 'third',
    visualMode: DEFAULT_SETTINGS.visualMode,
    timeMode: DEFAULT_SETTINGS.timeMode,
    weather: DEFAULT_SETTINGS.weather,

    setVisualMode(mode) {
      set({ visualMode: mode });
      scheduleAutosave();
      if (mode === 'claudeDream') get().showToast('Welcome to the dream world! ✨');
    },

    setTimeMode(mode) {
      set({ timeMode: mode });
      scheduleAutosave();
    },

    setWeather(weather) {
      set({ weather });
      scheduleAutosave();
    },

    petAnimal(kind) {
      const messages: Record<string, string> = {
        bunny: '🐰 Boing! The bunny loves you!',
        chick: '🐤 Cheep cheep! So happy!',
        butterfly: '🦋 The butterfly does a twirl!',
      };
      get().showToast(messages[kind] ?? '💛 Your friend is happy!');
    },

    setViewMode(mode) {
      set({ viewMode: mode });
    },

    toggleViewMode() {
      const next = get().viewMode === 'third' ? 'first' : 'third';
      set({ viewMode: next });
      get().showToast(next === 'first' ? 'Looking through your own eyes! 👀' : 'Back behind you! 🧍');
    },

    async init() {
      // StrictMode mounts effects twice; a second init racing the first
      // would overwrite live state with a fresh starter world. The flag
      // is set synchronously, so the second call bails immediately.
      if (get().initStarted) return;
      set({ initStarted: true });
      try {
        const saved = await worldRepository.loadWorld();
        const settings = await settingsRepository.loadSettings();
        const settingsState = {
          worldName: settings.worldName,
          selectedBlockType: settings.selectedBlockType,
          visualMode: settings.visualMode,
          timeMode: settings.timeMode,
          weather: settings.weather,
        };
        if (saved) {
          set({
            ready: true,
            blocks: toRecord(saved.blocks),
            boxes: saved.boxes,
            saveState: 'saved',
            ...settingsState,
          });
        } else {
          const starter = createStarterWorld();
          set({
            ready: true,
            blocks: toRecord(starter.blocks),
            boxes: starter.boxes,
            ...settingsState,
          });
          scheduleAutosave();
        }
      } catch {
        // IndexedDB blocked or broken: still let the kid play, just warn
        // that nothing will be remembered.
        const starter = createStarterWorld();
        set({
          ready: true,
          storageAvailable: false,
          saveState: 'error',
          blocks: toRecord(starter.blocks),
          boxes: starter.boxes,
        });
      }
    },

    selectBlockType(type) {
      set({ selectedBlockType: type, mode: 'place' });
      scheduleAutosave();
    },

    setMode(mode) {
      set({ mode });
    },

    placeBlockAt(pos) {
      const state = get();
      if (!isInsideWorld(pos, WORLD_SIZE)) return null;
      const key = positionKey(pos);
      if (state.blocks[key]) return null;
      const block = makeBlock(state.selectedBlockType, pos);
      const nextBoxes =
        block.type === 'magic-box'
          ? [
              ...state.boxes,
              { id: newBlockId(), name: 'Magic Delivery Box', position: pos, items: [] },
            ]
          : state.boxes;
      set({ blocks: { ...state.blocks, [key]: block }, boxes: nextBoxes });
      scheduleAutosave();
      return block;
    },

    removeBlockAt(pos) {
      const state = get();
      const key = positionKey(pos);
      const block = state.blocks[key];
      if (!block) return null;
      // Keep the floor level in place so the world never becomes a void
      // the kid can fall through visually. Ground blocks can be recolored
      // by placing on top instead.
      const nextBlocks = { ...state.blocks };
      delete nextBlocks[key];
      const nextBoxes =
        block.type === 'magic-box'
          ? state.boxes.filter((box) => positionKey(box.position) !== key)
          : state.boxes;
      set({ blocks: nextBlocks, boxes: nextBoxes });
      scheduleAutosave();
      return block;
    },

    openBoxAt(pos) {
      const state = get();
      const key = positionKey(pos);
      const box = state.boxes.find((b) => positionKey(b.position) === key);
      if (box) {
        set({ openPanel: 'magic-box', activeBoxId: box.id });
      }
    },

    setOpenPanel(panel) {
      set({ openPanel: panel, activeBoxId: panel === 'magic-box' ? get().activeBoxId : null });
    },

    closePanels() {
      set({ openPanel: 'none', activeBoxId: null });
    },

    renameBox(boxId, name) {
      const trimmed = name.trim().slice(0, 60);
      if (!trimmed) return;
      set({
        boxes: get().boxes.map((box) => (box.id === boxId ? { ...box, name: trimmed } : box)),
      });
      scheduleAutosave();
    },

    addItemToBox(boxId, blockType) {
      set({
        boxes: get().boxes.map((box) => {
          if (box.id !== boxId) return box;
          const existing = box.items.find((item) => item.blockType === blockType);
          const items = existing
            ? box.items.map((item) =>
                item.blockType === blockType ? { ...item, quantity: item.quantity + 1 } : item,
              )
            : [...box.items, { blockType, quantity: 1 }];
          return { ...box, items };
        }),
      });
      scheduleAutosave();
    },

    takeItemFromBox(boxId, blockType) {
      const state = get();
      const box = state.boxes.find((b) => b.id === boxId);
      const item = box?.items.find((i) => i.blockType === blockType);
      if (!box || !item || item.quantity <= 0) return;
      set({
        selectedBlockType: blockType,
        boxes: state.boxes.map((b) => {
          if (b.id !== boxId) return b;
          return {
            ...b,
            items: b.items
              .map((i) => (i.blockType === blockType ? { ...i, quantity: i.quantity - 1 } : i))
              .filter((i) => i.quantity > 0),
          };
        }),
      });
      scheduleAutosave();
    },

    clearBox(boxId) {
      set({
        boxes: get().boxes.map((box) => (box.id === boxId ? { ...box, items: [] } : box)),
      });
      scheduleAutosave();
    },

    async resetWorld(preset = 'meadow') {
      if (saveTimer) clearTimeout(saveTimer);
      const starter = preset === 'toyland' ? createToyLandWorld() : createStarterWorld();
      try {
        await worldRepository.clearWorld();
      } catch {
        // Storage may be unavailable; resetting the in-memory world still works.
      }
      set({
        blocks: toRecord(starter.blocks),
        boxes: starter.boxes,
        selectedBlockType: DEFAULT_SETTINGS.selectedBlockType,
        worldName: preset === 'toyland' ? 'Toy Land' : DEFAULT_SETTINGS.worldName,
        mode: 'place',
        openPanel: 'none',
        activeBoxId: null,
      });
      scheduleAutosave();
      get().showToast(
        preset === 'toyland'
          ? 'Welcome to Toy Land! The toys are waiting! 🧸'
          : 'Fresh new world! Build something awesome!',
      );
    },

    exportWorld() {
      const state = get();
      const data = buildWorldExport({
        worldId: 'local-world',
        worldName: state.worldName,
        size: WORLD_SIZE,
        blocks: Object.values(state.blocks),
        boxes: state.boxes,
        selectedBlockType: state.selectedBlockType,
        visualMode: state.visualMode,
        timeMode: state.timeMode,
        weather: state.weather,
      });
      downloadWorldExport(data);
      get().showToast('World exported! Keep that file safe.');
    },

    async importWorldFromText(text) {
      const result = parseWorldImportFile(text);
      if (!result.ok) {
        return { ok: false, error: result.error };
      }
      if (saveTimer) clearTimeout(saveTimer);
      set({
        blocks: toRecord(result.blocks),
        boxes: result.boxes,
        worldName: result.worldName,
        selectedBlockType: (result.selectedBlockType as BlockTypeId) ?? get().selectedBlockType,
        visualMode: result.visualMode ?? get().visualMode,
        timeMode: result.timeMode ?? get().timeMode,
        weather: result.weather ?? get().weather,
        openPanel: 'none',
        activeBoxId: null,
      });
      scheduleAutosave();
      const warning = result.warnings[0];
      get().showToast(warning ?? 'World imported! Welcome back!');
      return { ok: true };
    },

    showToast(message) {
      set({ toast: message });
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => set({ toast: null }), 4000);
    },
  };
});
