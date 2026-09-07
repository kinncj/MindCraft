import { useState } from 'react';
import { TALK_CHOICES, jobById } from '../engine/entities/villagers';
import { getEngine } from '../game/engineRef';
import { useGameStore } from '../game/gameStore';
import { KidButton } from './KidButton';
import { Sheet } from './ui/Sheet';

type Payload = { id: string; name?: string; variant?: string };

/** Picture dialogue with a villager: four big choices, one line back. */
export function VillagerPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const payload = useGameStore((state) => state.panelPayload) as Payload | null;
  const closePanels = useGameStore((state) => state.closePanels);
  const [line, setLine] = useState<string | null>(null);
  if (openPanel !== 'villager' || !payload) return null;
  const engine = getEngine();
  const villager = engine?.entities.byId(payload.id);
  if (!engine || !villager) return null;
  const job = jobById(villager.variant ?? '');
  const shown = line ?? job?.greeting ?? '👋 Hi!';

  return (
    <Sheet
      title={`${villager.name} the ${job?.label ?? 'Villager'}`}
      emoji={job?.emoji ?? '🧑'}
      onClose={() => {
        setLine(null);
        closePanels();
      }}
      kind="dialog"
    >
        <p className="speech-bubble" role="status" aria-live="polite">
          {shown}
        </p>
        <div className="dialog-buttons">
          {TALK_CHOICES.map((choice) => (
            <KidButton
              key={choice.id}
              tone={choice.id === 'bye' ? 'default' : 'primary'}
              onClick={() => {
                const reply = engine.talkTo(villager.id, choice.id);
                if (reply) setLine(reply.line);
                if (choice.id === 'bye') {
                  setTimeout(() => {
                    setLine(null);
                    closePanels();
                  }, 900);
                }
              }}
            >
              {choice.label}
            </KidButton>
          ))}
        </div>
    </Sheet>
  );
}
