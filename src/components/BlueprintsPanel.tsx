import { BLUEPRINTS } from '../engine/build/blueprints';
import { MONUMENT_LIST } from '../engine/build/monuments/index';
import { CITY_NAMES, CITY_PACKS } from '../engine/build/monuments/cities';
import { useGameStore } from '../game/gameStore';
import { Sheet } from './ui/Sheet';

/**
 * Thirty-odd landmarks in one grid is a wall of cards to a five-year-old.
 * They are grouped by country, in the order the list already has them, so a
 * child looking for the Eiffel Tower can look under France.
 */
function byCountry(): Array<[string, typeof MONUMENT_LIST[number][]]> {
  const groups = new Map<string, typeof MONUMENT_LIST[number][]>();
  for (const monument of MONUMENT_LIST) {
    if (monument.id === 'sign') continue;
    const country = monument.place.includes(',') ? monument.place.split(',')[1].trim() : 'Anywhere';
    const group = groups.get(country);
    if (group) group.push(monument);
    else groups.set(country, [monument]);
  }
  return [...groups.entries()];
}

/** Blueprint cards to stamp down, and famous places a villager builds for you. */
export function BlueprintsPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const selectBlueprint = useGameStore((state) => state.selectBlueprint);
  const buildMonument = useGameStore((state) => state.buildMonument);
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
        <h3 className="sheet-subtitle">Famous places</h3>
        <p className="sheet-hint">Tap one and it goes up on open ground nearby.</p>
        {byCountry().map(([country, monuments]) => (
          <div key={country}>
            <h4 className="sheet-group">{country}</h4>
            <div className="blueprint-grid">
              {monuments.map((m) => (
                <button key={m.id} type="button" className="blueprint-card" onClick={() => buildMonument(m.id)} aria-label={`Build the ${m.label}`}>
                  <span className="blueprint-emoji" aria-hidden="true">
                    {m.emoji}
                  </span>
                  <span className="blueprint-label">{m.label}</span>
                  <span className="blueprint-desc">{m.place}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <h3 className="sheet-subtitle">Whole cities</h3>
        <div className="blueprint-grid">
          {CITY_NAMES.map((city) => (
            <button
              key={city}
              type="button"
              className="blueprint-card"
              onClick={() => {
                for (const kind of CITY_PACKS[city].monuments) buildMonument(kind);
                buildMonument('sign', CITY_PACKS[city].sign);
              }}
              aria-label={`Build ${CITY_PACKS[city].label}`}
            >
              <span className="blueprint-emoji" aria-hidden="true">
                {CITY_PACKS[city].emoji}
              </span>
              <span className="blueprint-label">{CITY_PACKS[city].label}</span>
              <span className="blueprint-desc">{CITY_PACKS[city].monuments.length + 1} landmarks</span>
            </button>
          ))}
        </div>
    </Sheet>
  );
}
