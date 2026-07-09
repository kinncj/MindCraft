import { useEffect, useRef, useState } from 'react';
import { VoxelRenderer } from './engine/renderer';
import { WORLD_SIZE } from './engine/world';
import { useGameStore } from './gameStore';
import type { BlockTypeId } from '../types/game';

/** Highest block in a column, straight from the store. */
function groundAt(x: number, z: number): { y: number; type: BlockTypeId } | null {
  const blocks = useGameStore.getState().blocks;
  for (let y = WORLD_SIZE.height - 1; y >= 0; y--) {
    const block = blocks[`${x},${y},${z}`];
    if (block) return { y, type: block.type };
  }
  return null;
}

/** What block occupies a grid cell — the player physics probe. */
function cellAt(x: number, y: number, z: number): BlockTypeId | null {
  return useGameStore.getState().blocks[`${x},${y},${z}`]?.type ?? null;
}

/**
 * Mounts the Three.js renderer and keeps it in sync with the store.
 * The renderer is imperative; React only owns the container div.
 */
export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!VoxelRenderer.isSupported()) {
      setSupported(false);
      return;
    }

    const store = useGameStore.getState();
    const renderer = new VoxelRenderer(container, {
      onPlace: (pos) => useGameStore.getState().placeBlockAt(pos),
      onRemove: (pos) => useGameStore.getState().removeBlockAt(pos),
      onBoxTap: (pos) => useGameStore.getState().openBoxAt(pos),
      getMode: () => useGameStore.getState().mode,
      groundAt,
      cellAt,
      getViewMode: () => useGameStore.getState().viewMode,
      requestViewMode: (mode) => useGameStore.getState().setViewMode(mode),
      onAnimalPet: (kind) => useGameStore.getState().petAnimal(kind),
    });
    renderer.syncBlocks(store.blocks);
    renderer.setVisualMode(store.visualMode);
    renderer.setTimeMode(store.timeMode);
    renderer.setWeather(store.weather);

    const unsubscribe = useGameStore.subscribe((state, prev) => {
      if (state.blocks !== prev.blocks) {
        renderer.syncBlocks(state.blocks);
      }
      if (state.visualMode !== prev.visualMode) renderer.setVisualMode(state.visualMode);
      if (state.timeMode !== prev.timeMode) renderer.setTimeMode(state.timeMode);
      if (state.weather !== prev.weather) renderer.setWeather(state.weather);
    });

    return () => {
      unsubscribe();
      renderer.dispose();
    };
  }, []);

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
