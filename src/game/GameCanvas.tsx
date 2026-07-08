import { useEffect, useRef, useState } from 'react';
import { VoxelRenderer } from './engine/renderer';
import { useGameStore } from './gameStore';

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
    });
    renderer.syncBlocks(store.blocks);

    const unsubscribe = useGameStore.subscribe((state, prev) => {
      if (state.blocks !== prev.blocks) {
        renderer.syncBlocks(state.blocks);
      }
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
