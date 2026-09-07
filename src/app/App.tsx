import { useEffect } from 'react';
import { GameCanvas } from '../game/GameCanvas';
import { useGameStore } from '../game/gameStore';
import { BlockPalette } from '../components/BlockPalette';
import { BlueprintsPanel } from '../components/BlueprintsPanel';
import { CraftingPanel } from '../components/CraftingPanel';
import { DressUpPanel } from '../components/DressUpPanel';
import { Hotbar } from '../components/Hotbar';
import { MagicDeliveryBoxPanel } from '../components/MagicDeliveryBoxPanel';
import { MenuPanel } from '../components/MenuPanel';
import { PetPanel } from '../components/PetPanel';
import { RobotPanel } from '../components/RobotPanel';
import { SaveIndicator } from '../components/SaveIndicator';
import { SleepPanel } from '../components/SleepPanel';
import { Toast } from '../components/Toast';
import { ToolsDrawer } from '../components/ToolsDrawer';
import { VillagerPanel } from '../components/VillagerPanel';
import { VehiclePanel } from '../components/VehiclePanel';
import { DebugOverlay, debugEnabled } from '../components/DebugOverlay';
import { VirtualControls } from '../components/VirtualControls';
import { WelcomePanel } from '../components/WelcomePanel';
import { IconButton } from '../components/ui/IconButton';
import { Icon } from '../components/ui/icons';
import './App.css';

export function App() {
  const ready = useGameStore((state) => state.ready);
  const storageAvailable = useGameStore((state) => state.storageAvailable);
  const viewMode = useGameStore((state) => state.viewMode);
  const toggleViewMode = useGameStore((state) => state.toggleViewMode);
  const zoom = useGameStore((state) => state.zoom);
  const dance = useGameStore((state) => state.dance);
  const takePhoto = useGameStore((state) => state.takePhoto);
  const flying = useGameStore((state) => state.flying);
  const toggleFly = useGameStore((state) => state.toggleFly);
  const canUndo = useGameStore((state) => state.canUndo);
  const canRedo = useGameStore((state) => state.canRedo);
  const undo = useGameStore((state) => state.undo);
  const redo = useGameStore((state) => state.redo);
  const controllerActive = useGameStore((state) => state.controllerActive);
  const pointerLocked = useGameStore((state) => state.pointerLocked);
  const openPanel = useGameStore((state) => state.openPanel);
  const audio = useGameStore((state) => state.audio);
  const setAudio = useGameStore((state) => state.setAudio);
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
        <h1>MindCraft</h1>
        <p>Getting your blocks ready…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <GameCanvas />

      <header className="top-bar">
        <div className="brand" aria-label="MindCraft">
          <Icon name="blocks" size={26} className="brand-icon" />
          <span className="brand-text">MindCraft</span>
        </div>
        <SaveIndicator />
        <div className="top-actions">
          <IconButton icon="undo" label="Undo the last change" onClick={undo} disabled={!canUndo} />
          <IconButton icon="redo" label="Redo" onClick={redo} disabled={!canRedo} />
          <IconButton icon="menu" label="Open the menu" onClick={() => useGameStore.getState().setOpenPanel('menu')} tone="accent" />
        </div>
      </header>

      {!storageAvailable && (
        <div className="storage-warning" role="alert">
          This browser cannot save your world. You can still build and export it to a file!
        </div>
      )}

      <div className="side-actions">
        <IconButton icon="plus" label="Zoom in" onClick={() => zoom(-3)} />
        <IconButton icon="minus" label="Zoom out" onClick={() => zoom(3)} />
        <IconButton icon={viewMode === 'third' ? 'eye' : 'person'} label="Change camera view" onClick={toggleViewMode} />
        <IconButton icon="sparkle" label="Dance" onClick={dance} />
        <IconButton icon="camera" label="Take a photo" onClick={() => void takePhoto()} />
        <IconButton icon="fly" label={flying ? 'Stop flying' : 'Fly'} onClick={toggleFly} tone={flying ? 'accent' : undefined} />
        <IconButton icon={audio.muted ? 'mute' : 'sound'} label={audio.muted ? 'Unmute sound' : 'Mute sound'} onClick={() => setAudio({ muted: !audio.muted })} />
      </div>

      {(viewMode === 'first' || controllerActive || pointerLocked) && <div className="crosshair" aria-hidden="true" />}

      <ToolsDrawer />
      <Hotbar />
      {openPanel === 'none' && <VirtualControls />}
      <BlockPalette />
      <BlueprintsPanel />
      <PetPanel />
      <VehiclePanel />
      {debugEnabled() && <DebugOverlay />}
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
