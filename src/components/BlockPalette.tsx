import { blocks } from '../engine/blocks/blocks';
import type { BlockCategory } from '../engine/blocks/BlockDefinition';
import { blockIconDataUrl } from '../game/blockIcons';
import { useGameStore } from '../game/gameStore';
import { KidButton } from './KidButton';

const CATEGORIES: Array<{ id: BlockCategory; label: string; emoji: string }> = [
  { id: 'ground', label: 'Ground', emoji: '🌍' },
  { id: 'building', label: 'Building', emoji: '🧱' },
  { id: 'nature', label: 'Nature', emoji: '🌳' },
  { id: 'light', label: 'Lights', emoji: '💡' },
  { id: 'furniture', label: 'Home', emoji: '🛋️' },
  { id: 'decoration', label: 'Fun', emoji: '🌈' },
  { id: 'special', label: 'Special', emoji: '📦' },
];

/**
 * Every block, by picture, grouped by category. Tapping one puts it in
 * the selected hotbar slot and closes the palette.
 */
export function BlockPalette() {
  const openPanel = useGameStore((state) => state.openPanel);
  const hotbarIndex = useGameStore((state) => state.hotbarIndex);
  const setHotbarSlot = useGameStore((state) => state.setHotbarSlot);
  const closePanels = useGameStore((state) => state.closePanels);
  if (openPanel !== 'palette') return null;

  const palette = blocks.palette();

  return (
    <div className="panel-backdrop" role="presentation">
      <section className="panel palette-panel" role="dialog" aria-label="All blocks" aria-modal="true">
        <header className="panel-header">
          <h2>
            <span aria-hidden="true">🧱</span> All blocks
          </h2>
          <KidButton onClick={closePanels} aria-label="Close the block list">
            ✖ Close
          </KidButton>
        </header>
        <p className="panel-hint">Tap a block to put it in slot {hotbarIndex + 1}.</p>
        {CATEGORIES.map((category) => {
          const items = palette.filter((def) => def.category === category.id);
          if (items.length === 0) return null;
          return (
            <div key={category.id} className="palette-group" role="group" aria-label={category.label}>
              <h3>
                <span aria-hidden="true">{category.emoji}</span> {category.label}
              </h3>
              <div className="palette-grid">
                {items.map((def) => {
                  const icon = blockIconDataUrl(def.id);
                  return (
                    <button
                      key={def.id}
                      type="button"
                      className="palette-slot"
                      style={icon ? { backgroundImage: `url(${icon})`, backgroundColor: def.color } : { background: def.color }}
                      aria-label={def.label}
                      onClick={() => {
                        setHotbarSlot(hotbarIndex, def.id);
                        closePanels();
                      }}
                    >
                      {!icon && <span aria-hidden="true">{def.emoji}</span>}
                      <span className="palette-label">{def.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
