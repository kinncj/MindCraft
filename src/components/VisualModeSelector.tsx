import { useGameStore } from '../game/gameStore';
import { VISUAL_MODE_IDS, VISUAL_MODES } from '../shaders/visualModes';
import { KidButton } from './KidButton';

const MODE_EMOJI: Record<string, string> = {
  classic: '🌈',
  ultraRealistic: '🌄',
  claudeDream: '✨',
};

/** Three big buttons: Classic, Ultra, and Claude Dream. */
export function VisualModeSelector() {
  const visualMode = useGameStore((state) => state.visualMode);
  const setVisualMode = useGameStore((state) => state.setVisualMode);

  return (
    <div className="setting-group" role="group" aria-label="Visual mode">
      <h3>How the world looks</h3>
      {VISUAL_MODE_IDS.map((id) => {
        const def = VISUAL_MODES[id];
        const selected = id === visualMode;
        return (
          <KidButton
            key={id}
            tone={selected ? 'primary' : 'default'}
            aria-pressed={selected}
            onClick={() => setVisualMode(id)}
          >
            {MODE_EMOJI[id]} {def.name}
            <span className="setting-hint">{def.description}</span>
          </KidButton>
        );
      })}
    </div>
  );
}
