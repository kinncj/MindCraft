import { useEffect } from 'react';
import { BLOCK_DEFINITIONS, HOTBAR_BLOCK_TYPES } from '../game/engine/blockRegistry';
import { blockIconDataUrl } from '../game/engine/textures';
import { useGameStore } from '../game/gameStore';

/**
 * The block picker along the bottom of the screen. Number keys 1-9
 * select the first nine slots; clicking or tapping works for everything.
 */
export function Hotbar() {
  const selectedBlockType = useGameStore((state) => state.selectedBlockType);
  const selectBlockType = useGameStore((state) => state.selectBlockType);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      const index = Number.parseInt(event.key, 10);
      if (index >= 1 && index <= HOTBAR_BLOCK_TYPES.length) {
        selectBlockType(HOTBAR_BLOCK_TYPES[index - 1]);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectBlockType]);

  return (
    <div className="hotbar" role="toolbar" aria-label="Pick a block">
      {HOTBAR_BLOCK_TYPES.map((type, index) => {
        const def = BLOCK_DEFINITIONS[type];
        const selected = type === selectedBlockType;
        const icon = blockIconDataUrl(type);
        return (
          <button
            key={type}
            type="button"
            className={`hotbar-slot ${selected ? 'hotbar-slot-selected' : ''}`}
            style={
              icon
                ? { backgroundImage: `url(${icon})`, backgroundColor: def.color }
                : { background: def.color }
            }
            aria-label={`${def.label}${selected ? ', selected' : ''}`}
            aria-pressed={selected}
            onClick={() => selectBlockType(type)}
          >
            {!icon && (
              <span className="hotbar-emoji" aria-hidden="true">
                {def.emoji}
              </span>
            )}
            <span className="hotbar-label">{def.label}</span>
            {index < 9 && (
              <span className="hotbar-key" aria-hidden="true">
                {index + 1}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
