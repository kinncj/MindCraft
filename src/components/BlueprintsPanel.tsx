import { BLUEPRINTS } from '../engine/build/blueprints';
import { useGameStore } from '../game/gameStore';
import { KidButton } from './KidButton';

/** Blueprint cards: tap one, then tap the ground to stamp it down. */
export function BlueprintsPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const selectBlueprint = useGameStore((state) => state.selectBlueprint);
  const closePanels = useGameStore((state) => state.closePanels);
  if (openPanel !== 'blueprints') return null;
  return (
    <div className="panel-backdrop" role="presentation">
      <section className="panel palette-panel" role="dialog" aria-label="Blueprints" aria-modal="true">
        <header className="panel-header">
          <h2>
            <span aria-hidden="true">📐</span> Blueprints
          </h2>
          <KidButton onClick={closePanels} aria-label="Close the blueprints">
            ✖ Close
          </KidButton>
        </header>
        <p className="panel-hint">Pick a card, then tap the ground where it should go. Press R to turn it.</p>
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
      </section>
    </div>
  );
}
