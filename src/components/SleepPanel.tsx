import { useGameStore } from '../game/gameStore';
import { KidButton } from './KidButton';

/** Tapping a bed: skip to morning, or just get up. */
export function SleepPanel() {
  const openPanel = useGameStore((state) => state.openPanel);
  const sleepUntilMorning = useGameStore((state) => state.sleepUntilMorning);
  const closePanels = useGameStore((state) => state.closePanels);
  if (openPanel !== 'sleep') return null;
  return (
    <div className="panel-backdrop" role="presentation">
      <section className="panel dialog" role="dialog" aria-label="Sleepy time?" aria-modal="true">
        <h2>
          <span aria-hidden="true">🛏️</span> Sleepy time?
        </h2>
        <p>Snuggle in and wake up when the sun comes up.</p>
        <div className="dialog-buttons">
          <KidButton tone="primary" onClick={sleepUntilMorning} autoFocus>
            😴 Sleep until morning
          </KidButton>
          <KidButton onClick={closePanels}>I&apos;m not tired</KidButton>
        </div>
      </section>
    </div>
  );
}
