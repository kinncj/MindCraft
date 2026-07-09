import { useState } from 'react';
import { blockIconDataUrl } from '../game/engine/textures';
import { KidButton } from './KidButton';
import type { BlockTypeId } from '../types/game';

const FLOATING: Array<{ type: BlockTypeId; left: string; delay: string; size: string }> = [
  { type: 'grass', left: '8%', delay: '0s', size: '3.2rem' },
  { type: 'rainbow', left: '22%', delay: '1.2s', size: '2.6rem' },
  { type: 'star', left: '38%', delay: '0.6s', size: '2.2rem' },
  { type: 'magic-box', left: '58%', delay: '1.8s', size: '3rem' },
  { type: 'brick', left: '74%', delay: '0.3s', size: '2.4rem' },
  { type: 'water', left: '88%', delay: '1.5s', size: '2.8rem' },
];

/**
 * The splash screen: animated title, drifting blocks, and the Play
 * button. Shown once per visit, before the world appears.
 */
export function WelcomePanel() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="splash" role="dialog" aria-label="Welcome to MindCraft!" aria-modal="true">
      <div className="splash-blocks" aria-hidden="true">
        {FLOATING.map((item, index) => {
          const icon = blockIconDataUrl(item.type);
          return (
            <span
              key={index}
              className="splash-block"
              style={{
                left: item.left,
                animationDelay: item.delay,
                width: item.size,
                height: item.size,
                ...(icon ? { backgroundImage: `url(${icon})` } : { background: '#8ed75f' }),
              }}
            />
          );
        })}
      </div>
      <div className="splash-content">
        <h1 className="splash-title">
          <span aria-hidden="true">🧱</span> Welcome to MindCraft!
        </h1>
        <p className="splash-subtitle">Your own world of blocks. Build something awesome!</p>
        <ul className="welcome-tips">
          <li>
            <span aria-hidden="true">🚶</span> Walk with WASD or arrows, jump with space
          </li>
          <li>
            <span aria-hidden="true">👆</span> Tap the ground to place a block
          </li>
          <li>
            <span aria-hidden="true">👀</span> Scroll all the way in to see through your own eyes
          </li>
          <li>
            <span aria-hidden="true">📦</span> Tap the Magic Delivery Box to open it
          </li>
          <li>
            <span aria-hidden="true">🐰</span> Say hi to the bunnies and chicks
          </li>
          <li>
            <span aria-hidden="true">💾</span> Your world is saved here, on this computer
          </li>
        </ul>
        <KidButton tone="primary" className="splash-play" onClick={() => setDismissed(true)} autoFocus>
          Let&apos;s build! 🚀
        </KidButton>
        <p className="splash-version">MindCraft 1.0 — no internet needed, everything stays here</p>
      </div>
    </div>
  );
}
