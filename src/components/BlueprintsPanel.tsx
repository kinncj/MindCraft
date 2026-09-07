import { BLUEPRINTS } from '../engine/build/blueprints';
import { useGameStore } from '../game/gameStore';
import { Sheet } from './ui/Sheet';

/** Blueprint cards: tap one, then tap the ground to stamp it down. */
export function BlueprintsPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const selectBlueprint = useGameStore((state) => state.selectBlueprint);
  const closePanels = useGameStore((state) => state.closePanels);
  if (openPanel !== 'blueprints') return null;
  return (
    <Sheet title="Blueprints" emoji="📐" onClose={closePanels} hint="Pick a card, then tap the ground where it should go. Press R to turn it.">
        <div className="blueprint-grid">
          {BLUEPRINTS.map((bp) => (
            <button key={bp.id} type="button" className="blueprint-card" onClick={() => selectBlueprint(bp.id)} aria-label={`Build a ${bp.label}`}>
              <span className="blueprint-emoji" aria-hidden="true">
                {bp.emoji}
              </span>
              <span className="blueprint-label">{bp.label}</span>
              <span className="blueprint-desc">{bp.description}</span>
            </button>
          ))}
        </div>
    </Sheet>
  );
}
