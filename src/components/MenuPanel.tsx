import { useState } from 'react';
import { useGameStore } from '../game/gameStore';
import { ExportWorldButton } from './ExportWorldButton';
import { ImportWorldDialog } from './ImportWorldDialog';
import { ResetWorldDialog } from './ResetWorldDialog';
import { VisualModeSelector } from './VisualModeSelector';
import { WorldSettings } from './WorldSettings';
import { KidButton } from './KidButton';

/**
 * The game menu, opened with the Menu button or Escape. Holds
 * everything that is not moment-to-moment play: how to play,
 * export/import, and reset.
 */
export function MenuPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const closePanels = useGameStore((state) => state.closePanels);
  const storageAvailable = useGameStore((state) => state.storageAvailable);
  const [showHelp, setShowHelp] = useState(false);

  if (openPanel !== 'menu') return null;

  return (
    <div className="panel-backdrop" role="presentation">
      <section className="panel menu-panel" role="dialog" aria-label="Menu" aria-modal="true">
        <h2>
          <span aria-hidden="true">🧱</span> Menu
        </h2>
        <div className="menu-items">
          <KidButton tone="primary" onClick={closePanels} autoFocus>
            ▶️ Back to building
          </KidButton>
          <KidButton onClick={() => setShowHelp((value) => !value)} aria-expanded={showHelp}>
            ❓ How to play
          </KidButton>
          {showHelp && (
            <ul className="welcome-tips menu-help">
              <li>Walk with WASD or the arrow keys, jump with space</li>
              <li>Tap the ground or a block to build</li>
              <li>Use the 🧽 Remove button (or right-click) to take blocks away</li>
              <li>Drag to look around, scroll to zoom, arrows or WASD to move</li>
              <li>Press V (or zoom all the way in) to look through your own eyes</li>
              <li>Tap the 📦 Magic Delivery Box to store treasures</li>
              <li>The animals are just friends — they like watching you build</li>
            </ul>
          )}
          <VisualModeSelector />
          <WorldSettings />
          <h3>Your world</h3>
          <ExportWorldButton />
          <ImportWorldDialog />
          <ResetWorldDialog />
          <ResetWorldDialog preset="toyland" />
        </div>
        <p className="menu-footer">
          {storageAvailable
            ? 'Your world is saved on this computer. Want to keep it forever? Export it!'
            : 'This browser cannot save — export your world to keep it!'}
        </p>
      </section>
    </div>
  );
}
