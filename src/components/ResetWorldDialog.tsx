import { useState } from 'react';
import { useGameStore, type WorldPreset } from '../game/gameStore';
import { KidButton } from './KidButton';
import { Sheet } from './ui/Sheet';

type ResetWorldDialogProps = {
  preset?: WorldPreset;
};

const COPY: Record<WorldPreset, { button: string; ariaLabel: string; title: string; blurb: string; confirm: string }> = {
  meadow: {
    button: '🌱 Reset World',
    ariaLabel: 'Reset the world',
    title: 'Reset World?',
    blurb: 'This will clear your MindCraft world on this computer and grow a brand-new meadow.',
    confirm: 'Reset World',
  },
  toyland: {
    button: '🧸 Start as Toy Land',
    ariaLabel: 'Start a Toy Land world',
    title: 'Start Toy Land?',
    blurb: 'This will replace your world with Toy Land: a toy chest, block towers, a cowboy doll, and an astronaut toy.',
    confirm: 'Start Toy Land',
  },
};

export function ResetWorldDialog({ preset = 'meadow' }: ResetWorldDialogProps) {
  const resetWorld = useGameStore((state) => state.resetWorld);
  const exportWorld = useGameStore((state) => state.exportWorld);
  const [open, setOpen] = useState(false);
  const copy = COPY[preset];

  return (
    <>
      <KidButton onClick={() => setOpen(true)} aria-label={copy.ariaLabel}>
        {copy.button}
      </KidButton>
      {open && (
        <Sheet title={copy.title} emoji={preset === 'toyland' ? '🧸' : '🌱'} onClose={() => setOpen(false)} kind="dialog">
            <p>{copy.blurb}</p>
            <p>You can export your world first if you want to keep it.</p>
            <div className="dialog-buttons">
              <KidButton
                tone="danger"
                onClick={() => {
                  setOpen(false);
                  void resetWorld(preset);
                }}
              >
                {copy.confirm}
              </KidButton>
              <KidButton onClick={() => setOpen(false)}>Cancel</KidButton>
              <KidButton onClick={() => void exportWorld()}>Export First</KidButton>
            </div>
        </Sheet>
      )}
    </>
  );
}
