import { create } from 'zustand';
import { blocks as registry, resolveBlockId } from '../engine/blocks/blocks';
import { buildWorldExport, downloadWorldExport } from '../importExport/exportWorld';
import { parseWorldImportFile } from '../importExport/validateWorldImport';
import { rleEncode } from '../storage/chunkCodec';
import { db } from '../storage/db';
import type { StoredWorld } from '../storage/db';
import { DEFAULT_SETTINGS, normalizeSettings } from '../storage/settingsRepository';
import { WorldStore } from '../storage/worldStore';
import { getEngine } from './engineRef';
import { createWorldRecord } from './store/worldRecords';
import { blueprintById } from '../engine/build/blueprints';
import type { InteractionMode } from '../types/game';
import type { AudioState, PlayerLookState } from './store/types';
import type { GameState, ViewMode } from './store/types';

export type { GameState, PanelId, ViewMode, WorldPreset } from './store/types';

const worldStore = new WorldStore(db);

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
// Every change bumps this. A finishing save may only report "saved" if no
// newer change happened while it was writing.
let changeSeq = 0;

const AUDIO_KEY = 'mindcraft-audio';
const SMART_KEY = 'mindcraft-smart-chat';

function loadSmartChat(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(SMART_KEY) === '1';
  } catch {
    return false;
  }
}

function loadAudio(): AudioState {
  const fallback: AudioState = { muted: false, music: true, volume: 0.7 };
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(AUDIO_KEY) : null;
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AudioState>;
    return {
      muted: typeof parsed.muted === 'boolean' ? parsed.muted : fallback.muted,
      music: typeof parsed.music === 'boolean' ? parsed.music : fallback.music,
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : fallback.volume,
    };
  } catch {
    return fallback;
  }
}

function saveAudio(audio: AudioState): void {
  try {
    localStorage.setItem(AUDIO_KEY, JSON.stringify(audio));
  } catch {
    // Private mode: settings just do not stick.
  }
}

const DEFAULT_LOOK: PlayerLookState = { shirt: '#ffb03c', pants: '#4a7fd6', skin: '#f2c79a', hair: '#6b4a26', hat: 'none', style: 'boy' };

function lookOf(raw: StoredWorld['settings']['look']): PlayerLookState {
  const hex = (v: unknown, fallback: string): string => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback);
  const hats = ['none', 'cap', 'crown', 'cowboy', 'party'];
  return {
    shirt: hex(raw?.shirt, DEFAULT_LOOK.shirt),
    pants: hex(raw?.pants, DEFAULT_LOOK.pants),
    skin: hex(raw?.skin, DEFAULT_LOOK.skin),
    hair: hex(raw?.hair, DEFAULT_LOOK.hair),
    hat: (hats.includes(raw?.hat ?? '') ? raw!.hat : 'none') as PlayerLookState['hat'],
    style: raw?.style === 'girl' ? 'girl' : 'boy',
  };
}

function settingsOf(world: StoredWorld) {
  const s = normalizeSettings(world.settings, (id) => registry.has(id));
  return {
    worldName: world.name,
    look: lookOf(world.settings.look),
    selectedBlockType: s.selectedBlockType,
    hotbar: s.hotbar,
    visualMode: s.visualMode,
    timeMode: s.timeMode,
    weather: s.weather,
  };
}

type ContainerData = { name: string; items: Array<{ blockType: string; quantity: number }> };

function readContainer(pos: { x: number; y: number; z: number }): ContainerData | null {
  const entity = getEngine()?.world.getEntity(pos.x, pos.y, pos.z);
  if (!entity || entity.kind !== 'container') return null;
  const data = entity.data as Partial<ContainerData>;
  return { name: data.name ?? 'Magic Delivery Box', items: Array.isArray(data.items) ? data.items : [] };
}

function writeContainer(pos: { x: number; y: number; z: number }, data: ContainerData): void {
  getEngine()?.world.setEntity(pos.x, pos.y, pos.z, { kind: 'container', data });
}

