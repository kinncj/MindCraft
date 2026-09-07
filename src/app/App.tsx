import { useEffect } from 'react';
import { GameCanvas } from '../game/GameCanvas';
import { useGameStore } from '../game/gameStore';
import { BlockPalette } from '../components/BlockPalette';
import { BlueprintsPanel } from '../components/BlueprintsPanel';
import { CraftingPanel } from '../components/CraftingPanel';
import { RobotPanel } from '../components/RobotPanel';
import { DressUpPanel } from '../components/DressUpPanel';
import { Hotbar } from '../components/Hotbar';
import { MagicDeliveryBoxPanel } from '../components/MagicDeliveryBoxPanel';
import { MenuPanel } from '../components/MenuPanel';
import { PetPanel } from '../components/PetPanel';
import { SaveIndicator } from '../components/SaveIndicator';
import { SleepPanel } from '../components/SleepPanel';
import { Toast } from '../components/Toast';
import { ToolsDrawer } from '../components/ToolsDrawer';
import { VillagerPanel } from '../components/VillagerPanel';
import { VirtualControls } from '../components/VirtualControls';
import { WelcomePanel } from '../components/WelcomePanel';
import { IconButton } from '../components/ui/IconButton';
import './App.css';

export function App() {
  const ready = useGameStore((state) => state.ready);
  const storageAvailable = useGameStore((state) => state.storageAvailable);
  const viewMode = useGameStore((state) => state.viewMode);
  const toggleViewMode = useGameStore((state) => state.toggleViewMode);
  const canUndo = useGameStore((state) => state.canUndo);
  const canRedo = useGameStore((state) => state.canRedo);
  const undo = useGameStore((state) => state.undo);
  const redo = useGameStore((state) => state.redo);
  const controllerActive = useGameStore((state) => state.controllerActive);
  const init = useGameStore((state) => state.init);

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const state = useGameStore.getState();
      if (event.key === 'Escape') {
        if (state.openPanel === 'none') state.setOpenPanel('menu');
        else state.closePanels();
        return;
      }
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) state.redo();
        else state.undo();
      } else if ((event.ctrlKey || event.metaKey) && key === 'y') {
        event.preventDefault();
        state.redo();
      }
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

  return (
    <div className="app">
      <GameCanvas />

      <header className="top-bar">
        <div className="brand" aria-label="MindCraft">
          <span aria-hidden="true">🧱</span>
          <span className="brand-text">MindCraft</span>
        </div>
        <SaveIndicator />
        <div className="top-actions">
          <IconButton emoji="↩️" label="Undo the last change" onClick={undo} disabled={!canUndo} />
          <IconButton emoji="↪️" label="Redo" onClick={redo} disabled={!canRedo} />
          <IconButton emoji="☰" label="Open the menu" onClick={() => useGameStore.getState().setOpenPanel('menu')} />
        </div>
      </header>

      {!storageAvailable && (
        <div className="storage-warning" role="alert">
          <span aria-hidden="true">⚠️</span> This browser cannot save your world. You can still build and export it to a file!
        </div>
      )}

      <div className="side-actions">
        <IconButton emoji={viewMode === 'third' ? '👀' : '🧍'} label="Change camera view" onClick={toggleViewMode} />
      </div>

      {(viewMode === 'first' || controllerActive) && (
        <div className="crosshair" aria-hidden="true">
          +
        </div>
      )}

      <ToolsDrawer />
      <Hotbar />
      <VirtualControls />
      <BlockPalette />
      <BlueprintsPanel />
      <PetPanel />
      <CraftingPanel />
      <RobotPanel />
      <VillagerPanel />
      <DressUpPanel />
      <MagicDeliveryBoxPanel />
      <SleepPanel />
      <MenuPanel />
      <WelcomePanel />
      <Toast />
    </div>
  );
}
