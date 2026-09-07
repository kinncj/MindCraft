import { useEffect } from 'react';
import { blocks } from '../engine/blocks/blocks';
import { blockIconDataUrl } from '../game/blockIcons';
import { useGameStore } from '../game/gameStore';
import { KidButton } from './KidButton';

/**
 * Nine block slots along the bottom of the screen. Number keys 1-9 pick a
 * slot; the big "+" opens the full block palette to fill the slot.
 */
export function Hotbar() {
  const hotbar = useGameStore((state) => state.hotbar);
  const hotbarIndex = useGameStore((state) => state.hotbarIndex);
  const selectSlot = useGameStore((state) => state.selectSlot);
  const setOpenPanel = useGameStore((state) => state.setOpenPanel);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const index = Number.parseInt(event.key, 10);
      if (index >= 1 && index <= 9) selectSlot(index - 1);
      const state = useGameStore.getState();
      if ((event.key.toLowerCase() === 'e' || event.key.toLowerCase() === 'b') && state.openPanel === 'none') state.setOpenPanel('palette');
      if (event.key.toLowerCase() === 'c' && state.openPanel === 'none') state.setOpenPanel('crafting');
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectSlot]);

  return (
    <div className="hotbar" role="toolbar" aria-label="Pick a block">
      {hotbar.map((id, index) => {
        const def = blocks.byId(id);
        if (!def) return null;
        const selected = index === hotbarIndex;
        const icon = blockIconDataUrl(id);
        return (
          <button
            key={index}
            type="button"
            className={`hotbar-slot ${selected ? 'hotbar-slot-selected' : ''}`}
            style={icon ? { backgroundImage: `url(${icon})`, backgroundColor: def.color } : { background: def.color }}
            aria-label={`${def.label}${selected ? ', selected' : ''}`}
            aria-pressed={selected}
            onClick={() => selectSlot(index)}
          >
            {!icon && (
              <span className="hotbar-emoji" aria-hidden="true">
                {def.emoji}
              </span>
            )}
            <span className="hotbar-label">{def.label}</span>
            <span className="hotbar-key" aria-hidden="true">
              {index + 1}
            </span>
          </button>
        );
      })}
      <KidButton className="hotbar-more" onClick={() => setOpenPanel('palette')} aria-label="More blocks">
        ➕ More
      </KidButton>
    </div>
  );
}
