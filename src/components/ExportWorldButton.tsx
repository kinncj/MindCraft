import { useGameStore } from '../game/gameStore';
import { KidButton } from './KidButton';

export function ExportWorldButton() {
  const exportWorld = useGameStore((state) => state.exportWorld);
  return (
    <KidButton onClick={exportWorld} aria-label="Export your world to a file">
      💾 Export World
    </KidButton>
  );
}
