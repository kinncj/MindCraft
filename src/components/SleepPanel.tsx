import { useGameStore } from '../game/gameStore';
import { KidButton } from './KidButton';
import { Sheet } from './ui/Sheet';

/** Tapping a bed: skip to morning, or just get up. */
export function SleepPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const sleepUntilMorning = useGameStore((state) => state.sleepUntilMorning);
  const closePanels = useGameStore((state) => state.closePanels);
  if (openPanel !== 'sleep') return null;
  return (
    <Sheet title="Sleepy time?" emoji="🛏️" onClose={closePanels} kind="dialog" hint="Snuggle in and wake up when the sun comes up.">
        <div className="dialog-buttons">
          <KidButton tone="primary" onClick={sleepUntilMorning} autoFocus>
            😴 Sleep until morning
          </KidButton>
          <KidButton onClick={closePanels}>I&apos;m not tired</KidButton>
        </div>
    </Sheet>
  );
}
