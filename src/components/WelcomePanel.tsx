import { useState } from 'react';
import { KidButton } from './KidButton';

/** The friendly sign the player sees when the game opens. */
export function WelcomePanel() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="panel-backdrop" role="presentation">
      <section className="panel welcome-panel" role="dialog" aria-label="Welcome to MindCraft!" aria-modal="true">
        <h1>
          <span aria-hidden="true">🧱</span> Welcome to MindCraft!
        </h1>
        <p>Build something awesome!</p>
        <ul className="welcome-tips">
          <li>
            <span aria-hidden="true">👆</span> Tap the ground to place a block
          </li>
          <li>
            <span aria-hidden="true">🎨</span> Pick a block from the bar below
          </li>
          <li>
            <span aria-hidden="true">📦</span> Tap the Magic Delivery Box to open it
          </li>
          <li>
            <span aria-hidden="true">💾</span> Your world is saved here, on this computer
          </li>
        </ul>
        <KidButton tone="primary" onClick={() => setDismissed(true)} autoFocus>
          Let&apos;s build! 🚀
        </KidButton>
      </section>
    </div>
  );
}
