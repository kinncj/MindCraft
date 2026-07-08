import { useState } from 'react';
import { useGameStore } from '../game/gameStore';
import { KidButton } from './KidButton';

export function ResetWorldDialog() {
  const resetWorld = useGameStore((state) => state.resetWorld);
  const exportWorld = useGameStore((state) => state.exportWorld);
  const [open, setOpen] = useState(false);

  return (
    <>
      <KidButton onClick={() => setOpen(true)} aria-label="Reset the world">
        🌱 Reset World
      </KidButton>
      {open && (
        <div className="panel-backdrop" role="presentation">
          <section className="panel dialog" role="dialog" aria-label="Reset World?" aria-modal="true">
            <h2>Reset World?</h2>
            <p>This will clear your MindCraft world on this computer.</p>
            <p>You can export your world first if you want to keep it.</p>
            <div className="dialog-buttons">
              <KidButton
                tone="danger"
                onClick={() => {
                  setOpen(false);
                  void resetWorld();
                }}
              >
                Reset World
              </KidButton>
              <KidButton onClick={() => setOpen(false)}>Cancel</KidButton>
              <KidButton onClick={exportWorld}>Export First</KidButton>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