export const useGameStore = create<GameState>((set, get) => {
  function scheduleAutosave(): void {
    if (!get().storageAvailable) return;
    changeSeq += 1;
    set({ saveState: 'saving' });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void flush(), 600);
  }

  async function flush(): Promise<void> {
    const seqAtStart = changeSeq;
    const state = get();
    const id = state.currentWorldId;
    if (!id) return;
    try {
      const engine = getEngine();
      await engine?.save();
      await worldStore.touchWorld(id, {
        name: state.worldName,
        settings: {
          selectedBlockType: state.selectedBlockType,
          hotbar: state.hotbar,
          visualMode: state.visualMode,
          timeMode: state.timeMode,
          weather: state.weather,
          timeOfDay: engine?.environment.time,
          look: state.look,
        },
        player: engine?.playerState(),
        template: engine ? engine.pendingTemplate().map((t) => ({ ...t })) : undefined,
        entities: engine ? engine.entities.serialize() : undefined,
      });
      if (changeSeq === seqAtStart) set({ saveState: 'saved' });
    } catch {
      set({ saveState: 'error', storageAvailable: false });
    }
  }

  async function openRecord(world: StoredWorld): Promise<void> {
    if (saveTimer) clearTimeout(saveTimer);
    set({
      currentWorldId: world.id,
      ...settingsOf(world),
      hotbarIndex: 0,
      openPanel: 'none',
      panelPayload: null,
      mode: 'place',
      saveState: get().storageAvailable ? 'saved' : 'error',
    });
  }

  return {
    // --- world slice ---
    ready: false,
    initStarted: false,
    storageAvailable: true,
    saveState: 'idle',
    worlds: [],
    currentWorldId: null,
    worldName: 'My World',

    currentWorld() {
      const { worlds, currentWorldId } = get();
      return worlds.find((w) => w.id === currentWorldId) ?? null;
    },

    async init() {
      if (get().initStarted) return;
      set({ initStarted: true });
      try {
        const migrated = await worldStore.migrateLegacy();
        await worldStore.storageInfo();
        let worlds = await worldStore.listWorlds();
        if (migrated) get().showToast('Your old world moved into the new MindCraft! 🎉');
        if (worlds.length === 0) {
          const world = createWorldRecord('My World', 'meadow');
          await worldStore.putWorld(world);
          worlds = [world];
        }
        set({ worlds, ready: true });
        await openRecord(worlds[0]);
      } catch {
        // IndexedDB blocked or broken: still let the kid play, just warn
        // that nothing will be remembered.
        const world = createWorldRecord('My World', 'meadow');
        set({ worlds: [world], ready: true, storageAvailable: false, saveState: 'error' });
        await openRecord(world);
      }
    },

    async createWorld(name, preset) {
      const world = createWorldRecord(name.trim().slice(0, 60) || 'My World', preset);
      if (get().storageAvailable) await worldStore.putWorld(world).catch(() => set({ storageAvailable: false }));
      set({ worlds: [world, ...get().worlds] });
      await openRecord(world);
      get().showToast(preset === 'toyland' ? 'Welcome to Toy Land! The toys are waiting! 🧸' : preset === 'town' ? 'Welcome to Sunny Town! Say hi to the neighbors! 🏘️' : 'Fresh new world! Build something awesome!');
    },

    async openWorld(id) {
      const world = get().worlds.find((w) => w.id === id);
      if (!world || world.id === get().currentWorldId) return;
      await flush();
      const fresh = get().storageAvailable ? await worldStore.getWorld(id).catch(() => world) : world;
      const record = fresh ?? world;
      set({ worlds: get().worlds.map((w) => (w.id === id ? record : w)) });
      await openRecord(record);
    },

    async deleteWorld(id) {
      const remaining = get().worlds.filter((w) => w.id !== id);
      if (get().storageAvailable) await worldStore.deleteWorld(id).catch(() => undefined);
      set({ worlds: remaining });
      if (get().currentWorldId === id) {
        if (remaining.length === 0) {
          await get().createWorld('My World', 'meadow');
        } else {
          await openRecord(remaining[0]);
        }
      }
    },

    async renameWorld(id, name) {
      const trimmed = name.trim().slice(0, 60);
      if (!trimmed) return;
      set({ worlds: get().worlds.map((w) => (w.id === id ? { ...w, name: trimmed } : w)) });
      if (get().currentWorldId === id) set({ worldName: trimmed });
      if (get().storageAvailable) await worldStore.touchWorld(id, { name: trimmed }).catch(() => undefined);
    },

    async resetWorld(preset = 'meadow') {
      const oldId = get().currentWorldId;
      await get().createWorld(preset === 'toyland' ? 'Toy Land' : preset === 'town' ? 'Sunny Town' : 'My World', preset);
      if (oldId) {
        if (get().storageAvailable) await worldStore.deleteWorld(oldId).catch(() => undefined);
        set({ worlds: get().worlds.filter((w) => w.id !== oldId) });
      }
    },

    markDirty() {
      scheduleAutosave();
    },

    async saveNow() {
      if (saveTimer) clearTimeout(saveTimer);
      changeSeq += 1;
      set({ saveState: 'saving' });
      await flush();
    },

    async exportWorld() {
      const world = get().currentWorld();
      if (!world) return;
      const engine = getEngine();
      await engine?.save().catch(() => undefined);
      let chunks = get().storageAvailable ? await db.chunks.where('worldId').equals(world.id).toArray().catch(() => []) : [];
      if (!get().storageAvailable && engine) {
        // No storage: export straight from memory.
        chunks = engine.world
          .allChunks()
          .filter((c) => c.modified)
          .map((c) => ({
            key: `${world.id}:${c.cx},${c.cz}`,
            worldId: world.id,
            cx: c.cx,
            cz: c.cz,
            blocks: rleEncode(c.blocks),
            states: rleEncode(c.states),
            entities: [...c.entities.entries()].map(([index, e]) => ({ index, kind: e.kind, data: e.data })),
          }));
      }
      const state = get();
      const record: StoredWorld = {
        ...world,
        name: state.worldName,
        settings: {
          selectedBlockType: state.selectedBlockType,
          hotbar: state.hotbar,
          visualMode: state.visualMode,
          timeMode: state.timeMode,
          weather: state.weather,
          timeOfDay: engine?.environment.time,
          look: state.look,
        },
        player: engine?.playerState(),
        template: engine ? engine.pendingTemplate() : world.template,
        entities: engine ? engine.entities.serialize() : world.entities,
      };
      downloadWorldExport(buildWorldExport(record, chunks));
      get().showToast('World exported! Keep that file safe.');
    },

    async importWorldFromText(text) {
      const result = parseWorldImportFile(text);
      if (!result.ok) return { ok: false, error: result.error };
      if (get().storageAvailable) {
        try {
          await db.transaction('rw', db.worlds, db.chunks, async () => {
            await db.worlds.put(result.world);
            await db.chunks.bulkPut(result.chunks);
          });
        } catch {
          return { ok: false, error: 'This browser could not save the imported world.' };
        }
      }
      set({ worlds: [result.world, ...get().worlds] });
      await openRecord(result.world);
      get().showToast(result.warnings[0] ?? 'World imported! Welcome back!');
      return { ok: true };
    },

    // --- ui slice ---
    openPanel: 'none',
    panelPayload: null,
    toast: null,
    viewMode: 'third',
    mode: 'place',
    canUndo: false,
    canRedo: false,
    controllerActive: false,
    mirror: false,
    containerVersion: 0,

    setOpenPanel(panel, payload = null) {
      set({ openPanel: panel, panelPayload: payload });
    },
    closePanels() {
      set({ openPanel: 'none', panelPayload: null });
    },
    showToast(message) {
      set({ toast: message });
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => set({ toast: null }), 4000);
    },
    setMode(mode) {
      set({ mode });
      getEngine()?.build.cancel();
      const hints: Partial<Record<InteractionMode, string>> = {
        room: 'Room tool: tap one corner, then the other! 🏠',
        fill: 'Fill tool: tap one corner, then the other! 🧱',
        copy: 'Copy tool: tap one corner, then the other! 📋',
        paste: getEngine()?.build.clipboard ? 'Tap where to put it. Press R to turn it! 🔄' : 'Copy something or pick a blueprint first! 📋',
        paint: 'Paint tool: tap a block to change it! 🎨',
        interact: 'Interact: tap friends, doors, switches, and boxes. Nothing gets built or broken! 🤝',
      };
      const hint = hints[mode];
      if (hint) get().showToast(hint);
    },
    setMirror(enabled) {
      set({ mirror: enabled });
      getEngine()?.setMirror(enabled);
      get().showToast(enabled ? 'Mirror on! Everything you build is doubled. 🪞' : 'Mirror off.');
    },
    nextTool() {
      const order: InteractionMode[] = ['place', 'interact', 'remove', 'room', 'fill', 'paint', 'copy', 'paste'];
      const index = order.indexOf(get().mode);
      get().setMode(order[(index + 1) % order.length]);
    },
    receiveGift(blockId, label) {
      const def = registry.get(blockId);
      if (def) get().selectBlockType(def.id);
      get().showToast(`🎁 You got ${label}! It's in your hotbar.`);
    },
    villagerLines: {},
    pushVillagerLine(id, who, text) {
      const lines = [...(get().villagerLines[id] ?? []), { who, text }].slice(-12);
      set({ villagerLines: { ...get().villagerLines, [id]: lines } });
      if (who === 'villager') get().showToast(text);
    },
    receiveCrafted(blockId, label, count) {
      const def = registry.get(blockId);
      if (def) get().selectBlockType(def.id);
      get().showToast(`✨ You made ${count > 1 ? `${count} ${label}s` : `a ${label}`}! It's in your hotbar.`);
    },
    selectBlueprint(id) {
      const bp = blueprintById(id);
      const engine = getEngine();
      if (!bp || !engine) return;
      engine.build.setClipboard(bp.stamp);
      set({ openPanel: 'none', panelPayload: null, mode: 'paste' });
      get().showToast(`${bp.emoji} ${bp.label}: tap where to build it! Press R to turn it.`);
    },
    setViewMode(mode) {
      set({ viewMode: mode });
    },
    toggleViewMode() {
      const next: ViewMode = get().viewMode === 'third' ? 'first' : 'third';
      set({ viewMode: next });
      getEngine()?.setViewMode(next);
      get().showToast(next === 'first' ? 'Looking through your own eyes! 👀' : 'Back behind you! 🧍');
    },
    zoom(delta) {
      getEngine()?.zoom(delta);
    },
    setHistoryState(canUndo, canRedo) {
      set({ canUndo, canRedo });
    },
    setControllerActive(active) {
      set({ controllerActive: active });
    },
    undo() {
      const done = getEngine()?.history.undo();
      if (done) get().showToast(`Undid: ${done.label}`);
    },
    redo() {
      const done = getEngine()?.history.redo();
      if (done) get().showToast(`Redid: ${done.label}`);
    },
    petAnimal(kind, name) {
      const messages: Record<string, string> = {
        bunny: '🐰 Boing! The bunny loves you!',
        chick: '🐤 Cheep cheep! So happy!',
        butterfly: '🦋 The butterfly does a twirl!',
        pet: `💛 ${name ?? 'Your pet'} is so happy!`,
        villager: `👋 ${name ?? 'Your friend'} waves hello!`,
      };
      get().showToast(messages[kind] ?? '💛 Your friend is happy!');
    },
    sleepUntilMorning() {
      const engine = getEngine();
      if (engine) {
        engine.environment.setTime(0.3);
        if (get().timeMode === 'night') get().setTimeMode('cycle');
      }
      set({ openPanel: 'none', panelPayload: null });
      get().showToast('Good morning! ☀️ Rise and shine!');
      scheduleAutosave();
    },

    // --- settings slice ---
    smartChat: loadSmartChat(),
    setSmartChat(on) {
      set({ smartChat: on });
      try {
        localStorage.setItem(SMART_KEY, on ? '1' : '0');
      } catch {
        // fine
      }
      const engine = getEngine();
      if (engine) engine.chat.smart = on;
    },
    audio: loadAudio(),
    setAudio(audio) {
      const next = { ...get().audio, ...audio };
      set({ audio: next });
      saveAudio(next);
      const engine = getEngine();
      if (engine) {
        void engine.audio.start();
        engine.audio.setSettings(next);
      }
    },
    look: DEFAULT_LOOK,
    setLook(look) {
      const next = { ...get().look, ...look };
      set({ look: next });
      getEngine()?.setLook(next);
      scheduleAutosave();
    },
    visualMode: DEFAULT_SETTINGS.visualMode,
    timeMode: DEFAULT_SETTINGS.timeMode,
    weather: DEFAULT_SETTINGS.weather,

    setVisualMode(mode) {
      set({ visualMode: mode });
      getEngine()?.setVisualMode(mode);
      scheduleAutosave();
      if (mode === 'claudeDream') get().showToast('Welcome to the dream world! ✨');
    },
    setTimeMode(mode) {
      set({ timeMode: mode });
      getEngine()?.setTimeMode(mode);
      scheduleAutosave();
    },
    setWeather(weather) {
      set({ weather });
      getEngine()?.setWeather(weather);
      scheduleAutosave();
    },

    // --- inventory slice ---
    selectedBlockType: DEFAULT_SETTINGS.selectedBlockType,
    hotbar: DEFAULT_SETTINGS.hotbar,
    hotbarIndex: 0,

    selectBlockType(id) {
      const def = resolveBlockId(id);
      if (!def) return;
      const { hotbar, hotbarIndex } = get();
      const inBar = hotbar.indexOf(def.id);
      const nextBar = inBar >= 0 ? hotbar : hotbar.map((b, i) => (i === hotbarIndex ? def.id : b));
      set({ selectedBlockType: def.id, hotbar: nextBar, hotbarIndex: inBar >= 0 ? inBar : hotbarIndex, mode: 'place' });
      scheduleAutosave();
    },
    selectSlot(index) {
      const { hotbar } = get();
      if (index < 0 || index >= hotbar.length) return;
      set({ hotbarIndex: index, selectedBlockType: hotbar[index], mode: 'place' });
      scheduleAutosave();
    },
    setHotbarSlot(index, id) {
      const def = resolveBlockId(id);
      if (!def) return;
      set({ hotbar: get().hotbar.map((b, i) => (i === index ? def.id : b)), hotbarIndex: index, selectedBlockType: def.id, mode: 'place' });
      scheduleAutosave();
    },

    addItemToBox(pos, blockType) {
      const box = readContainer(pos);
      if (!box) return;
      const existing = box.items.find((i) => i.blockType === blockType);
      const items = existing
        ? box.items.map((i) => (i.blockType === blockType ? { ...i, quantity: i.quantity + 1 } : i))
        : [...box.items, { blockType, quantity: 1 }];
      writeContainer(pos, { ...box, items });
      set({ containerVersion: get().containerVersion + 1 });
      scheduleAutosave();
    },
    takeItemFromBox(pos, blockType) {
      const box = readContainer(pos);
      const item = box?.items.find((i) => i.blockType === blockType);
      if (!box || !item || item.quantity <= 0) return;
      const items = box.items.map((i) => (i.blockType === blockType ? { ...i, quantity: i.quantity - 1 } : i)).filter((i) => i.quantity > 0);
      writeContainer(pos, { ...box, items });
      get().selectBlockType(blockType);
      set({ containerVersion: get().containerVersion + 1 });
      scheduleAutosave();
    },
    clearBox(pos) {
      const box = readContainer(pos);
      if (!box) return;
      writeContainer(pos, { ...box, items: [] });
      set({ containerVersion: get().containerVersion + 1 });
      scheduleAutosave();
    },
    renameBox(pos, name) {
      const trimmed = name.trim().slice(0, 60);
      const box = readContainer(pos);
      if (!box || !trimmed) return;
      writeContainer(pos, { ...box, name: trimmed });
      set({ containerVersion: get().containerVersion + 1 });
      scheduleAutosave();
    },
  };
});

/** Read a container's contents for the panel. */
export function useContainer(pos: { x: number; y: number; z: number } | null): ContainerData | null {
  useGameStore((s) => s.containerVersion);
  return pos ? readContainer(pos) : null;
}

/** Flush pending saves when the tab hides or closes. */
if (typeof window !== 'undefined') {
  const flushIfDirty = (): void => {
    const state = useGameStore.getState();
    if (state.saveState === 'saving') void state.saveNow();
  };
  window.addEventListener('pagehide', flushIfDirty);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushIfDirty();
  });
}
