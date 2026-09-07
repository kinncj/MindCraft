import { useState } from 'react';
import { getEngine } from '../game/engineRef';
import { useGameStore } from '../game/gameStore';
import { KidButton } from './KidButton';
import { Sheet } from './ui/Sheet';

type Payload = { id: string; name?: string; variant?: string };

/** Tap a pet: rename it, tell it to follow or stay, or do a trick. */
export function PetPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const payload = useGameStore((state) => state.panelPayload) as Payload | null;
  const closePanels = useGameStore((state) => state.closePanels);
  const showToast = useGameStore((state) => state.showToast);
  const markDirty = useGameStore((state) => state.markDirty);
  const [name, setName] = useState('');
  const [confirmBye, setConfirmBye] = useState(false);
  if (openPanel !== 'pet' || !payload) return null;
  const engine = getEngine();
  const pet = engine?.entities.byId(payload.id);
  if (!engine || !pet) return null;
  const brain = (pet.data?.brain as string) ?? pet.brain.kind;
  const emoji = pet.variant === 'cat' ? '🐱' : '🐶';

  return (
    <Sheet title={pet.name ?? 'Your pet'} emoji={emoji} onClose={closePanels} kind="dialog" hint={`${pet.name} is feeling ${pet.mood}.`}>
        <form
          className="rename-form"
          onSubmit={(event) => {
            event.preventDefault();
            const trimmed = name.trim().slice(0, 24);
            if (trimmed) {
              pet.name = trimmed;
              markDirty();
              showToast(`${emoji} ${trimmed} loves the new name!`);
            }
            setName('');
          }}
        >
          <label htmlFor="pet-name">New name</label>
          <input id="pet-name" value={name} maxLength={24} placeholder={pet.name} onChange={(event) => setName(event.target.value)} />
          <KidButton tone="primary" type="submit" aria-label="Save pet name">
            ✏️ Rename
          </KidButton>
        </form>
        <div className="dialog-buttons">
          <KidButton
            tone={brain === 'follow' ? 'primary' : 'default'}
            aria-pressed={brain === 'follow'}
            onClick={() => {
              engine.entities.setPetBrain(pet, 'follow');
              markDirty();
              showToast(`${emoji} ${pet.name} will follow you!`);
            }}
          >
            🐾 Follow me
          </KidButton>
          <KidButton
            tone={brain === 'stay' ? 'primary' : 'default'}
            aria-pressed={brain === 'stay'}
            onClick={() => {
              engine.entities.setPetBrain(pet, 'stay');
              markDirty();
              showToast(`${emoji} ${pet.name} stays. Good ${pet.variant === 'cat' ? 'kitty' : 'puppy'}!`);
            }}
          >
            🛑 Stay
          </KidButton>
          <KidButton
            onClick={() => {
              engine.entities.pet(pet);
              pet.happyTimer = 1.6;
              showToast(`${emoji} ${pet.name} does a spin! 🌀`);
            }}
          >
            🌀 Do a trick
          </KidButton>
        </div>
        {confirmBye ? (
          <div className="confirm-row" role="alertdialog" aria-label="Say goodbye?">
            <p>Send {pet.name} to live on a farm far away?</p>
            <KidButton
              tone="danger"
              onClick={() => {
                engine.entities.remove(pet.id);
                markDirty();
                setConfirmBye(false);
                closePanels();
                showToast(`${emoji} ${pet.name} waves goodbye. 👋`);
              }}
            >
              Yes, bye bye
            </KidButton>
            <KidButton onClick={() => setConfirmBye(false)}>No, stay!</KidButton>
          </div>
        ) : (
          <KidButton onClick={() => setConfirmBye(true)}>👋 Say goodbye</KidButton>
        )}
    </Sheet>
  );
}
