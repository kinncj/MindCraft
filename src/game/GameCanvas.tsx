import { useEffect, useRef, useState } from 'react';
import { Engine } from '../engine/core/Engine';
import { blocks as registry } from '../engine/blocks/blocks';
import { db } from '../storage/db';
import { WorldStore } from '../storage/worldStore';
import { setEngine } from './engineRef';
import { useGameStore } from './gameStore';

const worldStore = new WorldStore(db);

/**
 * Mounts one Engine for the current world and keeps it in sync with the
 * store. The engine is imperative; React only owns the container div.
 */
export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState(true);
  const currentWorldId = useGameStore((s) => s.currentWorldId);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !currentWorldId) return;
    if (!Engine.isSupported()) {
      setSupported(false);
      return;
    }
    const store = useGameStore.getState();
    const world = store.currentWorld();
    if (!world) return;

    const engine = new Engine({
      container,
      generator: world.generator.kind === 'flat' ? { kind: 'flat', seed: world.seed, surfaceY: world.generator.surfaceY ?? 4, preset: world.generator.preset } : { kind: 'infinite', seed: world.seed },
      spawn: world.spawn,
      player: world.player ?? null,
      template: world.template ?? null,
      storage: store.storageAvailable ? worldStore.chunkStorage(world.id) : null,
      settings: { visualMode: store.visualMode, timeMode: store.timeMode, weather: store.weather, timeOfDay: world.settings.timeOfDay, look: store.look },
      entities: (world.entities ?? []) as import('../engine/entities/Entity').StoredEntity[],
      audio: store.audio,
      worldName: world.name,
      bridge: {
        getSelectedBlockId: () => registry.byId(useGameStore.getState().selectedBlockType)?.numericId ?? 1,
        getMode: () => useGameStore.getState().mode,
        openPanel: (kind, payload) => {
          const s = useGameStore.getState();
          if (kind === 'container') s.setOpenPanel('container', payload);
          else if (kind === 'sleep') s.setOpenPanel('sleep', payload);
          else if (kind === 'crafting') s.setOpenPanel('crafting', payload);
        },
        toast: (message) => useGameStore.getState().showToast(message),
        onViewModeChange: (mode) => useGameStore.getState().setViewMode(mode),
        onPet: (kind, name) => useGameStore.getState().petAnimal(kind, name),
        onTemplateApplied: () => useGameStore.getState().markDirty(),
        onEntityTapped: (entity) => useGameStore.getState().setOpenPanel(entity.kind === 'pet' ? 'pet' : entity.kind === 'robot' ? 'robot' : entity.kind === 'vehicle' ? 'vehicle' : 'villager', entity),
        onCrafted: (blockId, label, count) => useGameStore.getState().receiveCrafted(blockId, label, count),
        onGift: (blockId, label) => useGameStore.getState().receiveGift(blockId, label),
        onVillagerSay: (id, text) => useGameStore.getState().pushVillagerLine(id, 'villager', text),
        onFlyChanged: (flying) => useGameStore.getState().setFlying(flying),
        onGamepadActive: (active) => useGameStore.getState().setControllerActive(active),
        onPointerLock: (locked) => useGameStore.getState().setPointerLocked(locked),
        onVisualModeFallback: (mode, reason) => {
          const s = useGameStore.getState();
          s.setVisualMode(mode);
          s.showToast(`${reason}. Switched to ${mode === 'ultraRealistic' ? 'Ultra' : mode} so the game keeps running.`);
        },
        onCommand: (command) => {
          const s = useGameStore.getState();
          if (command === 'menu') s.openPanel === 'none' ? s.setOpenPanel('menu') : s.closePanels();
          else if (command === 'hotbar_next') s.selectSlot((s.hotbarIndex + 1) % s.hotbar.length);
          else if (command === 'hotbar_prev') s.selectSlot((s.hotbarIndex + s.hotbar.length - 1) % s.hotbar.length);
          else if (command === 'toggle_mode') s.setMode(s.mode === 'place' ? 'remove' : 'place');
          else if (command === 'undo') s.undo();
          else if (command === 'palette') s.setOpenPanel('palette');
          else if (command === 'tool_next') s.nextTool();
        },
      },
    });
    setEngine(engine);
    engine.setViewMode(store.viewMode);
    engine.onAudioSettings = (settings) => useGameStore.getState().setAudio(settings);
    engine.chat.smart = store.smartChat;
    // A helper the parent chose earlier loads again (from the browser cache) in the background.
    if (store.helper.enabled && store.helper.status !== 'ready') void useGameStore.getState().downloadHelper();
    else if (store.helper.enabled) engine.chat.helper.enabled = true;

    const unsubWorld = engine.world.subscribe({
      onBlockChanged: () => useGameStore.getState().markDirty(),
    });
    const unsubHistory = engine.history.subscribe(() =>
      useGameStore.getState().setHistoryState(engine.history.canUndo, engine.history.canRedo),
    );
    const unsubStore = useGameStore.subscribe((state, prev) => {
      if (state.openPanel !== prev.openPanel) engine.setInputBlocked(state.openPanel !== 'none');
      if (state.viewMode !== prev.viewMode) engine.setViewMode(state.viewMode);
    });
    engine.setInputBlocked(store.openPanel !== 'none');

    return () => {
      unsubWorld();
      unsubHistory();
      unsubStore();
      void engine.save().catch(() => undefined);
      setEngine(null);
      engine.dispose();
    };
  }, [currentWorldId]);

  if (!supported) {
    return (
      <div className="canvas-fallback" role="alert">
        <h2>Oh no, this browser cannot draw the world</h2>
        <p>MindCraft needs WebGL to show the blocks. Try a different browser, like Chrome or Firefox.</p>
      </div>
    );
  }

  return <div ref={containerRef} className="game-canvas" data-testid="game-canvas" />;
}
