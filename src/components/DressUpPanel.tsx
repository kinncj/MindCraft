import { useGameStore } from '../game/gameStore';
import type { PlayerLookState } from '../game/store/types';
import { KidButton } from './KidButton';
import { Sheet } from './ui/Sheet';

const COLORS = ['#ffb03c', '#e8574f', '#4a7fd6', '#67c23a', '#9b6bd8', '#f291bb', '#ffd94a', '#f3efe7', '#3a3a3a', '#8a6238', '#4fa8e8', '#2f9149'];
const SKINS = ['#f2c79a', '#e0ac69', '#c68642', '#8d5524', '#5c3a1e', '#ffdbac'];
const HAIRS = ['#6b4a26', '#3a3226', '#c98d4b', '#ffd94a', '#e8574f', '#9b6bd8', '#f3efe7', '#4a7fd6'];
const HATS: Array<{ id: PlayerLookState['hat']; label: string }> = [
  { id: 'none', label: '🙂 No hat' },
  { id: 'cap', label: '🧢 Cap' },
  { id: 'crown', label: '👑 Crown' },
  { id: 'cowboy', label: '🤠 Cowboy' },
  { id: 'party', label: '🥳 Party' },
];

function Swatches({ label, colors, value, onPick }: { label: string; colors: string[]; value: string; onPick: (c: string) => void }) {
  return (
    <div className="setting-group" role="group" aria-label={label}>
      <h3>{label}</h3>
      <div className="swatches">
        {colors.map((c) => (
          <button key={c} type="button" className={`swatch ${value === c ? 'swatch-selected' : ''}`} style={{ background: c }} aria-label={`${label} ${c}`} aria-pressed={value === c} onClick={() => onPick(c)} />
        ))}
      </div>
    </div>
  );
}

/** Dress-up: colors and hats for the player's avatar. */
export function DressUpPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const look = useGameStore((state) => state.look);
  const setLook = useGameStore((state) => state.setLook);
  const closePanels = useGameStore((state) => state.closePanels);
  if (openPanel !== 'dressup') return null;
  return (
    <Sheet title="Dress up" emoji="👕" onClose={closePanels}>
        <Swatches label="Shirt" colors={COLORS} value={look.shirt} onPick={(shirt) => setLook({ shirt })} />
        <Swatches label="Pants" colors={COLORS} value={look.pants} onPick={(pants) => setLook({ pants })} />
        <Swatches label="Skin" colors={SKINS} value={look.skin} onPick={(skin) => setLook({ skin })} />
        <Swatches label="Hair" colors={HAIRS} value={look.hair} onPick={(hair) => setLook({ hair })} />
        <div className="setting-group" role="group" aria-label="Hat">
          <h3>Hat</h3>
          {HATS.map((hat) => (
            <KidButton key={hat.id} tone={look.hat === hat.id ? 'primary' : 'default'} aria-pressed={look.hat === hat.id} onClick={() => setLook({ hat: hat.id })}>
              {hat.label}
            </KidButton>
          ))}
        </div>
    </Sheet>
  );
}
