import { useGameStore } from '../game/gameStore';

const MESSAGES = {
  idle: 'Ready to build',
  saving: 'Saving…',
  saved: 'Saved on this computer',
  error: 'Cannot save on this browser',
} as const;

export function SaveIndicator() {
  const saveState = useGameStore((state) => state.saveState);
  return (
    <div className={`save-indicator save-indicator-${saveState}`} role="status" aria-live="polite">
      <span aria-hidden="true">{saveState === 'saved' ? '✅' : saveState === 'saving' ? '💾' : saveState === 'error' ? '⚠️' : '🧱'}</span>{' '}
      {MESSAGES[saveState]}
    </div>
  );
}
