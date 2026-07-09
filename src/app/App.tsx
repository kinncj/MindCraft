import { useEffect } from 'react';
import { GameCanvas } from '../game/GameCanvas';
import { useGameStore } from '../game/gameStore';
import { BLOCK_DEFINITIONS } from '../game/engine/blockRegistry';
import { blockIconDataUrl } from '../game/engine/textures';
import { Hotbar } from '../components/Hotbar';
import { SaveIndicator } from '../components/SaveIndicator';
import { MagicDeliveryBoxPanel } from '../components/MagicDeliveryBoxPanel';
import { MenuPanel } from '../components/MenuPanel';
import { WelcomePanel } from '../components/WelcomePanel';
import { Toast } from '../components/Toast';
import { KidButton } from '../components/KidButton';
import './App.css';

export function App() {
  const ready = useGameStore((state) => state.ready);
  const storageAvailable = useGameStore((state) => state.storageAvailable);
  const mode = useGameStore((state) => state.mode);
  const setMode = useGameStore((state) => state.setMode);
  const selectedBlockType = useGameStore((state) => state.selectedBlockType);
  const viewMode = useGameStore((state) => state.viewMode);
  const toggleViewMode = useGameStore((state) => state.toggleViewMode);
  const init = useGameStore((state) => state.init);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      const state = useGameStore.getState();
      // Escape closes whatever is open; with nothing open it opens the menu.
      if (state.openPanel === 'none') state.setOpenPanel('menu');
      else state.closePanels();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (!ready) {
    return (
      <div className="loading-screen">
        <h1>
          <span aria-hidden="true">🧱</span> MindCraft
        </h1>
        <p>Getting your blocks ready…</p>
      </div>
    );
  }

  const selectedDef = BLOCK_DEFINITIONS[selectedBlockType];
  const selectedIcon = blockIconDataUrl(selectedBlockType);

  return (
    <div className="app">
      <GameCanvas />

      <header className="top-bar">
        <div className="brand" aria-label="MindCraft">
          <span aria-hidden="true">🧱</span> MindCraft
        </div>
        <SaveIndicator />
        <div className="top-actions">
          <KidButton
            onClick={() => useGameStore.getState().setOpenPanel('menu')}
            aria-label="Open the menu"
          >
            📋 Menu
          </KidButton>
        </div>
      </header>

      {!storageAvailable && (
        <div className="storage-warning" role="alert">
          <span aria-hidden="true">⚠️</span> This browser cannot save your world. You can still
          build and export it to a file!
        </div>
      )}

      <div className="mode-bar">
        <div
          className="selected-block"
          style={
            selectedIcon
              ? { backgroundImage: `url(${selectedIcon})`, backgroundColor: selectedDef.color }
              : { background: selectedDef.color }
          }
        >
          {!selectedIcon && <span aria-hidden="true">{selectedDef.emoji}</span>}{' '}
          {selectedDef.label}
        </div>
        <KidButton
          tone={mode === 'place' ? 'primary' : 'default'}
          onClick={() => setMode('place')}
          aria-pressed={mode === 'place'}
          aria-label="Place blocks mode"
        >
          ✨ Place
        </KidButton>
        <KidButton
          tone={mode === 'remove' ? 'primary' : 'default'}
          onClick={() => setMode('remove')}
          aria-pressed={mode === 'remove'}
          aria-label="Remove blocks mode"
        >
          🧽 Remove
        </KidButton>
        <KidButton onClick={toggleViewMode} aria-label="Change camera view">
          {viewMode === 'third' ? '👀 My eyes' : '🧍 Behind me'}
        </KidButton>
      </div>

      {viewMode === 'first' && (
        <div className="crosshair" aria-hidden="true">
          +
        </div>
      )}

      <Hotbar />
      <MagicDeliveryBoxPanel />
      <MenuPanel />
      <WelcomePanel />
      <Toast />
    </div>
  );
}
