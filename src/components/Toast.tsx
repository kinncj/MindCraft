import { useGameStore } from '../game/gameStore';

export function Toast() {
  const toast = useGameStore((state) => state.toast);
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {toast}
    </div>
  );
}
